import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "EMPRESA" | "PROVEEDOR";
  providerId?: string | null;
}

const JWT_SECRET = process.env.JWT_SECRET!;
const SESSION_COOKIE = "token";
const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;

if (!JWT_SECRET) {
  throw new Error("Por favor define JWT_SECRET en .env.local");
}

function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(JWT_SECRET);
}

export async function signToken(payload: SessionUser): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey());
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    return await verifyToken(token);
  } catch {
    return null;
  }
}

export async function getSessionFromRequest(
  req: Request
): Promise<SessionUser | null> {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const tokenMatch = cookieHeader.match(/token=([^;]+)/);
    if (!tokenMatch) return null;
    const token = decodeURIComponent(tokenMatch[1]);
    return await verifyToken(token);
  } catch {
    return null;
  }
}

export { SESSION_COOKIE, SEVEN_DAYS_SECONDS };
