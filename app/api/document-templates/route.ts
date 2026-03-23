import { NextResponse } from "next/server";
import { mongoColl } from "@/lib/mongo-collections";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { toObjectId } from "@/lib/object-id";
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "empresa") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const db = await getDb();
  const list = await db
    .collection(mongoColl.documentTemplates)
    .find({})
    .sort({ createdAt: -1 })
    .toArray();
  const templates = list.map((t) => ({
    id: String(t._id),
    label: t.label as string,
    defaultDescription: (t.defaultDescription as string) || "",
    createdAt: (t.createdAt as Date)?.toISOString?.() ?? null,
  }));
  return NextResponse.json({ templates });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "empresa") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  const label =
    typeof body?.label === "string" ? body.label.trim() : "";
  const defaultDescription =
    typeof body?.defaultDescription === "string"
      ? body.defaultDescription.trim()
      : "";
  if (!label) {
    return NextResponse.json({ error: "Nombre del tipo requerido" }, { status: 400 });
  }
  const uid = toObjectId(session.id);
  if (!uid) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 400 });
  }
  const now = new Date();
  const db = await getDb();
  const ins = await db.collection(mongoColl.documentTemplates).insertOne({
    label,
    defaultDescription,
    createdAt: now,
    createdByUserId: uid,
  });
  return NextResponse.json({
    template: {
      id: String(ins.insertedId),
      label,
      defaultDescription,
      createdAt: now.toISOString(),
    },
  });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "empresa") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") || "";
  const oid = toObjectId(id);
  if (!oid) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }
  const db = await getDb();
  const r = await db.collection(mongoColl.documentTemplates).deleteOne({ _id: oid });
  if (r.deletedCount === 0) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
