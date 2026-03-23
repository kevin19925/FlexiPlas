import { NextResponse } from "next/server";
import { mongoColl } from "@/lib/mongo-collections";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { notifyUsersByFilter } from "@/lib/notifications-service";
import { assertBulkSize, resolveProviderTargets } from "@/lib/resolve-provider-targets";
import { serializeDocument } from "@/lib/serialize";
import type { DbDocument } from "@/lib/types";
import { toObjectId } from "@/lib/object-id";

type Item = { documentType: string; description: string };

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "empresa") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  const year = Number(body?.year);
  const items = body?.items as unknown;
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: "items debe ser un array no vacío" },
      { status: 400 }
    );
  }
  if (items.length > 50) {
    return NextResponse.json({ error: "Máximo 50 tipos por lote" }, { status: 400 });
  }
  if (!Number.isFinite(year)) {
    return NextResponse.json({ error: "Año inválido" }, { status: 400 });
  }

  const parsed: Item[] = [];
  for (const row of items) {
    if (!row || typeof row !== "object") continue;
    const documentType =
      typeof (row as Item).documentType === "string"
        ? (row as Item).documentType.trim()
        : "";
    const description =
      typeof (row as Item).description === "string"
        ? (row as Item).description.trim()
        : "";
    if (documentType && description) parsed.push({ documentType, description });
  }
  if (parsed.length === 0) {
    return NextResponse.json(
      { error: "Cada ítem necesita documentType y description" },
      { status: 400 }
    );
  }

  const db = await getDb();
  const targets = await resolveProviderTargets(db, body as Record<string, unknown>);
  if (!targets.ok) {
    return NextResponse.json({ error: targets.error }, { status: 400 });
  }

  const sizeCheck = assertBulkSize(targets.ids.length, parsed.length);
  if (!sizeCheck.ok) {
    return NextResponse.json({ error: sizeCheck.error }, { status: 400 });
  }

  const now = new Date();
  const col = db.collection(mongoColl.documents);
  const created: DbDocument[] = [];
  const errors: string[] = [];

  for (const targetPid of targets.ids) {
    for (const { documentType, description } of parsed) {
      try {
        const ins = await col.insertOne({
          providerId: targetPid,
          documentType,
          year,
          description,
          status: "pending",
          blobName: null,
          observations: null,
          deadline: null,
          createdAt: now,
          updatedAt: now,
        });
        const doc = await col.findOne({ _id: ins.insertedId });
        if (doc) created.push(doc as unknown as DbDocument);
      } catch (e: unknown) {
        if (
          typeof e === "object" &&
          e !== null &&
          "code" in e &&
          (e as { code: number }).code === 11000
        ) {
          errors.push(`${documentType} (${year}) · proveedor: ya existe`);
        } else {
          errors.push(`${documentType}: error`);
        }
      }
    }
  }

  const countByProvider = new Map<string, number>();
  for (const d of created) {
    const s = String(d.providerId);
    countByProvider.set(s, (countByProvider.get(s) ?? 0) + 1);
  }
  for (const [pidStr, n] of Array.from(countByProvider.entries())) {
    const oid = toObjectId(pidStr);
    if (oid && n > 0) {
      await notifyUsersByFilter(
        { role: "proveedor", providerId: oid },
        `Nuevas solicitudes (${n}): revisa tu panel de documentos.`,
        "info"
      );
    }
  }

  const provs = await db.collection(mongoColl.providers).find().toArray();
  const names = new Map(provs.map((p) => [String(p._id), p.name as string]));

  return NextResponse.json({
    created: created.map((d) => serializeDocument(d, names)),
    createdCount: created.length,
    errors,
  });
}
