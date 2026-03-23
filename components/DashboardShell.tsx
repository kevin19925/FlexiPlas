"use client";

import {
  Button,
  Chip,
  Drawer,
  DrawerBody,
  DrawerContent,
} from "@nextui-org/react";
import { Menu } from "lucide-react";
import { useState } from "react";
import type { SessionUser } from "@/lib/types";
import { NotificationBell } from "./NotificationBell";
import { SidebarNav } from "./Sidebar";
import { ToastHost } from "./ToastHost";

const drawerWidth = 264;

export function DashboardShell({
  session,
  children,
}: {
  session: SessionUser;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/login";
  }

  const drawer = (
    <div className="h-full bg-primary text-primary-foreground" style={{ width: drawerWidth }}>
      <SidebarNav role={session.role} onNavigate={() => setMobileOpen(false)} />
    </div>
  );

  return (
    <ToastHost>
      <div className="flex min-h-screen flex-col bg-background">
        <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-primary shadow-sm">
          <div className="flex min-h-16 items-center gap-2 px-3 sm:px-4">
            <Button
              isIconOnly
              variant="light"
              className="text-white md:hidden"
              aria-label="Abrir menu"
              onPress={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <p className="text-tiny font-extrabold uppercase tracking-wider text-secondary">
                Flexiplast
              </p>
              <p className="truncate font-bold leading-tight text-white">Gestión de documentos</p>
              <p className="truncate text-tiny text-white/70">{session.name}</p>
            </div>
            <Chip
              size="sm"
              className="hidden border border-white/20 bg-white/15 font-bold text-white sm:flex"
              variant="flat"
            >
              {session.role}
            </Chip>
            <NotificationBell role={session.role} />
            <Button
              variant="light"
              className="shrink-0 font-bold text-white"
              onPress={() => void logout()}
            >
              Salir
            </Button>
          </div>
        </header>

        <div className="h-16 shrink-0" aria-hidden />

        <div className="flex min-h-0 flex-1">
          <Drawer
            isOpen={mobileOpen}
            onOpenChange={setMobileOpen}
            placement="left"
            size="xs"
            classNames={{
              base: "rounded-none",
              wrapper: "w-[264px] max-w-[85vw]",
            }}
          >
            <DrawerContent className="rounded-none bg-primary">
              <DrawerBody className="gap-0 p-0">{drawer}</DrawerBody>
            </DrawerContent>
          </Drawer>

          <aside
            className="hidden shrink-0 border-r border-primary md:flex md:flex-col"
            style={{ width: drawerWidth }}
          >
            {drawer}
          </aside>

          <main className="min-w-0 flex-1 overflow-auto bg-background">
            <div className="mx-auto max-w-screen-lg px-4 py-8 sm:px-6 sm:py-10">{children}</div>
          </main>
        </div>
      </div>
    </ToastHost>
  );
}
