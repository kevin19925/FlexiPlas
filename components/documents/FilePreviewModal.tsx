"use client";

import { useState, useEffect } from "react";
import { X, Download, Loader2, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { isImageFile, isPdfFile } from "@/lib/utils";
import Button from "@/components/ui/Button";

interface FilePreviewModalProps {
  open: boolean;
  onClose: () => void;
  blobName: string;
  fileName: string;
}

export default function FilePreviewModal({
  open,
  onClose,
  blobName,
  fileName,
}: FilePreviewModalProps) {
  const [sasUrl, setSasUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchSasUrl() {
    setLoading(true);
    try {
      // Usamos el endpoint de descarga que genera SAS URL
      const res = await fetch(`/api/upload/download/${encodeURIComponent(blobName)}`, {
        redirect: "manual",
      });
      // El endpoint hace redirect, obtenemos la URL final
      const url = res.headers.get("location") || res.url;
      if (url && url !== window.location.href) {
        setSasUrl(url);
      } else {
        // Fallback: simplemente construir la URL del download  
        setSasUrl(`/api/upload/download/${encodeURIComponent(blobName)}`);
      }
    } catch {
      setSasUrl(`/api/upload/download/${encodeURIComponent(blobName)}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && !sasUrl) {
      fetchSasUrl();
    }
    if (!open) {
      setSasUrl(null);
    }
  }, [open, blobName]);

  const isImage = isImageFile(fileName);
  const isPdf = isPdfFile(fileName);

  function handleDownload() {
    window.open(`/api/upload/download/${encodeURIComponent(blobName)}`, "_blank");
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative bg-white rounded-2xl shadow-2xl z-10 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <h2 className="text-sm font-semibold text-slate-900 truncate">{fileName}</h2>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button variant="secondary" size="sm" onClick={handleDownload}>
                  <Download className="w-3.5 h-3.5" />
                  Descargar
                </Button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-slate-50">
              {loading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                  <p className="text-sm text-slate-500">Cargando archivo...</p>
                </div>
              ) : isImage && sasUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={sasUrl}
                  alt={fileName}
                  className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-sm"
                />
              ) : isPdf ? (
                <div className="flex flex-col items-center gap-4 py-8">
                  <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center">
                    <FileText className="w-8 h-8 text-red-600" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-700 mb-1">Archivo PDF</p>
                    <p className="text-xs text-slate-500 mb-4">{fileName}</p>
                    <Button onClick={handleDownload}>
                      <Download className="w-4 h-4" />
                      Abrir PDF en Nueva Pestaña
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-8">
                  <FileText className="w-12 h-12 text-slate-300" />
                  <p className="text-sm text-slate-500">Vista previa no disponible</p>
                  <Button variant="secondary" onClick={handleDownload}>
                    <Download className="w-4 h-4" />
                    Descargar Archivo
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
