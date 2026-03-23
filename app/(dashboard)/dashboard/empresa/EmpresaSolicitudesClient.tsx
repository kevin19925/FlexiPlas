"use client";

import {
  Alert,
  Button,
  Card,
  CardBody,
  Checkbox,
  Chip,
  Input,
  Radio,
  RadioGroup,
  Select,
  SelectItem,
  Skeleton,
} from "@nextui-org/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ToastHost";
import { CURRENT_YEAR, SUGGESTED_DOCUMENT_TYPES } from "@/lib/constants";
import type { Provider } from "@/lib/types";

type Row = { documentType: string; description: string };

function firstKeyToValue(keys: unknown): string {
  if (!keys || keys === "all") return "";
  const arr = Array.from(keys as Set<React.Key>);
  return arr[0] ? String(arr[0]) : "";
}

export function EmpresaSolicitudesClient() {
  const toast = useToast();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<"one" | "selected" | "all">("one");
  const [providerId, setProviderId] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [deadline, setDeadline] = useState("");
  const [rows, setRows] = useState<Row[]>([{ documentType: "", description: "" }]);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [allProviders, setAllProviders] = useState<Provider[]>([]);

  const loadAllProviders = useCallback(async () => {
    const res = await fetch("/api/providers", { credentials: "include" });
    if (!res.ok) return;
    const data = (await res.json()) as { providers?: Provider[] };
    setAllProviders(data.providers ?? []);
  }, []);

  const loadProviders = useCallback(async () => {
    const q = new URLSearchParams();
    if (search.trim()) q.set("q", search.trim());
    const res = await fetch(`/api/providers?${q}`, { credentials: "include" });
    if (!res.ok) return;
    const data = (await res.json()) as { providers?: Provider[] };
    const list = data.providers ?? [];
    setProviders(list);
    setProviderId((prev) => (prev && list.some((p) => p.id === prev) ? prev : list[0]?.id ?? ""));
    setLoading(false);
  }, [search]);

  useEffect(() => {
    void loadProviders();
  }, [loadProviders]);

  useEffect(() => {
    void loadAllProviders();
  }, [loadAllProviders]);

  const filledItems = useMemo(
    () => rows.map((r) => ({ documentType: r.documentType.trim(), description: r.description.trim() })).filter((r) => r.documentType && r.description),
    [rows]
  );

  const deadlineApplies = filledItems.length === 1;

  function applySuggestedType(t: string) {
    setRows((prev) => {
      const idx = prev.findIndex((r) => !r.documentType.trim());
      if (idx >= 0) return prev.map((r, i) => (i === idx ? { ...r, documentType: t } : r));
      return [...prev, { documentType: t, description: "" }];
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (filledItems.length === 0) {
      setFormError("Completa al menos una fila con tipo y descripción");
      return;
    }
    if (scope === "selected" && selectedIds.length === 0) {
      setFormError("Marca al menos un proveedor");
      return;
    }
    if (scope === "one" && (!providerId || providers.length === 0)) {
      setFormError("Elige un proveedor");
      return;
    }
    if (scope === "all" && allProviders.length === 0) {
      setFormError("No hay proveedores registrados");
      return;
    }

    setSaving(true);
    try {
      if (filledItems.length === 1) {
        const body: Record<string, unknown> = {
          documentType: filledItems[0].documentType,
          description: filledItems[0].description,
          year,
        };
        if (deadlineApplies && deadline) body.deadline = deadline;
        if (scope === "all") body.applyToAllProviders = true;
        else if (scope === "selected") body.providerIds = selectedIds;
        else body.providerId = providerId;

        const res = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setFormError((data as { error?: string }).error || "Error al crear");
          return;
        }
        const n = (data as { createdCount?: number }).createdCount ?? 1;
        toast(n === 1 ? "Solicitud creada correctamente" : `Creadas ${n} solicitudes`, "success");
      } else {
        if (deadline) toast("Con varias filas no se aplica fecha límite.", "info");
        const payload: Record<string, unknown> = { year, items: filledItems };
        if (scope === "all") payload.applyToAllProviders = true;
        else if (scope === "selected") payload.providerIds = selectedIds;
        else payload.providerId = providerId;

        const res = await fetch("/api/documents/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setFormError((data as { error?: string }).error || "Error al crear");
          return;
        }
        const n = (data as { createdCount?: number }).createdCount ?? 0;
        toast(`Creadas ${n} solicitudes`, "success");
      }

      setRows([{ documentType: "", description: "" }]);
      setDeadline("");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !providers.length) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-[200px] rounded-lg" />
        <Skeleton className="h-[220px] w-full rounded-xl" />
      </div>
    );
  }

  const submitDisabled =
    saving ||
    (scope === "one" && (!providerId || providers.length === 0)) ||
    ((scope === "selected" || scope === "all") && allProviders.length === 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-extrabold text-primary">Solicitudes</h1>
        <p className="text-default-500">Crea una o varias solicitudes con mejor experiencia visual.</p>
      </div>

      <Card className="border border-default-200">
        <CardBody className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-semibold">¿A quién va dirigido?</p>
              <RadioGroup orientation="horizontal" value={scope} onValueChange={(v) => setScope(v as "one" | "selected" | "all") }>
                <Radio value="one">Un proveedor</Radio>
                <Radio value="selected">Varios proveedores</Radio>
                <Radio value="all">Todos los proveedores</Radio>
              </RadioGroup>
            </div>

            {scope === "one" && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Input label="Buscar proveedor" labelPlacement="outside" value={search} onValueChange={setSearch} placeholder="Nombre o RUC" variant="bordered" />
                <Select
                  label="Proveedor"
                  labelPlacement="outside"
                  selectedKeys={providerId ? [providerId] : []}
                  onSelectionChange={(keys) => setProviderId(firstKeyToValue(keys))}
                  variant="bordered"
                >
                  {providers.map((p) => (
                    <SelectItem key={p.id}>{p.name} - {p.ruc}</SelectItem>
                  ))}
                </Select>
              </div>
            )}

            {scope === "selected" && (
              <div>
                <p className="mb-2 text-sm font-semibold">Marca los proveedores</p>
                <div className="max-h-52 space-y-1 overflow-auto rounded-xl border border-default-200 p-2">
                  {allProviders.map((p) => (
                    <Checkbox
                      key={p.id}
                      isSelected={selectedIds.includes(p.id)}
                      onValueChange={(checked) =>
                        setSelectedIds((prev) =>
                          checked ? [...prev, p.id] : prev.filter((id) => id !== p.id)
                        )
                      }
                    >
                      {p.name} - {p.ruc}
                    </Checkbox>
                  ))}
                </div>
              </div>
            )}

            {scope === "all" && (
              <Alert color="warning" variant="bordered">
                Cada fila se repetirá para {allProviders.length} proveedores.
              </Alert>
            )}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Select
                label="Año"
                labelPlacement="outside"
                selectedKeys={[String(year)]}
                onSelectionChange={(keys) => {
                  const value = Number(firstKeyToValue(keys));
                  if (!Number.isNaN(value)) setYear(value);
                }}
                variant="bordered"
              >
                {[2024, 2025, 2026].map((y) => (
                  <SelectItem key={String(y)}>{String(y)}</SelectItem>
                ))}
              </Select>
              <Input
                label="Fecha límite (opcional)"
                labelPlacement="outside"
                type="date"
                value={deadline}
                onValueChange={setDeadline}
                isDisabled={!deadlineApplies}
                variant="bordered"
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold">Tipos sugeridos</p>
              <div className="flex flex-wrap gap-1">
                {SUGGESTED_DOCUMENT_TYPES.map((t) => (
                  <Chip key={t} variant="bordered" className="cursor-pointer" onClick={() => applySuggestedType(t)}>
                    {t}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold">Documentos pedidos</p>
              {rows.map((row, i) => (
                <Card key={`${i}-${row.documentType}-${row.description}`} className="border border-default-200 bg-default-50">
                  <CardBody className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
                    <Input
                      label="Tipo de documento"
                      labelPlacement="outside"
                      value={row.documentType}
                      onValueChange={(v) => setRows((prev) => prev.map((r, j) => (j === i ? { ...r, documentType: v } : r)))}
                      variant="bordered"
                    />
                    <Input
                      label="Descripción"
                      labelPlacement="outside"
                      value={row.description}
                      onValueChange={(v) => setRows((prev) => prev.map((r, j) => (j === i ? { ...r, description: v } : r)))}
                      variant="bordered"
                    />
                    <Button
                      color="danger"
                      variant="light"
                      isDisabled={rows.length <= 1}
                      onPress={() => setRows((prev) => prev.filter((_, j) => j !== i))}
                      className="self-end"
                    >
                      Quitar
                    </Button>
                  </CardBody>
                </Card>
              ))}
              <Button variant="light" color="primary" onPress={() => setRows((prev) => [...prev, { documentType: "", description: "" }])}>
                + Añadir otra fila
              </Button>
            </div>

            {formError && <Alert color="danger">{formError}</Alert>}

            <Button type="submit" color="secondary" isDisabled={submitDisabled}>
              {saving ? "Enviando..." : "Crear solicitud(es)"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
