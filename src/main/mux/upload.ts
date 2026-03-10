import * as tus from 'tus-js-client';
import fs from 'fs';
import { BrowserWindow } from 'electron';
import { UPLOAD_CHUNK_SIZE } from '../../shared/constants';
import { getMux } from './client';

export async function createUploadAndSend(
  filePath: string,
  window: BrowserWindow,
): Promise<string> {
  // Create a direct upload on Mux
  const upload = await getMux().video.uploads.create({
    cors_origin: 'http://localhost',
    new_asset_settings: {
      playback_policy: ['public'],
      encoding_tier: 'baseline',
    },
  });

  const uploadUrl = upload.url;
  if (!uploadUrl) throw new Error('Mux did not return an upload URL');

  // Upload via tus
  await tusUpload(filePath, uploadUrl, window);

  return upload.id;
}

function tusUpload(
  filePath: string,
  uploadUrl: string,
  window: BrowserWindow,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(filePath);
    const fileSize = fs.statSync(filePath).size;

    const upload = new tus.Upload(fileStream as unknown as tus.Upload['file'], {
      endpoint: uploadUrl,
      uploadUrl: uploadUrl,
      chunkSize: UPLOAD_CHUNK_SIZE,
      retryDelays: [0, 1000, 3000, 5000, 10000],
      uploadSize: fileSize,
      metadata: {
        filename: filePath.split('/').pop() ?? 'recording.mp4',
        filetype: 'video/mp4',
      },
      onProgress: (bytesUploaded: number, bytesTotal: number) => {
        const percent = Math.round((bytesUploaded / bytesTotal) * 100);
        window.webContents.send('bayside:upload-progress', {
          percent,
          bytesUploaded,
          bytesTotal,
        });
      },
      onSuccess: () => {
        console.log('[Mux] Upload complete');
        resolve();
      },
      onError: (err: Error) => {
        console.error('[Mux] Upload error:', err.message);
        reject(err);
      },
    });

    upload.start();
  });
}
