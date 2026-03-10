import { describe, it, expect } from 'vitest';
import {
  MAX_RECORDING_SECONDS,
  IDLE_TIMEOUT_MS,
  AUTO_RESET_MS,
  COUNTDOWN_SECONDS,
  UPLOAD_CHUNK_SIZE,
  UPLOAD_MAX_RETRIES,
  PREVIEW_FPS,
  PREVIEW_WIDTH,
  PREVIEW_HEIGHT,
} from '../../src/shared/constants';

describe('constants', () => {
  it('has reasonable recording limit', () => {
    expect(MAX_RECORDING_SECONDS).toBeGreaterThanOrEqual(30);
    expect(MAX_RECORDING_SECONDS).toBeLessThanOrEqual(600);
  });

  it('has idle timeout of at least 30 seconds', () => {
    expect(IDLE_TIMEOUT_MS).toBeGreaterThanOrEqual(30_000);
  });

  it('has auto reset delay', () => {
    expect(AUTO_RESET_MS).toBeGreaterThanOrEqual(5_000);
  });

  it('has 3-second countdown', () => {
    expect(COUNTDOWN_SECONDS).toBe(3);
  });

  it('has chunked upload size of 50MB', () => {
    expect(UPLOAD_CHUNK_SIZE).toBe(50 * 1024 * 1024);
  });

  it('has at least 2 upload retries', () => {
    expect(UPLOAD_MAX_RETRIES).toBeGreaterThanOrEqual(2);
  });

  it('has valid preview dimensions', () => {
    expect(PREVIEW_FPS).toBeGreaterThan(0);
    expect(PREVIEW_WIDTH).toBeGreaterThan(0);
    expect(PREVIEW_HEIGHT).toBeGreaterThan(0);
  });
});
