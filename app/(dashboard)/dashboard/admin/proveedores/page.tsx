"use client";

import { Button, Card, CardBody, Input } from "@nextui-org/react";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ToastHost";

type P = { id: string; name: string; ruc: string; email: string | null; phone: string | null };

export default function AdminProveedoresPage() {
  const toast = useToast();
  const [list, setList] = useState<P[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<P | null>(null);
  const [form, setForm] = useState({ name: "", ruc: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/providers", { credentials: "include" });
    if (r.ok) {
      const d = (await r.json()) as { providers?: P[] };
      setList(d.providers ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch("/api/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: form.name, ruc: form.ruc, email: form.email || null, phone: form.phone || null }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast((j as { error?: string }).error || "Error", "error");
        return;
      }
      toast("Proveedor creado", "success");
      setForm({ name: "", ruc: "", email: "", phone: "" });
      void load();
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/providers/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: form.name, ruc: form.ruc, email: form.email || null, phone: form.phone || null }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast((j as { error?: string }).error || "Error", "error");
        return;
      }
      toast("Proveedor actualizado", "success");
      setEditing(null);
      void load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar proveedor, documentos, archivos en Azure y desvincular usuarios?")) return;
    const r = await fetch(`/api/providers/${id}`, { method: "DELETE", credentials: "include" });
    if (!r.ok) {
      toast("No se pudo eliminar", "error");
      return;
    }
    toast("Proveedor eliminado", "info");
    void load();
  }

  function startEdit(p: P) {
    setEditing(p);
    setForm({ name: p.name, ruc: p.ruc, email: p.email ?? "", phone: p.phone ?? "" });
  }

  if (loading) return <p className="text-default-500">Cargando...</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold">Proveedores</h1>

      <Card className="border border-default-200">
        <CardBody>
          <form onSubmit={editing ? saveEdit : create} className="space-y-3">
            <h2 className="text-lg font-semibold">{editing ? "Editar proveedor" : "Nuevo proveedor"}</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input required label="Nombre" labelPlacement="outside" value={form.name} onValueChange={(v) => setForm((f) => ({ ...f, name: v }))} variant="bordered" />
              <Input required label="RUC (13 dígitos)" labelPlacement="outside" value={form.ruc} onValueChange={(v) => setForm((f) => ({ ...f, ruc: v }))} maxLength={13} variant="bordered" />
              <Input type="email" label="Email" labelPlacement="outside" value={form.email} onValueChange={(v) => setForm((f) => ({ ...f, email: v }))} variant="bordered" />
              <Input label="Teléfono" labelPlacement="outside" value={form.phone} onValueChange={(v) => setForm((f) => ({ ...f, phone: v }))} variant="bordered" />
            </div>
            <div className="flex gap-2">
              <Button type="submit" color="secondary" isDisabled={saving}>{saving ? "Guardando..." : editing ? "Guardar" : "Registrar"}</Button>
              {editing && <Button variant="light" onPress={() => setEditing(null)}>Cancelar</Button>}
            </div>
          </form>
        </CardBody>
      </Card>

      <Card className="border border-default-200">
        <CardBody className="overflow-auto p-0">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-default-50">
              <tr>
                <th className="px-3 py-2 text-left">Nombre</th>
                <th className="px-3 py-2 text-left">RUC</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Tel</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} className="border-t border-default-100">
                  <td className="px-3 py-2 font-semibold">{p.name}</td>
                  <td className="px-3 py-2">{p.ruc}</td>
                  <td className="px-3 py-2">{p.email ?? "-"}</td>
                  <td className="px-3 py-2">{p.phone ?? "-"}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="light" onPress={() => startEdit(p)}>Editar</Button>
                      <Button size="sm" color="danger" variant="light" onPress={() => void remove(p.id)}>Eliminar</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}