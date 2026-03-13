import '@testing-library/jest-dom/vitest';
import type { BaysideAPI } from '../src/shared/types';

// Mock the baysideAPI on window for renderer tests
const mockAPI: BaysideAPI = {
  detectDevice: vi.fn().mockResolvedValue('mock-device'),
  startPreview: vi.fn().mockResolvedValue(undefined),
  stopPreview: vi.fn().mockResolvedValue(undefined),
  startRecording: vi.fn().mockResolvedValue(undefined),
  stopRecording: vi.fn().mockResolvedValue({ filePath: '/tmp/test.mp4', durationSeconds: 10 }),
  uploadVideo: vi.fn().mockResolvedValue(undefined),
  sendEmail: vi.fn().mockResolvedValue(undefined),
  resetSession: vi.fn().mockResolvedValue(undefined),
  onPreviewFrame: vi.fn().mockReturnValue(() => {}),
  onUploadProgress: vi.fn().mockReturnValue(() => {}),
  onUploadComplete: vi.fn().mockReturnValue(() => {}),
  onError: vi.fn().mockReturnValue(() => {}),
};

Object.defineProperty(window, 'baysideAPI', {
  value: mockAPI,
  writable: true,
});
