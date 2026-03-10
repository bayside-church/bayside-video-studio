import { ipcMain, BrowserWindow } from 'electron';
import path from 'path';
import { detectDeckLinkDevice } from '../ffmpeg/devices';
import { ffmpegController } from '../ffmpeg/controller';
import { createUploadAndSend } from '../mux/upload';
import { waitForAssetReady } from '../mux/asset';
import { sendPlaybackEmail } from '../email/sender';
import { deleteRecording } from '../cleanup';
import { RECORDINGS_DIR } from '../config';

export function registerIpcHandlers(getWindow: () => BrowserWindow | null) {
  ipcMain.handle('bayside:detect-device', async () => {
    const device = await detectDeckLinkDevice();
    if (device) {
      ffmpegController.setDevice(device);
    }
    return device;
  });

  ipcMain.handle('bayside:start-preview', async () => {
    const win = getWindow();
    if (!win) throw new Error('No window available');
    await ffmpegController.startPreview(win);
  });

  ipcMain.handle('bayside:stop-preview', async () => {
    await ffmpegController.stopPreview();
  });

  ipcMain.handle('bayside:start-recording', async () => {
    const win = getWindow();
    if (!win) throw new Error('No window available');
    await ffmpegController.startRecording(win);
  });

  ipcMain.handle('bayside:stop-recording', async () => {
    return await ffmpegController.stopRecording();
  });

  ipcMain.handle('bayside:upload-video', async (_event, filePath: string) => {
    const win = getWindow();
    if (!win) throw new Error('No window available');

    // Validate file path is within recordings directory
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(RECORDINGS_DIR)) {
      throw new Error('Invalid file path');
    }

    // Upload to Mux
    const uploadId = await createUploadAndSend(filePath, win);

    // Wait for asset to be ready
    const playbackUrl = await waitForAssetReady(uploadId);

    // Clean up local file
    deleteRecording(filePath);

    return playbackUrl;
  });

  ipcMain.handle(
    'bayside:send-email',
    async (_event, email: string, playbackUrl: string) => {
      // Validate email format
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Invalid email address');
      }
      // Validate playback URL matches expected Mux domain
      if (!playbackUrl.startsWith('https://stream.mux.com/')) {
        throw new Error('Invalid playback URL');
      }
      await sendPlaybackEmail(email, playbackUrl);
    },
  );

  ipcMain.handle('bayside:reset-session', async () => {
    await ffmpegController.killAll();
  });
}
