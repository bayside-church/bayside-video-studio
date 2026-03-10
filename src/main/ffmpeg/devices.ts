import { execFile } from 'child_process';
import { isDev } from '../config';

/**
 * Detect available DeckLink device name.
 * In dev mode, returns a webcam device identifier instead.
 */
export function detectDeckLinkDevice(): Promise<string | null> {
  if (isDev) {
    return detectWebcam();
  }

  return new Promise((resolve) => {
    const proc = execFile(
      'ffmpeg',
      ['-f', 'decklink', '-list_devices', '1', '-i', 'dummy'],
      { timeout: 10_000 },
      (_error, _stdout, stderr) => {
        // FFmpeg outputs device list to stderr
        const output = stderr ?? '';
        const lines = output.split('\n');

        for (const line of lines) {
          // Look for lines like: [decklink @ 0x...] [0] DeckLink Mini Recorder
          const match = line.match(/\[\d+\]\s+(.+)/);
          if (match && !line.includes('Could not')) {
            const deviceName = match[1].trim();
            if (deviceName && !deviceName.startsWith('[')) {
              console.log(`[DeckLink] Found device: ${deviceName}`);
              resolve(deviceName);
              return;
            }
          }
        }

        console.warn('[DeckLink] No device found');
        resolve(null);
      },
    );

    proc.on('error', () => {
      console.error('[DeckLink] FFmpeg not found');
      resolve(null);
    });
  });
}

function detectWebcam(): Promise<string | null> {
  return new Promise((resolve) => {
    const proc = execFile(
      'ffmpeg',
      ['-f', 'avfoundation', '-list_devices', 'true', '-i', ''],
      { timeout: 10_000 },
      (_error, _stdout, stderr) => {
        const output = stderr ?? '';
        if (output.includes('[0]') || output.includes('video')) {
          console.log('[Dev] Using webcam device 0');
          resolve('0');
          return;
        }
        resolve(null);
      },
    );

    proc.on('error', () => resolve(null));
  });
}
