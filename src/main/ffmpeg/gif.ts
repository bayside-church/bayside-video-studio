import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { getFFmpegPath } from './binary';

/**
 * Generate an animated GIF preview from a video file using ffmpeg.
 * Uses a two-pass palette approach for quality, outputs to the same directory
 * as the source video with a .gif extension.
 *
 * @returns Absolute path to the generated GIF file.
 */
export async function generateGif(
  videoPath: string,
  options: { width?: number; fps?: number; duration?: number } = {},
): Promise<string> {
  const { width = 480, fps = 12, duration = 5 } = options;
  const ffmpeg = getFFmpegPath();
  const gifPath = videoPath.replace(/\.mp4$/i, '.gif');

  const filters = `fps=${fps},scale=${width}:-1:flags=lanczos`;

  // Single-pass with a global palette generated inline via split/palettegen/paletteuse
  const args = [
    '-y',
    '-i', videoPath,
    '-t', String(duration),
    '-filter_complex', `[0:v] ${filters},split [a][b]; [a] palettegen=max_colors=128 [pal]; [b][pal] paletteuse=dither=sierra2_4a`,
    '-loop', '0',
    gifPath,
  ];

  console.log(`[FFmpeg GIF] Generating: ${ffmpeg} ${args.join(' ')}`);

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(ffmpeg, args, { stdio: ['pipe', 'pipe', 'pipe'] });

    proc.stderr?.on('data', (data: Buffer) => {
      console.log(`[FFmpeg GIF stderr] ${data.toString()}`);
    });

    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(gifPath)) {
        const size = fs.statSync(gifPath).size;
        console.log(`[FFmpeg GIF] Generated ${path.basename(gifPath)} (${(size / 1024).toFixed(0)} KB)`);
        resolve();
      } else {
        reject(new Error(`GIF generation failed with code ${code}`));
      }
    });

    proc.on('error', reject);
  });

  return gifPath;
}
