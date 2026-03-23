import {
  BlobSASPermissions,
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
} from "@azure/storage-blob";
import { randomUUID } from "crypto";
import { runtimeEnv } from "./runtime-env";

function parseAccountFromConnectionString(conn: string): {
  accountName: string;
  accountKey: string;
} {
  const map: Record<string, string> = {};
  for (const part of conn.split(";")) {
    const i = part.indexOf("=");
    if (i > 0) map[part.slice(0, i)] = part.slice(i + 1);
  }
  if (!map.AccountName || !map.AccountKey) {
    throw new Error("Connection string Azure inválida (AccountName/AccountKey)");
  }
  return { accountName: map.AccountName, accountKey: map.AccountKey };
}

export function getBlobService(): BlobServiceClient {
  const conn = runtimeEnv("AZURE_STORAGE_CONNECTION_STRING");
  if (!conn) throw new Error("AZURE_STORAGE_CONNECTION_STRING no configurada");
  return BlobServiceClient.fromConnectionString(conn);
}

export function getContainerName(): string {
  return runtimeEnv("AZURE_STORAGE_CONTAINER") || "archivos";
}

export async function uploadBufferToAzure(
  buffer: Buffer,
  mime: string,
  blobPath: string
): Promise<string> {
  const service = getBlobService();
  const container = service.getContainerClient(getContainerName());
  await container.createIfNotExists();
  const block = container.getBlockBlobClient(blobPath);
  await block.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: mime },
  });
  return blobPath;
}

export async function deleteAzureBlobIfExists(blobName: string | null | undefined) {
  if (!blobName) return;
  try {
    const service = getBlobService();
    const container = service.getContainerClient(getContainerName());
    await container.getBlockBlobClient(blobName).deleteIfExists();
  } catch (e) {
    console.error("deleteAzureBlobIfExists", e);
  }
}

export function getBlobSasUrl(blobName: string, expiresMinutes = 60): string {
  const conn = runtimeEnv("AZURE_STORAGE_CONNECTION_STRING");
  if (!conn) throw new Error("AZURE_STORAGE_CONNECTION_STRING no configurada");
  const { accountName, accountKey } = parseAccountFromConnectionString(conn);
  const containerName = getContainerName();
  const cred = new StorageSharedKeyCredential(accountName, accountKey);
  const startsOn = new Date(Date.now() - 60 * 1000);
  const expiresOn = new Date(Date.now() + expiresMinutes * 60 * 1000);
  const sas = generateBlobSASQueryParameters(
    {
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse("r"),
      startsOn,
      expiresOn,
    },
    cred
  ).toString();
  const path = blobName
    .split("/")
    .map((s) => encodeURIComponent(s))
    .join("/");
  return `https://${accountName}.blob.core.windows.net/${containerName}/${path}?${sas}`;
}

export function buildBlobPath(
  providerId: string,
  documentId: string,
  ext: string
): string {
  const safeExt = ext.replace(/[^a-z0-9]/gi, "").slice(0, 5) || "bin";
  return `${providerId}/${documentId}/${Date.now()}-${randomUUID()}.${safeExt}`;
}
