"use client";

import {
  Alert,
  Button,
  Card,
  CardBody,
  Input,
  Progress,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@nextui-org/react";
import { CloudUpload, FileUp, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { DocumentViewerModal } from "@/components/DocumentViewerModal";
import { useToast } from "@/components/ToastHost";
import { cn } from "@/lib/utils";
import type { EmpresaUploadedFile } from "@/lib/types";

type Mode = "empresa" | "cliente";

const ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp";

const MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/webp",
]);

function fileLooksAllowed(f: File): boolean {
  const t = (f.type || "").toLowerCase();
  if (ALLOWED_MIME.has(t)) return true;
  const n = f.name.toLowerCase();
  return /\.(pdf|jpe?g|png|webp)$/i.test(n);
}

function formatFileSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export function EmpresaCorporativosClient({
  mode,
  showPageTitle = true,
}: {
  mode: Mode;
  /** Si false, no muestra el bloque de título (p. ej. portal cliente con cabecera propia). */
  showPageTitle?: boolean;
}) {
  const toast = useToast();
  const [files, setFiles] = useState<EmpresaUploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewer, setViewer] = useState<{ id: string; mime: string; title: string } | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    const res = await fetch("/api/empresa-files", { credentials: "include" });
    const data = (await res.json().catch(() => ({}))) as { files?: EmpresaUploadedFile[]; error?: string };
    if (!res.ok) {
      setErr(data.error || "No se pudo cargar la lista");
      setFiles([]);
      setLoading(false);
      return;
    }
    setFiles(data.files ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function validatePickedFile(f: File): string | null {
    if (f.size > MAX_BYTES) return "El archivo supera el límite de 10MB";
    if (!fileLooksAllowed(f)) return "Solo PDF, JPG, PNG o WEBP";
    return null;
  }

  function pickFiles(list: FileList | null) {
    if (!list?.length) return;
    const f = list[0];
    const msg = validatePickedFile(f);
    if (msg) {
      toast(msg, "error");
      return;
    }
    setFile(f);
  }

  function clearPickedFile() {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function onUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title.trim() || !documentType.trim()) {
      toast("Archivo, título y tipo son obligatorios", "error");
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", title.trim());
    fd.append("documentType", documentType.trim());
    if (description.trim()) fd.append("description", description.trim());

    setUploading(true);
    setUploadProgress(0);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/empresa-files");
    xhr.withCredentials = true;
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
      }
    };
    xhr.onload = () => {
      setUploading(false);
      setUploadProgress(0);
      let data: { error?: string } = {};
      try {
        data = JSON.parse(xhr.responseText || "{}") as { error?: string };
      } catch {
        /* ignore */
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        toast("Archivo subido", "success");
        setTitle("");
        setDocumentType("");
        setDescription("");
        clearPickedFile();
        void load();
      } else {
        toast(data.error || "Error al subir", "error");
      }
    };
    xhr.onerror = () => {
      setUploading(false);
      setUploadProgress(0);
      toast("Error de red", "error");
    };
    xhr.send(fd);
  }

  async function removeFile(id: string) {
    if (!confirm("¿Eliminar este archivo?")) return;
    const res = await fetch(`/api/empresa-files/${id}`, { method: "DELETE", credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast((data as { error?: string }).error || "Error al eliminar", "error");
      return;
    }
    toast("Eliminado", "info");
    void load();
  }

  async function downloadFile(f: EmpresaUploadedFile) {
    const res = await fetch(
      `/api/empresa-files/${encodeURIComponent(f.id)}/sas?mode=download`,
      { credentials: "include" }
    );
    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!res.ok || !data.url) {
      toast(data.error || "No se pudo descargar", "error");
      return;
    }
    window.open(data.url, "_blank", "noopener,noreferrer");
  }

  const heading =
    mode === "empresa"
      ? "Mis archivos de la empresa"
      : "Documentos de la empresa";
  const sub =
    mode === "empresa"
      ? "Solo documentos propios de tu empresa (RUC, certificados, pólizas, etc.). No uses esta sección para archivos de proveedores; esos van en Solicitudes / Gestión de archivos. Los clientes vinculados pueden ver y descargar lo que subas aquí, según el límite de descargas de su usuario."
      : "Archivos que la empresa ha subido sobre sí misma para que los consultes o descargues (según tu límite de descargas).";

  if (loading) {
    if (!showPageTitle) {
      return <Skeleton className="h-64 w-full rounded-xl" />;
    }
    return <p className="text-default-500">Cargando...</p>;
  }

  return (
    <div className="space-y-4">
      {showPageTitle && (
        <div>
          <h1 className="text-3xl font-extrabold text-primary">{heading}</h1>
          <p className="text-default-500">{sub}</p>
        </div>
      )}

      {err && (
        <Alert color="danger" variant="bordered">
          {err}
        </Alert>
      )}

      {mode === "empresa" && (
        <Card className="border border-default-200 shadow-sm">
          <CardBody className="gap-4 p-5 sm:p-6">
            <div>
              <h2 className="text-lg font-bold text-primary">Subir documento corporativo</h2>
              <p className="text-small text-default-500">
                Solo archivos de tu empresa; los clientes podrán descargarlos desde su cuenta. PDF, JPG, PNG o WEBP · máx. 10 MB.
              </p>
            </div>
            <form onSubmit={onUpload} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="Título"
                  labelPlacement="outside"
                  value={title}
                  onValueChange={setTitle}
                  variant="bordered"
                  isRequired
                  classNames={{ label: "text-sm font-semibold text-primary" }}
                />
                <Input
                  label="Tipo de documento"
                  labelPlacement="outside"
                  value={documentType}
                  onValueChange={setDocumentType}
                  placeholder="Ej. RUC"
                  variant="bordered"
                  isRequired
                  classNames={{ label: "text-sm font-semibold text-primary" }}
                />
                <Input
                  label="Descripción (opcional)"
                  labelPlacement="outside"
                  value={description}
                  onValueChange={setDescription}
                  variant="bordered"
                  className="sm:col-span-2"
                  classNames={{ label: "text-sm font-semibold text-primary" }}
                />
              </div>

              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (!uploading) fileInputRef.current?.click();
                  }
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!uploading) setDragOver(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!uploading) setDragOver(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOver(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOver(false);
                  if (!uploading) pickFiles(e.dataTransfer.files);
                }}
                onClick={() => !uploading && fileInputRef.current?.click()}
                className={cn(
                  "cursor-pointer rounded-2xl border-2 border-dashed px-4 py-10 text-center transition-all outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2",
                  uploading && "pointer-events-none opacity-60",
                  dragOver
                    ? "border-secondary bg-secondary/10 shadow-inner"
                    : "border-default-300 bg-default-50/80 hover:border-secondary/60 hover:bg-secondary/5"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT}
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => pickFiles(e.target.files)}
                />
                <FileUp
                  className={cn(
                    "mx-auto mb-3 h-11 w-11",
                    dragOver ? "text-secondary" : "text-default-400"
                  )}
                  aria-hidden
                />
                <p className="text-sm font-medium text-foreground">
                  Arrastra tu archivo aquí
                </p>
                <p className="mt-1 text-small text-default-500">
                  o{" "}
                  <span className="font-semibold text-secondary underline-offset-2">
                    haz clic para elegir
                  </span>
                </p>
              </div>

              {file && (
                <div className="flex items-center gap-3 rounded-xl border border-default-200 bg-content1 px-3 py-2.5 shadow-sm">
                  <CloudUpload className="h-5 w-5 shrink-0 text-secondary" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{file.name}</p>
                    <p className="text-tiny text-default-500">{formatFileSize(file.size)}</p>
                  </div>
                  <Button
                    type="button"
                    isIconOnly
                    size="sm"
                    variant="light"
                    aria-label="Quitar archivo"
                    isDisabled={uploading}
                    onPress={clearPickedFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {uploading && (
                <div className="space-y-1">
                  <Progress
                    aria-label="Progreso de subida"
                    value={uploadProgress || 12}
                    className="h-2"
                    color="secondary"
                  />
                  <p className="text-tiny text-default-500">
                    Subiendo… {uploadProgress > 0 ? `${uploadProgress}%` : ""}
                  </p>
                </div>
              )}

              <Button
                type="submit"
                color="secondary"
                className="font-bold"
                isDisabled={uploading || !file}
                startContent={!uploading ? <CloudUpload className="h-4 w-4" /> : undefined}
              >
                {uploading ? "Subiendo…" : "Subir archivo"}
              </Button>
            </form>
          </CardBody>
        </Card>
      )}

      <Card className="border border-default-200">
        <CardBody className="overflow-x-auto p-0">
          <Table aria-label="Archivos corporativos" removeWrapper>
            <TableHeader>
              <TableColumn>Título</TableColumn>
              <TableColumn>Tipo</TableColumn>
              <TableColumn>Archivo</TableColumn>
              <TableColumn>{mode === "cliente" ? "Descargas" : " "}</TableColumn>
              <TableColumn align="end">Acciones</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No hay archivos">
              {files.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>{f.title}</TableCell>
                  <TableCell>{f.documentType}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{f.fileName}</TableCell>
                  <TableCell className="text-default-500 text-sm">
                    {mode === "cliente" && f.downloads
                      ? `${f.downloads.used}${f.downloads.max == null ? " (ilimitado)" : ` / ${f.downloads.max}`}`
                      : mode === "cliente"
                        ? "—"
                        : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button
                        size="sm"
                        variant="flat"
                        onPress={() => setViewer({ id: f.id, mime: f.mimeType, title: f.title })}
                      >
                        Ver
                      </Button>
                      <Button size="sm" color="primary" variant="flat" onPress={() => void downloadFile(f)}>
                        Descargar
                      </Button>
                      {mode === "empresa" && (
                        <Button size="sm" color="danger" variant="light" onPress={() => void removeFile(f.id)}>
                          Eliminar
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      {viewer && (
        <DocumentViewerModal
          empresaFileId={viewer.id}
          mimeType={viewer.mime}
          title={viewer.title}
          onClose={() => setViewer(null)}
        />
      )}
    </div>
  );
}
