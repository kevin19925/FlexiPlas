import {
  BlobServiceClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";

const CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING!;
const CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER || "archivos";

if (!CONNECTION_STRING) {
  throw new Error(
    "Por favor define AZURE_STORAGE_CONNECTION_STRING en .env.local"
  );
}

function getBlobServiceClient(): BlobServiceClient {
  return BlobServiceClient.fromConnectionString(CONNECTION_STRING);
}

function parseConnectionString(connStr: string): {
  accountName: string;
  accountKey: string;
} {
  const parts = connStr.split(";");
  let accountName = "";
  let accountKey = "";

  for (const part of parts) {
    if (part.startsWith("AccountName=")) {
      accountName = part.replace("AccountName=", "");
    } else if (part.startsWith("AccountKey=")) {
      accountKey = part.replace("AccountKey=", "");
    }
  }

  return { accountName, accountKey };
}

export async function uploadFileToAzure(
  buffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<{ url: string; blobName: string }> {
  const blobServiceClient = getBlobServiceClient();
  const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);

  const ext = originalName.split(".").pop() || "bin";
  const blobName = `${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: {
      blobContentType: mimeType,
    },
  });

  const url = blockBlobClient.url;

  return { url, blobName };
}

export async function deleteFileFromAzure(blobName: string): Promise<void> {
  try {
    const blobServiceClient = getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.deleteIfExists();
  } catch {
    // Silent fail — el archivo puede que ya no exista
    console.warn(`No se pudo eliminar blob: ${blobName}`);
  }
}

export async function generateSasUrl(
  blobName: string,
  expiresInMinutes: number = 60
): Promise<string> {
  const { accountName, accountKey } = parseConnectionString(CONNECTION_STRING);

  const sharedKeyCredential = new StorageSharedKeyCredential(
    accountName,
    accountKey
  );

  const expiresOn = new Date();
  expiresOn.setMinutes(expiresOn.getMinutes() + expiresInMinutes);

  const sasPermissions = new BlobSASPermissions();
  sasPermissions.read = true;

  const sasQueryParameters = generateBlobSASQueryParameters(
    {
      containerName: CONTAINER_NAME,
      blobName,
      permissions: sasPermissions,
      expiresOn,
    },
    sharedKeyCredential
  );

  const sasUrl = `https://${accountName}.blob.core.windows.net/${CONTAINER_NAME}/${blobName}?${sasQueryParameters.toString()}`;

  return sasUrl;
}
