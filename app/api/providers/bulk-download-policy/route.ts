import type { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { mongoColl } from "@/lib/mongo-collections";
import { toObjectId } from "@/lib/object-id";

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || (session.role !== "empresa" && session.role !== "admin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    applyToAll?: unknown;
    providerIds?: unknown;
    maxDownloadsPerDocument?: unknown;
  } | null;

  const raw = body?.maxDownloadsPerDocument;
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

  const applyToAll = body?.applyToAll === true;
  const idsRaw = body?.providerIds;
  const idStrings = Array.isArray(idsRaw)
    ? idsRaw.filter((x): x is string => typeof x === "string" && x.length > 0)
    : [];

  if (!applyToAll && idStrings.length === 0) {
    return NextResponse.json(
      { error: "Indica applyToAll: true o una lista providerIds" },
      { status: 400 }
    );
  }

  const db = await getDb();
  let providerOids: ObjectId[];

  if (applyToAll) {
    const provs = await db
      .collection(mongoColl.providers)
      .find({}, { projection: { _id: 1 } })
      .toArray();
    providerOids = provs.map((p) => p._id as ObjectId);
  } else {
    providerOids = idStrings.map((id) => toObjectId(id)).filter((x): x is ObjectId => Boolean(x));
    if (providerOids.length !== idStrings.length) {
      return NextResponse.json({ error: "Algún ID de proveedor es inválido" }, { status: 400 });
    }
  }

  if (providerOids.length === 0) {
    return NextResponse.json({ ok: true, updatedUsers: 0, providers: 0 });
  }

  const r = await db.collection(mongoColl.users).updateMany(
    { role: "proveedor", providerId: { $in: providerOids } },
    { $set: { maxDownloadsPerDocument: value } }
  );

  return NextResponse.json({
    ok: true,
    maxDownloadsPerDocument: value,
    providers: providerOids.length,
    updatedUsers: r.modifiedCount,
  });
}
