import { verifySessionToken } from "./jwt";
import type { SessionUser, UserRole } from "./types";

export const SESSION_COOKIE = "flexiplas_session";

export function dashboardPathForRole(role: UserRole): string {
  switch (role) {
    case "admin":
      return "/dashboard/admin";
    case "empresa":
      return "/dashboard/empresa";
    case "proveedor":
      return "/dashboard/proveedor";
    default:
      return "/login";
  }
}

export async function parseSessionCookie(
  raw: string | undefined
): Promise<SessionUser | null> {
  return verifySessionToken(raw);
}
