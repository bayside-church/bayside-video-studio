import { contextBridge, ipcRenderer } from 'electron';
import type { BaysideAPI, PreviewFrame, UploadProgress } from '../shared/types';

const api: BaysideAPI = {
  detectDevice: () => ipcRenderer.invoke('bayside:detect-device'),
  startPreview: () => ipcRenderer.invoke('bayside:start-preview'),
  stopPreview: () => ipcRenderer.invoke('bayside:stop-preview'),
  startRecording: () => ipcRenderer.invoke('bayside:start-recording'),
  stopRecording: () => ipcRenderer.invoke('bayside:stop-recording'),
  uploadVideo: (filePath: string) => ipcRenderer.invoke('bayside:upload-video', filePath),
  sendEmail: (email: string, playbackUrl: string) =>
    ipcRenderer.invoke('bayside:send-email', email, playbackUrl),
  resetSession: () => ipcRenderer.invoke('bayside:reset-session'),

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
};

contextBridge.exposeInMainWorld('baysideAPI', api);
