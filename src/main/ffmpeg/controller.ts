import { spawn, ChildProcess } from 'child_process';
import { BrowserWindow } from 'electron';
import path from 'path';
import crypto from 'crypto';
import { isDev, RECORDINGS_DIR } from '../config';
import {
  PREVIEW_FPS,
  PREVIEW_WIDTH,
  PREVIEW_HEIGHT,
  FFMPEG_STOP_TIMEOUT_MS,
} from '../../shared/constants';

// JPEG SOI (Start of Image) and EOI (End of Image) markers
const SOI = Buffer.from([0xff, 0xd8]);
const EOI = Buffer.from([0xff, 0xd9]);

class FFmpegController {
  private process: ChildProcess | null = null;
  private deviceName: string | null = null;
  private isRecording = false;
  private recordingFilePath: string | null = null;
  private recordingStartTime: number | null = null;
  private frameBuffer = Buffer.alloc(0);

  setDevice(name: string) {
    this.deviceName = name;
  }

  async startPreview(window: BrowserWindow): Promise<void> {
    if (this.process) {
      await this.stop();
    }
    this.isRecording = false;
    this.spawnFFmpeg(window, false);
  }

  async startRecording(window: BrowserWindow): Promise<void> {
    if (this.process) {
      await this.stop();
    }

    const filename = `recording-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.mp4`;
    this.recordingFilePath = path.join(RECORDINGS_DIR, filename);
    this.isRecording = true;
    this.recordingStartTime = Date.now();
    this.spawnFFmpeg(window, true);
  }

  async stopRecording(): Promise<{ filePath: string; durationSeconds: number }> {
    const filePath = this.recordingFilePath;
    const startTime = this.recordingStartTime;

    if (!filePath || !startTime) {
      throw new Error('No active recording');
    }

    await this.stop();

    const durationSeconds = Math.round((Date.now() - startTime) / 1000);
    this.isRecording = false;
    this.recordingFilePath = null;
    this.recordingStartTime = null;

    return { filePath, durationSeconds };
  }

  async stopPreview(): Promise<void> {
    await this.stop();
  }

  private spawnFFmpeg(window: BrowserWindow, recording: boolean) {
    const args = this.buildArgs(recording);
    console.log(`[FFmpeg] Spawning: ffmpeg ${args.join(' ')}`);

    this.frameBuffer = Buffer.alloc(0);
    const proc = spawn('ffmpeg', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.process = proc;

    // Parse MJPEG frames from stdout (preview output)
    proc.stdout?.on('data', (chunk: Buffer) => {
      this.frameBuffer = Buffer.concat([this.frameBuffer, chunk]);
      this.extractFrames(window);
    });

    proc.stderr?.on('data', (data: Buffer) => {
      const msg = data.toString();
      // Only log errors, not the usual status lines
      if (msg.includes('Error') || msg.includes('error') || msg.includes('fatal')) {
        console.error(`[FFmpeg stderr] ${msg}`);
      }
    });

    proc.on('close', (code) => {
      console.log(`[FFmpeg] Process exited with code ${code}`);
      this.process = null;
      if (this.isRecording && code !== 0) {
        window.webContents.send('bayside:error', 'Recording was interrupted unexpectedly.');
      }
    });

    proc.on('error', (err) => {
      console.error(`[FFmpeg] Process error: ${err.message}`);
      this.process = null;
      window.webContents.send('bayside:error', `FFmpeg error: ${err.message}`);
    });
  }

  private buildArgs(recording: boolean): string[] {
    const inputArgs = isDev
      ? ['-f', 'avfoundation', '-framerate', '30', '-video_size', '1280x720', '-i', `${this.deviceName}:none`]
      : ['-f', 'decklink', '-i', this.deviceName!];

    const previewFilter = `scale=${PREVIEW_WIDTH}:${PREVIEW_HEIGHT}`;

    if (!recording) {
      // Preview only: output MJPEG to stdout
      return [
        ...inputArgs,
        '-vf', previewFilter,
        '-r', String(PREVIEW_FPS),
        '-f', 'mjpeg',
        '-q:v', '5',
        '-an',
        'pipe:1',
      ];
    }

    // Recording + Preview: two outputs using tee or split
    return [
      ...inputArgs,
      // Output 1: H.264 file (full quality)
      '-map', '0:v',
      '-c:v', 'h264_videotoolbox',
      '-b:v', '10M',
      '-profile:v', 'high',
      '-level', '4.1',
      '-movflags', '+faststart',
      this.recordingFilePath!,
      // Output 2: MJPEG preview to stdout
      '-map', '0:v',
      '-vf', previewFilter,
      '-r', String(PREVIEW_FPS),
      '-f', 'mjpeg',
      '-q:v', '5',
      '-an',
      'pipe:1',
    ];
  }

  private extractFrames(window: BrowserWindow) {
    while (true) {
      const soiIndex = this.frameBuffer.indexOf(SOI);
      if (soiIndex === -1) break;

      const eoiIndex = this.frameBuffer.indexOf(EOI, soiIndex + 2);
      if (eoiIndex === -1) break;

      const frameEnd = eoiIndex + 2;
      const frame = this.frameBuffer.subarray(soiIndex, frameEnd);
      const base64 = frame.toString('base64');

      window.webContents.send('bayside:preview-frame', {
        data: `data:image/jpeg;base64,${base64}`,
        timestamp: Date.now(),
      });

      this.frameBuffer = this.frameBuffer.subarray(frameEnd);
    }

    // Prevent buffer from growing too large
    if (this.frameBuffer.length > 10 * 1024 * 1024) {
      this.frameBuffer = this.frameBuffer.subarray(-1024 * 1024);
    }
  }

  private stop(): Promise<void> {
    return new Promise((resolve) => {
      const proc = this.process;
      if (!proc || proc.killed) {
        this.process = null;
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        console.warn('[FFmpeg] Graceful stop timed out, killing process');
        proc.kill('SIGKILL');
      }, FFMPEG_STOP_TIMEOUT_MS);

      proc.on('close', () => {
        clearTimeout(timeout);
        this.process = null;
        resolve();
      });

      // Send 'q' to stdin for graceful stop (proper moov atom finalization)
      try {
        proc.stdin?.write('q');
        proc.stdin?.end();
      } catch {
        proc.kill('SIGTERM');
      }
    });
  }

  async killAll(): Promise<void> {
    if (this.process && !this.process.killed) {
      this.process.kill('SIGKILL');
      this.process = null;
    }
    this.isRecording = false;
    this.recordingFilePath = null;
    this.recordingStartTime = null;
    this.frameBuffer = Buffer.alloc(0);
  }
}

export const ffmpegController = new FFmpegController();
