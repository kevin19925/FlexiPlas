"use client";

import { useState } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";
import type { IProviderWithStats } from "@/lib/types";

interface ProviderFormProps {
  onSuccess: (provider: IProviderWithStats) => void;
  onCancel?: () => void;
  initial?: {
    _id?: string;
    name?: string;
    ruc?: string;
    email?: string;
    phone?: string;
  };
  mode?: "create" | "edit";
}

export default function ProviderForm({
  onSuccess,
  onCancel,
  initial,
  mode = "create",
}: ProviderFormProps) {
  const [name, setName] = useState(initial?.name || "");
  const [ruc, setRuc] = useState(initial?.ruc || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "El nombre es requerido";
    if (!ruc.trim()) errs.ruc = "El RUC es requerido";
    else if (!/^\d{13}$/.test(ruc)) errs.ruc = "El RUC debe tener exactamente 13 dígitos numéricos";
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const url = mode === "edit" ? `/api/providers/${initial?._id}` : "/api/providers";
      const method = mode === "edit" ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, ruc, email, phone }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al guardar");
      }

      const saved = await res.json();
      toast.success(mode === "edit" ? "Proveedor actualizado" : "Proveedor creado");
      onSuccess(saved);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Nombre de la empresa *"
        value={name}
        onChange={(e) => { setName(e.target.value); setErrors((prev) => ({ ...prev, name: "" })); }}
        placeholder="Ej: Proveedor XYZ S.A."
        error={errors.name}
        required
      />
      <Input
        label="RUC (13 dígitos) *"
        value={ruc}
        onChange={(e) => { setRuc(e.target.value.replace(/\D/g, "").slice(0, 13)); setErrors((prev) => ({ ...prev, ruc: "" })); }}
        placeholder="0000000000001"
        maxLength={13}
        error={errors.ruc}
        disabled={mode === "edit"}
        hint={mode === "edit" ? "El RUC no se puede modificar" : undefined}
        required
      />
      <Input
        label="Email (opcional)"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="contacto@proveedor.com"
      />
      <Input
        label="Teléfono (opcional)"
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="+593 99 999 9999"
      />

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button variant="secondary" fullWidth onClick={onCancel} disabled={loading} type="button">
            Cancelar
          </Button>
        )}
        <Button fullWidth type="submit" loading={loading}>
          {mode === "edit" ? "Guardar Cambios" : "Crear Proveedor"}
        </Button>
      </div>
    </form>
  );
}
