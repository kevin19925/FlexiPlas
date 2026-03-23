"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, Plus, Building2 } from "lucide-react";
import { staggerContainer, staggerItem } from "@/lib/animations";
import ProviderCard from "@/components/providers/ProviderCard";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ProviderForm from "@/components/providers/ProviderForm";
import NewDocumentModal from "@/components/documents/NewDocumentModal";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonCard } from "@/components/ui/Skeleton";
import type { IProviderWithStats } from "@/lib/types";
import toast from "react-hot-toast";

export default function EmpresaDashboard() {
  const router = useRouter();
  const [providers, setProviders] = useState<IProviderWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showNewProvider, setShowNewProvider] = useState(false);
  const [showNewDoc, setShowNewDoc] = useState(false);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/providers");
      if (res.ok) {
        setProviders(await res.json());
      }
    } catch {
      toast.error("Error al cargar proveedores");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const filtered = providers.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.ruc.includes(search)
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Proveedores</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {providers.length} proveedor{providers.length !== 1 ? "es" : ""} registrado{providers.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowNewDoc(true)}>
            <Plus className="w-4 h-4" />
            Nueva Solicitud
          </Button>
          <Button onClick={() => setShowNewProvider(true)}>
            <Plus className="w-4 h-4" />
            Nuevo Proveedor
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o RUC..."
          className="input-base pl-10"
          id="empresa-search-providers"
        />
      </div>

      {/* Providers grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Sin proveedores"
          description={
            search
              ? "No se encontraron resultados para tu búsqueda"
              : "Agrega el primer proveedor para comenzar"
          }
          action={
            !search ? (
              <Button onClick={() => setShowNewProvider(true)}>
                <Plus className="w-4 h-4" /> Agregar Proveedor
              </Button>
            ) : undefined
          }
        />
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filtered.map((provider) => (
            <motion.div key={provider._id} variants={staggerItem}>
              <ProviderCard
                provider={provider}
                onClick={() => router.push(`/dashboard/empresa/proveedor/${provider._id}`)}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Modals */}
      <Modal
        open={showNewProvider}
        onClose={() => setShowNewProvider(false)}
        title="Nuevo Proveedor"
        size="md"
      >
        <ProviderForm
          onSuccess={(p) => {
            setProviders((prev) => [p as IProviderWithStats, ...prev]);
            setShowNewProvider(false);
          }}
          onCancel={() => setShowNewProvider(false)}
        />
      </Modal>

      <NewDocumentModal
        open={showNewDoc}
        onClose={() => setShowNewDoc(false)}
        onSuccess={fetchProviders}
      />
    </div>
  );
}
