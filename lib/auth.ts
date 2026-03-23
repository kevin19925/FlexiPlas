import { cookies } from "next/headers";
import { verifySessionToken } from "./jwt";
import { SESSION_COOKIE } from "./session";
import type { SessionUser } from "./types";

export { SESSION_COOKIE, dashboardPathForRole, parseSessionCookie } from "./session";

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  return verifySessionToken(raw);
}
