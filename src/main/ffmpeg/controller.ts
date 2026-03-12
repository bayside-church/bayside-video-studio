import { spawn, ChildProcess } from 'child_process';
import { BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { getRecordingsDir } from '../config';
import { getFFmpegPath } from './binary';
import type { VideoDevice, AudioDevice } from '../../shared/types';
import {
  PREVIEW_FPS,
  PREVIEW_WIDTH,
  PREVIEW_HEIGHT,
  FFMPEG_STOP_TIMEOUT_MS,
} from '../../shared/constants';

// JPEG SOI (Start of Image) and EOI (End of Image) markers
const SOI = Buffer.from([0xff, 0xd8]);
const EOI = Buffer.from([0xff, 0xd9]);

// Resolutions to try in order (highest first) for avfoundation landscape capture
const CAPTURE_RESOLUTIONS = ['3840x2160', '1920x1080', '1280x720'];

class FFmpegController {
  private process: ChildProcess | null = null;
  private device: VideoDevice | null = null;
  private audioDevice: AudioDevice | null = null;
  private recording = false;
  private recordingFilePath: string | null = null;
  private recordingStartTime: number | null = null;
  private frameBuffer = Buffer.alloc(0);
  private captureResolution: string | null = null;

  setDevice(device: VideoDevice) {
    this.device = device;
    this.captureResolution = null;
  }

  getDevice(): VideoDevice | null {
    return this.device;
  }

  setAudioDevice(device: AudioDevice | null) {
    this.audioDevice = device;
  }

  getAudioDevice(): AudioDevice | null {
    return this.audioDevice;
  }

  isPreviewRunning(): boolean {
    return this.process !== null && !this.process.killed && !this.recording;
  }

  /**
   * Start preview-only mode. No-op if preview is already running.
   */
  async startPreview(window: BrowserWindow): Promise<void> {
    if (this.isPreviewRunning()) return;

    await this.killProcess();
    await this.ensureCaptureResolution();

    this.recording = false;
    this.spawnProcess(window, false);
  }

  async stopPreview(): Promise<void> {
    await this.gracefulStop();
  }

  /**
   * Switch from preview-only to preview+recording in a single process.
   * Kills the current preview process and spawns a new one with both outputs.
   * For DeckLink + external audio: spawns a separate audio-only FFmpeg process
   * to avoid timestamp domain conflicts.
   */
  async startRecording(window: BrowserWindow, email?: string): Promise<void> {
    // Gracefully stop preview so avfoundation releases the camera cleanly
    await this.gracefulStop();
    // Brief pause for the camera device to be fully released
    await new Promise((r) => setTimeout(r, 300));
    await this.ensureCaptureResolution();

    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const safeEmail = email ? '_' + email.replace(/[^a-zA-Z0-9@._-]/g, '_') : '';
    const suffix = crypto.randomBytes(3).toString('hex');
    const filename = `${datePart}${safeEmail}_${suffix}.mp4`;
    this.recordingFilePath = path.join(getRecordingsDir(), filename);
    this.recordingStartTime = Date.now();
    this.recording = true;

    // Audio for DeckLink + external mic is handled by the renderer via
    // getUserMedia/MediaRecorder (FFmpeg avfoundation can't reliably capture
    // USB audio interfaces like the Scarlett at 192kHz).
    this.spawnProcess(window, true);
  }

  /**
   * Stop recording. Gracefully stops FFmpeg so the moov atom is written.
   * If renderer-captured audio is provided, merges it with the video using the offset to sync.
   * Does NOT restart preview — caller should show processing screen.
   */
  async stopRecording(rendererAudioPath?: string): Promise<{ filePath: string; durationSeconds: number }> {
    const filePath = this.recordingFilePath;
    const startTime = this.recordingStartTime;

    if (!filePath || !startTime) {
      throw new Error('No active recording');
    }

    await this.gracefulStop();

    const durationSeconds = Math.round((Date.now() - startTime) / 1000);
    this.recording = false;
    this.recordingFilePath = null;
    this.recordingStartTime = null;

    // If renderer captured audio separately, merge it with the video.
    // Sync is determined by probing both file durations — since both recordings
    // stop at the same moment, (audioDuration - videoDuration) = audio lead.
    if (rendererAudioPath && fs.existsSync(rendererAudioPath)) {
      console.log(`[FFmpeg] Merging renderer audio (${rendererAudioPath}) with video (${filePath})`);
      try {
        const mergedPath = await this.mergeVideoAudio(filePath, rendererAudioPath);
        try { fs.unlinkSync(rendererAudioPath); } catch { /* ignore */ }
        return { filePath: mergedPath, durationSeconds };
      } catch (err) {
        console.error('[FFmpeg] Merge failed, using video-only file:', err);
        try { fs.unlinkSync(rendererAudioPath); } catch { /* ignore */ }
      }
    }

    return { filePath, durationSeconds };
  }

  async killAll(): Promise<void> {
    await this.killProcess();
    this.recording = false;
    this.recordingFilePath = null;
    this.recordingStartTime = null;
  }

  // --- Private ---

  private async ensureCaptureResolution(): Promise<void> {
    if (this.device?.format === 'avfoundation' && !this.captureResolution) {
      this.captureResolution = await this.probeResolution();
      console.log(`[FFmpeg] Selected capture resolution: ${this.captureResolution}`);
    }
  }

  private getVideoInputArgs(): string[] {
    if (!this.device) throw new Error('No device configured');
    const deviceIndex = this.device.id.split(':')[1];

    if (this.device.format === 'decklink') {
      return ['-f', 'decklink', '-i', this.device.name];
    }

    return ['-f', 'avfoundation', '-framerate', '30', '-video_size', this.captureResolution ?? '1920x1080', '-i', `${deviceIndex}:none`];
  }

  /**
   * Whether audio should be included in the recording.
   * - avfoundation video: use external avfoundation audio input (same process)
   * - decklink video: use embedded DeckLink audio OR external audio (separate process)
   */
  private get hasAudio(): boolean {
    if (this.device?.format === 'decklink') return true; // DeckLink always has embedded audio
    return this.audioDevice !== null && this.device?.format === 'avfoundation';
  }

  /** Whether audio comes from a separate avfoundation input (vs embedded in the main input) */
  private get hasExternalAudio(): boolean {
    return this.audioDevice !== null;
  }

  /**
   * Spawn a separate FFmpeg process to record audio from the external device.
   * Used for DeckLink video + external audio (e.g. Scarlett) since the two
   * capture APIs have incompatible timestamp domains.
   * Each file starts at PTS 0 internally, so merge is simple.
   */


  /**
   * Probe the duration of a media file in seconds using ffprobe.
   */
  /**
   * Probe the duration of a media file using ffmpeg (no ffprobe binary needed).
   * Runs `ffmpeg -i <file> -f null -` and parses the final "time=" from stderr.
   */
  private probeDuration(filePath: string): Promise<number> {
    const ffmpeg = getFFmpegPath();
    return new Promise((resolve, reject) => {
      const args = ['-i', filePath, '-f', 'null', '-'];
      const proc = spawn(ffmpeg, args, { stdio: ['pipe', 'pipe', 'pipe'] });
      let stderr = '';
      proc.stderr?.on('data', (data: Buffer) => { stderr += data.toString(); });
      proc.on('close', (code) => {
        // Parse the last "time=HH:MM:SS.ss" from stderr
        const matches = [...stderr.matchAll(/time=(\d+):(\d+):([\d.]+)/g)];
        if (matches.length > 0) {
          const last = matches[matches.length - 1];
          const secs = parseInt(last[1]) * 3600 + parseInt(last[2]) * 60 + parseFloat(last[3]);
          resolve(secs);
        } else {
          reject(new Error(`Could not parse duration (code ${code})`));
        }
      });
      proc.on('error', reject);
    });
  }

  /**
   * Merge a video MP4 with an audio file (webm/wav) into a final MP4.
   * Probes both files to compute the trim offset from duration difference
   * (audio started before video, both stopped together → trim the excess).
   */
  private async mergeVideoAudio(videoPath: string, audioPath: string): Promise<string> {
    const ffmpeg = getFFmpegPath();
    const mergedPath = videoPath.replace(/\.mp4$/, '_merged.mp4');

    const [videoDuration, audioDuration] = await Promise.all([
      this.probeDuration(videoPath),
      this.probeDuration(audioPath),
    ]);

    const trimSec = Math.max(0, audioDuration - videoDuration);
    console.log(`[FFmpeg Merge] videoDuration=${videoDuration.toFixed(3)}s, audioDuration=${audioDuration.toFixed(3)}s, trimming ${trimSec.toFixed(3)}s from audio`);

    return new Promise((resolve, reject) => {
      const trimFilter = trimSec > 0.05
        ? ['-af', `atrim=start=${trimSec.toFixed(3)},asetpts=PTS-STARTPTS`]
        : [];

      const args = [
        '-i', videoPath,
        '-i', audioPath,
        '-c:v', 'copy',
        '-c:a', 'aac', '-b:a', '192k',
        ...trimFilter,
        '-map', '0:v:0',
        '-map', '1:a:0',
        '-movflags', '+faststart',
        '-shortest',
        mergedPath,
      ];

      console.log(`[FFmpeg Merge] ${ffmpeg} ${args.join(' ')}`);

      const proc = spawn(ffmpeg, args, { stdio: ['pipe', 'pipe', 'pipe'] });

      proc.stderr?.on('data', (data: Buffer) => {
        console.error(`[FFmpeg Merge stderr] ${data.toString()}`);
      });

      proc.on('close', (code) => {
        console.log(`[FFmpeg Merge] Exited with code ${code}`);
        if (code === 0 && fs.existsSync(mergedPath)) {
          try {
            fs.unlinkSync(videoPath);
            fs.renameSync(mergedPath, videoPath);
          } catch (err) {
            console.error('[FFmpeg Merge] Failed to replace original file:', err);
          }
          resolve(videoPath);
        } else {
          reject(new Error(`Merge failed with code ${code}`));
        }
      });

      proc.on('error', (err) => {
        reject(err);
      });
    });
  }

  private spawnProcess(window: BrowserWindow, withRecording: boolean) {
    const ffmpeg = getFFmpegPath();
    const previewScale = `scale=${PREVIEW_WIDTH}:${PREVIEW_HEIGHT}:force_original_aspect_ratio=decrease,pad=${PREVIEW_WIDTH}:${PREVIEW_HEIGHT}:(ow-iw)/2:(oh-ih)/2`;
    // For the main process, include audio only if it's embedded (DeckLink without external audio)
    const includeEmbeddedAudio = withRecording && this.hasAudio && !this.hasExternalAudio;
    // For avfoundation video + avfoundation audio (same device family), include audio inline
    const includeInlineAudio = withRecording && this.audioDevice !== null && this.device?.format === 'avfoundation';
    const videoInputArgs = this.getVideoInputArgs();

    let args: string[];

    if (!withRecording) {
      args = [
        ...videoInputArgs,
        '-vf', previewScale,
        '-r', String(PREVIEW_FPS),
        '-f', 'mjpeg',
        '-q:v', '3',
        '-an',
        'pipe:1',
      ];
    } else if (includeInlineAudio) {
      // avfoundation video + avfoundation audio in same process (same clock domain)
      const audioIndex = this.audioDevice!.id.split(':')[1];
      const deviceIndex = this.device!.id.split(':')[1];

      args = [
        '-f', 'avfoundation', '-framerate', '30', '-video_size', this.captureResolution ?? '1920x1080',
        '-i', `${deviceIndex}:${audioIndex}`,
        // Output 1: H.264 recording + audio
        '-map', '0:v', '-map', '0:a',
        '-fps_mode', 'cfr', '-r', '30',
        '-c:v', 'h264_videotoolbox',
        '-b:v', '30M',
        '-profile:v', 'high',
        '-level', '5.1',
        '-c:a', 'aac', '-b:a', '192k',
        '-movflags', '+faststart',
        this.recordingFilePath!,
        // Output 2: MJPEG preview to stdout (scaled down, no audio)
        '-map', '0:v',
        '-vf', previewScale,
        '-r', String(PREVIEW_FPS),
        '-f', 'mjpeg',
        '-q:v', '3',
        '-an',
        'pipe:1',
      ];
    } else {
      // DeckLink (video-only, audio handled by separate process if external audio)
      // or DeckLink with embedded audio only, or video-only (no external audio)
      const audioArgs = includeEmbeddedAudio
        ? ['-map', '0:a', '-c:a', 'aac', '-b:a', '192k']
        : [];

      args = [
        ...videoInputArgs,
        // Output 1: H.264 recording (+ embedded audio if no external audio device)
        '-map', '0:v',
        ...audioArgs,
        '-fps_mode', 'cfr', '-r', '30',
        '-c:v', 'h264_videotoolbox',
        '-b:v', '30M',
        '-profile:v', 'high',
        '-level', '5.1',
        '-movflags', '+faststart',
        this.recordingFilePath!,
        // Output 2: MJPEG preview to stdout (scaled down, no audio)
        '-map', '0:v',
        '-vf', previewScale,
        '-r', String(PREVIEW_FPS),
        '-f', 'mjpeg',
        '-q:v', '3',
        '-an',
        'pipe:1',
      ];
    }

    console.log(`[FFmpeg] Spawning (recording=${withRecording}, embeddedAudio=${includeEmbeddedAudio}, inlineAudio=${includeInlineAudio}, audioDevice=${this.audioDevice?.name ?? 'none'}, videoFormat=${this.device?.format}): ${ffmpeg} ${args.join(' ')}`);
    this.frameBuffer = Buffer.alloc(0);

    const proc = spawn(ffmpeg, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    this.process = proc;

    proc.stdout?.on('data', (chunk: Buffer) => {
      this.frameBuffer = Buffer.concat([this.frameBuffer, chunk]);
      this.extractFrames(window);
    });

    proc.stderr?.on('data', (data: Buffer) => {
      const msg = data.toString();
      // Log all stderr during recording to help debug issues
      if (withRecording || msg.includes('Error') || msg.includes('error') || msg.includes('fatal')) {
        console.error(`[FFmpeg stderr] ${msg}`);
      }
    });

    proc.on('close', (code) => {
      console.log(`[FFmpeg] Process exited with code ${code}`);
      if (this.process === proc) this.process = null;
    });

    proc.on('error', (err) => {
      console.error(`[FFmpeg] Process error: ${err.message}`);
      if (this.process === proc) this.process = null;
      if (!window.isDestroyed()) {
        window.webContents.send('bayside:error', `FFmpeg error: ${err.message}`);
      }
    });
  }

  private extractFrames(window: BrowserWindow) {
    if (window.isDestroyed()) return;

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

    if (this.frameBuffer.length > 10 * 1024 * 1024) {
      this.frameBuffer = this.frameBuffer.subarray(-1024 * 1024);
    }
  }

  private probeResolution(): Promise<string> {
    if (!this.device) return Promise.resolve('1920x1080');
    const ffmpeg = getFFmpegPath();
    const deviceIndex = this.device.id.split(':')[1];

    return new Promise((resolve) => {
      let resolved = false;
      let index = 0;

      const done = (res: string) => {
        if (resolved) return;
        resolved = true;
        resolve(res);
      };

      const tryNext = () => {
        if (resolved) return;
        if (index >= CAPTURE_RESOLUTIONS.length) {
          done('1920x1080');
          return;
        }

        const res = CAPTURE_RESOLUTIONS[index];
        console.log(`[FFmpeg] Probing resolution ${res}...`);

        const proc = spawn(ffmpeg, [
          '-f', 'avfoundation',
          '-framerate', '30',
          '-video_size', res,
          '-i', `${deviceIndex}:none`,
          '-frames:v', '1',
          '-f', 'null',
          '-',
        ], { stdio: ['pipe', 'pipe', 'pipe'] });

        let succeeded = false;

        const timeout = setTimeout(() => {
          if (!succeeded) {
            console.log(`[FFmpeg] Resolution ${res} probe timed out, trying next...`);
            proc.kill('SIGKILL');
            // Don't assume success on timeout — try next resolution
          }
        }, 3000);

        proc.stderr?.on('data', (data: Buffer) => {
          const msg = data.toString();
          if (msg.includes('Output #0') || msg.includes('frame=')) {
            succeeded = true;
            clearTimeout(timeout);
            proc.kill('SIGKILL');
            done(res);
          }
        });

        proc.on('close', (code) => {
          clearTimeout(timeout);
          if (!succeeded && !resolved) {
            console.log(`[FFmpeg] Resolution ${res} not supported (exit ${code}), trying next...`);
            index++;
            tryNext();
          }
        });

        proc.on('error', () => {
          clearTimeout(timeout);
          if (!succeeded && !resolved) {
            index++;
            tryNext();
          }
        });
      };

      tryNext();
    });
  }

  /** Graceful stop — sends 'q' so FFmpeg finalizes the file properly. */
  private gracefulStop(): Promise<void> {
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
        if (this.process === proc) this.process = null;
        resolve();
      });

      try {
        proc.stdin?.write('q');
        proc.stdin?.end();
      } catch {
        proc.kill('SIGTERM');
      }
    });
  }

  /** Hard kill — no finalization. */
  private killProcess(): Promise<void> {
    return new Promise((resolve) => {
      const proc = this.process;
      if (!proc || proc.killed) {
        this.process = null;
        this.frameBuffer = Buffer.alloc(0);
        resolve();
        return;
      }

      proc.on('close', () => {
        if (this.process === proc) this.process = null;
        this.frameBuffer = Buffer.alloc(0);
        resolve();
      });

      proc.kill('SIGKILL');
    });
  }

}

export const ffmpegController = new FFmpegController();

/**
 * Quick probe to check if an avfoundation video device can actually be opened.
 * Returns true if FFmpeg can grab at least one frame.
 */
export function probeVideoDevice(deviceIndex: string): Promise<boolean> {
  const ffmpeg = getFFmpegPath();
  return new Promise((resolve) => {
    const proc = spawn(ffmpeg, [
      '-f', 'avfoundation',
      '-framerate', '30',
      '-video_size', '1280x720',
      '-i', `${deviceIndex}:none`,
      '-frames:v', '1',
      '-f', 'null',
      '-',
    ], { stdio: ['pipe', 'pipe', 'pipe'] });

    let succeeded = false;

    const timeout = setTimeout(() => {
      proc.kill('SIGKILL');
      if (!succeeded) resolve(false);
    }, 5000);

    proc.stderr?.on('data', (data: Buffer) => {
      const msg = data.toString();
      if (msg.includes('Output #0') || msg.includes('frame=')) {
        succeeded = true;
        clearTimeout(timeout);
        proc.kill('SIGKILL');
        resolve(true);
      }
    });

    proc.on('close', () => {
      clearTimeout(timeout);
      if (!succeeded) resolve(false);
    });

    proc.on('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });
}

/**
 * Quick probe to check if a DeckLink device can be opened.
 * Returns true if FFmpeg can detect input from the device.
 */
export function probeDeckLinkDevice(deviceName: string): Promise<boolean> {
  const ffmpeg = getFFmpegPath();
  return new Promise((resolve) => {
    const proc = spawn(ffmpeg, [
      '-f', 'decklink',
      '-i', deviceName,
      '-frames:v', '1',
      '-f', 'null',
      '-',
    ], { stdio: ['pipe', 'pipe', 'pipe'] });

    let succeeded = false;

    const timeout = setTimeout(() => {
      proc.kill('SIGKILL');
      if (!succeeded) resolve(false);
    }, 8000);

    proc.stderr?.on('data', (data: Buffer) => {
      const msg = data.toString();
      if (msg.includes('Output #0') || msg.includes('frame=')) {
        succeeded = true;
        clearTimeout(timeout);
        proc.kill('SIGKILL');
        resolve(true);
      }
    });

    proc.on('close', () => {
      clearTimeout(timeout);
      if (!succeeded) resolve(false);
    });

    proc.on('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });
}
