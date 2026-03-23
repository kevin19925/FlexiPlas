import { NextResponse } from "next/server";
import { mongoColl } from "@/lib/mongo-collections";
import { getSession } from "@/lib/auth";
import { deleteAzureBlobIfExists } from "@/lib/azure-storage";
import { getDb } from "@/lib/mongodb";
import { toObjectId } from "@/lib/object-id";

const RUC_RE = /^\d{13}$/;

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || (session.role !== "empresa" && session.role !== "admin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const oid = toObjectId(params.id);
  if (!oid) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }
  const db = await getDb();
  const p = await db.collection(mongoColl.providers).findOne({ _id: oid });
  if (!p) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  return NextResponse.json({
    provider: {
      id: String(p._id),
      name: p.name,
      ruc: p.ruc,
      email: p.email ?? null,
      phone: p.phone ?? null,
    },
  });
}

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
  const name = typeof body?.name === "string" ? body.name.trim() : undefined;
  const ruc = typeof body?.ruc === "string" ? body.ruc.trim() : undefined;
  const email =
    body?.email === null
      ? null
      : typeof body?.email === "string"
        ? body.email.trim() || null
        : undefined;
  const phone =
    body?.phone === null
      ? null
      : typeof body?.phone === "string"
        ? body.phone.trim() || null
        : undefined;

  const $set: Record<string, unknown> = { updatedAt: new Date() };
  if (name !== undefined) {
    if (!name) return NextResponse.json({ error: "Nombre vacío" }, { status: 400 });
    $set.name = name;
  }
  if (ruc !== undefined) {
    if (!RUC_RE.test(ruc)) {
      return NextResponse.json(
        { error: "RUC debe tener 13 dígitos" },
        { status: 400 }
      );
    }
    $set.ruc = ruc;
  }
  if (email !== undefined) $set.email = email;
  if (phone !== undefined) $set.phone = phone;

  try {
    const db = await getDb();
    const r = await db
      .collection(mongoColl.providers)
      .updateOne({ _id: oid }, { $set });
    if (r.matchedCount === 0) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
    const p = await db.collection(mongoColl.providers).findOne({ _id: oid });
    return NextResponse.json({
      provider: {
        id: String(p!._id),
        name: p!.name,
        ruc: p!.ruc,
        email: p!.email ?? null,
        phone: p!.phone ?? null,
      },
    });
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code: number }).code === 11000) {
      return NextResponse.json({ error: "RUC ya registrado" }, { status: 409 });
    }
    throw e;
  }
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

  const db = await getDb();
  const docs = await db
    .collection(mongoColl.documents)
    .find({ providerId: oid })
    .toArray();
  for (const d of docs) {
    await deleteAzureBlobIfExists(d.blobName as string | null);
  }
  await db.collection(mongoColl.documents).deleteMany({ providerId: oid });
  await db.collection(mongoColl.users).updateMany(
    { providerId: oid },
    { $set: { providerId: null } }
  );
  const r = await db.collection(mongoColl.providers).deleteOne({ _id: oid });
  if (r.deletedCount === 0) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
