import { NextResponse } from "next/server";
import { mongoColl } from "@/lib/mongo-collections";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

const RUC_RE = /^\d{13}$/;

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || (session.role !== "empresa" && session.role !== "admin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();

  const db = await getDb();
  const col = db.collection(mongoColl.providers);
  const filter =
    q.length > 0
      ? {
          $or: [
            { name: { $regex: q, $options: "i" } },
            { ruc: { $regex: q, $options: "i" } },
          ],
        }
      : {};
  const list = await col.find(filter).sort({ name: 1 }).toArray();
  const providers = list.map((p) => ({
    id: String(p._id),
    name: p.name,
    ruc: p.ruc,
    email: p.email ?? null,
    phone: p.phone ?? null,
  }));
  return NextResponse.json({ providers });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const ruc = typeof body?.ruc === "string" ? body.ruc.trim() : "";
  const email =
    typeof body?.email === "string" && body.email.trim()
      ? body.email.trim()
      : null;
  const phone =
    typeof body?.phone === "string" && body.phone.trim()
      ? body.phone.trim()
      : null;
  if (!name) {
    return NextResponse.json({ error: "Nombre obligatorio" }, { status: 400 });
  }
  if (!RUC_RE.test(ruc)) {
    return NextResponse.json(
      { error: "RUC debe tener exactamente 13 dígitos" },
      { status: 400 }
    );
  }
  const now = new Date();
  try {
    const db = await getDb();
    const ins = await db.collection(mongoColl.providers).insertOne({
      name,
      ruc,
      email,
      phone,
      createdAt: now,
      updatedAt: now,
    });
    const p = await db.collection(mongoColl.providers).findOne({
      _id: ins.insertedId,
    });
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
