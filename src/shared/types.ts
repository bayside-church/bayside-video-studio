export type Screen =
  | 'welcome'
  | 'email'
  | 'preRecord'
  | 'countdown'
  | 'recording'
  | 'processing'
  | 'complete'
  | 'error'
  | 'unavailable';

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

export interface BaysideAPI {
  // FFmpeg
  detectDevice: () => Promise<string | null>;
  startPreview: () => Promise<void>;
  stopPreview: () => Promise<void>;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<RecordingResult>;

  // Mux
  uploadVideo: (filePath: string) => Promise<string>; // returns playback URL

  // Email
  sendEmail: (email: string, playbackUrl: string) => Promise<void>;

  // Events
  onPreviewFrame: (callback: (frame: PreviewFrame) => void) => () => void;
  onUploadProgress: (callback: (progress: UploadProgress) => void) => () => void;
  onError: (callback: (error: string) => void) => () => void;

  // Session
  resetSession: () => Promise<void>;
}
