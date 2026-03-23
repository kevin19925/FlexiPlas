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
    const { default: Provider } = await import("@/models/Provider");
    const Doc = (await import("@/models/Document")).default;

    const provider = await Provider.findById(id);
    if (!provider) {
      return NextResponse.json(
        { error: "Proveedor no encontrado" },
        { status: 404 }
      );
    }

    const documents = await Doc.find({ providerId: id }).sort({ createdAt: -1 });

    const statsAgg = await Doc.aggregate([
      { $match: { providerId: provider._id } },
      {
        $group: {
          _id: null,
          pending: { $sum: { $cond: [{ $eq: ["$status", "PENDING"] }, 1, 0] } },
          uploaded: { $sum: { $cond: [{ $eq: ["$status", "UPLOADED"] }, 1, 0] } },
          approved: { $sum: { $cond: [{ $eq: ["$status", "APPROVED"] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ["$status", "REJECTED"] }, 1, 0] } },
          total: { $sum: 1 },
        },
      },
    ]);

    const stats = statsAgg[0] || {
      pending: 0,
      uploaded: 0,
      approved: 0,
      rejected: 0,
      total: 0,
    };

    return NextResponse.json({
      provider: {
        _id: provider._id.toString(),
        name: provider.name,
        ruc: provider.ruc,
        email: provider.email || null,
        phone: provider.phone || null,
        createdAt: provider.createdAt,
        updatedAt: provider.updatedAt,
      },
      documents: documents.map((d) => ({
        _id: d._id.toString(),
        providerId: d.providerId.toString(),
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
      })),
      stats: {
        pending: stats.pending,
        uploaded: stats.uploaded,
        approved: stats.approved,
        rejected: stats.rejected,
        total: stats.total,
      },
    });
  } catch (error) {
    console.error("Error en GET /api/providers/[id]:", error);
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
    if (!session || (session.role !== "ADMIN" && session.role !== "EMPRESA")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id } = await params;
    await dbConnect();
    const { default: Provider } = await import("@/models/Provider");

    const body = await req.json();
    const { name, email, phone } = body;

    const provider = await Provider.findByIdAndUpdate(
      id,
      { name, email, phone },
      { new: true }
    );

    if (!provider) {
      return NextResponse.json(
        { error: "Proveedor no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      _id: provider._id.toString(),
      name: provider.name,
      ruc: provider.ruc,
      email: provider.email || null,
      phone: provider.phone || null,
    });
  } catch (error) {
    console.error("Error en PATCH /api/providers/[id]:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id } = await params;
    await dbConnect();
    const { default: Provider } = await import("@/models/Provider");
    const Doc = (await import("@/models/Document")).default;
    const { default: User } = await import("@/models/User");

    const provider = await Provider.findById(id);
    if (!provider) {
      return NextResponse.json(
        { error: "Proveedor no encontrado" },
        { status: 404 }
      );
    }

    // Eliminar archivos de Azure
    const documents = await Doc.find({ providerId: id });
    for (const doc of documents) {
      if (doc.blobName) {
        await deleteFileFromAzure(doc.blobName);
      }
    }

    // Eliminar documentos
    await Doc.deleteMany({ providerId: id });

    // Desvincular usuarios
    await User.updateMany({ providerId: id }, { $set: { providerId: null } });

    // Eliminar proveedor
    await Provider.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error en DELETE /api/providers/[id]:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
