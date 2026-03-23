"use client";

import { Button, Modal, ModalBody, ModalContent, ModalHeader, Spinner } from "@nextui-org/react";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
  documentId: string;
  mimeType: string | null | undefined;
  title: string;
  onClose: () => void;
};

export function DocumentViewerModal({ documentId, mimeType, title, onClose }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(
          `/api/files/sas?documentId=${encodeURIComponent(documentId)}&mode=view`,
          { credentials: "include" }
        );
        const j = (await r.json()) as { url?: string; error?: string };
        if (cancelled) return;
        if (!r.ok || !j.url) {
          setErr(j.error || "No se pudo cargar la vista previa");
          return;
        }
        setUrl(j.url);
      } catch {
        if (!cancelled) setErr("Error de red");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()} size="5xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex items-center justify-between gap-2">
          <p className="truncate text-base font-semibold">{title}</p>
          <Button isIconOnly size="sm" variant="light" onPress={onClose} aria-label="Cerrar">
            <X className="h-4 w-4" />
          </Button>
        </ModalHeader>
        <ModalBody className="p-0">
          <div className="min-h-[360px] bg-default-100">
            {loading && (
              <div className="flex min-h-[360px] items-center justify-center gap-2 text-default-500">
                <Spinner size="sm" />
                <span>Cargando vista previa...</span>
              </div>
            )}
            {err && !loading && (
              <div className="p-6 text-center text-danger">{err}</div>
            )}
            {url && !err && !loading && (
              <div className="min-h-[420px]">
                {mimeType?.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element -- SAS URL externa temporal
                  <img
                    src={url}
                    alt={title}
                    className="mx-auto block max-h-[min(80vh,720px)] max-w-full object-contain"
                  />
                ) : (
                  <iframe
                    title={title}
                    src={url}
                    className="h-[min(80vh,720px)] w-full border-0 bg-white"
                  />
                )}
              </div>
            )}
          </div>
          <div className="border-t border-default-200 bg-default-50 px-3 py-2 text-xs text-default-500">
            Vista previa con enlace temporal. Solo lectura en pantalla.
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
