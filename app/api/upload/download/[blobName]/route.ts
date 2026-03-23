import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { generateSasUrl } from "@/lib/azure";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ blobName: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { blobName } = await params;
    const decodedBlobName = decodeURIComponent(blobName);

    const sasUrl = await generateSasUrl(decodedBlobName, 60);

    return NextResponse.redirect(sasUrl);
  } catch (error) {
    console.error("Error en GET /api/upload/download/[blobName]:", error);
    return NextResponse.json(
      { error: "Error al generar URL de descarga" },
      { status: 500 }
    );
  }
}
