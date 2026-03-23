"use client";

import { Button, Card, CardBody, Select, SelectItem, Spinner } from "@nextui-org/react";
import { Eye, Info } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { DocumentDetailModal } from "@/components/DocumentDetailModal";
import { DocumentViewerModal } from "@/components/DocumentViewerModal";
import { StatusBadge } from "@/components/StatusBadge";
import type { DocumentRequest } from "@/lib/types";

type P = { id: string; name: string };

function firstKey(keys: unknown): string {
  if (!keys || keys === "all") return "";
  const arr = Array.from(keys as Set<React.Key>);
  return arr[0] ? String(arr[0]) : "";
}

export default function AdminDocumentosPage() {
  const [documents, setDocuments] = useState<DocumentRequest[]>([]);
  const [providers, setProviders] = useState<P[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [providerId, setProviderId] = useState("");
  const [status, setStatus] = useState("");
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailDoc, setDetailDoc] = useState<DocumentRequest | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DocumentRequest | null>(null);

  const load = useCallback(async () => {
    const q = new URLSearchParams();
    q.set("page", String(page));
    q.set("limit", "10");
    if (providerId) q.set("providerId", providerId);
    if (status) q.set("status", status);
    if (year) q.set("year", year);
    const r = await fetch(`/api/admin/documents?${q}`, { credentials: "include" });
    if (r.ok) {
      const d = (await r.json()) as { documents?: DocumentRequest[]; total?: number; totalPages?: number };
      setDocuments(d.documents ?? []);
      setTotal(d.total ?? 0);
      setTotalPages(d.totalPages ?? 1);
    }
    setLoading(false);
  }, [page, providerId, status, year]);

  useEffect(() => {
    void fetch("/api/providers", { credentials: "include" }).then(async (r) => {
      if (r.ok) {
        const d = (await r.json()) as { providers?: P[] };
        setProviders(d.providers ?? []);
      }
    });
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading && !documents.length) return <div className="flex justify-center py-6"><Spinner /></div>;

  return (
    <div className="space-y-4">
      <div><h1 className="text-3xl font-extrabold">Documentos</h1><p className="text-sm text-default-500">Vista global · {total} registros</p></div>

      <Card className="border border-default-200"><CardBody className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Select label="Proveedor" labelPlacement="outside" selectedKeys={providerId ? [providerId] : []} onSelectionChange={(k) => { setPage(1); setProviderId(firstKey(k)); }} variant="bordered">
          {providers.map((p) => <SelectItem key={p.id}>{p.name}</SelectItem>)}
        </Select>
        <Select label="Estado" labelPlacement="outside" selectedKeys={status ? [status] : []} onSelectionChange={(k) => { setPage(1); setStatus(firstKey(k)); }} variant="bordered">
          <SelectItem key="pending">Pendiente</SelectItem><SelectItem key="uploaded">Subido</SelectItem><SelectItem key="approved">Aprobado</SelectItem><SelectItem key="rejected">Rechazado</SelectItem>
        </Select>
        <Select label="Año" labelPlacement="outside" selectedKeys={year ? [year] : []} onSelectionChange={(k) => { setPage(1); setYear(firstKey(k)); }} variant="bordered">
          <SelectItem key="2024">2024</SelectItem><SelectItem key="2025">2025</SelectItem><SelectItem key="2026">2026</SelectItem>
        </Select>
      </CardBody></Card>

      <Card className="border border-default-200"><CardBody className="overflow-auto p-0">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-default-50"><tr><th className="px-3 py-2 text-left">Tipo</th><th className="px-3 py-2 text-left">Proveedor</th><th className="px-3 py-2 text-left">Año</th><th className="px-3 py-2 text-left">Estado</th><th className="px-3 py-2 text-left">Archivo</th><th className="px-3 py-2 text-left">Acciones</th></tr></thead>
          <tbody>
            {documents.map((d) => (
              <tr key={d.id} className="border-t border-default-100">
                <td className="px-3 py-2">{d.documentType}</td><td className="px-3 py-2">{d.providerName}</td><td className="px-3 py-2">{d.year}</td><td className="px-3 py-2"><StatusBadge status={d.status} /></td><td className="px-3 py-2">{d.hasFile ? "Sí" : "-"}</td>
                <td className="px-3 py-2">{d.hasFile ? <div className="flex gap-1"><Button size="sm" isIconOnly variant="light" color="primary" onPress={() => setPreviewDoc(d)}><Eye className="h-4 w-4" /></Button><Button size="sm" variant="light" startContent={<Info className="h-4 w-4" />} onPress={() => setDetailDoc(d)}>Detalle</Button></div> : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardBody></Card>

      <div className="flex items-center justify-between">
        <Button variant="bordered" size="sm" isDisabled={page <= 1} onPress={() => setPage((p) => p - 1)}>Anterior</Button>
        <p className="text-sm">Página {page} de {totalPages}</p>
        <Button variant="bordered" size="sm" isDisabled={page >= totalPages} onPress={() => setPage((p) => p + 1)}>Siguiente</Button>
      </div>

      {detailDoc && <DocumentDetailModal doc={detailDoc} role="admin" onClose={() => setDetailDoc(null)} />}
      {previewDoc && previewDoc.hasFile && <DocumentViewerModal documentId={previewDoc.id} mimeType={previewDoc.mimeType} title={previewDoc.documentType} onClose={() => setPreviewDoc(null)} />}
    </div>
  );
}