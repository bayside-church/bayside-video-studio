import { BlobServiceClient, ContainerClient, StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions } from '@azure/storage-blob';
import { getAzureBlobConnectionString, getAzureBlobContainerName } from '../settings';

let containerClient: ContainerClient | null = null;
let credential: StorageSharedKeyCredential | null = null;
let lastConnectionString = '';
let lastContainerName = '';

export function getContainerClient(): ContainerClient {
  const connectionString = getAzureBlobConnectionString();
  const containerName = getAzureBlobContainerName();

  if (!containerClient || connectionString !== lastConnectionString || containerName !== lastContainerName) {
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    containerClient = blobServiceClient.getContainerClient(containerName);

    // Extract account name + key from connection string for SAS generation
    const accountName = connectionString.match(/AccountName=([^;]+)/)?.[1] ?? '';
    const accountKey = connectionString.match(/AccountKey=([^;]+)/)?.[1] ?? '';
    credential = new StorageSharedKeyCredential(accountName, accountKey);

    lastConnectionString = connectionString;
    lastContainerName = containerName;
  }
  return containerClient;
}

export function generateDownloadSasUrl(blobName: string, downloadFilename: string): string {
  // Ensure client + credential are initialized
  const container = getContainerClient();

  const sasToken = generateBlobSASQueryParameters({
    containerName: container.containerName,
    blobName,
    permissions: BlobSASPermissions.parse('r'),
    startsOn: new Date(),
    expiresOn: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000), // 10 years
    contentDisposition: `attachment; filename="${downloadFilename}"`,
  }, credential!).toString();

  return `${container.url}/${blobName}?${sasToken}`;
}
