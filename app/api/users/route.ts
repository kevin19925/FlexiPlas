import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { mongoColl } from "@/lib/mongo-collections";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { toObjectId } from "@/lib/object-id";
import type { UserRole } from "@/lib/types";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const db = await getDb();
  const users = await db
    .collection(mongoColl.users)
    .find({})
    .sort({ createdAt: -1 })
    .toArray();
  const provs = await db.collection(mongoColl.providers).find().toArray();
  const pmap = new Map(provs.map((p) => [String(p._id), p.name as string]));
  const list = users.map((u) => ({
    id: String(u._id),
    email: u.email,
    name: u.name,
    role: u.role as UserRole,
    providerId: u.providerId ? String(u.providerId) : null,
    providerName: u.providerId ? pmap.get(String(u.providerId)) ?? null : null,
    createdAt: u.createdAt?.toISOString?.() ?? null,
    maxDownloadsPerDocument:
      typeof u.maxDownloadsPerDocument === "number"
        ? u.maxDownloadsPerDocument
        : null,
  }));
  return NextResponse.json({ users: list });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const role = body?.role as UserRole | undefined;
  const providerIdRaw =
    typeof body?.providerId === "string" ? body.providerId : null;

  if (!email || !password || !name || !role) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }
  if (role !== "admin" && role !== "empresa" && role !== "proveedor") {
    return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
  }
  if (role === "proveedor") {
    const pid = toObjectId(providerIdRaw || "");
    if (!pid) {
      return NextResponse.json(
        { error: "Proveedor requerido para rol proveedor" },
        { status: 400 }
      );
    }
    const db = await getDb();
    const exists = await db.collection(mongoColl.providers).findOne({ _id: pid });
    if (!exists) {
      return NextResponse.json({ error: "Proveedor no existe" }, { status: 400 });
    }
  } else if (providerIdRaw) {
    return NextResponse.json(
      { error: "Solo usuarios proveedor llevan proveedor asociado" },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date();
  const providerId =
    role === "proveedor" ? toObjectId(providerIdRaw!) : null;

  try {
    const db = await getDb();
    const ins = await db.collection(mongoColl.users).insertOne({
      email,
      passwordHash,
      name,
      role,
      providerId,
      createdAt: now,
    });
    const u = await db.collection(mongoColl.users).findOne({ _id: ins.insertedId });
    return NextResponse.json({
      user: {
        id: String(u!._id),
        email: u!.email,
        name: u!.name,
        role: u!.role,
        providerId: u!.providerId ? String(u!.providerId) : null,
      },
    });
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code: number }).code === 11000) {
      return NextResponse.json({ error: "Email ya registrado" }, { status: 409 });
    }
    throw e;
  }
}
