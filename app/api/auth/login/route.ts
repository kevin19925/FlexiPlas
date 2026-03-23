import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { signToken, SESSION_COOKIE, SEVEN_DAYS_SECONDS } from "@/lib/auth";
import { initializeSystem } from "@/lib/init";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    await initializeSystem();
    await dbConnect();

    const { default: User } = await import("@/models/User");

    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña son requeridos" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    const sessionUser = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role as "ADMIN" | "EMPRESA" | "PROVEEDOR",
      providerId: user.providerId?.toString() || null,
    };

    const token = await signToken(sessionUser);

    const isProd = process.env.NODE_ENV === "production";

    const response = NextResponse.json({ user: sessionUser });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: SEVEN_DAYS_SECONDS,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Error en login:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
