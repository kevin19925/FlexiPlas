"use client";

import {
  Button,
  Card,
  CardBody,
  Checkbox,
  Input,
  Radio,
  RadioGroup,
  Spinner,
} from "@nextui-org/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Provider } from "@/lib/types";

type Scope = "all" | "selected";

export function EmpresaConfiguracionesClient() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<Scope>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preset, setPreset] = useState<"inherit" | "viewOnly" | "unlimited" | "custom">("inherit");
  const [customValue, setCustomValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/providers", { credentials: "include" });
    if (r.ok) {
      const d = (await r.json()) as { providers?: Provider[] };
      setProviders(d.providers ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedList = useMemo(() => Array.from(selected), [selected]);

  function resolvePayload(): { maxDownloadsPerDocument: number | null } | { error: string } {
    if (preset === "inherit") return { maxDownloadsPerDocument: null };
    if (preset === "viewOnly") return { maxDownloadsPerDocument: 0 };
    if (preset === "unlimited") return { maxDownloadsPerDocument: -1 };
    const n = Number(customValue.trim());
    if (!Number.isFinite(n) || n < -1 || n > 9999) {
      return { error: "Valor personalizado inválido (-1 a 9999)" };
    }
    return { maxDownloadsPerDocument: Math.floor(n) };
  }

  async function apply() {
    setMessage(null);
    const payload = resolvePayload();
    if ("error" in payload) {
      setMessage(payload.error);
      return;
    }
    if (scope === "selected" && selectedList.length === 0) {
      setMessage("Selecciona al menos un proveedor.");
      return;
    }

    setBusy(true);
    try {
      const r = await fetch("/api/providers/bulk-download-policy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          applyToAll: scope === "all",
          providerIds: scope === "selected" ? selectedList : undefined,
          maxDownloadsPerDocument: payload.maxDownloadsPerDocument,
        }),
      });
      const j = (await r.json().catch(() => ({}))) as {
        error?: string;
        updatedUsers?: number;
        providers?: number;
      };
      if (!r.ok) {
        setMessage(j.error || "No se pudo aplicar la política");
        return;
      }
      setMessage(
        `Listo: ${j.updatedUsers ?? 0} usuario(s) proveedor actualizado(s) en ${j.providers ?? 0} proveedor(es).`
      );
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-primary">Configuraciones</h1>
        <p className="text-default-500">
          Define límites de descarga por proveedor. La vista previa en pantalla no consume descargas; al poner{" "}
          <strong>0</strong> el proveedor solo puede ver, no descargar.
        </p>
      </div>

      <Card className="border border-default-200">
        <CardBody className="space-y-4">
          <h2 className="text-lg font-semibold">Alcance</h2>
          <RadioGroup
            value={scope}
            onValueChange={(v) => setScope(v as Scope)}
            classNames={{ label: "text-default-600" }}
          >
            <Radio value="all">Todos los proveedores</Radio>
            <Radio value="selected">Solo proveedores seleccionados</Radio>
          </RadioGroup>

          {scope === "selected" && (
            <div className="max-h-[280px] space-y-2 overflow-y-auto rounded-lg border border-default-200 p-3">
              {providers.length === 0 && (
                <p className="text-sm text-default-500">No hay proveedores registrados.</p>
              )}
              {providers.map((p) => (
                <Checkbox
                  key={p.id}
                  isSelected={selected.has(p.id)}
                  onValueChange={(checked) => {
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (checked) next.add(p.id);
                      else next.delete(p.id);
                      return next;
                    });
                  }}
                  classNames={{ label: "text-sm" }}
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="ml-1 text-default-500">RUC {p.ruc}</span>
                </Checkbox>
              ))}
            </div>
          )}

          <h2 className="pt-2 text-lg font-semibold">Política de descargas</h2>
          <RadioGroup
            value={preset}
            onValueChange={(v) => setPreset(v as typeof preset)}
            classNames={{ label: "text-default-600" }}
          >
            <Radio value="inherit">Heredar valor global (dejar sin override)</Radio>
            <Radio value="viewOnly">Solo visualizar (0 descargas por archivo)</Radio>
            <Radio value="unlimited">Descargas ilimitadas (-1)</Radio>
            <Radio value="custom">Personalizado (número máximo por archivo)</Radio>
          </RadioGroup>

          {preset === "custom" && (
            <Input
              label="Máximo de descargas por archivo"
              labelPlacement="outside"
              placeholder="Ej. 3"
              type="number"
              variant="bordered"
              className="max-w-xs"
              value={customValue}
              onValueChange={setCustomValue}
              description="Usa -1 para ilimitado, 0 para solo vista previa."
            />
          )}

          {message && (
            <p className={`text-sm ${message.startsWith("Listo") ? "text-green-600" : "text-danger"}`}>
              {message}
            </p>
          )}

          <Button color="secondary" className="font-bold" isDisabled={busy} onPress={() => void apply()}>
            {busy ? "Aplicando…" : "Aplicar política"}
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
