"use client";

import { Chip } from "@nextui-org/react";
import type { DocumentStatus } from "@/lib/types";

const config: Record<
  DocumentStatus,
  { label: string; color: "default" | "primary" | "secondary" | "danger" | "warning" | "success" }
> = {
  pending: { label: "Pendiente", color: "warning" },
  uploaded: { label: "Subido", color: "primary" },
  approved: { label: "Aprobado", color: "success" },
  rejected: { label: "Rechazado", color: "danger" },
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  const c = config[status];
  return (
    <Chip size="sm" variant="bordered" color={c.color} classNames={{ content: "font-semibold" }}>
      {c.label}
    </Chip>
  );
}
