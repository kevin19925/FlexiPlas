"use client";

import { Clock, AlertCircle } from "lucide-react";
import { cn, getDaysUntilDeadline, formatDate, isUrgent } from "@/lib/utils";

interface DeadlineBadgeProps {
  deadline: string | Date;
  className?: string;
}

export default function DeadlineBadge({ deadline, className }: DeadlineBadgeProps) {
  const days = getDaysUntilDeadline(deadline);
  const urgent = isUrgent(deadline);

  let colorClass = "";
  let label = "";

  if (days < 0) {
    colorClass = "text-red-700 bg-red-100 border-red-200";
    label = `Vencido (${Math.abs(days)}d)`;
  } else if (days === 0) {
    colorClass = "text-red-700 bg-red-100 border-red-200";
    label = "Vence hoy";
  } else if (days <= 3) {
    colorClass = "text-red-700 bg-red-100 border-red-200";
    label = `${days}d restante${days > 1 ? "s" : ""}`;
  } else if (days <= 7) {
    colorClass = "text-amber-700 bg-amber-100 border-amber-200";
    label = `${days}d restantes`;
  } else {
    colorClass = "text-green-700 bg-green-100 border-green-200";
    label = `${days}d restantes`;
  }

  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
          colorClass
        )}
      >
        <Clock className="w-3 h-3" />
        {label}
      </span>

      {urgent && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white badge-urgent">
          <AlertCircle className="w-3 h-3" />
          URGENTE
        </span>
      )}

      <span className="text-xs text-slate-500">
        Límite: {formatDate(deadline)}
      </span>
    </div>
  );
}
