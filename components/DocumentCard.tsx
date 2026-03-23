"use client";

import { Alert, Button, Card, CardBody } from "@nextui-org/react";
import { Download, Eye } from "lucide-react";
import { useState } from "react";
import { CURRENT_YEAR } from "@/lib/constants";
import type { DocumentRequest } from "@/lib/types";
import { deadlineMeta } from "@/lib/time";
import { DocumentViewerModal } from "./DocumentViewerModal";
import { StatusBadge } from "./StatusBadge";
import { UploadForm } from "./UploadForm";

type Props = {
  doc: DocumentRequest;
  mode: "empresa" | "proveedor" | "admin";
  onApproved?: () => void;
  onRejected?: () => void;
  onUploaded?: () => void;
};

export function DocumentCard({ doc, mode, onApproved, onRejected, onUploaded }: Props) {
  const [sasBusy, setSasBusy] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  const showActions = mode === "empresa" && (doc.status === "uploaded" || doc.status === "rejected");
  const showUpload =
    mode === "proveedor" && (doc.status === "pending" || doc.status === "rejected") && doc.year === CURRENT_YEAR;

  const deadline = mode === "proveedor" ? deadlineMeta(doc.deadline) : null;

  async function downloadFile() {
    setSasBusy(true);
    try {
      const r = await fetch(
        `/api/files/sas?documentId=${encodeURIComponent(doc.id)}&mode=download`,
        { credentials: "include" }
      );
      const j = (await r.json()) as { url?: string; error?: string };
      if (!r.ok || !j.url) {
        alert(j.error || "No se pudo obtener el enlace");
        return;
      }
      window.open(j.url, "_blank", "noopener,noreferrer");
    } finally {
      setSasBusy(false);
    }
  }

  const downloads = doc.downloads;
  const downloadBlocked =
    mode !== "admin" && downloads && downloads.max !== null && downloads.used >= downloads.max;

  const deadlineColor =
    deadline?.tone === "urgent"
      ? "danger"
      : deadline?.tone === "warn"
        ? "warning"
        : deadline?.tone === "none"
          ? undefined
          : "success";

  return (
    <Card className="border border-default-200 shadow-sm">
      <CardBody className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-base font-semibold">{doc.documentType}</p>
            <p className="text-sm text-default-500">Año {doc.year} · {doc.description}</p>
          </div>
          <StatusBadge status={doc.status} />
        </div>

        {deadline && deadline.tone !== "none" && deadlineColor && (
          <Alert color={deadlineColor as "danger" | "warning" | "success"}>
            <div className="text-sm">
              <span className="font-semibold">Entrega: </span>
              {deadline.label}
              {deadline.daysLeft !== null && deadline.daysLeft >= 0 && deadline.daysLeft <= 3 && (
                <span className="ml-2 rounded bg-danger px-2 py-0.5 text-xs font-bold text-white">URGENTE</span>
              )}
            </div>
          </Alert>
        )}

        {doc.observations && (
          <Alert color="danger">
            <span className="text-sm"><span className="font-semibold">Observación: </span>{doc.observations}</span>
          </Alert>
        )}

        {doc.hasFile && (
          <div className="flex flex-wrap items-center gap-2">
            <Button isIconOnly size="sm" color="primary" variant="light" onPress={() => setViewerOpen(true)}>
              <Eye className="h-4 w-4" />
            </Button>
            {mode !== "admin" && (
              <Button
                size="sm"
                variant="bordered"
                startContent={<Download className="h-4 w-4" />}
                onPress={() => void downloadFile()}
                isDisabled={sasBusy || downloadBlocked}
              >
                {sasBusy ? "..." : "Descargar"}
              </Button>
            )}
            {downloads && mode !== "admin" && (
              <span className="text-xs text-default-500">
                {downloads.max === null ? "Descargas ilimitadas" : `${downloads.used}/${downloads.max} descargas`}
              </span>
            )}
          </div>
        )}

        {viewerOpen && doc.hasFile && (
          <DocumentViewerModal
            documentId={doc.id}
            mimeType={doc.mimeType}
            title={doc.documentType}
            onClose={() => setViewerOpen(false)}
          />
        )}

        {mode === "proveedor" && (doc.status === "pending" || doc.status === "rejected") && doc.year !== CURRENT_YEAR && (
          <p className="text-xs text-default-500">
            La subida solo está habilitada para el año en curso ({CURRENT_YEAR}). Contacta a la empresa si necesitas actualizar este expediente.
          </p>
        )}

        {showUpload && (
          <div className="border-t border-default-200 pt-3">
            <UploadForm documentId={doc.id} onDone={onUploaded} />
          </div>
        )}

        {showActions && (
          <div className="flex flex-wrap gap-2 border-t border-default-200 pt-3">
            {doc.status === "uploaded" && (
              <>
                <Button color="success" size="sm" onPress={onApproved}>Aprobar</Button>
                <Button color="danger" size="sm" onPress={onRejected}>Rechazar</Button>
              </>
            )}
            {doc.status === "rejected" && (
              <p className="text-sm text-default-500">Esperando nueva subida del proveedor.</p>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
