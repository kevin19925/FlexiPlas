"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Upload,
} from "lucide-react";
import { staggerContainer, staggerItem } from "@/lib/animations";
import DocumentCard from "@/components/documents/DocumentCard";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { getCurrentYear } from "@/lib/utils";
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

export default function ProveedorDashboard() {
  const [documents, setDocuments] = useState<IDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const currentYear = getCurrentYear();

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/documents?year=${currentYear}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch {
      toast.error("Error al cargar documentos");
    } finally {
      setLoading(false);
    }
  }, [currentYear]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const stats = {
    pending: documents.filter((d) => d.status === "PENDING").length,
    uploaded: documents.filter((d) => d.status === "UPLOADED").length,
    approved: documents.filter((d) => d.status === "APPROVED").length,
    rejected: documents.filter((d) => d.status === "REJECTED").length,
  };

  const statCards = [
    {
      label: "Pendientes",
      value: stats.pending,
      icon: Clock,
      color: "text-amber-600 bg-amber-50 border-amber-200",
      description: "Esperando que subas el archivo",
    },
    {
      label: "En Revisión",
      value: stats.uploaded,
      icon: Upload,
      color: "text-blue-600 bg-blue-50 border-blue-200",
      description: "Están siendo revisados",
    },
    {
      label: "Aprobados",
      value: stats.approved,
      icon: CheckCircle,
      color: "text-green-600 bg-green-50 border-green-200",
      description: "Documentos aceptados",
    },
    {
      label: "Rechazados",
      value: stats.rejected,
      icon: XCircle,
      color: "text-red-600 bg-red-50 border-red-200",
      description: "Necesitan corrección",
    },
  ];

  // Sort: rejected first, then pending, then uploaded, then approved
  const sortedDocs = [...documents].sort((a, b) => {
    const order = { REJECTED: 0, PENDING: 1, UPLOADED: 2, APPROVED: 3 };
    return order[a.status] - order[b.status];
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          Mis Documentos — {currentYear}
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Gestiona y sube los documentos solicitados por la empresa
        </p>
      </div>

      {/* Stats cards */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              variants={staggerItem}
              className={`stat-card border ${card.color}`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.color}`}>
                <Icon className="w-4.5 h-4.5" />
              </div>
              <p className="text-3xl font-bold">{card.value}</p>
              <div>
                <p className="text-sm font-semibold">{card.label}</p>
                <p className="text-xs opacity-70">{card.description}</p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Rejected alert */}
      {stats.rejected > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl"
        >
          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">
              Tienes {stats.rejected} documento{stats.rejected > 1 ? "s" : ""} rechazado{stats.rejected > 1 ? "s" : ""}
            </p>
            <p className="text-xs text-red-600">
              Revisa las observaciones y vuelve a subir el archivo correcto.
            </p>
          </div>
        </motion.div>
      )}

      {/* Documents */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : sortedDocs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Sin documentos para este año"
          description={`Cuando la empresa solicite documentos para el año ${currentYear}, aparecerán aquí.`}
        />
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedDocs.map((doc) => (
              <DocumentCard
                key={doc._id}
                doc={doc}
                userRole="PROVEEDOR"
                onRefresh={fetchDocs}
              />
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
