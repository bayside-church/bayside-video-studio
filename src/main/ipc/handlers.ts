import { ipcMain, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { listAllDevices, listAllAudioDevices } from '../ffmpeg/devices';
import { ffmpegController, probeVideoDevice, probeDeckLinkDevice } from '../ffmpeg/controller';
import {
  getSelectedDevice, setSelectedDevice, getSelectedAudioDevice, setSelectedAudioDevice,
  getAdminPin, setAdminPin, getGuides, setGuides,
  getStorageDir, setStorageDir, getAutoDeleteOnUpload, setAutoDeleteOnUpload,
  getMailgunApiKey, setMailgunApiKey, getMailgunDomain, setMailgunDomain,
  getEmailFromName, setEmailFromName, getEmailFromAddress, setEmailFromAddress,
  getMaxRecordingSeconds, setMaxRecordingSeconds,
  getIdleTimeoutSeconds, setIdleTimeoutSeconds,
  getAzureBlobConnectionString, setAzureBlobConnectionString,
  getAzureBlobContainerName, setAzureBlobContainerName,
  getMissingRequiredSettings,
  type GuideSettings,
} from '../settings';
import { sendPlaybackEmail } from '../email/sender';
import { generateGif } from '../ffmpeg/gif';
import { deleteRecording } from '../cleanup';
import { getRecordingsDir, TEMP_FALLBACK_DIR } from '../config';
import { DEFAULT_STORAGE_DIR } from '../settings';
import { uploadToAzureBlob } from '../azure/upload';
import { listAzureBlobs, getAzureDownloadUrl, getAzurePreviewUrl } from '../azure/assets';
import type { VideoDevice, AudioDevice, PaginatedAzureAssets } from '../../shared/types';

export function registerIpcHandlers(getWindow: () => BrowserWindow | null) {
  ipcMain.handle('bayside:detect-device', async () => {
    const available = await listAllDevices();

    // Validate saved video device can actually be opened
    const saved = getSelectedDevice();
    let videoDevice: VideoDevice | null = null;

    if (saved && saved.format === 'avfoundation') {
      const deviceIndex = saved.id.split(':')[1];
      const works = await probeVideoDevice(deviceIndex);
      if (works) {
        videoDevice = saved;
      } else {
        console.warn(`[Settings] Saved video device "${saved.name}" failed probe, trying alternatives`);
      }
    } else if (saved) {
      // DeckLink — trust the list check
      if (available.some((d) => d.id === saved.id)) {
        videoDevice = saved;
      }
    }

    // If saved device didn't work, try each available device until one works
    if (!videoDevice) {
      for (const dev of available) {
        if (dev.format === 'avfoundation') {
          const idx = dev.id.split(':')[1];
          const works = await probeVideoDevice(idx);
          if (works) {
            videoDevice = dev;
            break;
          }
        } else {
          videoDevice = dev;
          break;
        }
      }
    }

    if (videoDevice) {
      setSelectedDevice(videoDevice);
      ffmpegController.setDevice(videoDevice);
    } else {
      return null;
    }

    // Audio: just trust the list since audio is only used at recording time
    // and the mic sidebar already probes via getUserMedia
    const savedAudio = getSelectedAudioDevice();
    if (savedAudio) {
      const availableAudio = await listAllAudioDevices();
      const audioExists = availableAudio.some((d) => d.id === savedAudio.id);
      if (audioExists) {
        ffmpegController.setAudioDevice(savedAudio);
      } else {
        console.warn(`[Settings] Saved audio device "${savedAudio.name}" no longer in list, clearing`);
        setSelectedAudioDevice(null);
        ffmpegController.setAudioDevice(null);
      }
    } else {
      ffmpegController.setAudioDevice(null);
    }

    return videoDevice.name;
  });

  ipcMain.handle('bayside:list-devices', async () => {
    return await listAllDevices();
  });

  ipcMain.handle('bayside:probe-video-device', async (_event, deviceId: string) => {
    const [format, idx] = deviceId.split(':');
    if (format === 'decklink') {
      // For DeckLink, look up the device name from the available list
      const devices = await listAllDevices();
      const device = devices.find((d) => d.id === deviceId);
      if (!device) return false;
      return probeDeckLinkDevice(device.name);
    }
    return probeVideoDevice(idx);
  });

  ipcMain.handle('bayside:get-selected-device', async () => {
    return getSelectedDevice();
  });

  ipcMain.handle('bayside:select-device', async (_event, device: VideoDevice) => {
    setSelectedDevice(device);
    ffmpegController.setDevice(device);
  });

  ipcMain.handle('bayside:list-audio-devices', async () => {
    return await listAllAudioDevices();
  });

  ipcMain.handle('bayside:get-selected-audio-device', async () => {
    return getSelectedAudioDevice();
  });

  ipcMain.handle('bayside:select-audio-device', async (_event, device: AudioDevice | null) => {
    setSelectedAudioDevice(device);
    ffmpegController.setAudioDevice(device);
  });

  ipcMain.handle('bayside:start-preview', async () => {
    const win = getWindow();
    if (!win) throw new Error('No window available');

    // Ensure device is loaded from settings
    if (!ffmpegController.getDevice()) {
      const saved = getSelectedDevice();
      if (saved) {
        ffmpegController.setDevice(saved);
      } else {
        throw new Error('No device selected');
      }
    }
    // Ensure audio device is loaded from settings
    if (!ffmpegController.getAudioDevice()) {
      const savedAudio = getSelectedAudioDevice();
      ffmpegController.setAudioDevice(savedAudio);
    }

    await ffmpegController.startPreview(win);
  });

  ipcMain.handle('bayside:stop-preview', async () => {
    await ffmpegController.stopPreview();
  });

  ipcMain.handle('bayside:uses-ffmpeg-audio', async () => {
    // FFmpeg avfoundation can't reliably capture USB audio interfaces (e.g. Scarlett
    // at 192kHz produces silent output). Renderer always handles audio via getUserMedia.
    return false;
  });

  ipcMain.handle('bayside:start-recording', async (_event, email?: string) => {
    const win = getWindow();
    if (!win) throw new Error('No window available');
    await ffmpegController.startRecording(win, email);
  });

  ipcMain.handle('bayside:stop-recording', async (_event, rendererAudioPath?: string) => {
    return await ffmpegController.stopRecording(rendererAudioPath);
  });

  // Dedup guard: prevent duplicate uploads for the same file
  let activeUploadPath: string | null = null;

  ipcMain.handle('bayside:upload-video', async (_event, filePath: string, email: string) => {
    const win = getWindow();
    if (!win) throw new Error('No window available');

    const resolved = path.resolve(filePath);
    const allowedDirs = [getRecordingsDir(), DEFAULT_STORAGE_DIR, TEMP_FALLBACK_DIR, getStorageDir()];
    if (!allowedDirs.some((dir) => resolved.startsWith(dir))) {
      throw new Error('Invalid file path');
    }

    // Skip if already uploading this file
    if (activeUploadPath === resolved) return;
    activeUploadPath = resolved;

    // Generate GIF preview from the local video before upload/deletion
    let gifPath: string | null = null;
    try {
      gifPath = await generateGif(filePath);
    } catch (err) {
      console.warn(`[GIF] Generation failed, email will be sent without preview: ${err}`);
    }

    // Fire-and-forget: upload to Azure, then send email with Azure URL
    (async () => {
      try {
        const azureUrl = await uploadToAzureBlob(filePath, email, win);
        await sendPlaybackEmail(email, azureUrl, gifPath);
        console.log(`[Email] Sent Azure download link to ${email}`);
      } catch (err) {
        console.error(`[Background] Azure upload or email failed: ${err}`);
      } finally {
        if (getAutoDeleteOnUpload()) {
          deleteRecording(filePath);
        }
        activeUploadPath = null;
        // Clean up the GIF file after sending
        if (gifPath) {
          try { fs.unlinkSync(gifPath); } catch { /* ignore */ }
        }
      }
    })();
  });

  // --- Azure Blob Storage ---

  ipcMain.handle('bayside:list-azure-blobs', async (_event, page?: number): Promise<PaginatedAzureAssets> => {
    return await listAzureBlobs(page ?? 1);
  });

  ipcMain.handle('bayside:get-azure-preview-url', async (_event, blobName: string): Promise<string> => {
    return getAzurePreviewUrl(blobName);
  });

  ipcMain.handle('bayside:resend-azure-download', async (_event, blobName: string, email: string) => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Invalid email address');
    }
    const url = getAzureDownloadUrl(blobName);
    await sendPlaybackEmail(email, url);
    console.log(`[Email] Re-sent Azure download link for ${blobName} to ${email}`);
  });

  ipcMain.handle('bayside:save-audio-recording', async (_event, buffer: ArrayBuffer) => {
    const dir = getRecordingsDir();
    const suffix = crypto.randomBytes(4).toString('hex');
    const filePath = path.join(dir, `renderer_audio_${suffix}.webm`);
    fs.writeFileSync(filePath, Buffer.from(buffer));
    console.log(`[RendererAudio] Saved audio recording to ${filePath} (${Buffer.from(buffer).length} bytes)`);
    return filePath;
  });

  ipcMain.handle('bayside:save-browser-recording', async (_event, buffer: ArrayBuffer, email?: string) => {
    const dir = getRecordingsDir();
    const date = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const suffix = crypto.randomBytes(4).toString('hex');
    const emailSlug = email ? `_${email.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)}` : '';
    const ext = '.mp4'; // MediaRecorder prefers MP4 in Chromium 132+, but also works for webm
    const filename = `recording_${date}${emailSlug}_${suffix}${ext}`;
    const filePath = path.join(dir, filename);

    fs.writeFileSync(filePath, Buffer.from(buffer));
    console.log(`[BrowserCapture] Saved recording to ${filePath}`);
    return filePath;
  });

  ipcMain.handle('bayside:reset-session', async () => {
    await ffmpegController.killAll();
  });

  // Admin settings
  ipcMain.handle('bayside:verify-admin-pin', async (_event, pin: string) => {
    return pin === getAdminPin();
  });

  ipcMain.handle('bayside:set-admin-pin', async (_event, pin: string) => {
    setAdminPin(pin);
  });

  ipcMain.handle('bayside:get-guides', async () => {
    return getGuides();
  });

  ipcMain.handle('bayside:set-guides', async (_event, guides: GuideSettings) => {
    setGuides(guides);
  });

  ipcMain.handle('bayside:get-storage-dir', async () => {
    return getStorageDir();
  });

  ipcMain.handle('bayside:set-storage-dir', async (_event, dir: string) => {
    setStorageDir(dir);
  });

  ipcMain.handle('bayside:browse-storage-dir', async () => {
    const { dialog } = await import('electron');
    const win = getWindow();
    const result = await dialog.showOpenDialog(win!, {
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: getStorageDir(),
      title: 'Choose Video Storage Folder',
    });
    if (!result.canceled && result.filePaths.length > 0) {
      const chosen = result.filePaths[0];
      setStorageDir(chosen);
      return chosen;
    }
    return null;
  });

  ipcMain.handle('bayside:get-auto-delete', async () => {
    return getAutoDeleteOnUpload();
  });

  ipcMain.handle('bayside:set-auto-delete', async (_event, enabled: boolean) => {
    setAutoDeleteOnUpload(enabled);
  });

  // --- Service credentials ---

  ipcMain.handle('bayside:get-admin-settings', async () => {
    return {
      mailgunApiKey: getMailgunApiKey(),
      mailgunDomain: getMailgunDomain(),
      emailFromName: getEmailFromName(),
      emailFromAddress: getEmailFromAddress(),
      maxRecordingSeconds: getMaxRecordingSeconds(),
      idleTimeoutSeconds: getIdleTimeoutSeconds(),
      azureBlobConnectionString: getAzureBlobConnectionString(),
      azureBlobContainerName: getAzureBlobContainerName(),
    };
  });

  ipcMain.handle('bayside:set-admin-settings', async (_event, settings: {
    mailgunApiKey?: string;
    mailgunDomain?: string;
    emailFromName?: string;
    emailFromAddress?: string;
    maxRecordingSeconds?: number;
    idleTimeoutSeconds?: number;
    azureBlobConnectionString?: string;
    azureBlobContainerName?: string;
  }) => {
    if (settings.mailgunApiKey !== undefined) setMailgunApiKey(settings.mailgunApiKey);
    if (settings.mailgunDomain !== undefined) setMailgunDomain(settings.mailgunDomain);
    if (settings.emailFromName !== undefined) setEmailFromName(settings.emailFromName);
    if (settings.emailFromAddress !== undefined) setEmailFromAddress(settings.emailFromAddress);
    if (settings.maxRecordingSeconds !== undefined) setMaxRecordingSeconds(settings.maxRecordingSeconds);
    if (settings.idleTimeoutSeconds !== undefined) setIdleTimeoutSeconds(settings.idleTimeoutSeconds);
    if (settings.azureBlobConnectionString !== undefined) setAzureBlobConnectionString(settings.azureBlobConnectionString);
    if (settings.azureBlobContainerName !== undefined) setAzureBlobContainerName(settings.azureBlobContainerName);
  });

  ipcMain.handle('bayside:get-max-recording-seconds', async () => {
    return getMaxRecordingSeconds();
  });

  ipcMain.handle('bayside:get-idle-timeout-seconds', async () => {
    return getIdleTimeoutSeconds();
  });

  ipcMain.handle('bayside:get-missing-settings', async () => {
    return getMissingRequiredSettings();
  });
}
