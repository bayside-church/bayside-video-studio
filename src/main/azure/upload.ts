import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { BrowserWindow } from 'electron';
import { getContainerClient, generateDownloadSasUrl } from './client';
import { friendlyDownloadFilename } from '../util/filename';

export async function uploadToAzureBlob(
  filePath: string,
  email: string,
  window: BrowserWindow,
): Promise<string> {
  const containerClient = getContainerClient();

  // Build blob name: YYYYMMDD_email_randomsuffix.mp4
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const safeEmail = email.replace(/[^a-zA-Z0-9@._-]/g, '_').slice(0, 50);
  const suffix = crypto.randomBytes(4).toString('hex');
  const ext = path.extname(filePath) || '.mp4';
  const blobName = `${dateStr}_${safeEmail}_${suffix}${ext}`;

  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  const fileSize = fs.statSync(filePath).size;

  const downloadFilename = friendlyDownloadFilename(now, ext);

  await blockBlobClient.uploadFile(filePath, {
    blobHTTPHeaders: {
      blobContentType: 'video/mp4',
      blobContentDisposition: `attachment; filename="${downloadFilename}"`,
    },
    metadata: {
      email,
      uploadedat: now.toISOString(),
    },
    onProgress: (progress) => {
      const percent = fileSize > 0 ? Math.round((progress.loadedBytes / fileSize) * 100) : 0;
      window.webContents.send('bayside:upload-progress', {
        percent,
        bytesUploaded: progress.loadedBytes,
        bytesTotal: fileSize,
      });
    },
  });

  console.log(`[Azure] Uploaded blob: ${blobName} (${fileSize} bytes)`);
  return generateDownloadSasUrl(blobName, downloadFilename);
}
