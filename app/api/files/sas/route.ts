import { NextResponse } from "next/server";
import { mongoColl } from "@/lib/mongo-collections";
import { getSession } from "@/lib/auth";
import { assertDownloadAllowed, recordDownload } from "@/lib/download-quota";
import { getBlobSasUrl } from "@/lib/azure-storage";
import { getDb } from "@/lib/mongodb";
import { toObjectId } from "@/lib/object-id";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get("documentId") || "";
  const mode = searchParams.get("mode") || "download";
  const oid = toObjectId(documentId);
  if (!oid) {
    return NextResponse.json({ error: "documentId inválido" }, { status: 400 });
  }

  if (mode !== "view" && mode !== "download") {
    return NextResponse.json({ error: "mode debe ser view o download" }, { status: 400 });
  }

  const db = await getDb();
  const doc = await db.collection(mongoColl.documents).findOne({ _id: oid });
  if (!doc || !doc.blobName) {
    return NextResponse.json({ error: "Sin archivo" }, { status: 404 });
  }

  const pid = String(doc.providerId);

  if (session.role === "proveedor") {
    if (!session.providerId || session.providerId !== pid) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
  } else if (session.role !== "empresa" && session.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const userOid = toObjectId(session.id);
  if (!userOid) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 400 });
  }

  if (mode === "download" && session.role === "admin") {
    return NextResponse.json(
      {
        error:
          "Los administradores solo pueden usar vista previa en la aplicación (modo view).",
      },
      { status: 403 }
    );
  }

  if (mode === "download" && (session.role === "empresa" || session.role === "proveedor")) {
    const check = await assertDownloadAllowed(db, userOid, oid);
    if (!check.ok) {
      return NextResponse.json({ error: check.message }, { status: 429 });
    }
    await recordDownload(db, userOid, oid);
  }

  try {
    const url = getBlobSasUrl(doc.blobName as string, 60);
    return NextResponse.json({
      url,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      mode,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "No se pudo generar enlace temporal (Azure)" },
      { status: 503 }
    );
  }
}
