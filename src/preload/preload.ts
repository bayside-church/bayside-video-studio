import { contextBridge, ipcRenderer } from 'electron';
import type { BaysideAPI, PreviewFrame, UploadProgress, VideoDevice, AudioDevice, GuideSettings, AdminSettings, PaginatedAzureAssets } from '../shared/types';

const api: BaysideAPI = {
  detectDevice: () => ipcRenderer.invoke('bayside:detect-device'),
  startPreview: () => ipcRenderer.invoke('bayside:start-preview'),
  stopPreview: () => ipcRenderer.invoke('bayside:stop-preview'),
  usesFFmpegAudio: () => ipcRenderer.invoke('bayside:uses-ffmpeg-audio'),
  startRecording: (email?: string) => ipcRenderer.invoke('bayside:start-recording', email) as Promise<{ filePath: string }>,
  stopRecording: (rendererAudioPath?: string) =>
    ipcRenderer.invoke('bayside:stop-recording', rendererAudioPath),
  uploadVideo: (filePath: string, email: string) =>
    ipcRenderer.invoke('bayside:upload-video', filePath, email),
  listAzureBlobs: (page?: number) => ipcRenderer.invoke('bayside:list-azure-blobs', page),
  resendAzureDownload: (blobName: string, email: string) =>
    ipcRenderer.invoke('bayside:resend-azure-download', blobName, email),
  saveBrowserRecording: (buffer: ArrayBuffer, email?: string) =>
    ipcRenderer.invoke('bayside:save-browser-recording', buffer, email),
  saveAudioRecording: (buffer: ArrayBuffer) =>
    ipcRenderer.invoke('bayside:save-audio-recording', buffer),
  resetSession: () => ipcRenderer.invoke('bayside:reset-session'),

  // Admin
  verifyAdminPin: (pin: string) => ipcRenderer.invoke('bayside:verify-admin-pin', pin),
  setAdminPin: (pin: string) => ipcRenderer.invoke('bayside:set-admin-pin', pin),
  getGuides: () => ipcRenderer.invoke('bayside:get-guides'),
  setGuides: (guides: GuideSettings) => ipcRenderer.invoke('bayside:set-guides', guides),
  getStorageDir: () => ipcRenderer.invoke('bayside:get-storage-dir'),
  setStorageDir: (dir: string) => ipcRenderer.invoke('bayside:set-storage-dir', dir),
  browseStorageDir: () => ipcRenderer.invoke('bayside:browse-storage-dir'),
  getAutoDelete: () => ipcRenderer.invoke('bayside:get-auto-delete'),
  setAutoDelete: (enabled: boolean) => ipcRenderer.invoke('bayside:set-auto-delete', enabled),
  getAdminSettings: () => ipcRenderer.invoke('bayside:get-admin-settings'),
  setAdminSettings: (settings: Partial<AdminSettings>) => ipcRenderer.invoke('bayside:set-admin-settings', settings),
  getMaxRecordingSeconds: () => ipcRenderer.invoke('bayside:get-max-recording-seconds'),
  getIdleTimeoutSeconds: () => ipcRenderer.invoke('bayside:get-idle-timeout-seconds'),
  getMissingSettings: () => ipcRenderer.invoke('bayside:get-missing-settings'),

  // Device management
  listDevices: () => ipcRenderer.invoke('bayside:list-devices'),
  getSelectedDevice: () => ipcRenderer.invoke('bayside:get-selected-device'),
  selectDevice: (device: VideoDevice) => ipcRenderer.invoke('bayside:select-device', device),
  probeVideoDevice: (deviceId: string) => ipcRenderer.invoke('bayside:probe-video-device', deviceId),
  hasDeckLinkSupport: () => ipcRenderer.invoke('bayside:has-decklink-support'),
  buildDeckLinkFfmpeg: () => ipcRenderer.invoke('bayside:build-decklink-ffmpeg'),
  onDeckLinkBuildProgress: (callback: (message: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, message: string) => callback(message);
    ipcRenderer.on('bayside:decklink-build-progress', handler);
    return () => ipcRenderer.removeListener('bayside:decklink-build-progress', handler);
  },
  listAudioDevices: () => ipcRenderer.invoke('bayside:list-audio-devices'),
  getSelectedAudioDevice: () => ipcRenderer.invoke('bayside:get-selected-audio-device'),
  selectAudioDevice: (device: AudioDevice | null) => ipcRenderer.invoke('bayside:select-audio-device', device),
  getAudioDelayMs: () => ipcRenderer.invoke('bayside:get-audio-delay-ms'),
  setAudioDelayMs: (value: number) => ipcRenderer.invoke('bayside:set-audio-delay-ms', value),
  getAudioChannels: () => ipcRenderer.invoke('bayside:get-audio-channels'),
  setAudioChannels: (value: string) => ipcRenderer.invoke('bayside:set-audio-channels', value),
  startAudioMeter: (audioDeviceIndex: string, channels: string) => ipcRenderer.invoke('bayside:start-audio-meter', audioDeviceIndex, channels),
  stopAudioMeter: () => ipcRenderer.invoke('bayside:stop-audio-meter'),
  onAudioMeterLevel: (callback: (data: { left: number; right: number }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { left: number; right: number }) => callback(data);
    ipcRenderer.on('bayside:audio-meter-level', handler);
    return () => ipcRenderer.removeListener('bayside:audio-meter-level', handler);
  },

  onPreviewFrame: (callback: (frame: PreviewFrame) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, frame: PreviewFrame) => callback(frame);
    ipcRenderer.on('bayside:preview-frame', handler);
    return () => ipcRenderer.removeListener('bayside:preview-frame', handler);
  },

  onUploadProgress: (callback: (progress: UploadProgress) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: UploadProgress) =>
      callback(progress);
    ipcRenderer.on('bayside:upload-progress', handler);
    return () => ipcRenderer.removeListener('bayside:upload-progress', handler);
  },

  onError: (callback: (error: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, error: string) => callback(error);
    ipcRenderer.on('bayside:error', handler);
    return () => ipcRenderer.removeListener('bayside:error', handler);
  },

  onUploadComplete: (callback: (data: { uploadId: string; success: boolean; error?: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { uploadId: string; success: boolean; error?: string }) => callback(data);
    ipcRenderer.on('bayside:upload-complete', handler);
    return () => ipcRenderer.removeListener('bayside:upload-complete', handler);
  },
};

contextBridge.exposeInMainWorld('baysideAPI', api);
