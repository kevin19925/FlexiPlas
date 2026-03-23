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

function todayIsoLocal(): string {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function matchesProviderSearch(p: Provider, q: string): boolean {
  const t = q.trim().toLowerCase();
  if (!t) return true;
  const digits = t.replace(/\D/g, "");
  const rucDigits = (p.ruc || "").replace(/\D/g, "");
  return (
    p.name.toLowerCase().includes(t) ||
    (p.ruc && p.ruc.toLowerCase().includes(t)) ||
    (digits.length > 0 && rucDigits.includes(digits))
  );
}

export function EmpresaSolicitudesClient() {
  const toast = useToast();
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
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = (await res.json()) as { providers?: Provider[] };
    const list = data.providers ?? [];
    setAllProviders(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadAllProviders();
  }, [loadAllProviders]);

  const filteredProviders = useMemo(() => {
    const q = search.trim();
    let list = allProviders.filter((p) => matchesProviderSearch(p, q));
    if (providerId && !list.some((p) => p.id === providerId)) {
      const sel = allProviders.find((p) => p.id === providerId);
      if (sel) list = [sel, ...list];
    }
    return list;
  }, [allProviders, search, providerId]);

  useEffect(() => {
    if (!allProviders.length) return;
    if (providerId && allProviders.some((p) => p.id === providerId)) return;
    setProviderId(allProviders[0]?.id ?? "");
  }, [allProviders, providerId]);

  const filledItems = useMemo(
    () =>
      rows
        .map((r) => ({
          documentType: r.documentType.trim(),
          description: r.description.trim(),
        }))
        .filter((r) => r.documentType && r.description),
    [rows]
  );

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
    if (scope === "one" && (!providerId || !allProviders.some((p) => p.id === providerId))) {
      setFormError("Elige un proveedor");
      return;
    }
    if (scope === "all" && allProviders.length === 0) {
      setFormError("No hay proveedores registrados");
      return;
    }
    if (!deadline.trim()) {
      setFormError("La fecha límite es obligatoria");
      return;
    }
    const ds = deadline.trim().slice(0, 10);
    if (ds < todayIsoLocal()) {
      setFormError("La fecha límite no puede ser anterior a hoy");
      return;
    }

    setSaving(true);
    try {
      if (filledItems.length === 1) {
        const body: Record<string, unknown> = {
          documentType: filledItems[0].documentType,
          description: filledItems[0].description,
          year,
          deadline: ds,
        };
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
        const payload: Record<string, unknown> = { year, items: filledItems, deadline: ds };
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

  if (loading && !allProviders.length) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-[200px] rounded-lg" />
        <Skeleton className="h-[220px] w-full rounded-xl" />
      </div>
    );
  }

  const submitDisabled =
    saving ||
    !deadline.trim() ||
    (scope === "one" && (!providerId || allProviders.length === 0)) ||
    ((scope === "selected" || scope === "all") && allProviders.length === 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-extrabold text-primary">Solicitudes</h1>
        <p className="text-default-500">
          Indica siempre una fecha límite: los proveedores reciben un aviso para subir la documentación a tiempo.
        </p>
      </div>

      <Card className="border border-default-200">
        <CardBody className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-semibold">¿A quién va dirigido?</p>
              <RadioGroup
                orientation="horizontal"
                value={scope}
                onValueChange={(v) => setScope(v as "one" | "selected" | "all")}
              >
                <Radio value="one">Un proveedor</Radio>
                <Radio value="selected">Varios proveedores</Radio>
                <Radio value="all">Todos los proveedores</Radio>
              </RadioGroup>
            </div>

            {scope === "one" && (
              <div className="flex flex-col gap-3">
                <Input
                  label="Buscar proveedor"
                  labelPlacement="outside"
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Nombre o RUC"
                  description="Filtra la lista; no quita el proveedor ya elegido."
                  variant="bordered"
                />
                {/* select nativo: NextUI Select a veces deja el trigger vacío con opciones dinámicas */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="solicitud-proveedor" className="text-sm font-semibold text-primary">
                    Proveedor
                  </label>
                  <select
                    id="solicitud-proveedor"
                    className="h-14 w-full rounded-medium border-2 border-default-200 bg-background px-3 text-small text-foreground shadow-sm outline-none transition-colors hover:border-default-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    value={providerId}
                    onChange={(e) => setProviderId(e.target.value)}
                    aria-label="Proveedor"
                  >
                    {!filteredProviders.length ? (
                      <option value="">Sin coincidencias</option>
                    ) : (
                      <>
                        <option value="" disabled>
                          Selecciona un proveedor
                        </option>
                        {filteredProviders.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} — {p.ruc}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
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
                label="Fecha límite"
                labelPlacement="outside"
                type="date"
                isRequired
                value={deadline}
                onValueChange={setDeadline}
                min={todayIsoLocal()}
                description="Obligatoria. Se incluye en la notificación al proveedor."
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
