"use client";

import { useState } from "react";
import { XCircle } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";

interface RejectModalProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
  documentType: string;
  onSuccess: () => void;
}

export default function RejectModal({
  open,
  onClose,
  documentId,
  documentType,
  onSuccess,
}: RejectModalProps) {
  const [observations, setObservations] = useState("");
  const [loading, setLoading] = useState(false);

  const MIN_CHARS = 5;
  const error =
    observations.length > 0 && observations.length < MIN_CHARS
      ? `Mínimo ${MIN_CHARS} caracteres`
      : "";

  async function handleSubmit() {
    if (observations.trim().length < MIN_CHARS) {
      toast.error(`Las observaciones deben tener al menos ${MIN_CHARS} caracteres`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          observations: observations.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al rechazar");
      }

      toast.success("Documento rechazado correctamente");
      setObservations("");
      onSuccess();
      onClose();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Error desconocido";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Rechazar Documento"
      size="md"
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl border border-red-200">
          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">
              Rechazando: {documentType}
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              El proveedor recibirá una notificación con el motivo del rechazo.
            </p>
          </div>
        </div>

        <Textarea
          label="Motivo del rechazo (observaciones)"
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          placeholder="Describa detalladamente por qué el documento fue rechazado..."
          maxLength={500}
          showCount
          error={error}
          className="min-h-[140px]"
        />

        <div className="flex gap-3">
          <Button
            variant="secondary"
            fullWidth
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            fullWidth
            onClick={handleSubmit}
            loading={loading}
            disabled={observations.trim().length < MIN_CHARS}
          >
            Confirmar Rechazo
          </Button>
        </div>
      </div>
    </Modal>
  );
}
