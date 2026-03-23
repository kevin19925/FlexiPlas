import type { Db, ObjectId } from "mongodb";
import { mongoColl } from "./mongo-collections";
import { toObjectId } from "./object-id";

/** Máximo de proveedores a los que se envía una misma solicitud en un solo envío. */
export const MAX_PROVIDERS_PER_REQUEST = 500;

/** Máximo de filas creadas en bulk (proveedores × tipos). */
export const MAX_BULK_DOCUMENT_CREATES = 500;

export async function resolveProviderTargets(
  db: Db,
  body: Record<string, unknown>
): Promise<{ ok: true; ids: ObjectId[] } | { ok: false; error: string }> {
  const applyAll =
    body.providerMode === "all" ||
    body.applyToAllProviders === true ||
    body.targetProviders === "all";

  const rawIds = body.providerIds;
  const providerId = typeof body.providerId === "string" ? body.providerId : "";

  if (applyAll) {
    const all = await db.collection(mongoColl.providers).find({}).toArray();
    const ids = all.map((p) => p._id as ObjectId);
    if (ids.length === 0) {
      return { ok: false, error: "No hay proveedores registrados" };
    }
    if (ids.length > MAX_PROVIDERS_PER_REQUEST) {
      return {
        ok: false,
        error: `Hay ${ids.length} proveedores; el máximo por envío es ${MAX_PROVIDERS_PER_REQUEST}. Elige “varios” y selecciona un subconjunto.`,
      };
    }
    return { ok: true, ids };
  }

  if (Array.isArray(rawIds) && rawIds.length > 0) {
    const strs = rawIds.filter((x): x is string => typeof x === "string");
    const oidsRaw = strs.map(toObjectId).filter((x): x is ObjectId => !!x);
    const seen = new Set<string>();
    const oids = oidsRaw.filter((o) => {
      const s = String(o);
      if (seen.has(s)) return false;
      seen.add(s);
      return true;
    });
    if (oids.length === 0) {
      return { ok: false, error: "providerIds inválidos" };
    }
    if (oids.length > MAX_PROVIDERS_PER_REQUEST) {
      return {
        ok: false,
        error: `Máximo ${MAX_PROVIDERS_PER_REQUEST} proveedores por envío`,
      };
    }
    const found = await db
      .collection(mongoColl.providers)
      .find({ _id: { $in: oids } })
      .toArray();
    if (found.length !== oids.length) {
      return { ok: false, error: "Algún proveedor no existe" };
    }
    return { ok: true, ids: found.map((p) => p._id as ObjectId) };
  }

  const one = toObjectId(providerId);
  if (!one) {
    return {
      ok: false,
      error:
        "Indica un proveedor, varios (providerIds) o applyToAllProviders / providerMode=all",
    };
  }
  const exists = await db.collection(mongoColl.providers).findOne({ _id: one });
  if (!exists) {
    return { ok: false, error: "Proveedor no existe" };
  }
  return { ok: true, ids: [one] };
}

export function assertBulkSize(
  providerCount: number,
  itemCount: number
): { ok: true } | { ok: false; error: string } {
  const total = providerCount * itemCount;
  if (total > MAX_BULK_DOCUMENT_CREATES) {
    return {
      ok: false,
      error: `Demasiadas solicitudes (${total}). Máximo ${MAX_BULK_DOCUMENT_CREATES} en un lote (proveedores × tipos).`,
    };
  }
  if (total === 0) {
    return { ok: false, error: "Sin combinaciones que crear" };
  }
  return { ok: true };
}
