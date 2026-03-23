"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import type { IProvider, IUser } from "@/lib/types";
import toast from "react-hot-toast";

interface UserFormProps {
  onSuccess: (user: IUser) => void;
  onCancel?: () => void;
}

export default function UserForm({ onSuccess, onCancel }: UserFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"ADMIN" | "EMPRESA" | "PROVEEDOR">("EMPRESA");
  const [providerId, setProviderId] = useState("");
  const [providers, setProviders] = useState<IProvider[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/providers")
      .then((r) => r.json())
      .then((data) => setProviders(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !password || !role) {
      toast.error("Todos los campos son requeridos");
      return;
    }
    if (role === "PROVEEDOR" && !providerId) {
      toast.error("Debes seleccionar un proveedor para usuarios PROVEEDOR");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          providerId: role === "PROVEEDOR" ? providerId : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al crear usuario");
      }

      const user = await res.json();
      toast.success("Usuario creado correctamente");
      onSuccess(user);

      // Reset
      setName("");
      setEmail("");
      setPassword("");
      setRole("EMPRESA");
      setProviderId("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  const roleOptions = [
    { value: "ADMIN", label: "Administrador" },
    { value: "EMPRESA", label: "Empresa" },
    { value: "PROVEEDOR", label: "Proveedor" },
  ];

  const providerOptions = providers.map((p) => ({
    value: p._id,
    label: `${p.name} (${p.ruc})`,
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Nombre completo *"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Juan Pérez"
        required
      />
      <Input
        label="Email *"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="usuario@empresa.com"
        required
      />
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700">Contraseña *</label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            className="input-base pr-10"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <Select
        label="Rol *"
        value={role}
        onChange={(e) => setRole(e.target.value as typeof role)}
        options={roleOptions}
      />

      {role === "PROVEEDOR" && (
        <Select
          label="Proveedor asociado *"
          value={providerId}
          onChange={(e) => setProviderId(e.target.value)}
          options={providerOptions}
          placeholder="Seleccionar proveedor..."
        />
      )}

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button variant="secondary" fullWidth onClick={onCancel} disabled={loading} type="button">
            Cancelar
          </Button>
        )}
        <Button fullWidth type="submit" loading={loading}>
          Crear Usuario
        </Button>
      </div>
    </form>
  );
}
