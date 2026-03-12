import { getContainerClient, generateDownloadSasUrl } from './client';
import { friendlyFilenameFromBlob } from '../util/filename';
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
  return generateDownloadSasUrl(blobName, friendlyFilenameFromBlob(blobName));
}
