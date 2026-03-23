import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import {
  getDefaultMaxDownloadsPerDocument,
  setDefaultMaxDownloadsPerDocument,
} from "@/lib/settings-helpers";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const db = await getDb();
  const defaultMaxDownloadsPerDocument =
    await getDefaultMaxDownloadsPerDocument(db);
  return NextResponse.json({
    defaultMaxDownloadsPerDocument,
    help:
      "Por usuario puedes sobreescribir en Usuarios. -1 = descargas ilimitadas por archivo.",
  });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  const n = Number(body?.defaultMaxDownloadsPerDocument);
  if (!Number.isFinite(n) || n < -1 || n > 9999) {
    return NextResponse.json(
      {
        error:
          "defaultMaxDownloadsPerDocument: número entre -1 y 9999 (-1 = ilimitado)",
      },
      { status: 400 }
    );
  }
  const db = await getDb();
  await setDefaultMaxDownloadsPerDocument(db, Math.floor(n));
  return NextResponse.json({
    defaultMaxDownloadsPerDocument: Math.floor(n),
  });
}
