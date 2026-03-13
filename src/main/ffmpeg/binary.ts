import { app } from 'electron';
import path from 'path';
import { execFileSync } from 'child_process';
import fs from 'fs';

let cachedPath: string | null = null;

/**
 * Check if an ffmpeg binary supports the decklink input format.
 */
function supportsDeckLink(ffmpegPath: string): boolean {
  try {
    const output = execFileSync(ffmpegPath, ['-formats'], {
      timeout: 5000,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return output.includes('decklink');
  } catch {
    return false;
  }
}

/**
 * Returns the path to the ffmpeg binary.
 *
 * Priority:
 * 1. Bundled DeckLink-capable ffmpeg in resources/ (production) or project root (development)
 * 2. System FFmpeg with DeckLink support (fallback for capture card users)
 * 3. Bundled ffmpeg-static (development fallback, no DeckLink)
 */
export function getFFmpegPath(): string {
  if (cachedPath) return cachedPath;

  // In production: bundled binary in resources
  if (app.isPackaged) {
    cachedPath = path.join(process.resourcesPath, 'ffmpeg');
    return cachedPath;
  }

  // In development: use the DeckLink-capable binary from resources/ dir
  const devBundled = path.join(app.getAppPath(), 'resources', 'ffmpeg');
  if (fs.existsSync(devBundled) && supportsDeckLink(devBundled)) {
    console.log(`[FFmpeg] Using bundled DeckLink-capable ffmpeg: ${devBundled}`);
    cachedPath = devBundled;
    return cachedPath;
  }

  // Fallback: system FFmpeg with DeckLink support
  const systemCandidates = [
    '/opt/homebrew/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
  ];
  for (const candidate of systemCandidates) {
    if (fs.existsSync(candidate) && supportsDeckLink(candidate)) {
      console.log(`[FFmpeg] Using system ffmpeg with DeckLink support: ${candidate}`);
      cachedPath = candidate;
      return cachedPath;
    }
  }

  // Final fallback: ffmpeg-static (no DeckLink)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ffmpegPath = require('ffmpeg-static') as string;
  if (!ffmpegPath) {
    throw new Error('ffmpeg-static binary not found');
  }

  console.log(`[FFmpeg] Using ffmpeg-static (no DeckLink support): ${ffmpegPath}`);
  cachedPath = ffmpegPath;
  return cachedPath;
}

/**
 * Returns true if the current ffmpeg binary supports DeckLink input.
 */
export function hasDeckLinkSupport(): boolean {
  return supportsDeckLink(getFFmpegPath());
}

/**
 * Clear the cached path so the next getFFmpegPath() call re-evaluates.
 */
export function clearCachedPath(): void {
  cachedPath = null;
}
