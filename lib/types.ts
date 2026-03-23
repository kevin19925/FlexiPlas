import type { ObjectId } from "mongodb";

export type UserRole = "admin" | "empresa" | "proveedor";

export type DocumentStatus = "pending" | "uploaded" | "approved" | "rejected";

export type NotificationKind = "success" | "error" | "warning" | "info";

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  providerId?: string;
}

export interface Provider {
  id: string;
  name: string;
  ruc: string;
  email?: string | null;
  phone?: string | null;
}

export interface DocumentRequest {
  id: string;
  providerId: string;
  providerName?: string;
  documentType: string;
  year: number;
  description: string;
  status: DocumentStatus;
  /** No exponer URL pública; usar /api/files/sas */
  hasFile: boolean;
  /** Tipo MIME del archivo subido (vista previa) */
  mimeType?: string | null;
  observations: string | null;
  deadline: string | null;
  createdAt?: string;
  updatedAt?: string;
  /** Límite de descargas por archivo (empresa/proveedor). max null = ilimitado */
  downloads?: { used: number; max: number | null };
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  kind: NotificationKind;
  createdAt: string;
}

export interface DbUser {
  _id: ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  providerId: ObjectId | null;
  createdAt: Date;
  /** undefined = hereda default global; -1 = ilimitado; ≥0 = tope por documento */
  maxDownloadsPerDocument?: number | null;
}

export interface DbProvider {
  _id: ObjectId;
  name: string;
  ruc: string;
  email?: string | null;
  phone?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbDocument {
  _id: ObjectId;
  providerId: ObjectId;
  documentType: string;
  year: number;
  description: string;
  status: DocumentStatus;
  blobName: string | null;
  mimeType?: string | null;
  observations: string | null;
  deadline: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Plantilla de tipo de documento (empresa define campos reutilizables). */
export interface DbDocumentTemplate {
  _id: ObjectId;
  label: string;
  defaultDescription: string;
  createdAt: Date;
  createdByUserId: ObjectId;
}

export interface DbNotification {
  _id: ObjectId;
  userId: ObjectId;
  message: string;
  read: boolean;
  kind: NotificationKind;
  createdAt: Date;
}

// Legacy UI compatibility types (used by app/(dashboard)/* pages).
export type DocStatus = "PENDING" | "UPLOADED" | "APPROVED" | "REJECTED";

export interface IDocument {
  _id: string;
  providerId: string;
  providerName?: string;
  documentType: string;
  year: number;
  description: string;
  status: DocStatus;
  fileName?: string | null;
  fileUrl?: string | null;
  blobName?: string | null;
  observations?: string | null;
  deadline?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IProvider {
  _id: string;
  name: string;
  ruc: string;
  email?: string | null;
  phone?: string | null;
  createdAt?: string;
}

export interface IProviderWithStats extends IProvider {
  stats: {
    total: number;
    pending?: number;
    uploaded?: number;
    approved?: number;
    rejected?: number;
  };
}

export interface IUser {
  _id: string;
  name: string;
  email: string;
  role: "ADMIN" | "EMPRESA" | "PROVEEDOR";
  providerId?: string | null;
  providerName?: string | null;
  createdAt: string;
}

export const DOCUMENT_TYPES = [
  "RUC",
  "Permiso Bomberos",
  "Patente Municipal",
  "Certificado IESS",
  "Seguro RC",
  "Permiso Sanitario",
  "Certificado Bancario",
] as const;

export type NotificationType = "SUCCESS" | "ERROR" | "WARNING" | "INFO";

export interface INotification {
  _id: string;
  userId: string;
  message: string;
  read: boolean;
  type: NotificationType;
  createdAt: string;
}
