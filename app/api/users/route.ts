import type { ObjectId } from "mongodb";
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
  const empresaUsers = await db
    .collection(mongoColl.users)
    .find({ role: "empresa" })
    .project({ name: 1, email: 1 })
    .toArray();
  const emap = new Map(
    empresaUsers.map((e) => [
      String(e._id),
      { name: e.name as string, email: e.email as string },
    ])
  );
  const list = users.map((u) => {
    const eid = u.empresaUserId ? String(u.empresaUserId) : null;
    const emp = eid ? emap.get(eid) : undefined;
    return {
      id: String(u._id),
      email: u.email,
      name: u.name,
      role: u.role as UserRole,
      providerId: u.providerId ? String(u.providerId) : null,
      providerName: u.providerId ? pmap.get(String(u.providerId)) ?? null : null,
      empresaUserId: eid,
      empresaLinkedName: emp?.name ?? null,
      empresaLinkedEmail: emp?.email ?? null,
      createdAt: u.createdAt?.toISOString?.() ?? null,
      maxDownloadsPerDocument:
        typeof u.maxDownloadsPerDocument === "number"
          ? u.maxDownloadsPerDocument
          : null,
    };
  });
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
  const empresaUserIdRaw =
    typeof body?.empresaUserId === "string" ? body.empresaUserId : null;

  if (!email || !password || !name || !role) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }
  if (
    role !== "admin" &&
    role !== "empresa" &&
    role !== "proveedor" &&
    role !== "cliente"
  ) {
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

  let empresaUserId: ObjectId | null = null;
  if (role === "cliente") {
    const eid = toObjectId(empresaUserIdRaw || "");
    if (!eid) {
      return NextResponse.json(
        { error: "Empresa vinculada requerida para rol cliente" },
        { status: 400 }
      );
    }
    const db = await getDb();
    const emp = await db.collection(mongoColl.users).findOne({
      _id: eid,
      role: "empresa",
    });
    if (!emp) {
      return NextResponse.json(
        { error: "La empresa indicada no existe o no es rol empresa" },
        { status: 400 }
      );
    }
    empresaUserId = eid;
  } else if (empresaUserIdRaw) {
    return NextResponse.json(
      { error: "Solo usuarios cliente llevan empresa vinculada" },
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
      empresaUserId,
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
        empresaUserId: u!.empresaUserId ? String(u!.empresaUserId) : null,
      },
    });
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code: number }).code === 11000) {
      return NextResponse.json({ error: "Email ya registrado" }, { status: 409 });
    }
    throw e;
  }
}
