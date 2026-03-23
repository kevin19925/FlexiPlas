import { NextResponse } from "next/server";
import { CURRENT_YEAR } from "@/lib/constants";
import { mongoColl } from "@/lib/mongo-collections";
import { getSession } from "@/lib/auth";
import {
  buildBlobPath,
  deleteAzureBlobIfExists,
  uploadBufferToAzure,
} from "@/lib/azure-storage";
import { getDb } from "@/lib/mongodb";
import { notifyUsersByFilter } from "@/lib/notifications-service";
import { toObjectId } from "@/lib/object-id";
import { serializeDocument } from "@/lib/serialize";
import type { DbDocument } from "@/lib/types";

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

async function loadProviderNames(db: Awaited<ReturnType<typeof getDb>>) {
  const provs = await db.collection(mongoColl.providers).find().toArray();
  return new Map(provs.map((p) => [String(p._id), p.name as string]));
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "proveedor" || !session.providerId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    const documentId =
      typeof form.get("documentId") === "string"
        ? (form.get("documentId") as string)
        : "";
    if (!(file instanceof File) || !documentId) {
      return NextResponse.json(
        { error: "Archivo o documentId faltante" },
        { status: 400 }
      );
    }

    const docOid = toObjectId(documentId);
    const provOid = toObjectId(session.providerId);
    if (!docOid || !provOid) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const db = await getDb();
    const col = db.collection(mongoColl.documents);
    const doc = await col.findOne({ _id: docOid });
    if (!doc || String(doc.providerId) !== String(provOid)) {
      return NextResponse.json({ error: "Documento inválido" }, { status: 400 });
    }
    if (doc.year !== CURRENT_YEAR) {
      return NextResponse.json({ error: "Año no permitido" }, { status: 403 });
    }
    if (doc.status !== "pending" && doc.status !== "rejected") {
      return NextResponse.json(
        { error: "Estado no permite subida" },
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
    const blobPath = buildBlobPath(String(doc.providerId), documentId, ext);

    await deleteAzureBlobIfExists(doc.blobName as string | null);

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

    await col.updateOne(
      { _id: docOid },
      {
        $set: {
          blobName: blobPath,
          mimeType: type,
          status: "uploaded",
          observations: null,
          updatedAt: new Date(),
        },
      }
    );

    await notifyUsersByFilter(
      { role: "empresa" },
      `El proveedor subió el documento '${doc.documentType} ${doc.year}' para revisión.`,
      "info"
    );

    const updated = await col.findOne({ _id: docOid });
    const names = await loadProviderNames(db);
    return NextResponse.json({
      document: serializeDocument(updated as unknown as DbDocument, names),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al subir" }, { status: 500 });
  }
}
