import { NextResponse } from "next/server";
import { mongoColl } from "@/lib/mongo-collections";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { toObjectId } from "@/lib/object-id";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const oid = toObjectId(params.id);
  if (!oid) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || !("maxDownloadsPerDocument" in body)) {
    return NextResponse.json({ error: "Sin cambios" }, { status: 400 });
  }
  const raw = (body as { maxDownloadsPerDocument: unknown }).maxDownloadsPerDocument;
  let value: number | null = null;
  if (raw === null || raw === "") {
    value = null;
  } else if (typeof raw === "number" && Number.isFinite(raw)) {
    if (raw < -1) {
      return NextResponse.json({ error: "Valor inválido" }, { status: 400 });
    }
    value = Math.floor(raw);
  } else {
    return NextResponse.json({ error: "Valor inválido" }, { status: 400 });
  }

  const db = await getDb();
  const r = await db.collection(mongoColl.users).updateOne(
    { _id: oid },
    { $set: { maxDownloadsPerDocument: value } }
  );
  if (r.matchedCount === 0) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const oid = toObjectId(params.id);
  if (!oid) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }
  if (String(oid) === session.id) {
    return NextResponse.json(
      { error: "No puedes eliminarte a ti mismo" },
      { status: 400 }
    );
  }
  const db = await getDb();
  const r = await db.collection(mongoColl.users).deleteOne({ _id: oid });
  if (r.deletedCount === 0) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
