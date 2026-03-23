/** Fecha límite enviada como YYYY-MM-DD (input type="date"). */

export function parseRequiredDeadline(raw: unknown):
  | { ok: true; date: Date; isoDay: string }
  | { ok: false; error: string } {
  if (typeof raw !== "string" || !raw.trim()) {
    return { ok: false, error: "La fecha límite es obligatoria" };
  }
  const isoDay = raw.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDay)) {
    return { ok: false, error: "Fecha límite inválida" };
  }
  const d = new Date(`${isoDay}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) {
    return { ok: false, error: "Fecha límite inválida" };
  }
  return { ok: true, date: d, isoDay };
}

export function formatDeadlineLongEs(isoDay: string): string {
  const d = new Date(`${isoDay}T12:00:00.000Z`);
  return d.toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
