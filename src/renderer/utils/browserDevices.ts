import type { VideoDevice } from '../../shared/types';

/**
 * Enumerate browser videoinput devices that FFmpeg can't see
 * (e.g. Blackmagic UltraStudio via DeckLinkCMIO.plugin).
 */
export async function listBrowserVideoDevices(
  ffmpegDeviceNames: string[]
): Promise<VideoDevice[]> {
  // Request a temporary stream to populate device labels
  let tempStream: MediaStream | null = null;
  try {
    tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
  } catch {
    // No video permission or no devices — return empty
    return [];
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
    tempStream.getTracks().forEach((t) => t.stop());
  }
}
