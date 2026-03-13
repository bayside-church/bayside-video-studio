import { create } from 'zustand';
import type { Screen, GuideSettings, PendingVideo } from '../../shared/types';

interface SessionStore {
  screen: Screen;
  email: string;
  filePath: string | null;
  playbackUrl: string | null;
  errorMessage: string | null;
  guides: GuideSettings;
  isBrowserCapture: boolean;
  pendingVideos: PendingVideo[];

  setScreen: (screen: Screen) => void;
  setEmail: (email: string) => void;
  setFilePath: (path: string) => void;
  setPlaybackUrl: (url: string) => void;
  setError: (message: string) => void;
  setGuides: (guides: GuideSettings) => void;
  setIsBrowserCapture: (v: boolean) => void;
  addPendingVideo: (video: PendingVideo) => void;
  updatePendingVideoProgress: (id: string, progress: number) => void;
  completePendingVideo: (id: string, status: 'complete' | 'failed') => void;
  retryPendingVideo: (id: string) => void;
  removePendingVideo: (id: string) => void;
  reset: () => void;
}

const initialState = {
  screen: 'home' as Screen,
  email: '',
  filePath: null as string | null,
  playbackUrl: null as string | null,
  errorMessage: null as string | null,
  guides: { ruleOfThirds: true, centerCrosshair: true, safeZones: false } as GuideSettings,
  isBrowserCapture: false,
  pendingVideos: [] as PendingVideo[],
};

export const useSessionStore = create<SessionStore>((set) => ({
  ...initialState,
  setScreen: (screen) => set({ screen }),
  setEmail: (email) => set({ email }),
  setFilePath: (filePath) => set({ filePath }),
  setPlaybackUrl: (playbackUrl) => set({ playbackUrl }),
  setError: (errorMessage) => set({ errorMessage, screen: 'error' }),
  setGuides: (guides) => set({ guides }),
  setIsBrowserCapture: (isBrowserCapture) => set({ isBrowserCapture }),
  addPendingVideo: (video) => set((state) => ({
    pendingVideos: [video, ...state.pendingVideos],
  })),
  updatePendingVideoProgress: (id, progress) => set((state) => ({
    pendingVideos: state.pendingVideos.map((v) =>
      v.id === id ? { ...v, progress } : v
    ),
  })),
  completePendingVideo: (id, status) => set((state) => ({
    pendingVideos: state.pendingVideos.map((v) =>
      v.id === id ? { ...v, status, progress: status === 'complete' ? 100 : v.progress } : v
    ),
  })),
  retryPendingVideo: (id) => set((state) => ({
    pendingVideos: state.pendingVideos.map((v) =>
      v.id === id ? { ...v, status: 'uploading' as const, progress: 0 } : v
    ),
  })),
  removePendingVideo: (id) => set((state) => ({
    pendingVideos: state.pendingVideos.filter((v) => v.id !== id),
  })),
  reset: () => set((state) => ({ ...initialState, pendingVideos: state.pendingVideos })),
}));
