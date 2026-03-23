"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button, Card, CardBody, Progress, Spinner } from "@nextui-org/react";

type Stats = {
  usersCount: number;
  providersCount: number;
  documentsCount: number;
  pendingReview: number;
  documentsByStatus: {
    pending: number;
    uploaded: number;
    approved: number;
    rejected: number;
  };
};

export default function AdminStatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/stats", { credentials: "include" });
    if (!r.ok) {
      setErr("No se pudieron cargar las estadísticas");
      return;
    }
    setStats((await r.json()) as Stats);
    setErr(null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (err) {
    return (
      <p className="text-danger" role="alert">{err}</p>
    );
  }

  if (!stats) {
    return (
      <div className="flex justify-center py-8"><Spinner /></div>
    );
  }

  const maxBar = Math.max(
    1,
    stats.documentsByStatus.pending +
      stats.documentsByStatus.uploaded +
      stats.documentsByStatus.approved +
      stats.documentsByStatus.rejected
  );

  const bars = [
    { key: "pending", label: "Pendiente", n: stats.documentsByStatus.pending, color: "warning" as const },
    { key: "uploaded", label: "Subido", n: stats.documentsByStatus.uploaded, color: "primary" as const },
    { key: "approved", label: "Aprobado", n: stats.documentsByStatus.approved, color: "success" as const },
    { key: "rejected", label: "Rechazado", n: stats.documentsByStatus.rejected, color: "danger" as const },
  ];

  const cards = [
    ["Usuarios", stats.usersCount],
    ["Proveedores", stats.providersCount],
    ["Documentos", stats.documentsCount],
    ["Pendientes revisión", stats.pendingReview],
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Panel administrador</h1>
        <p className="text-default-500">Resumen del sistema.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, n]) => (
          <Card key={label} className="border border-default-200">
            <CardBody>
              <p className="text-sm font-semibold text-default-500">{label}</p>
              <p className="mt-1 text-3xl font-bold">{n}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card className="border border-default-200">
        <CardBody>
          <h2 className="text-xl font-semibold">Documentos por estado</h2>
          <div className="mt-3 space-y-3">
            {bars.map((b) => (
              <div key={b.key}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-default-500">{b.label}</span>
                  <span className="font-bold">{b.n}</span>
                </div>
                <Progress aria-label={b.label} value={(b.n / maxBar) * 100} color={b.color} />
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button as={Link} href="/dashboard/admin/proveedores" color="secondary">
          Gestionar proveedores
        </Button>
        <Button as={Link} href="/dashboard/admin/documentos" variant="bordered">
          Ver documentos
        </Button>
      </div>
    </div>
  );
}
