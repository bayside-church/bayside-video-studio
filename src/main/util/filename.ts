/**
 * Generate a consistent, user-friendly download filename.
 * Format: Bayside-Recording-YYYY-MM-DD.mp4
 */
export function friendlyDownloadFilename(date?: Date, ext = '.mp4'): string {
  const d = date ?? new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `Bayside-Recording-${year}-${month}-${day}${ext}`;
}

/**
 * Extract a friendly download filename from an Azure blob name.
 * Blob names follow the pattern: YYYYMMDD_email_suffix.ext
 */
export function friendlyFilenameFromBlob(blobName: string): string {
  const ext = blobName.match(/\.\w+$/)?.[0] ?? '.mp4';
  const parts = blobName.match(/^(\d{4})(\d{2})(\d{2})_/);
  if (parts) {
    return `Bayside-Recording-${parts[1]}-${parts[2]}-${parts[3]}${ext}`;
  }
  return `Bayside-Recording${ext}`;
}
