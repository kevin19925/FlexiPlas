import { NextResponse } from "next/server";
import { mongoColl } from "@/lib/mongo-collections";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const db = await getDb();
  const [
    usersCount,
    providersCount,
    documentsCount,
    pendingReview,
    byStatus,
  ] = await Promise.all([
    db.collection(mongoColl.users).countDocuments(),
    db.collection(mongoColl.providers).countDocuments(),
    db.collection(mongoColl.documents).countDocuments(),
    db.collection(mongoColl.documents).countDocuments({
      status: "uploaded",
    }),
    db
      .collection(mongoColl.documents)
      .aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }])
      .toArray(),
  ]);

  const statusMap: Record<string, number> = {};
  for (const row of byStatus as { _id: string; n: number }[]) {
    statusMap[String(row._id)] = row.n;
  }

  return NextResponse.json({
    usersCount,
    providersCount,
    documentsCount,
    pendingReview,
    documentsByStatus: {
      pending: statusMap.pending ?? 0,
      uploaded: statusMap.uploaded ?? 0,
      approved: statusMap.approved ?? 0,
      rejected: statusMap.rejected ?? 0,
    },
  });
}
