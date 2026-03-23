import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { buildEmpresaFileBlobPath, uploadBufferToAzure } from "@/lib/azure-storage";
import { getSession } from "@/lib/auth";
import { notifyUsersByFilter } from "@/lib/notifications-service";
import { buildDownloadInfoForEmpresaFiles } from "@/lib/empresa-file-download-quota";
import { getDb } from "@/lib/mongodb";
import { mongoColl } from "@/lib/mongo-collections";
import { toObjectId } from "@/lib/object-id";
import type { EmpresaUploadedFile } from "@/lib/types";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/webp",
]);

function extFromMime(m: string, filename: string): string {
  if (m === "image/jpeg" || m === "image/jpg") return "jpg";
  if (m === "image/png") return "png";
  if (m === "image/webp") return "webp";
  if (m === "application/pdf") return "pdf";
  const n = filename.toLowerCase();
  if (n.endsWith(".pdf")) return "pdf";
  if (n.endsWith(".png")) return "png";
  if (n.endsWith(".webp")) return "webp";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "jpg";
  return "bin";
}

function resolvedMime(file: File): string {
  const t = (file.type || "").toLowerCase();
  if (ALLOWED.has(t)) return t;
  const n = file.name.toLowerCase();
  if (n.endsWith(".pdf")) return "application/pdf";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".webp")) return "image/webp";
  return t;
}

function serializeRow(
  doc: {
    _id: ObjectId;
    title: string;
    documentType: string;
    description?: string | null;
    fileName: string;
    mimeType: string;
    blobName: string;
    createdAt: Date;
  },
  downloads?: { used: number; max: number | null }
): EmpresaUploadedFile {
  const base: EmpresaUploadedFile = {
    id: String(doc._id),
    title: doc.title,
    documentType: doc.documentType,
    description: doc.description ?? null,
    fileName: doc.fileName,
    mimeType: doc.mimeType,
    hasFile: Boolean(doc.blobName),
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : String(doc.createdAt),
  };
  if (downloads) base.downloads = downloads;
  return base;
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const db = await getDb();
  const col = db.collection(mongoColl.empresaFiles);

  let filter: Record<string, unknown> = {};
  if (session.role === "empresa") {
    const oid = toObjectId(session.id);
    if (!oid) return NextResponse.json({ error: "Sesión inválida" }, { status: 400 });
    filter = { empresaUserId: oid };
  } else if (session.role === "cliente") {
    const eid = session.empresaUserId ? toObjectId(session.empresaUserId) : null;
    if (!eid) {
      return NextResponse.json(
        { error: "Cliente sin empresa vinculada" },
        { status: 403 }
      );
    }
    filter = { empresaUserId: eid };
  } else if (session.role === "admin") {
    filter = {};
  } else {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const list = await col.find(filter).sort({ createdAt: -1 }).toArray();
  const ids = list.map((d) => d._id as ObjectId);

  let dlMap = new Map<string, { used: number; max: number | null }>();
  if (session.role === "cliente" && ids.length > 0) {
    dlMap = await buildDownloadInfoForEmpresaFiles(db, session.id, ids);
  }

  const files = list.map((d) =>
    serializeRow(
      d as {
        _id: ObjectId;
        title: string;
        documentType: string;
        description?: string | null;
        fileName: string;
        mimeType: string;
        blobName: string;
        createdAt: Date;
      },
      session.role === "cliente" ? dlMap.get(String(d._id)) : undefined
    )
  );

  return NextResponse.json({ files });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "empresa") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const empresaOid = toObjectId(session.id);
  if (!empresaOid) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 400 });
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    const title =
      typeof form.get("title") === "string" ? (form.get("title") as string).trim() : "";
    const documentType =
      typeof form.get("documentType") === "string"
        ? (form.get("documentType") as string).trim()
        : "";
    const description =
      typeof form.get("description") === "string"
        ? (form.get("description") as string).trim()
        : "";

    if (!(file instanceof File) || !title || !documentType) {
      return NextResponse.json(
        { error: "Archivo, título y tipo de documento son obligatorios" },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Máximo 10MB" }, { status: 400 });
    }
    const type = resolvedMime(file);
    if (!ALLOWED.has(type)) {
      return NextResponse.json(
        { error: "Solo PDF, JPG, PNG o WEBP" },
        { status: 400 }
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const ext = extFromMime(type, file.name);
    const fileId = new ObjectId();
    const blobPath = buildEmpresaFileBlobPath(String(empresaOid), String(fileId), ext);

    try {
      await uploadBufferToAzure(buf, type, blobPath);
    } catch (e) {
      console.error(e);
      return NextResponse.json(
        {
          error:
            "No se pudo subir a Azure. Revisa AZURE_STORAGE_CONNECTION_STRING y el contenedor.",
        },
        { status: 503 }
      );
    }

    const now = new Date();
    const db = await getDb();
    await db.collection(mongoColl.empresaFiles).insertOne({
      _id: fileId,
      empresaUserId: empresaOid,
      title,
      documentType,
      description: description || null,
      fileName: file.name,
      mimeType: type,
      blobName: blobPath,
      createdAt: now,
      updatedAt: now,
    });

    const inserted = await db.collection(mongoColl.empresaFiles).findOne({ _id: fileId });
    await notifyUsersByFilter(
      { role: "cliente", empresaUserId: empresaOid },
      `La empresa publicó un archivo nuevo: «${title}» (${documentType}). Revísalo en tu portal para ver o descargar.`,
      "info"
    );
    return NextResponse.json({
      file: serializeRow(inserted as Parameters<typeof serializeRow>[0]),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al subir" }, { status: 500 });
  }
}
