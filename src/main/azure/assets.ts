import { getContainerClient, generateDownloadSasUrl, generateGifSasUrl } from './client';
import type { AzureBlobSummary, PaginatedAzureAssets } from '../../shared/types';

export async function listAzureBlobs(page = 1, limit = 20): Promise<PaginatedAzureAssets> {
  const containerClient = getContainerClient();

  // List all blobs with metadata, filter for those with an email metadata field
  const allBlobs: AzureBlobSummary[] = [];

  for await (const blob of containerClient.listBlobsFlat({ includeMetadata: true })) {
    const email = blob.metadata?.email;
    if (!email) continue;
    const gifBlobName = blob.metadata?.gifblob;
    allBlobs.push({
      name: blob.name,
      email,
      uploadedAt: blob.metadata?.uploadedat ?? blob.properties.createdOn?.toISOString() ?? '',
      url: `${containerClient.url}/${blob.name}`,
      size: blob.properties.contentLength ?? 0,
      gifUrl: gifBlobName ? generateGifSasUrl(gifBlobName) : undefined,
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
  return generateDownloadSasUrl(blobName, blobName);
}

/**
 * Look up the GIF blob name from a video blob's metadata and return a SAS URL for it.
 * Returns null if no GIF is associated with the blob.
 */
export async function getGifUrlForBlob(videoBlobName: string): Promise<string | null> {
  const containerClient = getContainerClient();
  const blobClient = containerClient.getBlobClient(videoBlobName);
  const properties = await blobClient.getProperties();
  const gifBlobName = properties.metadata?.gifblob;
  if (!gifBlobName) return null;
  return generateGifSasUrl(gifBlobName);
}

