"use client";

import Link from "next/link";
import { Button, Card, CardBody, Input, Select, SelectItem, Skeleton } from "@nextui-org/react";
import { Eye } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DocumentDetailModal } from "@/components/DocumentDetailModal";
import { DocumentViewerModal } from "@/components/DocumentViewerModal";
import { StatusBadge } from "@/components/StatusBadge";
import type { DocumentRequest, DocumentStatus, Provider } from "@/lib/types";

function firstKeyToString(keys: unknown): string {
  if (!keys || keys === "all") return "";
  const arr = Array.from(keys as Set<React.Key>);
  return arr[0] ? String(arr[0]) : "";
}

export function EmpresaArchivosClient() {
  const [allProviders, setAllProviders] = useState<Provider[]>([]);
  const [documents, setDocuments] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProviderId, setFilterProviderId] = useState<string | null>(null);
  const [yearFilter, setYearFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | "">("");
  const [q, setQ] = useState("");
  const [detailDoc, setDetailDoc] = useState<DocumentRequest | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DocumentRequest | null>(null);

  const load = useCallback(async () => {
    const [pr, dr] = await Promise.all([
      fetch("/api/providers", { credentials: "include" }),
      fetch("/api/documents", { credentials: "include" }),
    ]);
    if (pr.ok) {
      const d = (await pr.json()) as { providers?: Provider[] };
      setAllProviders(d.providers ?? []);
    }
    if (dr.ok) {
      const d = (await dr.json()) as { documents?: DocumentRequest[] };
      setDocuments(d.documents ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => {
    const map: Record<string, { pending: number; uploaded: number; approved: number; rejected: number }> = {};
    for (const p of allProviders) map[p.id] = { pending: 0, uploaded: 0, approved: 0, rejected: 0 };
    for (const d of documents) {
      if (!map[d.providerId]) map[d.providerId] = { pending: 0, uploaded: 0, approved: 0, rejected: 0 };
      map[d.providerId][d.status] += 1;
    }
    return map;
  }, [allProviders, documents]);

  const filteredDocs = useMemo(() => {
    return documents.filter((d) => {
      if (filterProviderId && d.providerId !== filterProviderId) return false;
      if (yearFilter && String(d.year) !== yearFilter) return false;
      if (statusFilter && d.status !== statusFilter) return false;
      if (q.trim()) {
        const t = q.trim().toLowerCase();
        const ok =
          d.documentType.toLowerCase().includes(t) ||
          (d.providerName ?? "").toLowerCase().includes(t) ||
          d.description.toLowerCase().includes(t);
        if (!ok) return false;
      }
      return true;
    });
  }, [documents, filterProviderId, yearFilter, statusFilter, q]);

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-[280px] rounded-lg" />
        <Skeleton className="h-[360px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-extrabold text-primary">Gestión de archivos</h1>
        <p className="text-default-500">Filtra, revisa y abre expedientes por proveedor con una vista más rápida.</p>
      </div>

      <Card className="border border-default-200">
        <CardBody>
          <p className="mb-1 font-semibold">Cómo funciona el acceso</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-default-500">
            <li><strong>Vista previa</strong> no consume descargas.</li>
            <li><strong>Descargar</strong> sí consume descargas por archivo.</li>
            <li>Los enlaces temporales de Azure caducan (~60 min).</li>
          </ul>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
        <Card className="border border-default-200">
          <CardBody>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-default-500">Por proveedor</p>
            <div className="max-h-[420px] space-y-1 overflow-auto">
              <button
                type="button"
                onClick={() => setFilterProviderId(null)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                  filterProviderId === null ? "bg-primary text-white" : "hover:bg-default-100"
                }`}
              >
                Todos ({documents.length})
              </button>
              {allProviders.map((p) => {
                const s = summary[p.id];
                const active = filterProviderId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setFilterProviderId(p.id)}
                    className={`w-full rounded-lg px-3 py-2 text-left ${
                      active ? "bg-secondary text-white" : "hover:bg-default-100"
                    }`}
                  >
                    <p className="text-sm font-semibold">{p.name}</p>
                    <p className={`text-xs ${active ? "text-white/80" : "text-default-500"}`}>
                      Pend {s?.pending ?? 0} · Sub {s?.uploaded ?? 0} · Apr {s?.approved ?? 0} · Rec {s?.rejected ?? 0}
                    </p>
                  </button>
                );
              })}
              {allProviders.length === 0 && <p className="px-2 text-sm text-default-500">No hay proveedores.</p>}
            </div>
          </CardBody>
        </Card>

        <div className="space-y-3">
          <Card className="border border-default-200">
            <CardBody className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Input
                label="Buscar"
                labelPlacement="outside"
                placeholder="Tipo, proveedor o descripción"
                value={q}
                onValueChange={setQ}
                variant="bordered"
              />
              <Select
                label="Año"
                labelPlacement="outside"
                selectedKeys={yearFilter ? [yearFilter] : []}
                onSelectionChange={(keys) => setYearFilter(firstKeyToString(keys))}
                variant="bordered"
              >
                <SelectItem key="2024">2024</SelectItem>
                <SelectItem key="2025">2025</SelectItem>
                <SelectItem key="2026">2026</SelectItem>
              </Select>
              <Select
                label="Estado"
                labelPlacement="outside"
                selectedKeys={statusFilter ? [statusFilter] : []}
                onSelectionChange={(keys) => setStatusFilter(firstKeyToString(keys) as DocumentStatus | "")}
                variant="bordered"
              >
                <SelectItem key="pending">Pendiente</SelectItem>
                <SelectItem key="uploaded">Subido</SelectItem>
                <SelectItem key="approved">Aprobado</SelectItem>
                <SelectItem key="rejected">Rechazado</SelectItem>
              </Select>
            </CardBody>
          </Card>

          <Card className="border border-default-200">
            <CardBody className="overflow-auto p-0">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="bg-default-50 text-default-600">
                  <tr>
                    <th className="px-3 py-2 text-left">Documento</th>
                    <th className="px-3 py-2 text-left">Proveedor</th>
                    <th className="px-3 py-2 text-left">Año</th>
                    <th className="px-3 py-2 text-left">Estado</th>
                    <th className="px-3 py-2 text-left">Archivo</th>
                    <th className="px-3 py-2 text-center">Vista</th>
                    <th className="px-3 py-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocs.map((d) => (
                    <tr key={d.id} className="border-t border-default-100">
                      <td className="px-3 py-2">
                        <p className="font-semibold">{d.documentType}</p>
                        <p className="text-xs text-default-500">{d.description}</p>
                      </td>
                      <td className="px-3 py-2">{d.providerName}</td>
                      <td className="px-3 py-2">{d.year}</td>
                      <td className="px-3 py-2"><StatusBadge status={d.status} /></td>
                      <td className="px-3 py-2">{d.hasFile ? "Sí" : "-"}</td>
                      <td className="px-3 py-2 text-center">
                        {d.hasFile ? (
                          <Button isIconOnly size="sm" variant="light" color="primary" onPress={() => setPreviewDoc(d)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="light" onPress={() => setDetailDoc(d)}>Detalle</Button>
                          <Button as={Link} size="sm" variant="bordered" href={`/dashboard/empresa/proveedor/${d.providerId}`}>
                            Ficha
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredDocs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-default-500">
                        No hay documentos con estos filtros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardBody>
          </Card>
        </div>
      </div>

      {detailDoc && <DocumentDetailModal doc={detailDoc} role="empresa" onClose={() => setDetailDoc(null)} />}
      {previewDoc && previewDoc.hasFile && (
        <DocumentViewerModal
          documentId={previewDoc.id}
          mimeType={previewDoc.mimeType}
          title={previewDoc.documentType}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  );
}
