import { SignJWT, jwtVerify } from "jose";
import { runtimeEnv } from "./runtime-env";
import type { SessionUser, UserRole } from "./types";

function secretKey(): Uint8Array {
  const s = runtimeEnv("JWT_SECRET");
  if (!s || s.length < 16) {
    throw new Error("JWT_SECRET debe tener al menos 16 caracteres");
  }
  return new TextEncoder().encode(s);
}

/** Para middleware Edge: no lanza si falta secret (sesión inválida). */
export function getJwtSecretOptional(): Uint8Array | null {
  const s = runtimeEnv("JWT_SECRET");
  if (!s || s.length < 16) return null;
  return new TextEncoder().encode(s);
}

export async function signSessionToken(user: SessionUser): Promise<string> {
  const token = await new SignJWT({
    email: user.email,
    name: user.name,
    role: user.role,
    ...(user.providerId ? { providerId: user.providerId } : {}),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
  return token;
}

export async function verifySessionToken(
  token: string | undefined
): Promise<SessionUser | null> {
  if (!token) return null;
  const key = getJwtSecretOptional();
  if (!key) return null;
  try {
    const { payload } = await jwtVerify(token, key);
    const sub = payload.sub;
    if (!sub || typeof payload.email !== "string" || typeof payload.role !== "string") {
      return null;
    }
    const role = payload.role as UserRole;
    if (role !== "admin" && role !== "empresa" && role !== "proveedor") return null;
    return {
      id: sub,
      email: payload.email,
      name: typeof payload.name === "string" ? payload.name : "",
      role,
      providerId:
        typeof payload.providerId === "string" ? payload.providerId : undefined,
    };
  } catch {
    return null;
  }
}
