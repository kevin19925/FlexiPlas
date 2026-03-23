"use client";

import { useState, useEffect } from "react";
import { Plus, Tag } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import { DOCUMENT_TYPES, type IProvider } from "@/lib/types";
import { getCurrentYear, getYearRange } from "@/lib/utils";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface NewDocumentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultProviderId?: string;
}

export default function NewDocumentModal({
  open,
  onClose,
  onSuccess,
  defaultProviderId,
}: NewDocumentModalProps) {
  const [providers, setProviders] = useState<IProvider[]>([]);
  const [providerId, setProviderId] = useState(defaultProviderId || "");
  const [documentType, setDocumentType] = useState("");
  const [customType, setCustomType] = useState("");
  const [year, setYear] = useState(String(getCurrentYear()));
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);
  const [useCustomType, setUseCustomType] = useState(false);

  useEffect(() => {
    if (!defaultProviderId) {
      fetch("/api/providers")
        .then((r) => r.json())
        .then((data) => setProviders(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
  }, [defaultProviderId]);

  useEffect(() => {
    if (defaultProviderId) setProviderId(defaultProviderId);
  }, [defaultProviderId]);

  const finalType = useCustomType ? customType : documentType;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!providerId || !finalType || !year || !description) {
      toast.error("Todos los campos son requeridos");
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        providerId,
        documentType: finalType,
        year: parseInt(year),
        description,
      };
      if (deadline) body.deadline = deadline;

      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al crear solicitud");
      }

      toast.success("Solicitud de documento creada");
      // Reset
      setDocumentType("");
      setCustomType("");
      setDescription("");
      setDeadline("");
      if (!defaultProviderId) setProviderId("");
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  const yearOptions = getYearRange().map((y) => ({ value: String(y), label: String(y) }));
  const providerOptions = providers.map((p) => ({ value: p._id, label: `${p.name} (${p.ruc})` }));

  return (
    <Modal open={open} onClose={onClose} title="Nueva Solicitud de Documento" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Provider selector */}
        {!defaultProviderId && (
          <Select
            label="Proveedor"
            value={providerId}
            onChange={(e) => setProviderId(e.target.value)}
            options={providerOptions}
            placeholder="Seleccionar proveedor..."
            required
          />
        )}

        {/* Year */}
        <Select
          label="Año"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          options={yearOptions}
          required
        />

        {/* Document type chips */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">
            Tipo de Documento
          </label>
          <div className="flex flex-wrap gap-2">
            {DOCUMENT_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setDocumentType(type);
                  setUseCustomType(false);
                }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                  documentType === type && !useCustomType
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                )}
              >
                <Tag className="w-3 h-3" />
                {type}
              </button>
            ))}
            <button
              type="button"
              onClick={() => { setUseCustomType(true); setDocumentType(""); }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                useCustomType
                  ? "bg-slate-700 text-white border-slate-700"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
              )}
            >
              <Plus className="w-3 h-3" />
              Otro tipo
            </button>
          </div>

          {useCustomType && (
            <Input
              placeholder="Escribir tipo personalizado..."
              value={customType}
              onChange={(e) => setCustomType(e.target.value)}
            />
          )}
        </div>

        {/* Description */}
        <Textarea
          label="Descripción / Instrucciones"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describa exactamente qué documento se necesita y cualquier instrucción especial..."
          maxLength={500}
          showCount
          required
        />

        {/* Deadline */}
        <Input
          label="Fecha Límite (opcional)"
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          min={new Date().toISOString().split("T")[0]}
        />

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" fullWidth onClick={onClose} type="button" disabled={loading}>
            Cancelar
          </Button>
          <Button fullWidth type="submit" loading={loading}>
            Crear Solicitud
          </Button>
        </div>
      </form>
    </Modal>
  );
}
