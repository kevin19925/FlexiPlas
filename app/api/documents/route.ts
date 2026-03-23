import { NextResponse } from "next/server";
import { mongoColl } from "@/lib/mongo-collections";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { notifyUsersByFilter } from "@/lib/notifications-service";
import { buildDownloadInfoForDocuments } from "@/lib/download-quota";
import { resolveProviderTargets } from "@/lib/resolve-provider-targets";
import { serializeDocument } from "@/lib/serialize";
import type { DbDocument } from "@/lib/types";
import { toObjectId } from "@/lib/object-id";
import type { ObjectId } from "mongodb";

async function loadProviderNames(db: Awaited<ReturnType<typeof getDb>>) {
  const provs = await db.collection(mongoColl.providers).find().toArray();
  return new Map(provs.map((p) => [String(p._id), p.name as string]));
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const db = await getDb();
    const names = await loadProviderNames(db);
    const col = db.collection(mongoColl.documents);

    if (session.role === "proveedor" && session.providerId) {
      const pid = toObjectId(session.providerId);
      if (!pid) {
        return NextResponse.json({ error: "Proveedor inválido" }, { status: 400 });
      }
      const list = await col
        .find({ providerId: pid })
        .sort({ year: -1, updatedAt: -1 })
        .toArray();
      const ids = list.map((d) => d._id as ObjectId);
      const quota = await buildDownloadInfoForDocuments(db, session.id, ids);
      const docs = list.map((d) => {
        const base = serializeDocument(d as unknown as DbDocument, names);
        const q = quota.get(String(d._id));
        return q ? { ...base, downloads: { used: q.used, max: q.max } } : base;
      });
      return NextResponse.json({ documents: docs });
    }

    if (session.role === "empresa") {
      const list = await col.find({}).sort({ updatedAt: -1 }).toArray();
      const ids = list.map((d) => d._id as ObjectId);
      const quota = await buildDownloadInfoForDocuments(db, session.id, ids);
      const docs = list.map((d) => {
        const base = serializeDocument(d as unknown as DbDocument, names);
        const q = quota.get(String(d._id));
        return q ? { ...base, downloads: { used: q.used, max: q.max } } : base;
      });
      return NextResponse.json({ documents: docs });
    }

    return NextResponse.json({ error: "Usa /api/admin/documents" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error de base de datos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "empresa") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  const documentType =
    typeof body?.documentType === "string" ? body.documentType.trim() : "";
  const year = Number(body?.year);
  const description =
    typeof body?.description === "string" ? body.description.trim() : "";
  const deadlineRaw = body?.deadline;
  const deadline =
    typeof deadlineRaw === "string" && deadlineRaw
      ? new Date(deadlineRaw)
      : null;
  if (deadline && Number.isNaN(deadline.getTime())) {
    return NextResponse.json({ error: "Fecha límite inválida" }, { status: 400 });
  }
  if (!documentType || !Number.isFinite(year) || !description) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  try {
    const db = await getDb();
    const targets = await resolveProviderTargets(db, body as Record<string, unknown>);
    if (!targets.ok) {
      return NextResponse.json({ error: targets.error }, { status: 400 });
    }

    const col = db.collection(mongoColl.documents);
    const now = new Date();
    const created: DbDocument[] = [];
    const errors: string[] = [];
    const msgTail = `${description.slice(0, 80)}${description.length > 80 ? "…" : ""}`;

    for (const targetPid of targets.ids) {
      try {
        const ins = await col.insertOne({
          providerId: targetPid,
          documentType,
          year,
          description,
          status: "pending",
          blobName: null,
          observations: null,
          deadline,
          createdAt: now,
          updatedAt: now,
        });
        const doc = await col.findOne({ _id: ins.insertedId });
        if (doc) {
          created.push(doc as unknown as DbDocument);
          await notifyUsersByFilter(
            { role: "proveedor", providerId: targetPid },
            `Nueva solicitud: ${documentType} (${year}) — ${msgTail}`,
            "info"
          );
        }
      } catch (e: unknown) {
        if (
          typeof e === "object" &&
          e !== null &&
          "code" in e &&
          (e as { code: number }).code === 11000
        ) {
          errors.push(
            `Ya existe para un proveedor el mismo tipo y año (${documentType} · ${year})`
          );
        } else {
          errors.push("Error al insertar una fila");
          console.error(e);
        }
      }
    }

    const names = await loadProviderNames(db);
    const documents = created.map((d) => serializeDocument(d, names));
    const payload: Record<string, unknown> = {
      createdCount: documents.length,
      documents,
      errors,
    };
    if (documents.length === 1) {
      payload.document = documents[0];
    }
    return NextResponse.json(payload);
  } catch (e: unknown) {
    console.error(e);
    return NextResponse.json({ error: "Error al crear" }, { status: 500 });
  }
}
