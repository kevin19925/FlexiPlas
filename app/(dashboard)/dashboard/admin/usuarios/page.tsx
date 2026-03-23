"use client";

import { Button, Card, CardBody, Input, Select, SelectItem } from "@nextui-org/react";
import { useCallback, useEffect, useState } from "react";
import { DashboardTabs } from "@/components/DashboardTabs";
import { useToast } from "@/components/ToastHost";
import type { UserRole } from "@/lib/types";

type Tab = "usuarios" | "limites";
type U = { id: string; email: string; name: string; role: UserRole; providerName: string | null; maxDownloadsPerDocument: number | null };
type P = { id: string; name: string };

function firstKey(keys: unknown): string {
  if (!keys || keys === "all") return "";
  const arr = Array.from(keys as Set<React.Key>);
  return arr[0] ? String(arr[0]) : "";
}

export default function AdminUsuariosPage() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("usuarios");
  const [users, setUsers] = useState<U[]>([]);
  const [providers, setProviders] = useState<P[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ email: "", password: "", name: "", role: "proveedor" as UserRole, providerId: "" });
  const [saving, setSaving] = useState(false);
  const [defaultMaxInput, setDefaultMaxInput] = useState("10");
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [maxEdits, setMaxEdits] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const [ur, pr, sr] = await Promise.all([
      fetch("/api/users", { credentials: "include" }),
      fetch("/api/providers", { credentials: "include" }),
      fetch("/api/admin/settings", { credentials: "include" }),
    ]);
    if (ur.ok) {
      const d = (await ur.json()) as { users?: U[] };
      const list = d.users ?? [];
      setUsers(list);
      const edits: Record<string, string> = {};
      for (const u of list) edits[u.id] = u.maxDownloadsPerDocument === null ? "" : String(u.maxDownloadsPerDocument);
      setMaxEdits(edits);
    }
    if (pr.ok) {
      const d = (await pr.json()) as { providers?: P[] };
      const list = d.providers ?? [];
      setProviders(list);
      setForm((f) => ({ ...f, providerId: f.providerId || list[0]?.id || "" }));
    }
    if (sr.ok) {
      const d = (await sr.json()) as { defaultMaxDownloadsPerDocument?: number };
      setDefaultMaxInput(String(d.defaultMaxDownloadsPerDocument ?? 10));
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, unknown> = { email: form.email, password: form.password, name: form.name, role: form.role };
      if (form.role === "proveedor") body.providerId = form.providerId;
      const r = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return void toast((j as { error?: string }).error || "Error", "error");
      toast("Usuario creado", "success");
      setForm({ email: "", password: "", name: "", role: "proveedor", providerId: providers[0]?.id ?? "" });
      void load();
    } finally { setSaving(false); }
  }

  async function removeUser(id: string) {
    if (!confirm("¿Eliminar este usuario?")) return;
    const r = await fetch(`/api/users/${id}`, { method: "DELETE", credentials: "include" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return void toast((j as { error?: string }).error || "Error", "error");
    toast("Usuario eliminado", "info");
    void load();
  }

  async function saveUserMax(id: string) {
    const raw = (maxEdits[id] ?? "").trim();
    let value: number | null = null;
    if (raw !== "") {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < -1) return void toast("Usa numero >= -1 o vacio", "error");
      value = n;
    }
    const r = await fetch(`/api/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ maxDownloadsPerDocument: value }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return void toast((j as { error?: string }).error || "Error", "error");
    toast("Límite actualizado", "success");
    void load();
  }

  async function saveGlobalDefault(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(defaultMaxInput);
    if (!Number.isFinite(n) || n < -1 || n > 9999) return void toast("Número entre -1 y 9999", "error");
    setSettingsSaving(true);
    try {
      const r = await fetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ defaultMaxDownloadsPerDocument: n }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return void toast((j as { error?: string }).error || "Error", "error");
      toast("Política global guardada", "success");
    } finally { setSettingsSaving(false); }
  }

  if (loading) return <p className="text-default-500">Cargando...</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold">Usuarios y límites</h1>
      <DashboardTabs<Tab> active={tab} onChange={setTab} tabs={[{ id: "usuarios", label: "Crear y listar" }, { id: "limites", label: "Descargas por archivo" }]} />

      {tab === "limites" && (
        <Card className="border border-default-200"><CardBody>
          <h2 className="text-lg font-semibold">Límite por defecto</h2>
          <p className="mb-2 text-sm text-default-500">Vista previa no cuenta. Usa -1 para ilimitado.</p>
          <form onSubmit={saveGlobalDefault} className="flex flex-wrap items-end gap-2">
            <Input label="Máx. descargas por documento" labelPlacement="outside" value={defaultMaxInput} onValueChange={setDefaultMaxInput} className="w-[240px]" variant="bordered" />
            <Button type="submit" color="secondary" isDisabled={settingsSaving}>{settingsSaving ? "Guardando..." : "Guardar global"}</Button>
          </form>
        </CardBody></Card>
      )}

      {tab === "usuarios" && (
        <div className="space-y-3">
          <Card className="border border-default-200"><CardBody>
            <form onSubmit={createUser} className="space-y-3">
              <h2 className="text-lg font-semibold">Crear usuario</h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Input required type="email" label="Email" labelPlacement="outside" value={form.email} onValueChange={(v) => setForm((f) => ({ ...f, email: v }))} variant="bordered" />
                <Input required type="password" label="Contraseña" labelPlacement="outside" value={form.password} onValueChange={(v) => setForm((f) => ({ ...f, password: v }))} variant="bordered" />
                <Input required label="Nombre" labelPlacement="outside" value={form.name} onValueChange={(v) => setForm((f) => ({ ...f, name: v }))} variant="bordered" />
                <Select label="Rol" labelPlacement="outside" selectedKeys={[form.role]} onSelectionChange={(k) => setForm((f) => ({ ...f, role: firstKey(k) as UserRole }))} variant="bordered">
                  <SelectItem key="admin">admin</SelectItem>
                  <SelectItem key="empresa">empresa</SelectItem>
                  <SelectItem key="proveedor">proveedor</SelectItem>
                </Select>
              </div>
              {form.role === "proveedor" && (
                <Select label="Proveedor" labelPlacement="outside" selectedKeys={form.providerId ? [form.providerId] : []} onSelectionChange={(k) => setForm((f) => ({ ...f, providerId: firstKey(k) }))} variant="bordered">
                  {providers.map((p) => <SelectItem key={p.id}>{p.name}</SelectItem>)}
                </Select>
              )}
              <Button type="submit" color="secondary" isDisabled={saving}>{saving ? "Creando..." : "Crear"}</Button>
            </form>
          </CardBody></Card>

          <Card className="border border-default-200"><CardBody className="overflow-auto p-0">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-default-50"><tr>
                <th className="px-3 py-2 text-left">Email</th><th className="px-3 py-2 text-left">Nombre</th><th className="px-3 py-2 text-left">Rol</th><th className="px-3 py-2 text-left">Proveedor</th><th className="px-3 py-2 text-left">Máx. desc./doc</th><th className="px-3 py-2 text-right">Acciones</th>
              </tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-default-100">
                    <td className="px-3 py-2">{u.email}</td><td className="px-3 py-2">{u.name}</td><td className="px-3 py-2">{u.role}</td><td className="px-3 py-2">{u.providerName ?? "-"}</td>
                    <td className="px-3 py-2">{(u.role === "empresa" || u.role === "proveedor") ? <div className="flex items-center gap-1"><Input size="sm" value={maxEdits[u.id] ?? ""} onValueChange={(v) => setMaxEdits((m) => ({ ...m, [u.id]: v }))} placeholder="defecto" className="max-w-[100px]" /><Button size="sm" variant="light" onPress={() => void saveUserMax(u.id)}>OK</Button></div> : "-"}</td>
                    <td className="px-3 py-2 text-right"><Button size="sm" color="danger" variant="light" onPress={() => void removeUser(u.id)}>Eliminar</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody></Card>
        </div>
      )}
    </div>
  );
}