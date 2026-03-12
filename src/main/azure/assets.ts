import { getContainerClient, generateDownloadSasUrl } from './client';
import type { AzureBlobSummary, PaginatedAzureAssets } from '../../shared/types';

export async function listAzureBlobs(page = 1, limit = 20): Promise<PaginatedAzureAssets> {
  const containerClient = getContainerClient();

  // List all blobs with metadata, filter for those with an email metadata field
  const allBlobs: AzureBlobSummary[] = [];

  for await (const blob of containerClient.listBlobsFlat({ includeMetadata: true })) {
    const email = blob.metadata?.email;
    if (!email) continue;
    allBlobs.push({
      name: blob.name,
      email,
      uploadedAt: blob.metadata?.uploadedat ?? blob.properties.createdOn?.toISOString() ?? '',
      url: `${containerClient.url}/${blob.name}`,
      size: blob.properties.contentLength ?? 0,
    });
  }

  // Sort newest first
  allBlobs.sort((a, b) => {
    const ta = new Date(a.uploadedAt).getTime() || 0;
    const tb = new Date(b.uploadedAt).getTime() || 0;
    return tb - ta;
  });

  // Paginate
  const start = (page - 1) * limit;
  const assets = allBlobs.slice(start, start + limit);
  const hasMore = start + limit < allBlobs.length;

  return {
    assets,
    hasMore,
    nextPage: page + 1,
  };
}

export function getAzureDownloadUrl(blobName: string): string {
  // Extract a friendly filename from the blob name (strip date prefix and hash suffix)
  const ext = blobName.match(/\.\w+$/)?.[0] ?? '.mp4';
  const parts = blobName.match(/^(\d{8})_/);
  const dateStr = parts?.[1];
  let downloadFilename = `Bayside-Recording${ext}`;
  if (dateStr) {
    downloadFilename = `Bayside-Recording-${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}${ext}`;
  }
  return generateDownloadSasUrl(blobName, downloadFilename);
}
