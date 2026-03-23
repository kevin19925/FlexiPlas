import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { mongoColl } from "@/lib/mongo-collections";
import { toObjectId } from "@/lib/object-id";
import { getDefaultMaxDownloadsPerDocument } from "@/lib/settings-helpers";

type Params = { params: { id: string } };

export async function GET(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session || (session.role !== "empresa" && session.role !== "admin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const providerOid = toObjectId(params.id);
  if (!providerOid) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const db = await getDb();
  const provider = await db.collection(mongoColl.providers).findOne({ _id: providerOid });
  if (!provider) {
    return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });
  }

  const users = await db
    .collection(mongoColl.users)
    .find({ role: "proveedor", providerId: providerOid })
    .project({
      _id: 1,
      name: 1,
      email: 1,
      maxDownloadsPerDocument: 1,
    })
    .toArray();

  const globalDefault = await getDefaultMaxDownloadsPerDocument(db);

  return NextResponse.json({
    providerId: params.id,
    defaultMaxDownloadsPerDocument: globalDefault,
    users: users.map((u) => ({
      id: String(u._id),
      name: u.name ?? "",
      email: u.email ?? "",
      maxDownloadsPerDocument:
        typeof u.maxDownloadsPerDocument === "number" ? u.maxDownloadsPerDocument : null,
    })),
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session || (session.role !== "empresa" && session.role !== "admin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const providerOid = toObjectId(params.id);
  if (!providerOid) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const raw = (body as { maxDownloadsPerDocument?: unknown } | null)?.maxDownloadsPerDocument;

  let value: number | null;
  if (raw === null || raw === "") {
    value = null;
  } else if (typeof raw === "number" && Number.isFinite(raw)) {
    if (raw < -1 || raw > 9999) {
      return NextResponse.json({ error: "Valor inválido" }, { status: 400 });
    }
    value = Math.floor(raw);
  } else {
    return NextResponse.json({ error: "maxDownloadsPerDocument inválido" }, { status: 400 });
  }

  const db = await getDb();
  const provider = await db.collection(mongoColl.providers).findOne({ _id: providerOid });
  if (!provider) {
    return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });
  }

  await db
    .collection(mongoColl.users)
    .updateMany(
      { role: "proveedor", providerId: providerOid },
      { $set: { maxDownloadsPerDocument: value } }
    );

  return NextResponse.json({ ok: true, maxDownloadsPerDocument: value });
}

