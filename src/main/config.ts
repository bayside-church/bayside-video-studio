import { config } from 'dotenv';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';

// Load .env from app resources in production, or project root in dev
const envPath = app.isPackaged
  ? path.join(process.resourcesPath, '.env')
  : path.join(app.getAppPath(), '.env');

if (fs.existsSync(envPath)) {
  config({ path: envPath });
}

export const isDev = process.env.DEV_MODE === 'true' || !app.isPackaged;

export const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID ?? '';
export const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET ?? '';
export const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY ?? '';
export const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN ?? '';
export const EMAIL_FROM = process.env.EMAIL_FROM ?? 'Bayside Video Studio <studio@example.com>';
export const MAX_RECORDING_SECONDS = parseInt(process.env.MAX_RECORDING_SECONDS ?? '120', 10);
export const IDLE_TIMEOUT_SECONDS = parseInt(process.env.IDLE_TIMEOUT_SECONDS ?? '120', 10);

export const RECORDINGS_DIR = path.join(app.getPath('temp'), 'bayside-recordings');

// Ensure recordings directory exists
if (!fs.existsSync(RECORDINGS_DIR)) {
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
}
