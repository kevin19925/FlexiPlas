import { NextResponse } from "next/server";
import { mongoColl } from "@/lib/mongo-collections";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { toObjectId } from "@/lib/object-id";
import { serializeDocument } from "@/lib/serialize";
import type { DbDocument } from "@/lib/types";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 10));
  const providerId = searchParams.get("providerId") || "";
  const status = searchParams.get("status") || "";
  const yearRaw = searchParams.get("year");

  const filter: Record<string, unknown> = {};
  const pid = providerId ? toObjectId(providerId) : null;
  if (pid) filter.providerId = pid;
  if (status && ["pending", "uploaded", "approved", "rejected"].includes(status)) {
    filter.status = status;
  }
  if (yearRaw && yearRaw !== "all") {
    const y = Number(yearRaw);
    if (Number.isFinite(y)) filter.year = y;
  }

  const db = await getDb();
  const col = db.collection(mongoColl.documents);
  const total = await col.countDocuments(filter);
  const list = await col
    .find(filter)
    .sort({ updatedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray();
  const provs = await db.collection(mongoColl.providers).find().toArray();
  const names = new Map(provs.map((p) => [String(p._id), p.name as string]));
  const documents = list.map((d) =>
    serializeDocument(d as unknown as DbDocument, names)
  );
  return NextResponse.json({
    documents,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  });
}
