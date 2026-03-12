import { execFile } from 'child_process';
import { getFFmpegPath, hasDeckLinkSupport } from './binary';
import type { VideoDevice, AudioDevice } from '../../shared/types';

/**
 * List all available video capture devices (DeckLink + avfoundation).
 */
export async function listAllDevices(): Promise<VideoDevice[]> {
  const ffmpeg = getFFmpegPath();
  const decklink = hasDeckLinkSupport()
    ? await listDeckLinkDevices(ffmpeg)
    : [];
  const avfoundation = await listAvFoundationDevices(ffmpeg);
  console.log(`[Devices] Found ${decklink.length} DeckLink + ${avfoundation.length} AVFoundation video devices`);
  return [...decklink, ...avfoundation];
}

/**
 * List all available audio input devices (avfoundation only).
 */
export async function listAllAudioDevices(): Promise<AudioDevice[]> {
  const ffmpeg = getFFmpegPath();
  return listAvFoundationAudioDevices(ffmpeg);
}

function listDeckLinkDevices(ffmpeg: string): Promise<VideoDevice[]> {
  return new Promise((resolve) => {
    const proc = execFile(
      ffmpeg,
      ['-f', 'decklink', '-list_devices', '1', '-i', 'dummy'],
      { timeout: 10_000 },
      (_error, _stdout, stderr) => {
        const output = stderr ?? '';
        console.log('[DeckLink] Raw device output:\n', output);
        const devices: VideoDevice[] = [];
        let deviceIndex = 0;

        for (const line of output.split('\n')) {
          // Old format: [0] UltraStudio 4K Mini
          const indexMatch = line.match(/\[(\d+)\]\s+(.+)/);
          if (indexMatch && !line.includes('Could not')) {
            const name = indexMatch[2].trim().replace(/^'|'$/g, '');
            if (name && !name.startsWith('[')) {
              devices.push({
                id: `decklink:${indexMatch[1]}`,
                name,
                format: 'decklink',
              });
              continue;
            }
          }

          // New format (FFmpeg 7+): quoted name, possibly with log prefix
          // e.g. [in#0 @ 0x...] \t'UltraStudio 4K Mini'
          const quotedMatch = line.match(/'([^']+)'/);
          if (quotedMatch && !line.includes('DeckLink input devices') && !line.includes('Could not') && !line.includes('option is deprecated') && !line.includes('drivers are too old')) {
            const name = quotedMatch[1].trim();
            if (name) {
              devices.push({
                id: `decklink:${deviceIndex}`,
                name,
                format: 'decklink',
              });
              deviceIndex++;
            }
          }
        }

        resolve(devices);
      },
    );

    proc.on('error', (err) => {
      console.warn('[DeckLink] Failed to list devices:', err.message);
      resolve([]);
    });
  });
}

function listAvFoundationDevices(ffmpeg: string): Promise<VideoDevice[]> {
  return new Promise((resolve) => {
    const proc = execFile(
      ffmpeg,
      ['-f', 'avfoundation', '-list_devices', 'true', '-i', ''],
      { timeout: 10_000 },
      (_error, _stdout, stderr) => {
        const output = stderr ?? '';
        console.log('[AVFoundation] Raw device output:\n', output);
        const devices: VideoDevice[] = [];
        let inVideoSection = false;

        for (const line of output.split('\n')) {
          // Detect start of video devices section
          if (line.includes('AVFoundation video devices')) {
            inVideoSection = true;
            continue;
          }
          // Detect start of audio devices section (end of video)
          if (line.includes('AVFoundation audio devices')) {
            break;
          }

          if (inVideoSection) {
            // Match lines like: [AVFoundation indev @ 0x...] [0] FaceTime HD Camera
            const match = line.match(/\[(\d+)\]\s+(.+)/);
            if (match) {
              const idx = match[1];
              const name = match[2].trim();
              // Skip screen capture and Continuity Camera (iPhone/iPad) devices
              if (/capture screen/i.test(name)) continue;
              if (/iphone|ipad/i.test(name)) continue;
              devices.push({
                id: `avfoundation:${idx}`,
                name,
                format: 'avfoundation',
              });
            }
          }
        }

        resolve(devices);
      },
    );

    proc.on('error', (err) => {
      console.warn('[AVFoundation] Failed to list devices:', err.message);
      resolve([]);
    });
  });
}

function listAvFoundationAudioDevices(ffmpeg: string): Promise<AudioDevice[]> {
  return new Promise((resolve) => {
    const proc = execFile(
      ffmpeg,
      ['-f', 'avfoundation', '-list_devices', 'true', '-i', ''],
      { timeout: 10_000 },
      (_error, _stdout, stderr) => {
        const output = stderr ?? '';
        const devices: AudioDevice[] = [];
        let inAudioSection = false;

        for (const line of output.split('\n')) {
          if (line.includes('AVFoundation audio devices')) {
            inAudioSection = true;
            continue;
          }

          if (inAudioSection) {
            const match = line.match(/\[(\d+)\]\s+(.+)/);
            if (match) {
              const idx = match[1];
              const name = match[2].trim();
              // Skip Continuity Camera (iPhone/iPad) audio devices
              if (/iphone|ipad/i.test(name)) continue;
              devices.push({
                id: `avfoundation:${idx}`,
                name,
                format: 'avfoundation',
              });
            }
          }
        }

        resolve(devices);
      },
    );

    proc.on('error', (err) => {
      console.warn('[AVFoundation] Failed to list audio devices:', err.message);
      resolve([]);
    });
  });
}
