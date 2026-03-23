import type { Db } from "mongodb";
import { mongoColl } from "./mongo-collections";

const KEY_DEFAULT_MAX_DL = "default_max_downloads_per_document";

export async function getNumericSetting(
  db: Db,
  key: string,
  fallback: number
): Promise<number> {
  const row = await db.collection(mongoColl.settings).findOne({ key });
  const raw = row?.value;
  const n = typeof raw === "string" ? parseInt(raw, 10) : Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export async function getDefaultMaxDownloadsPerDocument(db: Db): Promise<number> {
  const n = await getNumericSetting(db, KEY_DEFAULT_MAX_DL, 10);
  return n;
}

export async function setDefaultMaxDownloadsPerDocument(
  db: Db,
  value: number
): Promise<void> {
  const now = new Date();
  await db.collection(mongoColl.settings).updateOne(
    { key: KEY_DEFAULT_MAX_DL },
    { $set: { key: KEY_DEFAULT_MAX_DL, value: String(value), updatedAt: now } },
    { upsert: true }
  );
}
