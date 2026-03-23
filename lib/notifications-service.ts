import type { ObjectId } from "mongodb";
import { mongoColl } from "./mongo-collections";
import { getDb } from "./mongodb";
import type { NotificationKind } from "./types";

const MAX_PER_USER = 200;

export async function trimNotificationsForUser(userId: ObjectId) {
  const db = await getDb();
  const col = db.collection(mongoColl.notifications);
  const count = await col.countDocuments({ userId });
  if (count <= MAX_PER_USER) return;
  const toRemove = count - MAX_PER_USER;
  const oldest = await col
    .find({ userId })
    .sort({ createdAt: 1 })
    .limit(toRemove)
    .project({ _id: 1 })
    .toArray();
  if (oldest.length) {
    await col.deleteMany({ _id: { $in: oldest.map((d) => d._id) } });
  }
}

export async function createNotification(
  userId: ObjectId,
  message: string,
  kind: NotificationKind = "info"
) {
  const db = await getDb();
  const col = db.collection(mongoColl.notifications);
  await col.insertOne({
    userId,
    message,
    read: false,
    kind,
    createdAt: new Date(),
  });
  await trimNotificationsForUser(userId);
}

export async function notifyUsersByFilter(
  filter: Record<string, unknown>,
  message: string,
  kind: NotificationKind
) {
  const db = await getDb();
  const users = await db
    .collection(mongoColl.users)
    .find(filter)
    .project({ _id: 1 })
    .toArray();
  for (const u of users) {
    await createNotification(u._id, message, kind);
  }
}
