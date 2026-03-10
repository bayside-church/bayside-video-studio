import { create } from 'zustand';
import type { Screen } from '../../shared/types';

interface SessionStore {
  screen: Screen;
  email: string;
  filePath: string | null;
  uploadProgress: number;
  playbackUrl: string | null;
  errorMessage: string | null;

  setScreen: (screen: Screen) => void;
  setEmail: (email: string) => void;
  setFilePath: (path: string) => void;
  setUploadProgress: (progress: number) => void;
  setPlaybackUrl: (url: string) => void;
  setError: (message: string) => void;
  reset: () => void;
}

const initialState = {
  screen: 'welcome' as Screen,
  email: '',
  filePath: null as string | null,
  uploadProgress: 0,
  playbackUrl: null as string | null,
  errorMessage: null as string | null,
};

export const useSessionStore = create<SessionStore>((set) => ({
  ...initialState,
  setScreen: (screen) => set({ screen }),
  setEmail: (email) => set({ email }),
  setFilePath: (filePath) => set({ filePath }),
  setUploadProgress: (uploadProgress) => set({ uploadProgress }),
  setPlaybackUrl: (playbackUrl) => set({ playbackUrl }),
  setError: (errorMessage) => set({ errorMessage, screen: 'error' }),
  reset: () => set({ ...initialState }),
}));
