import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    await dbConnect();
    const { default: Provider } = await import("@/models/Provider");
    const Doc = (await import("@/models/Document")).default;

    const providers = await Provider.find({}).sort({ name: 1 });

    // Calcular stats por proveedor con aggregate
    const statsAgg = await Doc.aggregate([
      {
        $group: {
          _id: "$providerId",
          pending: {
            $sum: { $cond: [{ $eq: ["$status", "PENDING"] }, 1, 0] },
          },
          uploaded: {
            $sum: { $cond: [{ $eq: ["$status", "UPLOADED"] }, 1, 0] },
          },
          approved: {
            $sum: { $cond: [{ $eq: ["$status", "APPROVED"] }, 1, 0] },
          },
          rejected: {
            $sum: { $cond: [{ $eq: ["$status", "REJECTED"] }, 1, 0] },
          },
          total: { $sum: 1 },
        },
      },
    ]);

    const statsMap = new Map(
      statsAgg.map((s) => [s._id.toString(), s])
    );

    const result = providers.map((p) => {
      const stats = statsMap.get(p._id.toString()) || {
        pending: 0,
        uploaded: 0,
        approved: 0,
        rejected: 0,
        total: 0,
      };

      return {
        _id: p._id.toString(),
        name: p.name,
        ruc: p.ruc,
        email: p.email || null,
        phone: p.phone || null,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        stats: {
          pending: stats.pending,
          uploaded: stats.uploaded,
          approved: stats.approved,
          rejected: stats.rejected,
          total: stats.total,
        },
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error en GET /api/providers:", error);
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
    const { default: Provider } = await import("@/models/Provider");

    const body = await req.json();
    const { name, ruc, email, phone } = body;

    if (!name || !ruc) {
      return NextResponse.json(
        { error: "Nombre y RUC son requeridos" },
        { status: 400 }
      );
    }

    if (!/^\d{13}$/.test(ruc)) {
      return NextResponse.json(
        { error: "El RUC debe tener exactamente 13 dígitos numéricos" },
        { status: 400 }
      );
    }

    const existing = await Provider.findOne({ ruc });
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe un proveedor con ese RUC" },
        { status: 409 }
      );
    }

    const provider = await Provider.create({
      name: name.trim(),
      ruc: ruc.trim(),
      email: email?.trim() || undefined,
      phone: phone?.trim() || undefined,
    });

    return NextResponse.json(
      {
        _id: provider._id.toString(),
        name: provider.name,
        ruc: provider.ruc,
        email: provider.email || null,
        phone: provider.phone || null,
        createdAt: provider.createdAt,
        updatedAt: provider.updatedAt,
        stats: { pending: 0, uploaded: 0, approved: 0, rejected: 0, total: 0 },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error en POST /api/providers:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
