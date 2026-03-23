"use client";

import { cn, getStatusLabel } from "@/lib/utils";
import type { DocStatus } from "@/lib/types";

interface StatusBadgeProps {
  status: DocStatus;
  className?: string;
}

const statusConfig: Record<DocStatus, { className: string; dot: string }> = {
  PENDING: {
    className: "badge-pending",
    dot: "bg-amber-500",
  },
  UPLOADED: {
    className: "badge-uploaded",
    dot: "bg-blue-500",
  },
  APPROVED: {
    className: "badge-approved",
    dot: "bg-green-500",
  },
  REJECTED: {
    className: "badge-rejected",
    dot: "bg-red-500",
  },
};

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span className={cn(config.className, className)}>
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", config.dot)} />
      {getStatusLabel(status)}
    </span>
  );
}
