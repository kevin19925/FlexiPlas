"use client";

import { Button, Card, CardBody, Chip, Modal, ModalBody, ModalContent, ModalHeader, Select, SelectItem, Spinner } from "@nextui-org/react";
import { FilePenLine, PlusCircle, Eye } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DocumentViewerModal } from "@/components/DocumentViewerModal";
import { UploadForm } from "@/components/UploadForm";
import { CURRENT_YEAR } from "@/lib/constants";
import type { DocumentRequest, DocumentStatus } from "@/lib/types";
import { deadlineMeta } from "@/lib/time";

type MainTab = "pendientes" | "misArchivos";
const STATUS_LABEL: Record<DocumentStatus, string> = { pending: "Pendiente", uploaded: "En revisión", approved: "Aprobado", rejected: "Rechazado" };

function firstKey(keys: unknown): string {
  if (!keys || keys === "all") return "";
  const arr = Array.from(keys as Set<React.Key>);
  return arr[0] ? String(arr[0]) : "";
}

export function ProveedorDashboardClient() {
  const [documents, setDocuments] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState<MainTab>("pendientes");
  const [yearFilter, setYearFilter] = useState("");
  const [uploadDoc, setUploadDoc] = useState<DocumentRequest | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DocumentRequest | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/documents", { credentials: "include" });
    if (!res.ok) return;
    const data = (await res.json()) as { documents?: DocumentRequest[] };
    setDocuments(data.documents ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const years = useMemo(() => Array.from(new Set(documents.map((d) => d.year))).sort((a, b) => b - a), [documents]);
  const pendientesAnoActual = useMemo(() => documents.filter((d) => d.year === CURRENT_YEAR && (d.status === "pending" || d.status === "rejected" || d.status === "uploaded")), [documents]);
  const porSubirORechazados = useMemo(() => pendientesAnoActual.filter((d) => d.status === "pending" || d.status === "rejected"), [pendientesAnoActual]);
  const enRevision = useMemo(() => pendientesAnoActual.filter((d) => d.status === "uploaded"), [pendientesAnoActual]);
  const pendientesCount = porSubirORechazados.length + enRevision.length;

  const misArchivosFiltrados = useMemo(() => {
    let list = [...documents];
    if (yearFilter) list = list.filter((d) => d.year === Number(yearFilter));
    return list.sort((a, b) => (b.year !== a.year ? b.year - a.year : (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")));
  }, [documents, yearFilter]);

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>;

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold">Mis documentos</h1>
      <p className="text-sm text-default-500">Archivos pendientes para subir/corregir este anio y Mis archivos para historial completo.</p>

      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
        <Card className="border border-default-200 lg:sticky lg:top-20">
          <CardBody className="gap-2 p-3">
            <p className="px-1 text-xs font-bold uppercase tracking-[0.12em] text-default-500">Menú</p>
            <Button
              fullWidth
              className="justify-start"
              variant={mainTab === "pendientes" ? "solid" : "light"}
              color={mainTab === "pendientes" ? "secondary" : "default"}
              onPress={() => setMainTab("pendientes")}
            >
              Archivos pendientes ({pendientesCount})
            </Button>
            <Button
              fullWidth
              className="justify-start"
              variant={mainTab === "misArchivos" ? "solid" : "light"}
              color={mainTab === "misArchivos" ? "primary" : "default"}
              onPress={() => setMainTab("misArchivos")}
            >
              Mis archivos
            </Button>
          </CardBody>
        </Card>

        <div className="space-y-3">

      {mainTab === "pendientes" && (
        <div className="space-y-3">
          <Card className="border border-default-200"><CardBody className="overflow-auto p-0">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="bg-default-50"><tr><th className="px-3 py-2 text-left">Documento</th><th className="px-3 py-2 text-left">Descripción</th><th className="px-3 py-2 text-left">Archivo</th><th className="px-3 py-2 text-left">Fecha límite</th><th className="px-3 py-2 text-left">Observaciones</th><th className="px-3 py-2 text-left">Estado</th><th className="px-3 py-2 text-right">Acciones</th></tr></thead>
              <tbody>
                {porSubirORechazados.map((d) => {
                  const dl = deadlineMeta(d.deadline);
                  return (
                    <tr key={d.id} className="border-t border-default-100">
                      <td className="px-3 py-2 font-semibold">{d.documentType}</td>
                      <td className="px-3 py-2 text-default-500">{d.description}</td>
                      <td className="px-3 py-2"><Chip size="sm" color={d.hasFile ? "success" : "default"}>{d.hasFile ? "Sí" : "No"}</Chip></td>
                      <td className="px-3 py-2">{dl.label}</td>
                      <td className="px-3 py-2">{d.status === "rejected" && d.observations ? <span className="text-danger">{d.observations}</span> : "-"}</td>
                      <td className="px-3 py-2"><Chip size="sm" variant="bordered">{STATUS_LABEL[d.status]}</Chip></td>
                      <td className="px-3 py-2 text-right"><div className="flex justify-end gap-1">{d.hasFile && <Button isIconOnly size="sm" variant="light" color="primary" onPress={() => setPreviewDoc(d)}><Eye className="h-4 w-4" /></Button>}<Button isIconOnly size="sm" variant="light" color="secondary" onPress={() => setUploadDoc(d)}>{d.hasFile ? <FilePenLine className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}</Button></div></td>
                    </tr>
                  );
                })}
                {porSubirORechazados.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-default-500">No hay documentos pendientes de subir para {CURRENT_YEAR}.</td></tr>}
              </tbody>
            </table>
          </CardBody></Card>

          <Card className="border border-default-200"><CardBody className="overflow-auto p-0">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-default-50"><tr><th className="px-3 py-2 text-left">Documento</th><th className="px-3 py-2 text-left">Descripción</th><th className="px-3 py-2 text-left">Archivo</th><th className="px-3 py-2 text-left">Fecha límite</th><th className="px-3 py-2 text-right">Acciones</th></tr></thead>
              <tbody>
                {enRevision.map((d) => { const dl = deadlineMeta(d.deadline); return <tr key={d.id} className="border-t border-default-100"><td className="px-3 py-2 font-semibold">{d.documentType}</td><td className="px-3 py-2 text-default-500">{d.description}</td><td className="px-3 py-2"><Chip size="sm" color="primary">Sí</Chip></td><td className="px-3 py-2">{dl.label}</td><td className="px-3 py-2 text-right">{d.hasFile && <Button isIconOnly size="sm" variant="light" color="primary" onPress={() => setPreviewDoc(d)}><Eye className="h-4 w-4" /></Button>}</td></tr>; })}
                {enRevision.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-default-500">No hay envíos en revisión.</td></tr>}
              </tbody>
            </table>
          </CardBody></Card>
        </div>
      )}

      {mainTab === "misArchivos" && (
        <div className="space-y-3">
          <Select label="Año" labelPlacement="outside" selectedKeys={yearFilter ? [yearFilter] : []} onSelectionChange={(k) => setYearFilter(firstKey(k))} className="max-w-[220px]" variant="bordered">
            {years.map((y) => <SelectItem key={String(y)}>{String(y)}</SelectItem>)}
          </Select>
          <Card className="border border-default-200"><CardBody className="overflow-auto p-0">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-default-50"><tr><th className="px-3 py-2 text-left">Documento</th><th className="px-3 py-2 text-left">Año</th><th className="px-3 py-2 text-left">Descripción</th><th className="px-3 py-2 text-left">Archivo</th><th className="px-3 py-2 text-left">Estado</th><th className="px-3 py-2 text-right">Acciones</th></tr></thead>
              <tbody>
                {misArchivosFiltrados.map((d) => {
                  const canUpload = d.year === CURRENT_YEAR && (d.status === "pending" || d.status === "rejected");
                  return <tr key={d.id} className="border-t border-default-100"><td className="px-3 py-2 font-semibold">{d.documentType}</td><td className="px-3 py-2">{d.year}</td><td className="px-3 py-2 text-default-500">{d.description}</td><td className="px-3 py-2"><Chip size="sm" color={d.hasFile ? "success" : "default"}>{d.hasFile ? "Sí" : "No"}</Chip></td><td className="px-3 py-2"><Chip size="sm" variant="bordered">{STATUS_LABEL[d.status]}</Chip></td><td className="px-3 py-2 text-right"><div className="flex justify-end gap-1">{d.hasFile && <Button isIconOnly size="sm" variant="light" color="primary" onPress={() => setPreviewDoc(d)}><Eye className="h-4 w-4" /></Button>}{canUpload && <Button isIconOnly size="sm" variant="light" color="secondary" onPress={() => setUploadDoc(d)}>{d.hasFile ? <FilePenLine className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}</Button>}</div></td></tr>;
                })}
                {misArchivosFiltrados.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-default-500">No hay registros para este filtro.</td></tr>}
              </tbody>
            </table>
          </CardBody></Card>
        </div>
      )}
        </div>
      </div>

      <Modal isOpen={Boolean(uploadDoc)} onOpenChange={(open) => !open && setUploadDoc(null)} size="2xl">
        <ModalContent>
          <ModalHeader>Subir archivo{uploadDoc ? ` · ${uploadDoc.documentType}` : ""}</ModalHeader>
          <ModalBody>{uploadDoc && <UploadForm documentId={uploadDoc.id} onDone={() => { setUploadDoc(null); void load(); }} />}</ModalBody>
        </ModalContent>
      </Modal>

      {previewDoc && previewDoc.hasFile && <DocumentViewerModal documentId={previewDoc.id} mimeType={previewDoc.mimeType} title={previewDoc.documentType} onClose={() => setPreviewDoc(null)} />}
    </div>
  );
}