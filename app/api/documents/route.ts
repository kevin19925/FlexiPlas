import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    await dbConnect();
    const Doc = (await import("@/models/Document")).default;
    const { default: Provider } = await import("@/models/Provider");

    const { searchParams } = new URL(req.url);
    const providerId = searchParams.get("providerId");
    const year = searchParams.get("year");
    const status = searchParams.get("status");

    // Construir filtro
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};
    if (providerId) filter.providerId = providerId;
    if (year) filter.year = parseInt(year);
    if (status) filter.status = status;

    // Si el usuario es PROVEEDOR, solo puede ver sus propios documentos
    if (session.role === "PROVEEDOR") {
      if (!session.providerId) {
        return NextResponse.json([], { status: 200 });
      }
      filter.providerId = session.providerId;
      filter.year = 2026; // Solo año actual
    }

    const documents = await Doc.find(filter).sort({ createdAt: -1 });

    // Enriquecer con nombre del proveedor
    const providerIds = [...new Set(documents.map((d) => d.providerId.toString()))];
    const providers = await Provider.find({ _id: { $in: providerIds } }, { name: 1 });
    const providerMap = new Map(providers.map((p) => [p._id.toString(), p.name]));

    const result = documents.map((d) => ({
      _id: d._id.toString(),
      providerId: d.providerId.toString(),
      providerName: providerMap.get(d.providerId.toString()) || "Desconocido",
      documentType: d.documentType,
      year: d.year,
      description: d.description,
      status: d.status,
      fileUrl: d.fileUrl || null,
      fileName: d.fileName || null,
      blobName: d.blobName || null,
      observations: d.observations || null,
      deadline: d.deadline || null,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error en GET /api/documents:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || (session.role !== "ADMIN" && session.role !== "EMPRESA")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    await dbConnect();
    const Doc = (await import("@/models/Document")).default;
    const { default: Provider } = await import("@/models/Provider");
    const { default: Notification } = await import("@/models/Notification");
    const { default: User } = await import("@/models/User");

    const body = await req.json();
    const { providerId, documentType, year, description, deadline } = body;

    if (!providerId || !documentType || !year || !description) {
      return NextResponse.json(
        { error: "providerId, documentType, year y description son requeridos" },
        { status: 400 }
      );
    }

    const provider = await Provider.findById(providerId);
    if (!provider) {
      return NextResponse.json(
        { error: "Proveedor no encontrado" },
        { status: 404 }
      );
    }

    // Verificar unicidad
    const existing = await Doc.findOne({
      providerId,
      documentType,
      year: parseInt(year),
    });

    if (existing) {
      return NextResponse.json(
        {
          error: `Ya existe una solicitud de "${documentType}" para el año ${year} en este proveedor`,
        },
        { status: 409 }
      );
    }

    const docData: Record<string, unknown> = {
      providerId,
      documentType: documentType.trim(),
      year: parseInt(year),
      description: description.trim(),
      status: "PENDING",
    };

    if (deadline) {
      docData.deadline = new Date(deadline);
    }

    const newDoc = await Doc.create(docData);

    // Notificar al proveedor
    const providerUser = await User.findOne({ providerId, role: "PROVEEDOR" });
    if (providerUser) {
      await Notification.create({
        userId: providerUser._id,
        message: `Nueva solicitud de documento: "${documentType}" para el año ${year}. ${
          deadline ? `Fecha límite: ${new Date(deadline).toLocaleDateString("es-EC")}` : ""
        }`,
        type: "INFO",
      });
    }

    return NextResponse.json(
      {
        _id: newDoc._id.toString(),
        providerId: newDoc.providerId.toString(),
        documentType: newDoc.documentType,
        year: newDoc.year,
        description: newDoc.description,
        status: newDoc.status,
        deadline: newDoc.deadline || null,
        createdAt: newDoc.createdAt,
        updatedAt: newDoc.updatedAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error en POST /api/documents:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
