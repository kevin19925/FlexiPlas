"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Upload,
  AlertCircle,
  Calendar,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import DeadlineBadge from "@/components/ui/DeadlineBadge";
import Button from "@/components/ui/Button";
import UploadForm from "./UploadForm";
import RejectModal from "./RejectModal";
import FilePreviewModal from "./FilePreviewModal";
import { formatDate } from "@/lib/utils";
import type { IDocument } from "@/lib/types";
import toast from "react-hot-toast";

interface DocumentCardProps {
  doc: IDocument;
  userRole: "ADMIN" | "EMPRESA" | "PROVEEDOR";
  onRefresh: () => void;
  showProvider?: boolean;
}

export default function DocumentCard({
  doc,
  userRole,
  onRefresh,
  showProvider = false,
}: DocumentCardProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [approving, setApproving] = useState(false);

  const canUpload =
    userRole === "PROVEEDOR" &&
    (doc.status === "PENDING" || doc.status === "REJECTED");
  const canApproveReject =
    (userRole === "ADMIN" || userRole === "EMPRESA") &&
    doc.status === "UPLOADED";

  async function handleApprove() {
    setApproving(true);
    try {
      const res = await fetch(`/api/documents/${doc._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al aprobar");
      }
      toast.success("Documento aprobado");
      onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setApproving(false);
    }
  }

  async function handleDownload() {
    if (!doc.blobName) return;
    window.open(`/api/upload/download/${encodeURIComponent(doc.blobName)}`, "_blank");
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="card hover:shadow-md transition-shadow duration-200"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 truncate">{doc.documentType}</h3>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Calendar className="w-3 h-3" />
              <span>Año {doc.year}</span>
              {showProvider && doc.providerName && (
                <span>· {doc.providerName}</span>
              )}
            </div>
          </div>
        </div>
        <StatusBadge status={doc.status} className="flex-shrink-0" />
      </div>

      {/* Description */}
      <p className="text-sm text-slate-600 mb-3 line-clamp-2">{doc.description}</p>

      {/* Deadline */}
      {doc.deadline && (
        <div className="mb-3">
          <DeadlineBadge deadline={doc.deadline} />
        </div>
      )}

      {/* Rejection observations */}
      {doc.status === "REJECTED" && doc.observations && (
        <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-3">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-red-700 mb-0.5">Motivo del rechazo:</p>
            <p className="text-xs text-red-600">{doc.observations}</p>
          </div>
        </div>
      )}

      {/* File info */}
      {doc.fileName && (
        <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 mb-3">
          <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <span className="text-xs text-slate-600 truncate flex-1">{doc.fileName}</span>
        </div>
      )}

      {/* Upload form */}
      <AnimatePresence>
        {showUpload && canUpload && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 overflow-hidden"
          >
            <div className="py-2">
              <UploadForm
                documentId={doc._id}
                onSuccess={() => {
                  setShowUpload(false);
                  onRefresh();
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
        {/* Provider actions */}
        {canUpload && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowUpload(!showUpload)}
          >
            <Upload className="w-3.5 h-3.5" />
            {showUpload ? "Cancelar" : doc.status === "REJECTED" ? "Volver a Subir" : "Subir Archivo"}
          </Button>
        )}

        {/* Company/Admin actions */}
        {canApproveReject && (
          <>
            <Button
              variant="primary"
              size="sm"
              onClick={handleApprove}
              loading={approving}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Aprobar
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowReject(true)}
            >
              <XCircle className="w-3.5 h-3.5" />
              Rechazar
            </Button>
          </>
        )}

        {/* File actions */}
        {doc.blobName && (
          <>
            <Button variant="ghost" size="sm" onClick={() => setShowPreview(true)}>
              <Eye className="w-3.5 h-3.5" />
              Ver
            </Button>
            <Button variant="secondary" size="sm" onClick={handleDownload}>
              <Download className="w-3.5 h-3.5" />
              Descargar
            </Button>
          </>
        )}
      </div>

      <p className="text-xs text-slate-400 mt-2">
        Creado: {formatDate(doc.createdAt)}
      </p>

      {/* Modals */}
      <RejectModal
        open={showReject}
        onClose={() => setShowReject(false)}
        documentId={doc._id}
        documentType={doc.documentType}
        onSuccess={onRefresh}
      />

      {doc.blobName && doc.fileName && (
        <FilePreviewModal
          open={showPreview}
          onClose={() => setShowPreview(false)}
          blobName={doc.blobName}
          fileName={doc.fileName}
        />
      )}
    </motion.div>
  );
}
