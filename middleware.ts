import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Solo proteger rutas /dashboard/*
  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  const token = request.cookies.get("token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const session = await verifyToken(token);

  if (!session) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("token");
    return response;
  }

  // Verificar que el rol coincida con la ruta
  const role = session.role;

  if (pathname.startsWith("/dashboard/admin") && role !== "ADMIN") {
    return NextResponse.redirect(
      new URL(getDashboardForRole(role), request.url)
    );
  }

  if (
    pathname.startsWith("/dashboard/empresa") &&
    role !== "EMPRESA" &&
    role !== "ADMIN"
  ) {
    return NextResponse.redirect(
      new URL(getDashboardForRole(role), request.url)
    );
  }

  if (pathname.startsWith("/dashboard/proveedor") && role !== "PROVEEDOR") {
    return NextResponse.redirect(
      new URL(getDashboardForRole(role), request.url)
    );
  }

  return NextResponse.next();
}

function getDashboardForRole(role: string): string {
  switch (role) {
    case "ADMIN":
      return "/dashboard/admin";
    case "EMPRESA":
      return "/dashboard/empresa";
    case "PROVEEDOR":
      return "/dashboard/proveedor";
    default:
      return "/login";
  }
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
