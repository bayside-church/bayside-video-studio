import { describe, it, expect, beforeEach } from 'vitest';
import { useSessionStore } from '../../src/renderer/store/useSessionStore';

describe('useSessionStore', () => {
  beforeEach(() => {
    useSessionStore.getState().reset();
  });

  it('starts on welcome screen', () => {
    expect(useSessionStore.getState().screen).toBe('welcome');
  });

  it('sets screen', () => {
    useSessionStore.getState().setScreen('email');
    expect(useSessionStore.getState().screen).toBe('email');
  });

  it('sets email', () => {
    useSessionStore.getState().setEmail('test@example.com');
    expect(useSessionStore.getState().email).toBe('test@example.com');
  });

  it('sets file path', () => {
    useSessionStore.getState().setFilePath('/tmp/recording.mp4');
    expect(useSessionStore.getState().filePath).toBe('/tmp/recording.mp4');
  });

  it('sets upload progress', () => {
    useSessionStore.getState().setUploadProgress(75);
    expect(useSessionStore.getState().uploadProgress).toBe(75);
  });

  it('sets playback URL', () => {
    useSessionStore.getState().setPlaybackUrl('https://stream.mux.com/abc.m3u8');
    expect(useSessionStore.getState().playbackUrl).toBe('https://stream.mux.com/abc.m3u8');
  });

  it('sets error and transitions to error screen', () => {
    useSessionStore.getState().setError('Something broke');
    expect(useSessionStore.getState().errorMessage).toBe('Something broke');
    expect(useSessionStore.getState().screen).toBe('error');
  });

  it('resets to initial state', () => {
    const store = useSessionStore.getState();
    store.setScreen('recording');
    store.setEmail('test@example.com');
    store.setFilePath('/tmp/test.mp4');
    store.setUploadProgress(50);
    store.setPlaybackUrl('https://example.com');

    store.reset();

    const state = useSessionStore.getState();
    expect(state.screen).toBe('welcome');
    expect(state.email).toBe('');
    expect(state.filePath).toBeNull();
    expect(state.uploadProgress).toBe(0);
    expect(state.playbackUrl).toBeNull();
    expect(state.errorMessage).toBeNull();
  });

  it('follows correct screen flow', () => {
    const store = useSessionStore.getState();

    store.setScreen('email');
    expect(useSessionStore.getState().screen).toBe('email');

    store.setScreen('preRecord');
    expect(useSessionStore.getState().screen).toBe('preRecord');

    store.setScreen('countdown');
    expect(useSessionStore.getState().screen).toBe('countdown');

    store.setScreen('recording');
    expect(useSessionStore.getState().screen).toBe('recording');

    store.setScreen('processing');
    expect(useSessionStore.getState().screen).toBe('processing');

    store.setScreen('complete');
    expect(useSessionStore.getState().screen).toBe('complete');
  });
});
