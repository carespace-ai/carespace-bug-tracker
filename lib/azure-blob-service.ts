import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || '';
const containerName = process.env.AZURE_BLOB_CONTAINER_NAME || 'bug-attachments';

let containerClient: ContainerClient | null = null;

function getContainerClient(): ContainerClient {
  if (!containerClient) {
    if (!connectionString) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING environment variable is not configured');
    }
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    containerClient = blobServiceClient.getContainerClient(containerName);
  }
  return containerClient;
}

/**
 * Uploads a file to Azure Blob Storage and returns its public URL
 * @param fileContent - Buffer containing the file content
 * @param filename - Original filename
 * @param correlationId - Optional correlation ID for request tracing
 * @returns Public URL to the uploaded blob
 */
export async function uploadFileToAzureBlob(
  fileContent: Buffer,
  filename: string,
  correlationId?: string
): Promise<string> {
  const logPrefix = correlationId ? `[AzureBlob] [reqId: ${correlationId}]` : '[AzureBlob]';

  try {
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const blobName = `${timestamp}-${sanitizedFilename}`;

    console.log(`${logPrefix} Uploading file: ${blobName}`);

    const client = getContainerClient();
    const blockBlobClient = client.getBlockBlobClient(blobName);

    // Determine content type from filename extension
    const contentType = getContentType(filename);

    await blockBlobClient.upload(fileContent, fileContent.length, {
      blobHTTPHeaders: {
        blobContentType: contentType,
      },
    });

    console.log(`${logPrefix} Successfully uploaded: ${blockBlobClient.url}`);
    return blockBlobClient.url;
  } catch (error) {
    console.error(`${logPrefix} Error uploading file to Azure Blob:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to upload file to Azure Blob Storage: ${errorMessage}`);
  }
}

/**
 * Uploads multiple files to Azure Blob Storage
 * @param files - Array of File objects from FormData
 * @param correlationId - Optional correlation ID for request tracing
 * @returns Array of attachment objects with name, size, type, and Azure Blob URL
 */
export async function uploadFilesToAzureBlob(
  files: File[],
  correlationId?: string
): Promise<{ name: string; size: number; type: string; url: string }[]> {
  const uploadPromises = files.map(async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const url = await uploadFileToAzureBlob(buffer, file.name, correlationId);

    return {
      name: file.name,
      size: file.size,
      type: file.type,
      url,
    };
  });

  return Promise.all(uploadPromises);
}

/**
 * Maps file extensions to MIME content types
 */
function getContentType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    txt: 'text/plain',
    log: 'text/plain',
    pdf: 'application/pdf',
    json: 'application/json',
  };
  return mimeTypes[ext || ''] || 'application/octet-stream';
}
