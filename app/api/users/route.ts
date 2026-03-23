import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || (session.role !== "ADMIN" && session.role !== "EMPRESA")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    await dbConnect();
    const { default: User } = await import("@/models/User");
    const { default: Provider } = await import("@/models/Provider");

    const users = await User.find({}, { password: 0 }).sort({ createdAt: -1 });

    const enriched = await Promise.all(
      users.map(async (u) => {
        let providerName = null;
        if (u.providerId) {
          const prov = await Provider.findById(u.providerId, { name: 1 });
          providerName = prov?.name || null;
        }
        return {
          _id: u._id.toString(),
          email: u.email,
          name: u.name,
          role: u.role,
          providerId: u.providerId?.toString() || null,
          providerName,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Error en GET /api/users:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    await dbConnect();
    const { default: User } = await import("@/models/User");
    const { default: Provider } = await import("@/models/Provider");

    const body = await req.json();
    const { email, password, name, role, providerId } = body;

    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: "Todos los campos son requeridos" },
        { status: 400 }
      );
    }

    if (!["ADMIN", "EMPRESA", "PROVEEDOR"].includes(role)) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }

    if (role === "PROVEEDOR") {
      if (!providerId) {
        return NextResponse.json(
          { error: "El proveedor es requerido para usuarios de tipo PROVEEDOR" },
          { status: 400 }
        );
      }
      const provider = await Provider.findById(providerId);
      if (!provider) {
        return NextResponse.json(
          { error: "El proveedor especificado no existe" },
          { status: 404 }
        );
      }
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe un usuario con ese email" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await User.create({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      name: name.trim(),
      role,
      providerId: role === "PROVEEDOR" ? providerId : null,
    });

    return NextResponse.json(
      {
        _id: newUser._id.toString(),
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        providerId: newUser.providerId?.toString() || null,
        createdAt: newUser.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error en POST /api/users:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
