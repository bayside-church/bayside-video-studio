import { app } from 'electron';
import path from 'path';
import fs from 'fs';

export const isDev = !app.isPackaged;

import { getStorageDir, DEFAULT_STORAGE_DIR } from './settings';

export const TEMP_FALLBACK_DIR = path.join(app.getPath('temp'), 'bayside-recordings');

function ensureDir(dir: string): boolean {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return true;
  } catch {
    return false;
  }
}

export function getRecordingsDir(): string {
  const userDir = getStorageDir();
  if (ensureDir(userDir)) return userDir;

  console.warn(`[Config] Storage dir unavailable (${userDir}), trying default`);
  if (userDir !== DEFAULT_STORAGE_DIR && ensureDir(DEFAULT_STORAGE_DIR)) return DEFAULT_STORAGE_DIR;

  console.warn(`[Config] Default storage dir unavailable, falling back to temp`);
  ensureDir(TEMP_FALLBACK_DIR);
  return TEMP_FALLBACK_DIR;
}
