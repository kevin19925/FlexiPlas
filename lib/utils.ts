import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd/MM/yyyy", { locale: es });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd/MM/yyyy HH:mm", { locale: es });
}

export function formatRelative(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: es });
}

export function getDaysUntilDeadline(deadline: Date | string): number {
  const d = typeof deadline === "string" ? new Date(deadline) : deadline;
  return differenceInDays(d, new Date());
}

export function getDeadlineColor(days: number): string {
  if (days < 0) return "text-red-700 bg-red-100 border-red-200";
  if (days <= 3) return "text-red-700 bg-red-100 border-red-200";
  if (days <= 7) return "text-amber-700 bg-amber-100 border-amber-200";
  return "text-green-700 bg-green-100 border-green-200";
}

export function isUrgent(deadline: Date | string): boolean {
  const days = getDaysUntilDeadline(deadline);
  return days <= 3;
}

export function validateRuc(ruc: string): boolean {
  return /^\d{13}$/.test(ruc);
}

export function getStatusLabel(
  status: "PENDING" | "UPLOADED" | "APPROVED" | "REJECTED"
): string {
  const labels: Record<string, string> = {
    PENDING: "Pendiente",
    UPLOADED: "Subido",
    APPROVED: "Aprobado",
    REJECTED: "Rechazado",
  };
  return labels[status] || status;
}

export function getCurrentYear(): number {
  return 2026;
}

export function getYearRange(startYear: number = 2022): number[] {
  const current = getCurrentYear();
  const years: number[] = [];
  for (let y = current; y >= startYear; y--) {
    years.push(y);
  }
  return years;
}

export function isImageFile(fileName: string): boolean {
  const imageExtensions = ["jpg", "jpeg", "png", "webp", "gif"];
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  return imageExtensions.includes(ext);
}

export function isPdfFile(fileName: string): boolean {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  return ext === "pdf";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
