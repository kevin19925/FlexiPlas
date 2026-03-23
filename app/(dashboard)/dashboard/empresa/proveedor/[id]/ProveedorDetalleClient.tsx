"use client";

import Link from "next/link";
import { Button, Card, CardBody, Input, Select, SelectItem, Spinner } from "@nextui-org/react";
import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DocumentCard } from "@/components/DocumentCard";
import { DocumentDetailModal } from "@/components/DocumentDetailModal";
import { RejectModal } from "@/components/RejectModal";
import { TraceabilityTable } from "@/components/TraceabilityTable";
import type { DocumentRequest, Provider } from "@/lib/types";

type YearFilter = "all" | 2024 | 2025 | 2026;
type StatusFilter = "all" | DocumentRequest["status"];

function firstKeyToValue(keys: unknown): string {
  if (!keys || keys === "all") return "all";
  const arr = Array.from(keys as Set<React.Key>);
  return arr[0] ? String(arr[0]) : "all";
}

export function ProveedorDetalleClient({ providerId }: { providerId: string }) {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [documents, setDocuments] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState<YearFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [detailDoc, setDetailDoc] = useState<DocumentRequest | null>(null);
  const [downloadLimitInput, setDownloadLimitInput] = useState("");
  const [downloadLimitSaving, setDownloadLimitSaving] = useState(false);
  const [downloadLimitDefault, setDownloadLimitDefault] = useState<number | null>(null);

  const load = useCallback(async () => {
    const [pr, dr, qr] = await Promise.all([
      fetch(`/api/providers/${providerId}`, { credentials: "include" }),
      fetch("/api/documents", { credentials: "include" }),
      fetch(`/api/providers/${providerId}/download-policy`, { credentials: "include" }),
    ]);
    if (pr.ok) {
      const pj = (await pr.json()) as { provider?: Provider };
      setProvider(pj.provider ?? null);
    }
    if (dr.ok) {
      const dj = (await dr.json()) as { documents?: DocumentRequest[] };
      setDocuments(dj.documents ?? []);
    }
    if (qr.ok) {
      const qj = (await qr.json()) as {
        users?: { maxDownloadsPerDocument: number | null }[];
        defaultMaxDownloadsPerDocument?: number;
      };
      const first = qj.users?.[0]?.maxDownloadsPerDocument ?? null;
      setDownloadLimitInput(first === null ? "" : String(first));
      setDownloadLimitDefault(
        typeof qj.defaultMaxDownloadsPerDocument === "number"
          ? qj.defaultMaxDownloadsPerDocument
          : null
      );
    }
    setLoading(false);
  }, [providerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const mine = useMemo(() => documents.filter((d) => d.providerId === providerId), [documents, providerId]);

  const filtered = useMemo(() => {
    let list = mine;
    if (yearFilter !== "all") list = list.filter((d) => d.year === yearFilter);
    if (statusFilter !== "all") list = list.filter((d) => d.status === statusFilter);
    return list;
  }, [mine, yearFilter, statusFilter]);

  async function approve(id: string) {
    await fetch(`/api/documents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "approve" }),
    });
    void load();
  }

  async function reject(id: string, observations: string) {
    await fetch(`/api/documents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "reject", observations }),
    });
    setRejectId(null);
    void load();
  }

  async function saveDownloadPolicy() {
    const raw = downloadLimitInput.trim();
    let value: number | null = null;
    if (raw !== "") {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < -1 || n > 9999) {
        alert("Usa un número entre -1 y 9999, o deja vacío para heredar.");
        return;
      }
      value = Math.floor(n);
    }

    setDownloadLimitSaving(true);
    try {
      const r = await fetch(`/api/providers/${providerId}/download-policy`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ maxDownloadsPerDocument: value }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        alert(j.error || "No se pudo guardar la política de descargas");
        return;
      }
      await load();
    } finally {
      setDownloadLimitSaving(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-10"><Spinner /></div>;
  }

  if (!provider) {
    return (
      <div className="space-y-2">
        <p className="text-danger">Proveedor no encontrado.</p>
        <Button as={Link} href="/dashboard/empresa/archivos" variant="bordered" startContent={<ArrowLeft className="h-4 w-4" />}>
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <Button
          as={Link}
          href="/dashboard/empresa/archivos"
          size="sm"
          variant="light"
          startContent={<ArrowLeft className="h-4 w-4" />}
          className="mb-2"
        >
          Volver a gestión de archivos
        </Button>
        <h1 className="text-3xl font-extrabold text-primary">{provider.name}</h1>
        <p className="text-default-500">RUC {provider.ruc}</p>
      </div>

      <Card className="border border-default-200">
        <CardBody>
          <h2 className="mb-1 text-lg font-semibold">Tabla de trazabilidad</h2>
          <p className="mb-3 text-sm text-default-500">Clic en una celda con documento para ver detalle.</p>
          <TraceabilityTable documents={mine} onCellClick={(d) => setDetailDoc(d)} />
        </CardBody>
      </Card>

      <Card className="border border-default-200">
        <CardBody className="space-y-3">
          <h2 className="text-lg font-semibold">Política de acceso (empresa)</h2>
          <p className="text-sm text-default-500">
            Desde aquí defines cuántas descargas por archivo tendrá este proveedor. La
            vista previa en pantalla no consume descargas.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <Input
              label="Máx. descargas por archivo"
              labelPlacement="outside"
              placeholder="Vacío = hereda"
              description={
                downloadLimitDefault === null
                  ? "Global actual: ilimitado. Usa -1 para ilimitado."
                  : `Global actual: ${downloadLimitDefault}. Usa -1 para ilimitado.`
              }
              className="w-full sm:max-w-[320px]"
              value={downloadLimitInput}
              onValueChange={setDownloadLimitInput}
              variant="bordered"
            />
            <Button
              color="secondary"
              onPress={() => void saveDownloadPolicy()}
              isDisabled={downloadLimitSaving}
            >
              {downloadLimitSaving ? "Guardando..." : "Guardar política"}
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card className="border border-default-200">
        <CardBody className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-lg font-semibold">Documentos y acciones</h2>
            <div className="flex flex-wrap gap-2">
              <Select
                label="Año"
                labelPlacement="outside"
                className="w-[120px]"
                selectedKeys={[String(yearFilter)]}
                onSelectionChange={(keys) => {
                  const v = firstKeyToValue(keys);
                  setYearFilter(v === "all" ? "all" : (Number(v) as 2024 | 2025 | 2026));
                }}
                variant="bordered"
              >
                <SelectItem key="all">Todos</SelectItem>
                <SelectItem key="2024">2024</SelectItem>
                <SelectItem key="2025">2025</SelectItem>
                <SelectItem key="2026">2026</SelectItem>
              </Select>
              <Select
                label="Estado"
                labelPlacement="outside"
                className="w-[150px]"
                selectedKeys={[String(statusFilter)]}
                onSelectionChange={(keys) => setStatusFilter(firstKeyToValue(keys) as StatusFilter)}
                variant="bordered"
              >
                <SelectItem key="all">Todos</SelectItem>
                <SelectItem key="pending">Pendiente</SelectItem>
                <SelectItem key="uploaded">Subido</SelectItem>
                <SelectItem key="approved">Aprobado</SelectItem>
                <SelectItem key="rejected">Rechazado</SelectItem>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            {filtered.map((d) => (
              <DocumentCard
                key={d.id}
                doc={d}
                mode="empresa"
                onApproved={() => approve(d.id)}
                onRejected={() => setRejectId(d.id)}
              />
            ))}
            {filtered.length === 0 && <p className="text-sm text-default-500">No hay documentos para este filtro.</p>}
          </div>
        </CardBody>
      </Card>

      <RejectModal
        open={rejectId !== null}
        onClose={() => setRejectId(null)}
        onConfirm={(obs) => {
          if (rejectId) void reject(rejectId, obs);
        }}
      />

      {detailDoc && <DocumentDetailModal doc={detailDoc} role="empresa" onClose={() => setDetailDoc(null)} />}
    </div>
  );
}