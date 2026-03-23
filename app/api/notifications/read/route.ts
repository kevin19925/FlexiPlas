import { NextResponse } from "next/server";
import { mongoColl } from "@/lib/mongo-collections";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { toObjectId } from "@/lib/object-id";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const uid = toObjectId(session.id);
  if (!uid) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body?.ids)
    ? (body.ids as unknown[]).filter((x): x is string => typeof x === "string")
    : undefined;

  const db = await getDb();
  const col = db.collection(mongoColl.notifications);
  if (ids?.length) {
    const oids = ids
      .map((id) => toObjectId(id))
      .filter((x): x is NonNullable<typeof x> => x !== null);
    if (oids.length) {
      await col.updateMany(
        { userId: uid, _id: { $in: oids } },
        { $set: { read: true } }
      );
    }
  } else {
    await col.updateMany({ userId: uid }, { $set: { read: true } });
  }
  return NextResponse.json({ ok: true });
}
