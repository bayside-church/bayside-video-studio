export type Screen =
  | 'home'
  | 'countdown'
  | 'recording'
  | 'complete'
  | 'error'
  | 'unavailable';

export interface SessionState {
  screen: Screen;
  email: string;
  filePath: string | null;
  playbackUrl: string | null;
  errorMessage: string | null;
}

export interface PreviewFrame {
  data: string; // base64 JPEG data URL
  timestamp: number;
}

export interface UploadProgress {
  uploadId: string;
  percent: number;
  bytesUploaded: number;
  bytesTotal: number;
}

export interface RecordingResult {
  filePath: string;
  durationSeconds: number;
}

export interface VideoDevice {
  id: string;
  name: string;
  format: 'decklink' | 'avfoundation' | 'browser';
}

export interface AudioDevice {
  id: string;
  name: string;
  format: 'avfoundation';
}

export interface GuideSettings {
  ruleOfThirds: boolean;
  centerCrosshair: boolean;
  safeZones: boolean;
}

export interface AzureBlobSummary {
  name: string;
  email: string;
  uploadedAt: string;
  url: string;
  size: number;
  gifUrl?: string;
}

export interface PaginatedAzureAssets {
  assets: AzureBlobSummary[];
  hasMore: boolean;
  nextPage: number;
}

export interface PendingVideo {
  id: string;         // unique identifier (filePath)
  email: string;
  startedAt: string;  // ISO date string
  progress: number;   // 0-100
  status: 'uploading' | 'complete' | 'failed';
}

export interface BaysideAPI {
  // FFmpeg
  detectDevice: () => Promise<string | null>;
  startPreview: () => Promise<void>;
  stopPreview: () => Promise<void>;
  usesFFmpegAudio: () => Promise<boolean>;
  startRecording: (email?: string) => Promise<{ filePath: string }>;
  stopRecording: (rendererAudioPath?: string) => Promise<RecordingResult>;

  // Device management
  listDevices: () => Promise<VideoDevice[]>;
  getSelectedDevice: () => Promise<VideoDevice | null>;
  selectDevice: (device: VideoDevice) => Promise<void>;
  probeVideoDevice: (deviceId: string) => Promise<boolean>;
  hasDeckLinkSupport: () => Promise<boolean>;
  buildDeckLinkFfmpeg: () => Promise<{ success: boolean; error?: string }>;
  onDeckLinkBuildProgress: (callback: (message: string) => void) => () => void;
  listAudioDevices: () => Promise<AudioDevice[]>;
  getSelectedAudioDevice: () => Promise<AudioDevice | null>;
  selectAudioDevice: (device: AudioDevice | null) => Promise<void>;
  getAudioDelayMs: () => Promise<number>;
  setAudioDelayMs: (value: number) => Promise<void>;
  getAudioChannels: () => Promise<string>;
  setAudioChannels: (value: string) => Promise<void>;
  startAudioMeter: (audioDeviceIndex: string, channels: string) => Promise<void>;
  stopAudioMeter: () => Promise<void>;
  onAudioMeterLevel: (callback: (data: { left: number; right: number }) => void) => () => void;

  // Upload & videos
  uploadVideo: (filePath: string, email: string) => Promise<void>;
  listAzureBlobs: (page?: number) => Promise<PaginatedAzureAssets>;
  resendAzureDownload: (blobName: string, email: string) => Promise<void>;

  // Events
  onPreviewFrame: (callback: (frame: PreviewFrame) => void) => () => void;
  onUploadProgress: (callback: (progress: UploadProgress) => void) => () => void;
  onError: (callback: (error: string) => void) => () => void;
  onUploadComplete: (callback: (data: { uploadId: string; success: boolean; error?: string }) => void) => () => void;

  // Browser capture
  saveBrowserRecording: (buffer: ArrayBuffer, email?: string) => Promise<string>;
  saveAudioRecording: (buffer: ArrayBuffer) => Promise<string>;

  // Session
  resetSession: () => Promise<void>;

  // Admin
  verifyAdminPin: (pin: string) => Promise<boolean>;
  setAdminPin: (pin: string) => Promise<void>;
  getGuides: () => Promise<GuideSettings>;
  setGuides: (guides: GuideSettings) => Promise<void>;
  getStorageDir: () => Promise<string>;
  setStorageDir: (dir: string) => Promise<void>;
  browseStorageDir: () => Promise<string | null>;
  getAutoDelete: () => Promise<boolean>;
  setAutoDelete: (enabled: boolean) => Promise<void>;
  getAdminSettings: () => Promise<AdminSettings>;
  setAdminSettings: (settings: Partial<AdminSettings>) => Promise<void>;
  getMaxRecordingSeconds: () => Promise<number>;
  getIdleTimeoutSeconds: () => Promise<number>;
  getMissingSettings: () => Promise<string[]>;
}

export interface AdminSettings {
  mailgunApiKey: string;
  mailgunDomain: string;
  emailFromName: string;
  emailFromAddress: string;
  maxRecordingSeconds: number;
  idleTimeoutSeconds: number;
  azureBlobConnectionString: string;
  azureBlobContainerName: string;
}
