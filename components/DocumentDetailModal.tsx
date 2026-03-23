"use client";

import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@nextui-org/react";
import { Download, Eye } from "lucide-react";
import { useState } from "react";
import type { DocumentRequest } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import { DocumentViewerModal } from "./DocumentViewerModal";

type Props = {
  doc: DocumentRequest | null;
  onClose: () => void;
  role: "admin" | "empresa" | "proveedor";
  /** Cuando el documento está en revisión, la empresa puede aprobar o solicitar rechazo (observación en modal aparte). */
  empresaModeration?: {
    onApprove: () => void | Promise<void>;
    onRejectRequest: () => void;
  };
};

export function DocumentDetailModal({ doc, onClose, role, empresaModeration }: Props) {
  const [busy, setBusy] = useState(false);
  const [approveBusy, setApproveBusy] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  if (!doc) return null;
  const d = doc;

  async function download() {
    setBusy(true);
    try {
      const r = await fetch(
        `/api/files/sas?documentId=${encodeURIComponent(d.id)}&mode=download`,
        { credentials: "include" }
      );
      const j = (await r.json()) as { url?: string; error?: string };
      if (!r.ok || !j.url) {
        alert(j.error || "Sin archivo o error");
        return;
      }
      window.open(j.url, "_blank", "noopener,noreferrer");
    } finally {
      setBusy(false);
    }
  }

  const dl = d.downloads;
  const downloadBlocked = role !== "admin" && dl && dl.max !== null && dl.used >= dl.max;

  return (
    <>
      <Modal isOpen onOpenChange={(open) => !open && onClose()} size="2xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">{d.documentType}</p>
            </div>
            <StatusBadge status={d.status} />
          </ModalHeader>
          <ModalBody>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-default-500">Año</p>
                <p className="font-semibold">{d.year}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-default-500">Descripción</p>
                <p>{d.description}</p>
              </div>
              {d.observations && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-default-500">Observación</p>
                  <p className="text-danger">{d.observations}</p>
                </div>
              )}
              {role !== "admin" && dl && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-default-500">Descargas de archivo</p>
                  <p>{dl.max === null ? "Ilimitadas (vista previa no cuenta)" : `${dl.used} de ${dl.max} usadas`}</p>
                </div>
              )}
            </div>
            {role === "admin" && d.hasFile && (
              <p className="text-xs text-default-500">
                Como administrador solo puedes revisar el contenido aquí; la descarga directa está desactivada.
              </p>
            )}
          </ModalBody>
          <ModalFooter className="flex-wrap gap-2">
            {role === "empresa" &&
              d.status === "uploaded" &&
              d.hasFile &&
              empresaModeration && (
                <>
                  <Button
                    color="success"
                    className="font-bold text-white"
                    isDisabled={approveBusy}
                    onPress={() => {
                      setApproveBusy(true);
                      void Promise.resolve(empresaModeration.onApprove()).finally(() => setApproveBusy(false));
                    }}
                  >
                    {approveBusy ? "…" : "Aprobar"}
                  </Button>
                  <Button color="danger" variant="flat" onPress={empresaModeration.onRejectRequest}>
                    Rechazar
                  </Button>
                </>
              )}
            {d.hasFile && (
              <>
                <Button color="primary" startContent={<Eye className="h-4 w-4" />} onPress={() => setViewerOpen(true)}>
                  Vista previa
                </Button>
                {role !== "admin" && (
                  <Button
                    variant="bordered"
                    startContent={<Download className="h-4 w-4" />}
                    onPress={() => void download()}
                    isDisabled={busy || downloadBlocked}
                  >
                    {busy ? "..." : "Descargar"}
                  </Button>
                )}
              </>
            )}
            <Button variant="light" onPress={onClose}>Cerrar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      {viewerOpen && d.hasFile && (
        <DocumentViewerModal
          documentId={d.id}
          mimeType={d.mimeType}
          title={d.documentType}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </>
  );
}
