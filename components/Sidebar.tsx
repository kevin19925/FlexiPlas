"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SessionUser } from "@/lib/types";

type NavLink = {
  href: string;
  label: string;
  activeMatch?: (pathname: string) => boolean;
};

const links: Record<SessionUser["role"], NavLink[]> = {
  empresa: [
    {
      href: "/dashboard/empresa",
      label: "Inicio",
      activeMatch: (p) => p === "/dashboard/empresa",
    },
    {
      href: "/dashboard/empresa/solicitudes",
      label: "Solicitudes",
      activeMatch: (p) => p.startsWith("/dashboard/empresa/solicitudes"),
    },
    {
      href: "/dashboard/empresa/archivos",
      label: "Gestión de archivos",
      activeMatch: (p) =>
        p === "/dashboard/empresa/archivos" ||
        p.startsWith("/dashboard/empresa/proveedor/"),
    },
  ],
  proveedor: [{ href: "/dashboard/proveedor", label: "Mis documentos" }],
  admin: [
    { href: "/dashboard/admin", label: "Estadísticas" },
    { href: "/dashboard/admin/proveedores", label: "Proveedores" },
    { href: "/dashboard/admin/usuarios", label: "Usuarios" },
    { href: "/dashboard/admin/documentos", label: "Documentos" },
  ],
};

function linkIsActive(l: NavLink, pathname: string): boolean {
  if (l.activeMatch) return l.activeMatch(pathname);
  if (l.href === "/dashboard/admin") return pathname === "/dashboard/admin";
  return pathname === l.href || pathname.startsWith(`${l.href}/`);
}

export function SidebarNav({
  role,
  onNavigate,
}: {
  role: SessionUser["role"];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = links[role];

  return (
    <div className="pb-4 pt-2">
      <p className="px-3 pb-3 text-tiny font-bold uppercase tracking-[0.12em] text-white/45">
        Empaques flexibles
      </p>
      <nav className="flex flex-col gap-0.5 px-2">
        {items.map((l) => {
          const isActive = linkIsActive(l, pathname);
          return (
            <Link
              key={l.href}
              href={l.href}
              onClick={onNavigate}
              className={`rounded-lg px-3 py-2 text-sm text-white transition-colors ${
                isActive
                  ? "bg-secondary font-bold text-white shadow-sm"
                  : "font-medium hover:bg-white/10"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
