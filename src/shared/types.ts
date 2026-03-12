export type Screen =
  | 'home'
  | 'countdown'
  | 'recording'
  | 'processing'
  | 'complete'
  | 'error'
  | 'unavailable';

export interface MuxAssetSummary {
  id: string;
  playbackId: string | null;
  status: string;
  duration: number | null;
  resolution: string | null;
  createdAt: string;
  isTest: boolean;
  masterReady: boolean;
  email: string | null;
}

export interface SessionState {
  screen: Screen;
  email: string;
  filePath: string | null;
  uploadProgress: number;
  playbackUrl: string | null;
  errorMessage: string | null;
}

export interface PreviewFrame {
  data: string; // base64 JPEG data URL
  timestamp: number;
}

export interface UploadProgress {
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

export interface PaginatedAssetsResult {
  assets: MuxAssetSummary[];
  hasMore: boolean;
  nextPage: number;
}

export interface AzureBlobSummary {
  name: string;
  email: string;
  uploadedAt: string;
  url: string;
  size: number;
}

export interface PaginatedAzureAssets {
  assets: AzureBlobSummary[];
  hasMore: boolean;
  nextPage: number;
}

export interface BaysideAPI {
  // FFmpeg
  detectDevice: () => Promise<string | null>;
  startPreview: () => Promise<void>;
  stopPreview: () => Promise<void>;
  usesFFmpegAudio: () => Promise<boolean>;
  startRecording: (email?: string) => Promise<void>;
  stopRecording: (rendererAudioPath?: string) => Promise<RecordingResult>;

  // Device management
  listDevices: () => Promise<VideoDevice[]>;
  getSelectedDevice: () => Promise<VideoDevice | null>;
  selectDevice: (device: VideoDevice) => Promise<void>;
  probeVideoDevice: (deviceId: string) => Promise<boolean>;
  listAudioDevices: () => Promise<AudioDevice[]>;
  getSelectedAudioDevice: () => Promise<AudioDevice | null>;
  selectAudioDevice: (device: AudioDevice | null) => Promise<void>;

  // Mux
  uploadVideo: (filePath: string, email: string) => Promise<void>;
  listAssets: (page?: number) => Promise<PaginatedAssetsResult>;
  resendDownload: (assetId: string, email: string) => Promise<void>;

  // Azure
  listAzureBlobs: (page?: number) => Promise<PaginatedAzureAssets>;
  resendAzureDownload: (blobName: string, email: string) => Promise<void>;

  // Events
  onPreviewFrame: (callback: (frame: PreviewFrame) => void) => () => void;
  onUploadProgress: (callback: (progress: UploadProgress) => void) => () => void;
  onError: (callback: (error: string) => void) => () => void;

  // Browser capture
  saveBrowserRecording: (buffer: ArrayBuffer, email?: string) => Promise<string>;
  saveAudioRecording: (buffer: ArrayBuffer) => Promise<string>;

  // Session
  resetSession: () => Promise<void>;

  // Admin
  getTestMode: () => Promise<boolean>;
  setTestMode: (enabled: boolean) => Promise<void>;
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
  muxTokenId: string;
  muxTokenSecret: string;
  mailgunApiKey: string;
  mailgunDomain: string;
  emailFromName: string;
  emailFromAddress: string;
  maxRecordingSeconds: number;
  idleTimeoutSeconds: number;
  azureBlobConnectionString: string;
  azureBlobContainerName: string;
}
