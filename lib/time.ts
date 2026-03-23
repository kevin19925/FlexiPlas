export function formatRelativeTimeEs(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return "hace un momento";
  const min = Math.floor(sec / 60);
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `hace ${days} día${days === 1 ? "" : "s"}`;
  return d.toLocaleDateString("es-EC", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function deadlineMeta(deadlineIso: string | null): {
  label: string;
  tone: "ok" | "warn" | "urgent" | "none";
  daysLeft: number | null;
} {
  if (!deadlineIso) {
    return { label: "Sin fecha límite", tone: "none", daysLeft: null };
  }
  const end = new Date(deadlineIso);
  if (Number.isNaN(end.getTime())) {
    return { label: "Fecha límite inválida", tone: "none", daysLeft: null };
  }
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const ms = end.getTime() - start.getTime();
  const daysLeft = Math.ceil(ms / (24 * 60 * 60 * 1000));
  if (daysLeft < 0) {
    return { label: `Vencido hace ${Math.abs(daysLeft)} día(s)`, tone: "urgent", daysLeft };
  }
  if (daysLeft === 0) return { label: "Vence hoy", tone: "urgent", daysLeft: 0 };
  if (daysLeft <= 3) {
    return { label: `${daysLeft} día(s) restantes`, tone: "urgent", daysLeft };
  }
  if (daysLeft <= 7) {
    return { label: `${daysLeft} día(s) restantes`, tone: "warn", daysLeft };
  }
  return { label: `${daysLeft} día(s) restantes`, tone: "ok", daysLeft };
}
