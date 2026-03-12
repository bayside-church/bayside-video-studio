import crypto from 'crypto';

/**
 * Generate a consistent download filename.
 * Format: YYYYMMDD_email_hexsuffix.ext  (e.g. 20260312_zack@zackdutra.com_f1f863.mp4)
 */
export function buildDownloadFilename(email: string, date?: Date, ext = '.mp4'): string {
  const d = date ?? new Date();
  const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const safeEmail = email.replace(/[^a-zA-Z0-9@._-]/g, '_').slice(0, 50);
  const suffix = crypto.randomBytes(3).toString('hex');
  return `${dateStr}_${safeEmail}_${suffix}${ext}`;
}
