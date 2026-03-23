"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Building2,
  FileText,
  Clock,
  Plus,
  Trash2,
  Pencil,
  CheckCircle,
  XCircle,
  Upload,
  Search,
  Filter,
} from "lucide-react";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { formatDate, formatDateTime, getYearRange, getCurrentYear } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import ProviderForm from "@/components/providers/ProviderForm";
import UserForm from "@/components/users/UserForm";
import type { IUser, IProviderWithStats, IDocument } from "@/lib/types";
import toast from "react-hot-toast";

type Tab = "resumen" | "proveedores" | "usuarios" | "documentos";

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-400",
  UPLOADED: "bg-blue-400",
  APPROVED: "bg-green-400",
  REJECTED: "bg-red-400",
};

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("resumen");
  const [users, setUsers] = useState<IUser[]>([]);
  const [providers, setProviders] = useState<IProviderWithStats[]>([]);
  const [documents, setDocuments] = useState<IDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionUserId, setSessionUserId] = useState("");

  // Modals
  const [showUserForm, setShowUserForm] = useState(false);
  const [showProviderForm, setShowProviderForm] = useState(false);
  const [editProvider, setEditProvider] = useState<IProviderWithStats | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deleteProviderId, setDeleteProviderId] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);
  const [deletingProvider, setDeletingProvider] = useState(false);

  // Filters - Documents tab
  const [docFilterProvider, setDocFilterProvider] = useState("");
  const [docFilterStatus, setDocFilterStatus] = useState("");
  const [docFilterYear, setDocFilterYear] = useState("");
  const [docPage, setDocPage] = useState(1);
  const DOC_PAGE_SIZE = 10;

  // Search
  const [providerSearch, setProviderSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, providersRes, docsRes, meRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/providers"),
        fetch("/api/documents"),
        fetch("/api/auth/me"),
      ]);
      setUsers(await usersRes.json());
      setProviders(await providersRes.json());
      setDocuments(await docsRes.json());
      const me = await meRes.json();
      setSessionUserId(me.id);
    } catch {
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Stats
  const totalPending = documents.filter((d) => d.status === "PENDING").length;
  const totalUploaded = documents.filter((d) => d.status === "UPLOADED").length;
  const totalApproved = documents.filter((d) => d.status === "APPROVED").length;
  const totalRejected = documents.filter((d) => d.status === "REJECTED").length;

  const statCards = [
    { label: "Usuarios", value: users.length, icon: Users, color: "text-purple-600 bg-purple-50", border: "border-purple-100" },
    { label: "Proveedores", value: providers.length, icon: Building2, color: "text-blue-600 bg-blue-50", border: "border-blue-100" },
    { label: "Documentos", value: documents.length, icon: FileText, color: "text-indigo-600 bg-indigo-50", border: "border-indigo-100" },
    { label: "Pendientes Revisión", value: totalUploaded, icon: Clock, color: "text-amber-600 bg-amber-50", border: "border-amber-100" },
  ];

  // Filtered docs
  const filteredDocs = documents.filter((d) => {
    if (docFilterProvider && d.providerId !== docFilterProvider) return false;
    if (docFilterStatus && d.status !== docFilterStatus) return false;
    if (docFilterYear && d.year !== parseInt(docFilterYear)) return false;
    return true;
  });

  const paginatedDocs = filteredDocs.slice(
    (docPage - 1) * DOC_PAGE_SIZE,
    docPage * DOC_PAGE_SIZE
  );
  const totalPages = Math.ceil(filteredDocs.length / DOC_PAGE_SIZE);

  const filteredProviders = providers.filter((p) =>
    p.name.toLowerCase().includes(providerSearch.toLowerCase()) ||
    p.ruc.includes(providerSearch)
  );

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  async function handleDeleteUser() {
    if (!deleteUserId) return;
    setDeletingUser(true);
    try {
      const res = await fetch(`/api/users/${deleteUserId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      toast.success("Usuario eliminado");
      setUsers((prev) => prev.filter((u) => u._id !== deleteUserId));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setDeletingUser(false);
      setDeleteUserId(null);
    }
  }

  async function handleDeleteProvider() {
    if (!deleteProviderId) return;
    setDeletingProvider(true);
    try {
      const res = await fetch(`/api/providers/${deleteProviderId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      toast.success("Proveedor eliminado");
      fetchAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setDeletingProvider(false);
      setDeleteProviderId(null);
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "resumen", label: "Resumen" },
    { key: "proveedores", label: "Proveedores" },
    { key: "usuarios", label: "Usuarios" },
    { key: "documentos", label: "Documentos" },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Tab navigation */}
      <div className="flex gap-1 p-1 bg-white rounded-2xl shadow-sm border border-slate-200 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
              tab === t.key
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ===== TAB: RESUMEN ===== */}
      {tab === "resumen" && (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <motion.div key={card.label} variants={staggerItem} className={`stat-card border ${card.border}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-3xl font-bold text-slate-900">{card.value}</p>
                  <p className="text-sm text-slate-500">{card.label}</p>
                </motion.div>
              );
            })}
          </div>

          {/* Document status chart */}
          <motion.div variants={staggerItem} className="card">
            <h2 className="text-base font-semibold text-slate-900 mb-5">
              Estado de Documentos
            </h2>
            <div className="space-y-4">
              {[
                { label: "Pendientes", value: totalPending, color: "bg-amber-400", max: documents.length },
                { label: "Subidos (en revisión)", value: totalUploaded, color: "bg-blue-400", max: documents.length },
                { label: "Aprobados", value: totalApproved, color: "bg-green-400", max: documents.length },
                { label: "Rechazados", value: totalRejected, color: "bg-red-400", max: documents.length },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-slate-600">{item.label}</span>
                    <span className="font-semibold text-slate-900">{item.value}</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: item.max > 0 ? `${(item.value / item.max) * 100}%` : "0%",
                      }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                      className={`h-full rounded-full ${item.color}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Recent activity */}
          <motion.div variants={staggerItem} className="card">
            <h2 className="text-base font-semibold text-slate-900 mb-4">
              Actividad Reciente
            </h2>
            {loading ? (
              <SkeletonTable rows={5} />
            ) : (
              <div className="space-y-2">
                {documents.slice(0, 10).map((doc) => (
                  <div
                    key={doc._id}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusColors[doc.status]}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {doc.providerName} — {doc.documentType} ({doc.year})
                      </p>
                      <p className="text-xs text-slate-500">{formatDateTime(doc.updatedAt)}</p>
                    </div>
                    <StatusBadge status={doc.status} />
                  </div>
                ))}
                {documents.length === 0 && (
                  <EmptyState
                    icon={FileText}
                    title="Sin actividad reciente"
                    description="Los documentos aparecerán aquí"
                  />
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}

      {/* ===== TAB: PROVEEDORES ===== */}
      {tab === "proveedores" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={providerSearch}
                onChange={(e) => setProviderSearch(e.target.value)}
                placeholder="Buscar por nombre o RUC..."
                className="input-base pl-9 w-64"
              />
            </div>
            <Button onClick={() => setShowProviderForm(true)}>
              <Plus className="w-4 h-4" /> Nuevo Proveedor
            </Button>
          </div>

          {loading ? (
            <SkeletonTable rows={5} />
          ) : (
            <div className="card overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="table-header">Nombre</th>
                      <th className="table-header">RUC</th>
                      <th className="table-header">Email</th>
                      <th className="table-header">Teléfono</th>
                      <th className="table-header text-center">Docs</th>
                      <th className="table-header">Registro</th>
                      <th className="table-header">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {filteredProviders.map((p) => (
                        <motion.tr
                          key={p._id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="table-cell font-medium">{p.name}</td>
                          <td className="table-cell font-mono text-sm">{p.ruc}</td>
                          <td className="table-cell text-slate-500">{p.email || "—"}</td>
                          <td className="table-cell text-slate-500">{p.phone || "—"}</td>
                          <td className="table-cell text-center">
                            <span className="font-semibold">{p.stats.total}</span>
                          </td>
                          <td className="table-cell text-slate-500">{formatDate(p.createdAt)}</td>
                          <td className="table-cell">
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => setEditProvider(p)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteProviderId(p._id)}
                                className="p-1.5 rounded-lg hover:bg-red-100 text-slate-500 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
                {filteredProviders.length === 0 && !loading && (
                  <EmptyState
                    icon={Building2}
                    title="Sin proveedores"
                    description="Crea el primer proveedor con el botón de arriba"
                    className="py-12"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== TAB: USUARIOS ===== */}
      {tab === "usuarios" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Buscar por nombre o email..."
                className="input-base pl-9 w-64"
              />
            </div>
            <Button onClick={() => setShowUserForm(true)}>
              <Plus className="w-4 h-4" /> Nuevo Usuario
            </Button>
          </div>

          {loading ? (
            <SkeletonTable rows={5} />
          ) : (
            <div className="card overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="table-header">Nombre</th>
                      <th className="table-header">Email</th>
                      <th className="table-header">Rol</th>
                      <th className="table-header">Proveedor</th>
                      <th className="table-header">Creado</th>
                      <th className="table-header">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {filteredUsers.map((u) => (
                        <motion.tr
                          key={u._id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="table-cell font-medium">{u.name}</td>
                          <td className="table-cell text-slate-500">{u.email}</td>
                          <td className="table-cell">
                            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                              u.role === "ADMIN" ? "bg-purple-100 text-purple-700" :
                              u.role === "EMPRESA" ? "bg-blue-100 text-blue-700" :
                              "bg-emerald-100 text-emerald-700"
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="table-cell text-slate-500">{u.providerName || "—"}</td>
                          <td className="table-cell text-slate-500">{formatDate(u.createdAt)}</td>
                          <td className="table-cell">
                            {u._id !== sessionUserId && (
                              <button
                                onClick={() => setDeleteUserId(u._id)}
                                className="p-1.5 rounded-lg hover:bg-red-100 text-slate-500 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
                {filteredUsers.length === 0 && !loading && (
                  <EmptyState
                    icon={Users}
                    title="Sin usuarios"
                    className="py-12"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== TAB: DOCUMENTOS ===== */}
      {tab === "documentos" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Select
              value={docFilterProvider}
              onChange={(e) => { setDocFilterProvider(e.target.value); setDocPage(1); }}
              options={providers.map((p) => ({ value: p._id, label: p.name }))}
              placeholder="Todos los proveedores"
              className="w-48"
            />
            <Select
              value={docFilterStatus}
              onChange={(e) => { setDocFilterStatus(e.target.value); setDocPage(1); }}
              options={[
                { value: "PENDING", label: "Pendientes" },
                { value: "UPLOADED", label: "Subidos" },
                { value: "APPROVED", label: "Aprobados" },
                { value: "REJECTED", label: "Rechazados" },
              ]}
              placeholder="Todos los estados"
              className="w-44"
            />
            <Select
              value={docFilterYear}
              onChange={(e) => { setDocFilterYear(e.target.value); setDocPage(1); }}
              options={getYearRange().map((y) => ({ value: String(y), label: String(y) }))}
              placeholder="Todos los años"
              className="w-36"
            />
            {(docFilterProvider || docFilterStatus || docFilterYear) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDocFilterProvider("");
                  setDocFilterStatus("");
                  setDocFilterYear("");
                  setDocPage(1);
                }}
              >
                <Filter className="w-3.5 h-3.5" /> Limpiar filtros
              </Button>
            )}
          </div>

          {loading ? (
            <SkeletonTable rows={8} />
          ) : (
            <div className="card overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="table-header">Proveedor</th>
                      <th className="table-header">Tipo</th>
                      <th className="table-header">Año</th>
                      <th className="table-header">Estado</th>
                      <th className="table-header">Fecha Límite</th>
                      <th className="table-header">Archivo</th>
                      <th className="table-header">Creado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedDocs.map((doc) => (
                      <tr
                        key={doc._id}
                        className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="table-cell font-medium">{doc.providerName}</td>
                        <td className="table-cell">{doc.documentType}</td>
                        <td className="table-cell">{doc.year}</td>
                        <td className="table-cell"><StatusBadge status={doc.status} /></td>
                        <td className="table-cell text-slate-500">
                          {doc.deadline ? formatDate(doc.deadline) : "—"}
                        </td>
                        <td className="table-cell">
                          {doc.fileName ? (
                            <button
                              onClick={() =>
                                window.open(`/api/upload/download/${encodeURIComponent(doc.blobName || "")}`, "_blank")
                              }
                              className="text-xs text-indigo-600 hover:underline truncate max-w-[120px] block"
                            >
                              {doc.fileName}
                            </button>
                          ) : (
                            <span className="text-slate-400 text-xs">Sin archivo</span>
                          )}
                        </td>
                        <td className="table-cell text-slate-500">{formatDate(doc.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {paginatedDocs.length === 0 && (
                  <EmptyState
                    icon={FileText}
                    title="Sin documentos"
                    description="Ajusta los filtros para ver documentos"
                    className="py-12"
                  />
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                  <p className="text-sm text-slate-500">
                    {filteredDocs.length} resultado{filteredDocs.length !== 1 ? "s" : ""}
                  </p>
                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => setDocPage(i + 1)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                          docPage === i + 1
                            ? "bg-indigo-600 text-white"
                            : "hover:bg-slate-100 text-slate-600"
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <Modal open={showUserForm} onClose={() => setShowUserForm(false)} title="Nuevo Usuario" size="md">
        <UserForm
          onSuccess={(u) => {
            setUsers((prev) => [u, ...prev]);
            setShowUserForm(false);
          }}
          onCancel={() => setShowUserForm(false)}
        />
      </Modal>

      <Modal open={showProviderForm} onClose={() => setShowProviderForm(false)} title="Nuevo Proveedor" size="md">
        <ProviderForm
          onSuccess={(p) => {
            setProviders((prev) => [p as IProviderWithStats, ...prev]);
            setShowProviderForm(false);
          }}
          onCancel={() => setShowProviderForm(false)}
        />
      </Modal>

      <Modal
        open={!!editProvider}
        onClose={() => setEditProvider(null)}
        title="Editar Proveedor"
        size="md"
      >
        {editProvider && (
          <ProviderForm
            mode="edit"
            initial={editProvider}
            onSuccess={() => {
              setEditProvider(null);
              fetchAll();
            }}
            onCancel={() => setEditProvider(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteUserId}
        onClose={() => setDeleteUserId(null)}
        onConfirm={handleDeleteUser}
        title="¿Eliminar usuario?"
        description="Esta acción no se puede deshacer."
        loading={deletingUser}
      />

      <ConfirmDialog
        open={!!deleteProviderId}
        onClose={() => setDeleteProviderId(null)}
        onConfirm={handleDeleteProvider}
        title="¿Eliminar proveedor?"
        description="Se eliminarán todos sus documentos y archivos de Azure. Esta acción no se puede deshacer."
        loading={deletingProvider}
      />
    </div>
  );
}
