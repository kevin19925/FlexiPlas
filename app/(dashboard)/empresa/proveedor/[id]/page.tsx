"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  Plus,
  FileText,
  Filter,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import DocumentCard from "@/components/documents/DocumentCard";
import TraceabilityTable from "@/components/documents/TraceabilityTable";
import NewDocumentModal from "@/components/documents/NewDocumentModal";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { getYearRange, getCurrentYear } from "@/lib/utils";
import toast from "react-hot-toast";

type DocStatus = "PENDING" | "UPLOADED" | "APPROVED" | "REJECTED";
type IDocument = {
  _id: string;
  providerId: string;
  providerName?: string;
  documentType: string;
  year: number;
  description: string;
  status: DocStatus;
  fileName?: string | null;
  fileUrl?: string | null;
  blobName?: string | null;
  observations?: string | null;
  deadline?: string | null;
  createdAt: string;
  updatedAt: string;
};
type IProviderWithStats = {
  _id: string;
  name: string;
  ruc: string;
  email?: string | null;
  phone?: string | null;
  stats: {
    total: number;
    pending: number;
    uploaded: number;
    approved: number;
    rejected: number;
  };
};

export default function ProviderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const providerId = params.id as string;

  const [provider, setProvider] = useState<IProviderWithStats | null>(null);
  const [documents, setDocuments] = useState<IDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDoc, setShowNewDoc] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<IDocument | null>(null);

  // Filters
  const [filterYear, setFilterYear] = useState(String(getCurrentYear()));
  const [filterStatus, setFilterStatus] = useState<DocStatus | "">("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/providers/${providerId}`);
      if (!res.ok) throw new Error("Proveedor no encontrado");
      const data = await res.json();
      setProvider({
        ...data.provider,
        stats: data.stats,
      });
      setDocuments(data.documents);
    } catch {
      toast.error("Error al cargar el proveedor");
      router.push("/dashboard/empresa");
    } finally {
      setLoading(false);
    }
  }, [providerId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredDocs = documents.filter((d) => {
    if (filterYear && d.year !== parseInt(filterYear)) return false;
    if (filterStatus && d.status !== filterStatus) return false;
    return true;
  });

  const uploadedDocs = filteredDocs.filter((d) => d.status === "UPLOADED");

  const statusOptions: { value: string; label: string }[] = [
    { value: "PENDING", label: "Pendientes" },
    { value: "UPLOADED", label: "Subidos" },
    { value: "APPROVED", label: "Aprobados" },
    { value: "REJECTED", label: "Rechazados" },
  ];

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (!provider) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back + Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl hover:bg-white hover:shadow-sm transition-all text-slate-500 hover:text-slate-700 mt-1"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{provider.name}</h2>
              <p className="text-sm text-slate-500">RUC: {provider.ruc}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 ml-13 mt-2">
            {provider.email && (
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <Mail className="w-3.5 h-3.5" /> {provider.email}
              </span>
            )}
            {provider.phone && (
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <Phone className="w-3.5 h-3.5" /> {provider.phone}
              </span>
            )}
          </div>
        </div>

        <Button onClick={() => setShowNewDoc(true)}>
          <Plus className="w-4 h-4" /> Nueva Solicitud
        </Button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Pendientes", value: provider.stats.pending, color: "bg-amber-50 text-amber-700 border-amber-200" },
          { label: "Subidos", value: provider.stats.uploaded, color: "bg-blue-50 text-blue-700 border-blue-200" },
          { label: "Aprobados", value: provider.stats.approved, color: "bg-green-50 text-green-700 border-green-200" },
          { label: "Rechazados", value: provider.stats.rejected, color: "bg-red-50 text-red-700 border-red-200" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-3 text-center ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs font-medium opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Alert: uploaded docs pending review */}
      {uploadedDocs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-2xl"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
          <p className="text-sm text-blue-800 font-medium">
            {uploadedDocs.length} documento{uploadedDocs.length > 1 ? "s" : ""} pendiente{uploadedDocs.length > 1 ? "s" : ""} de revisión
          </p>
        </motion.div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
          options={getYearRange().map((y) => ({ value: String(y), label: String(y) }))}
          placeholder="Todos los años"
          className="w-36"
        />
        <Select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as DocStatus | "")}
          options={statusOptions}
          placeholder="Todos los estados"
          className="w-44"
        />
        {(filterYear || filterStatus) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setFilterYear(""); setFilterStatus(""); }}
          >
            <Filter className="w-3.5 h-3.5" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Documents grid */}
      {filteredDocs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Sin documentos"
          description="Crea una nueva solicitud para este proveedor"
          action={
            <Button onClick={() => setShowNewDoc(true)}>
              <Plus className="w-4 h-4" /> Nueva Solicitud
            </Button>
          }
        />
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDocs.map((doc) => (
              <DocumentCard
                key={doc._id}
                doc={doc}
                userRole="EMPRESA"
                onRefresh={fetchData}
              />
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Traceability table */}
      {documents.length > 0 && (
        <div className="card space-y-4">
          <h3 className="text-base font-semibold text-slate-900">
            Trazabilidad Histórica
          </h3>
          <TraceabilityTable
            documents={documents}
            onCellClick={(doc) => setSelectedDoc(doc)}
          />
        </div>
      )}

      {/* Selected doc modal from traceability */}
      <Modal
        open={!!selectedDoc}
        onClose={() => setSelectedDoc(null)}
        title="Detalle del Documento"
        size="md"
      >
        {selectedDoc && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900">{selectedDoc.documentType}</p>
                <p className="text-sm text-slate-500">Año {selectedDoc.year}</p>
              </div>
              <StatusBadge status={selectedDoc.status} />
            </div>
            <p className="text-sm text-slate-600">{selectedDoc.description}</p>
            {selectedDoc.observations && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-xs font-semibold text-red-700 mb-1">Observaciones:</p>
                <p className="text-xs text-red-600">{selectedDoc.observations}</p>
              </div>
            )}
            {selectedDoc.blobName && (
              <Button
                onClick={() =>
                  window.open(`/api/upload/download/${encodeURIComponent(selectedDoc.blobName!)}`, "_blank")
                }
              >
                Descargar Archivo
              </Button>
            )}
          </div>
        )}
      </Modal>

      <NewDocumentModal
        open={showNewDoc}
        onClose={() => setShowNewDoc(false)}
        onSuccess={fetchData}
        defaultProviderId={providerId}
      />
    </div>
  );
}
