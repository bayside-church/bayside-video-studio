import fs from 'fs';
import https from 'https';
import { BrowserWindow } from 'electron';
import { UPLOAD_CHUNK_SIZE } from '../../shared/constants';
import { getTestMode } from '../settings';
import { getMux } from './client';

export async function createUploadAndSend(
  filePath: string,
  window: BrowserWindow,
  email: string,
): Promise<string> {
  // Create a direct upload on Mux
  const upload = await getMux().video.uploads.create({
    cors_origin: 'http://localhost',
    ...(getTestMode() && { test: true }),
    new_asset_settings: {
      playback_policy: ['public'],
      video_quality: 'premium',
      max_resolution_tier: '2160p',
      master_access: 'temporary',
      passthrough: email,
    },
  });

  const uploadUrl = upload.url;
  if (!uploadUrl) throw new Error('Mux did not return an upload URL');

  // Upload via PUT
  await putUpload(filePath, uploadUrl, window);

  return upload.id;
}

function putUpload(
  filePath: string,
  uploadUrl: string,
  window: BrowserWindow,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const fileSize = fs.statSync(filePath).size;
    const url = new URL(uploadUrl);

    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': fileSize,
        },
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          console.log('[Mux] Upload complete');
          resolve();
        } else {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            reject(
              new Error(
                `Upload failed with status ${res.statusCode}: ${body}`,
              ),
            );
          });
        }
      },
    );

    req.on('error', (err) => {
      console.error('[Mux] Upload error:', err.message);
      reject(err);
    });

    const fileStream = fs.createReadStream(filePath, {
      highWaterMark: UPLOAD_CHUNK_SIZE,
    });

    let bytesUploaded = 0;
    fileStream.on('data', (chunk: Buffer) => {
      bytesUploaded += chunk.length;
      const percent = Math.round((bytesUploaded / fileSize) * 100);
      window.webContents.send('bayside:upload-progress', {
        percent,
        bytesUploaded,
        bytesTotal: fileSize,
      });
    });

    fileStream.pipe(req);
  });
}
