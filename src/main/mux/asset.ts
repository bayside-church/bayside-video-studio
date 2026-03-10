import { MUX_POLL_INTERVAL_MS, MUX_POLL_TIMEOUT_MS } from '../../shared/constants';
import { getMux } from './client';

/**
 * Poll Mux until the upload's asset is ready and return the playback URL.
 */
export async function waitForAssetReady(uploadId: string): Promise<string> {
  const startTime = Date.now();

  while (Date.now() - startTime < MUX_POLL_TIMEOUT_MS) {
    const upload = await getMux().video.uploads.retrieve(uploadId);

    if (upload.asset_id) {
      const asset = await getMux().video.assets.retrieve(upload.asset_id);

      if (asset.status === 'ready') {
        const playbackId = asset.playback_ids?.[0]?.id;
        if (!playbackId) throw new Error('Asset ready but no playback ID found');
        const playbackUrl = `https://stream.mux.com/${playbackId}.m3u8`;
        console.log(`[Mux] Asset ready: ${playbackUrl}`);
        return playbackUrl;
      }

      if (asset.status === 'errored') {
        throw new Error('Mux asset processing failed');
      }
    }

    await sleep(MUX_POLL_INTERVAL_MS);
  }

  throw new Error('Mux asset processing timed out');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
