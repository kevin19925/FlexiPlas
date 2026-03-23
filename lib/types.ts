// ===== SESSION Y AUTH =====
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "EMPRESA" | "PROVEEDOR";
  providerId?: string | null;
}

// ===== DOCUMENTOS =====
export type DocStatus = "PENDING" | "UPLOADED" | "APPROVED" | "REJECTED";

export interface IDocument {
  _id: string;
  providerId: string;
  providerName?: string;
  documentType: string;
  year: number;
  description: string;
  status: DocStatus;
  fileUrl?: string;
  fileName?: string;
  blobName?: string;
  observations?: string;
  deadline?: string;
  createdAt: string;
  updatedAt: string;
}

// ===== PROVEEDORES =====
export interface IProvider {
  _id: string;
  name: string;
  ruc: string;
  email?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IProviderWithStats extends IProvider {
  stats: {
    pending: number;
    uploaded: number;
    approved: number;
    rejected: number;
    total: number;
  };
}

// ===== USUARIOS =====
export interface IUser {
  _id: string;
  email: string;
  name: string;
  role: "ADMIN" | "EMPRESA" | "PROVEEDOR";
  providerId?: string | null;
  providerName?: string;
  createdAt: string;
  updatedAt: string;
}

// ===== NOTIFICACIONES =====
export type NotificationType = "SUCCESS" | "ERROR" | "WARNING" | "INFO";

export interface INotification {
  _id: string;
  userId: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
}

// ===== STATS =====
export interface DocumentStats {
  pending: number;
  uploaded: number;
  approved: number;
  rejected: number;
  total: number;
}

// ===== API RESPONSES =====
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

// ===== DOCUMENT TYPES SUGGESTIONS =====
export const DOCUMENT_TYPES = [
  "RUC",
  "Permiso de Bomberos",
  "Permiso de Funcionamiento",
  "Certificado de Salud",
  "Contrato",
  "Factura",
  "Póliza de Seguro",
  "Certificado IESS",
  "Mantenimiento",
  "Audit Report",
  "Environmental Permit",
  "Quality Certificate",
] as const;
