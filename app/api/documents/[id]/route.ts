import { NextResponse } from "next/server";
import { mongoColl } from "@/lib/mongo-collections";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { createNotification } from "@/lib/notifications-service";
import { toObjectId } from "@/lib/object-id";
import { serializeDocument } from "@/lib/serialize";
import type { DbDocument } from "@/lib/types";

async function loadProviderNames(db: Awaited<ReturnType<typeof getDb>>) {
  const provs = await db.collection(mongoColl.providers).find().toArray();
  return new Map(provs.map((p) => [String(p._id), p.name as string]));
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const oid = toObjectId(params.id);
  if (!oid) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }
  const body = await request.json().catch(() => null);
  const action = body?.action as string | undefined;

  const db = await getDb();
  const col = db.collection(mongoColl.documents);
  const doc = await col.findOne({ _id: oid });
  if (!doc) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  if (action === "approve" || action === "reject") {
    if (session.role !== "empresa") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    if (action === "approve") {
      await col.updateOne(
        { _id: oid },
        {
          $set: {
            status: "approved",
            observations: null,
            updatedAt: new Date(),
          },
        }
      );
      const users = await db
        .collection(mongoColl.users)
        .find({ role: "proveedor", providerId: doc.providerId })
        .toArray();
      for (const u of users) {
        await createNotification(
          u._id,
          `Tu documento '${doc.documentType} ${doc.year}' fue aprobado.`,
          "success"
        );
      }
    } else {
      const observations =
        typeof body?.observations === "string" ? body.observations.trim() : "";
      if (observations.length < 5) {
        return NextResponse.json(
          { error: "La observación debe tener al menos 5 caracteres" },
          { status: 400 }
        );
      }
      await col.updateOne(
        { _id: oid },
        {
          $set: {
            status: "rejected",
            observations,
            updatedAt: new Date(),
          },
        }
      );
      const users = await db
        .collection(mongoColl.users)
        .find({ role: "proveedor", providerId: doc.providerId })
        .toArray();
      for (const u of users) {
        await createNotification(
          u._id,
          `Tu documento '${doc.documentType} ${doc.year}' fue rechazado: ${observations}`,
          "error"
        );
      }
    }
    const updated = await col.findOne({ _id: oid });
    const names = await loadProviderNames(db);
    return NextResponse.json({
      document: serializeDocument(updated as unknown as DbDocument, names),
    });
  }

  return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
}
