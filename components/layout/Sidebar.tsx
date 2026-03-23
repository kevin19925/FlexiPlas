"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  X,
  FolderArchive,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/types";
import toast from "react-hot-toast";

interface NavLink {
  label: string;
  href: string;
  icon: React.ElementType;
}

const adminLinks: NavLink[] = [
  { label: "Resumen", href: "/dashboard/admin", icon: LayoutDashboard },
  { label: "Proveedores", href: "/dashboard/admin#proveedores", icon: Building2 },
  { label: "Usuarios", href: "/dashboard/admin#usuarios", icon: Users },
  { label: "Documentos", href: "/dashboard/admin#documentos", icon: FileText },
];

const empresaLinks: NavLink[] = [
  { label: "Inicio", href: "/dashboard/empresa", icon: LayoutDashboard },
];

const proveedorLinks: NavLink[] = [
  { label: "Mis Documentos", href: "/dashboard/proveedor", icon: FolderArchive },
];

interface SidebarProps {
  user: SessionUser;
  open?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ user, open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  let links: NavLink[] = [];
  if (user.role === "admin") links = adminLinks;
  else if (user.role === "empresa") links = empresaLinks;
  else links = proveedorLinks;

  const roleLabel = {
    admin: "Administrador",
    empresa: "Empresa",
    proveedor: "Proveedor",
  }[user.role];

  const roleColor = {
    admin: "bg-purple-500",
    empresa: "bg-blue-500",
    proveedor: "bg-emerald-500",
  }[user.role];

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Error al cerrar sesión");
    }
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-6 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/40">
            <FolderArchive className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-white text-sm">SisArchivos</span>
            <p className="text-xs text-slate-500">v1.0</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 lg:hidden"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* User info */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-800">
          <div
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center text-white font-semibold text-sm flex-shrink-0",
              roleColor
            )}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user.name}</p>
            <p className="text-xs text-slate-400">{roleLabel}</p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <p className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Menú
        </p>
        {links.map((link) => {
          const Icon = link.icon;
          const isActive =
            pathname === link.href ||
            (link.href !== "/dashboard/admin" && pathname.startsWith(link.href));

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn("sidebar-link group", isActive && "active")}
              onClick={onClose}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{link.label}</span>
              {isActive && <ChevronRight className="w-3 h-3 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-slate-700/50">
        <button
          onClick={handleLogout}
          className="sidebar-link w-full hover:bg-red-900/30 hover:text-red-400"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 fixed left-0 top-0 bottom-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 bottom-0 w-64 bg-slate-900 z-50 lg:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
