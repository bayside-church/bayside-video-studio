import { MUX_POLL_INTERVAL_MS, MUX_POLL_TIMEOUT_MS } from '../../shared/constants';
import { getMux } from './client';
import { buildDownloadFilename } from '../util/filename';
import type { MuxAssetSummary } from '../../shared/types';

/**
 * Append a custom download filename to a Mux master URL.
 * Uses the &download= query parameter convention.
 */
function withDownloadFilename(masterUrl: string, filename: string): string {
  const separator = masterUrl.includes('?') ? '&' : '?';
  return `${masterUrl}${separator}download=${encodeURIComponent(filename)}`;
}

/**
 * Poll Mux until the upload has an asset with a playback ID.
 * Returns the asset ID and a streaming playback URL immediately.
 */
export async function getAssetInfo(uploadId: string): Promise<{ assetId: string; playbackId: string; playbackUrl: string }> {
  const startTime = Date.now();

  while (Date.now() - startTime < MUX_POLL_TIMEOUT_MS) {
    const upload = await getMux().video.uploads.retrieve(uploadId);

    if (upload.asset_id) {
      const asset = await getMux().video.assets.retrieve(upload.asset_id);

      if (asset.status === 'errored') {
        throw new Error('Mux asset processing failed');
      }

      const playbackId = asset.playback_ids?.[0]?.id;
      if (playbackId) {
        const playbackUrl = `https://stream.mux.com/${playbackId}.m3u8`;
        console.log(`[Mux] Asset created (status: ${asset.status}): ${playbackUrl}`);
        return { assetId: upload.asset_id, playbackId, playbackUrl };
      }
    }

    await sleep(MUX_POLL_INTERVAL_MS);
  }

  throw new Error('Mux upload timed out waiting for asset');
}

/**
 * Poll Mux until the master (original quality) download URL is available.
 * Master access is an async process that completes after the asset is ready.
 * The URL expires after 24 hours.
 */
export async function waitForMasterUrl(assetId: string, downloadFilename: string): Promise<string> {
  // Allow up to 10 minutes for encoding + master generation
  const timeout = Math.max(MUX_POLL_TIMEOUT_MS, 10 * 60 * 1000);
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const asset = await getMux().video.assets.retrieve(assetId);

    if (asset.status === 'errored') {
      throw new Error('Mux asset processing failed');
    }

    const master = asset.master;
    if (master?.status === 'ready' && master?.url) {
      const url = withDownloadFilename(master.url, downloadFilename);
      console.log(`[Mux] Master URL ready: ${url}`);
      return url;
    }

    await sleep(MUX_POLL_INTERVAL_MS);
  }

  throw new Error('Mux master generation timed out');
}

export interface PaginatedAssets {
  assets: MuxAssetSummary[];
  hasMore: boolean;
  nextPage: number;
}

/**
 * List Mux assets with pagination, newest first.
 */
export async function listMuxAssets(page: number = 1, limit: number = 20): Promise<PaginatedAssets> {
  const assets: MuxAssetSummary[] = [];
  const response = await getMux().video.assets.list({ limit, page });

  for await (const asset of response) {
    const track = asset.tracks?.find((t) => t.type === 'video');
    assets.push({
      id: asset.id!,
      playbackId: asset.playback_ids?.[0]?.id ?? null,
      status: asset.status ?? 'unknown',
      duration: asset.duration ?? null,
      resolution: track ? `${track.max_width}x${track.max_height}` : null,
      createdAt: asset.created_at ?? '',
      isTest: asset.test ?? false,
      masterReady: asset.master?.status === 'ready',
      email: asset.passthrough || null,
    });
    // Stop after our limit — the iterator auto-paginates, but we only want one page
    if (assets.length >= limit) break;
  }

  return {
    assets,
    hasMore: assets.length >= limit,
    nextPage: page + 1,
  };
}

/**
 * Re-enable master access on an asset and wait for the download URL.
 * Returns the temporary master URL (expires in 24 hours).
 */
export async function enableMasterAccess(assetId: string, email: string): Promise<string> {
  const asset = await getMux().video.assets.retrieve(assetId);
  const createdDate = asset.created_at
    ? new Date(Number(asset.created_at) * 1000)
    : new Date();
  const filename = buildDownloadFilename(email, createdDate);

  // Check if master is already ready
  if (asset.master?.status === 'ready' && asset.master?.url) {
    const url = withDownloadFilename(asset.master.url, filename);
    console.log(`[Mux] Master already available: ${url}`);
    return url;
  }

  // Re-enable master access
  await getMux().video.assets.updateMasterAccess(assetId, { master_access: 'temporary' });
  console.log(`[Mux] Enabled master access for asset ${assetId}`);

  return await waitForMasterUrl(assetId, filename);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
