import { NextResponse } from "next/server";
import { getBlobSasUrl } from "@/lib/azure-storage";
import { getSession } from "@/lib/auth";
import {
  assertEmpresaFileDownloadAllowed,
  recordEmpresaFileDownload,
} from "@/lib/empresa-file-download-quota";
import { getDb } from "@/lib/mongodb";
import { mongoColl } from "@/lib/mongo-collections";
import { toObjectId } from "@/lib/object-id";

type Params = { params: { id: string } };

export async function GET(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") || "view";
  if (mode !== "view" && mode !== "download") {
    return NextResponse.json({ error: "mode debe ser view o download" }, { status: 400 });
  }

  const fid = toObjectId(params.id);
  if (!fid) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const db = await getDb();
  const doc = await db.collection(mongoColl.empresaFiles).findOne({ _id: fid });
  if (!doc || !doc.blobName) {
    return NextResponse.json({ error: "Sin archivo" }, { status: 404 });
  }

  const ownerId = String(doc.empresaUserId);

  if (session.role === "empresa") {
    if (session.id !== ownerId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
  } else if (session.role === "cliente") {
    if (!session.empresaUserId || session.empresaUserId !== ownerId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
  } else if (session.role === "admin") {
    if (mode === "download") {
      return NextResponse.json(
        { error: "Los administradores solo pueden vista previa (modo view)." },
        { status: 403 }
      );
    }
  } else {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const userOid = toObjectId(session.id);
  if (!userOid) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 400 });
  }

  if (mode === "download" && session.role === "cliente") {
    const check = await assertEmpresaFileDownloadAllowed(db, userOid, fid);
    if (!check.ok) {
      return NextResponse.json({ error: check.message }, { status: 429 });
    }
    await recordEmpresaFileDownload(db, userOid, fid);
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
      { error: "No se pudo generar enlace temporal" },
      { status: 503 }
    );
  }
}
