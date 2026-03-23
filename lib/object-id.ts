import { ObjectId } from "mongodb";

export function toObjectId(id: string): ObjectId | null {
  if (!id || !ObjectId.isValid(id)) return null;
  return new ObjectId(id);
}
