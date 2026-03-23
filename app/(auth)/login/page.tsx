"use client";

import { Alert, Button, Card, CardBody, Divider, Input } from "@nextui-org/react";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error || "Error al iniciar sesión");
        return;
      }
      const redirectTo =
        (data as { redirect?: string }).redirect || "/dashboard/empresa";
      window.location.assign(redirectTo);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0f3d89] via-[#154a9f] to-[#1d3a6c] px-4 py-10">
      <Card className="w-full max-w-[560px] border border-white/35 bg-white/95 shadow-2xl backdrop-blur">
        <CardBody className="gap-6 p-8 sm:p-10">
          <div className="space-y-1.5 text-center">
            <p className="text-3xl font-black tracking-tight text-secondary">Flexiplast</p>
            <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-primary">Empaques flexibles</p>
            <h1 className="pt-2 text-4xl font-extrabold leading-tight text-primary sm:text-5xl">
              Gestión de documentos
            </h1>
            <p className="text-lg text-default-500">Accede con tu cuenta corporativa</p>
          </div>
          <Divider />
          <form onSubmit={onSubmit} noValidate className="space-y-4">
            <Input
              label="Correo electrónico"
              labelPlacement="outside"
              placeholder="usuario@empresa.com"
              type="email"
              autoComplete="username"
              value={email}
              onValueChange={setEmail}
              isRequired
              variant="bordered"
              radius="md"
              classNames={{
                label: "text-sm font-semibold text-primary",
                inputWrapper: "h-14 border-default-300 bg-white",
                input: "text-base",
              }}
            />
            <Input
              label="Contraseña"
              labelPlacement="outside"
              placeholder="Ingresa tu contraseña"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onValueChange={setPassword}
              isRequired
              variant="bordered"
              radius="md"
              classNames={{
                label: "text-sm font-semibold text-primary",
                inputWrapper: "h-14 border-default-300 bg-white",
                input: "text-base",
              }}
              endContent={
                <button
                  type="button"
                  aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-default-500 transition-colors hover:text-primary"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />
            {error && <Alert color="danger" variant="solid" title={error} />}
            <Button
              type="submit"
              color="secondary"
              className="h-12 w-full text-lg font-extrabold"
              isDisabled={busy}
            >
              {busy ? "Entrando…" : "Entrar"}
            </Button>
          </form>
          <Card className="border border-default-200 bg-default-50 shadow-none">
            <CardBody className="gap-2">
              <p className="text-sm font-bold text-primary">Usuarios demo</p>
              <p className="text-sm text-default-500">Credenciales de prueba para el entorno demo.</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-default-600">
                {[
                  "empresa@demo.com / empresa123",
                  "prov1@demo.com / prov123",
                  "prov2@demo.com / prov456",
                ].map((line) => (
                  <li key={line} className="font-mono">
                    {line}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </CardBody>
      </Card>
    </div>
  );
}
