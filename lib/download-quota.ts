import type { Db, ObjectId } from "mongodb";
import { mongoColl } from "./mongo-collections";
import { getDefaultMaxDownloadsPerDocument } from "./settings-helpers";
import { toObjectId } from "./object-id";

/** null = sin límite */
export async function effectiveMaxDownloadsPerDocument(
  db: Db,
  userId: ObjectId
): Promise<number | null> {
  const u = await db.collection(mongoColl.users).findOne({ _id: userId });
  const override = u?.maxDownloadsPerDocument;
  if (override === -1) return null;
  if (typeof override === "number" && override >= 0) return override;
  const def = await getDefaultMaxDownloadsPerDocument(db);
  if (def < 0) return null;
  return def;
}

export async function countDownloadsForDocument(
  db: Db,
  userId: ObjectId,
  documentId: ObjectId
): Promise<number> {
  return db.collection(mongoColl.downloadLogs).countDocuments({
    userId,
    documentId,
  });
}

export async function recordDownload(
  db: Db,
  userId: ObjectId,
  documentId: ObjectId
): Promise<void> {
  await db.collection(mongoColl.downloadLogs).insertOne({
    userId,
    documentId,
    createdAt: new Date(),
  });
}

export async function assertDownloadAllowed(
  db: Db,
  userId: ObjectId,
  documentId: ObjectId
): Promise<{ ok: true } | { ok: false; message: string }> {
  const max = await effectiveMaxDownloadsPerDocument(db, userId);
  if (max === null) return { ok: true };
  const used = await countDownloadsForDocument(db, userId, documentId);
  if (used >= max) {
    return {
      ok: false,
      message: `Límite de descargas alcanzado (${max} por archivo). Contacta al administrador.`,
    };
  }
  return { ok: true };
}

export async function buildDownloadInfoForDocuments(
  db: Db,
  userIdStr: string,
  docIds: ObjectId[]
): Promise<Map<string, { used: number; max: number | null }>> {
  const uid = toObjectId(userIdStr);
  const map = new Map<string, { used: number; max: number | null }>();
  if (!uid || docIds.length === 0) return map;
  const max = await effectiveMaxDownloadsPerDocument(db, uid);
  const agg = await db
    .collection(mongoColl.downloadLogs)
    .aggregate<{ _id: ObjectId; n: number }>([
      { $match: { userId: uid, documentId: { $in: docIds } } },
      { $group: { _id: "$documentId", n: { $sum: 1 } } },
    ])
    .toArray();
  const usedByDoc = new Map(agg.map((a) => [String(a._id), a.n]));
  for (const id of docIds) {
    const sid = String(id);
    map.set(sid, { used: usedByDoc.get(sid) ?? 0, max });
  }
  return map;
}
