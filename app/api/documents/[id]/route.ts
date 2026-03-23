import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";
import { deleteFileFromAzure } from "@/lib/azure";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();
    const Doc = (await import("@/models/Document")).default;
    const { default: Provider } = await import("@/models/Provider");

    const doc = await Doc.findById(id);
    if (!doc) {
      return NextResponse.json(
        { error: "Documento no encontrado" },
        { status: 404 }
      );
    }

    const provider = await Provider.findById(doc.providerId, { name: 1 });

    return NextResponse.json({
      _id: doc._id.toString(),
      providerId: doc.providerId.toString(),
      providerName: provider?.name || "Desconocido",
      documentType: doc.documentType,
      year: doc.year,
      description: doc.description,
      status: doc.status,
      fileUrl: doc.fileUrl || null,
      fileName: doc.fileName || null,
      blobName: doc.blobName || null,
      observations: doc.observations || null,
      deadline: doc.deadline || null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  } catch (error) {
    console.error("Error en GET /api/documents/[id]:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();
    const Doc = (await import("@/models/Document")).default;
    const { default: Notification } = await import("@/models/Notification");
    const { default: User } = await import("@/models/User");

    const doc = await Doc.findById(id);
    if (!doc) {
      return NextResponse.json(
        { error: "Documento no encontrado" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { action, observations, fileUrl, fileName, blobName } = body;

    if (action === "approve") {
      if (session.role !== "ADMIN" && session.role !== "EMPRESA") {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }

      doc.status = "APPROVED";
      await doc.save();

      // Notificar al proveedor
      const providerUser = await User.findOne({
        providerId: doc.providerId,
        role: "PROVEEDOR",
      });
      if (providerUser) {
        await Notification.create({
          userId: providerUser._id,
          message: `Tu documento "${doc.documentType}" del año ${doc.year} fue APROBADO.`,
          type: "SUCCESS",
        });
      }
    } else if (action === "reject") {
      if (session.role !== "ADMIN" && session.role !== "EMPRESA") {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }

      if (!observations || observations.trim().length < 5) {
        return NextResponse.json(
          { error: "Las observaciones deben tener al menos 5 caracteres" },
          { status: 400 }
        );
      }

      doc.status = "REJECTED";
      doc.observations = observations.trim();
      await doc.save();

      // Notificar al proveedor
      const providerUser = await User.findOne({
        providerId: doc.providerId,
        role: "PROVEEDOR",
      });
      if (providerUser) {
        await Notification.create({
          userId: providerUser._id,
          message: `Tu documento "${doc.documentType}" del año ${doc.year} fue RECHAZADO. Motivo: ${observations}`,
          type: "ERROR",
        });
      }
    } else if (action === "upload") {
      if (session.role !== "PROVEEDOR" && session.role !== "ADMIN") {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }

      if (!fileUrl || !fileName || !blobName) {
        return NextResponse.json(
          { error: "fileUrl, fileName y blobName son requeridos" },
          { status: 400 }
        );
      }

      // Eliminar archivo anterior si existe
      if (doc.blobName) {
        await deleteFileFromAzure(doc.blobName);
      }

      doc.status = "UPLOADED";
      doc.fileUrl = fileUrl;
      doc.fileName = fileName;
      doc.blobName = blobName;
      await doc.save();

      // Notificar a la empresa
      const empresaUsers = await User.find({ role: { $in: ["EMPRESA", "ADMIN"] } });
      for (const eu of empresaUsers) {
        await Notification.create({
          userId: eu._id,
          message: `Nuevo archivo subido para "${doc.documentType}" (${doc.year}). Pendiente de revisión.`,
          type: "INFO",
        });
      }
    } else {
      return NextResponse.json(
        { error: "Acción inválida. Use: approve, reject, upload" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      _id: doc._id.toString(),
      status: doc.status,
      fileUrl: doc.fileUrl || null,
      fileName: doc.fileName || null,
      blobName: doc.blobName || null,
      observations: doc.observations || null,
    });
  } catch (error) {
    console.error("Error en PATCH /api/documents/[id]:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
