import { NextResponse } from "next/server";
import { deleteAzureBlobIfExists } from "@/lib/azure-storage";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { mongoColl } from "@/lib/mongo-collections";
import { toObjectId } from "@/lib/object-id";

type Params = { params: { id: string } };

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "empresa") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const fid = toObjectId(params.id);
  const eid = toObjectId(session.id);
  if (!fid || !eid) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const db = await getDb();
  const col = db.collection(mongoColl.empresaFiles);
  const doc = await col.findOne({ _id: fid });
  if (!doc) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  if (String(doc.empresaUserId) !== String(eid)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  await deleteAzureBlobIfExists(doc.blobName as string | null);
  await col.deleteOne({ _id: fid });
  await db.collection(mongoColl.empresaFileDownloads).deleteMany({ empresaFileId: fid });

  return NextResponse.json({ ok: true });
}
