import type { Db, ObjectId } from "mongodb";
import { mongoColl } from "./mongo-collections";
import { effectiveMaxDownloadsPerDocument } from "./download-quota";
import { toObjectId } from "./object-id";

/** Reutiliza la misma política de maxDownloadsPerDocument del usuario, pero por archivo de empresa. */
export async function countEmpresaFileDownloads(
  db: Db,
  userId: ObjectId,
  empresaFileId: ObjectId
): Promise<number> {
  return db.collection(mongoColl.empresaFileDownloads).countDocuments({
    userId,
    empresaFileId,
  });
}

export async function assertEmpresaFileDownloadAllowed(
  db: Db,
  userId: ObjectId,
  empresaFileId: ObjectId
): Promise<{ ok: true } | { ok: false; message: string }> {
  const max = await effectiveMaxDownloadsPerDocument(db, userId);
  if (max === null) return { ok: true };
  const used = await countEmpresaFileDownloads(db, userId, empresaFileId);
  if (used >= max) {
    return {
      ok: false,
      message: `Límite de descargas alcanzado (${max} por archivo).`,
    };
  }
  return { ok: true };
}

export async function recordEmpresaFileDownload(
  db: Db,
  userId: ObjectId,
  empresaFileId: ObjectId
): Promise<void> {
  await db.collection(mongoColl.empresaFileDownloads).insertOne({
    userId,
    empresaFileId,
    createdAt: new Date(),
  });
}

export async function buildDownloadInfoForEmpresaFiles(
  db: Db,
  userIdStr: string,
  fileIds: ObjectId[]
): Promise<Map<string, { used: number; max: number | null }>> {
  const uid = toObjectId(userIdStr);
  const map = new Map<string, { used: number; max: number | null }>();
  if (!uid || fileIds.length === 0) return map;
  const max = await effectiveMaxDownloadsPerDocument(db, uid);
  const agg = await db
    .collection(mongoColl.empresaFileDownloads)
    .aggregate<{ _id: ObjectId; n: number }>([
      { $match: { userId: uid, empresaFileId: { $in: fileIds } } },
      { $group: { _id: "$empresaFileId", n: { $sum: 1 } } },
    ])
    .toArray();
  const usedBy = new Map(agg.map((a) => [String(a._id), a.n]));
  for (const id of fileIds) {
    const sid = String(id);
    map.set(sid, { used: usedBy.get(sid) ?? 0, max });
  }
  return map;
}
