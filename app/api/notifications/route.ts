import { NextResponse } from "next/server";
import { mongoColl } from "@/lib/mongo-collections";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { toObjectId } from "@/lib/object-id";
import type { NotificationKind } from "@/lib/types";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const uid = toObjectId(session.id);
  if (!uid) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }
  const db = await getDb();
  const list = await db
    .collection(mongoColl.notifications)
    .find({ userId: uid })
    .sort({ createdAt: -1 })
    .limit(20)
    .toArray();
  const notifications = list.map((n) => ({
    id: String(n._id),
    userId: String(n.userId),
    message: n.message as string,
    read: Boolean(n.read),
    kind: (n.kind as NotificationKind) || "info",
    createdAt:
      n.createdAt instanceof Date
        ? n.createdAt.toISOString()
        : String(n.createdAt),
  }));
  return NextResponse.json({ notifications });
}
