import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { mongoColl } from "@/lib/mongo-collections";
import { getDb } from "@/lib/mongodb";
import { signSessionToken } from "@/lib/jwt";
import { dashboardPathForRole, SESSION_COOKIE } from "@/lib/session";
import type { SessionUser } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!email || !password) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const db = await getDb();
    const user = await db.collection(mongoColl.users).findOne({
      email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    });
    if (!user || typeof user.passwordHash !== "string") {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    const session: SessionUser = {
      id: String(user._id),
      email: user.email,
      name: user.name,
      role: user.role,
      ...(user.providerId ? { providerId: String(user.providerId) } : {}),
    };

    const token = await signSessionToken(session);
    const res = NextResponse.json({
      user: session,
      redirect: dashboardPathForRole(session.role),
    });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Error de servidor. ¿MongoDB configurada?" },
      { status: 500 }
    );
  }
}
