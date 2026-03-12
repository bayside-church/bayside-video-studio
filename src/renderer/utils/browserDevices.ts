import type { VideoDevice, AudioDevice } from '../../shared/types';

/**
 * Enumerate browser videoinput devices that FFmpeg can't see
 * (e.g. Blackmagic UltraStudio via DeckLinkCMIO.plugin).
 */
export async function listBrowserVideoDevices(
  ffmpegDeviceNames: string[]
): Promise<VideoDevice[]> {
  // Check if labels are already available (from a previous permission grant)
  const preCheck = await navigator.mediaDevices.enumerateDevices();
  const hasLabels = preCheck.some((d) => d.kind === 'videoinput' && d.label);

  // Only request a temp stream if labels aren't available yet.
  // Use audio-only to avoid disrupting an active FFmpeg video preview.
  let tempStream: MediaStream | null = null;
  if (!hasLabels) {
    try {
      tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      // No permission or no devices — return empty
      return [];
    }
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoInputs = devices.filter((d) => d.kind === 'videoinput');

    const result: VideoDevice[] = [];
    const ffmpegLower = ffmpegDeviceNames.map((n) => n.toLowerCase());

    for (const d of videoInputs) {
      const label = d.label || 'Unknown Camera';
      const labelLower = label.toLowerCase();

      // Skip screen capture devices
      if (labelLower.includes('screen') || labelLower.includes('display')) continue;

      // Skip devices that FFmpeg already exposes (fuzzy match)
      const matchesFFmpeg = ffmpegLower.some(
        (n) => labelLower.includes(n) || n.includes(labelLower)
      );
      if (matchesFFmpeg) continue;

      result.push({
        id: `browser:${d.deviceId}`,
        name: label,
        format: 'browser',
      });
    }

    return result;
  } finally {
    tempStream?.getTracks().forEach((t) => t.stop());
  }
}

/**
 * Get the set of currently connected device labels from the browser.
 * Uses enumerateDevices() which doesn't open any hardware.
 */
async function getConnectedDeviceLabels(): Promise<{ video: string[]; audio: string[] }> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return {
      video: devices
        .filter((d) => d.kind === 'videoinput' && d.label)
        .map((d) => d.label.toLowerCase()),
      audio: devices
        .filter((d) => d.kind === 'audioinput' && d.label)
        .map((d) => d.label.toLowerCase()),
    };
  } catch {
    return { video: [], audio: [] };
  }
}

function fuzzyMatch(ffmpegName: string, browserLabels: string[]): boolean {
  const name = ffmpegName.toLowerCase();
  return browserLabels.some((label) => label.includes(name) || name.includes(label));
}

/**
 * Filter an FFmpeg video device list to only include currently connected devices.
 * Cross-references against browser enumerateDevices() labels.
 */
export async function filterConnectedVideoDevices(devices: VideoDevice[]): Promise<VideoDevice[]> {
  const { video: connectedVideo, audio: connectedAudio } = await getConnectedDeviceLabels();
  if (connectedVideo.length === 0) return devices; // Can't filter without labels
  return devices.filter((d) => {
    if (d.format === 'browser') return true; // Browser devices are already verified
    if (d.format === 'decklink') return fuzzyMatch(d.name, connectedAudio); // DeckLink exposes audio but not video in browser
    return fuzzyMatch(d.name, connectedVideo);
  });
}

/**
 * Filter an FFmpeg audio device list to only include currently connected devices.
 * Cross-references against browser enumerateDevices() labels.
 */
export async function filterConnectedAudioDevices(devices: AudioDevice[]): Promise<AudioDevice[]> {
  const { audio: connectedLabels } = await getConnectedDeviceLabels();
  if (connectedLabels.length === 0) return devices; // Can't filter without labels
  return devices.filter((d) => fuzzyMatch(d.name, connectedLabels));
}
