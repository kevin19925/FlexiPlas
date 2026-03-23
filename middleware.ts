import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { parseSessionCookie, SESSION_COOKIE } from "@/lib/session";
import type { UserRole } from "@/lib/types";

function roleForPath(pathname: string): UserRole | null {
  if (pathname.startsWith("/dashboard/empresa")) return "empresa";
  if (pathname.startsWith("/dashboard/proveedor")) return "proveedor";
  if (pathname.startsWith("/dashboard/admin")) return "admin";
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/login") {
    const raw = request.cookies.get(SESSION_COOKIE)?.value;
    const session = await parseSessionCookie(raw);
    if (session) {
      const dest =
        session.role === "admin"
          ? "/dashboard/admin"
          : session.role === "empresa"
            ? "/dashboard/empresa"
            : "/dashboard/proveedor";
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/dashboard")) {
    const raw = request.cookies.get(SESSION_COOKIE)?.value;
    const session = await parseSessionCookie(raw);
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    const required = roleForPath(pathname);
    if (required && session.role !== required) {
      const fallback =
        session.role === "admin"
          ? "/dashboard/admin"
          : session.role === "empresa"
            ? "/dashboard/empresa"
            : "/dashboard/proveedor";
      return NextResponse.redirect(new URL(fallback, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/dashboard/:path*"],
};
