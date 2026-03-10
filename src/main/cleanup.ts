import fs from 'fs';

/**
 * Delete local recording file after successful upload.
 */
export function deleteRecording(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[Cleanup] Deleted: ${filePath}`);
    }
  } catch (err) {
    console.warn(`[Cleanup] Failed to delete ${filePath}:`, err);
  }
}
