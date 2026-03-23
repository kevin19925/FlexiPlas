import type { DbDocument, DocumentRequest } from "./types";

export function serializeDocument(
  d: DbDocument & { providerName?: string },
  providerNames?: Map<string, string>
): DocumentRequest {
  const pid = String(d.providerId);
  const providerName =
    d.providerName ?? providerNames?.get(pid) ?? pid;
  return {
    id: String(d._id),
    providerId: pid,
    providerName,
    documentType: d.documentType,
    year: d.year,
    description: d.description,
    status: d.status,
    hasFile: !!d.blobName,
    mimeType: d.mimeType ?? null,
    observations: d.observations,
    deadline: d.deadline ? d.deadline.toISOString() : null,
    createdAt: d.createdAt?.toISOString(),
    updatedAt: d.updatedAt?.toISOString(),
  };
}
