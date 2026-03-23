"use client";

import { Card, CardBody, Chip, Skeleton } from "@nextui-org/react";
import { motion } from "framer-motion";
import { Building2, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { EmpresaCorporativosClient } from "@/components/EmpresaCorporativosClient";
import { formatRelativeTimeEs } from "@/lib/time";
import type { Notification, NotificationKind, SessionUser } from "@/lib/types";

const KIND_SURFACE: Record<NotificationKind, string> = {
  success: "border-l-4 border-l-success bg-success/5",
  error: "border-l-4 border-l-danger bg-danger/5",
  warning: "border-l-4 border-l-warning bg-warning/10",
  info: "border-l-4 border-l-secondary bg-primary/5",
};

export function ClientePortalClient() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [mr, nr] = await Promise.all([
      fetch("/api/auth/me", { credentials: "include" }),
      fetch("/api/notifications", { credentials: "include" }),
    ]);
    if (mr.ok) setUser((await mr.json()) as SessionUser);
    if (nr.ok) {
      const d = (await nr.json()) as { notifications?: Notification[] };
      setNotifications(d.notifications ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || !user) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-52 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const emp = user.linkedEmpresa;

  return (
    <div className="space-y-10 pb-10">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-[#154a9f] to-secondary p-6 text-white shadow-xl sm:p-8"
      >
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-secondary/30 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/4 h-32 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <Chip
            size="sm"
            variant="flat"
            classNames={{
              base: "mb-3 border border-white/25 bg-white/15",
              content: "font-bold text-white",
            }}
            startContent={<Sparkles className="h-3.5 w-3.5 text-secondary" />}
          >
            Portal cliente
          </Chip>
          <h1 className="text-2xl font-black tracking-tight sm:text-4xl">Hola, {user.name}</h1>
          {emp ? (
            <p className="mt-3 flex flex-wrap items-center gap-2 text-base text-white/90">
              <Building2 className="h-5 w-5 shrink-0 text-secondary" />
              <span>
                Documentación de{" "}
                <strong className="text-white">{emp.name}</strong>
                {emp.email ? (
                  <span className="text-white/75"> · {emp.email}</span>
                ) : null}
              </span>
            </p>
          ) : (
            <p className="mt-3 text-white/80">Consulta los archivos que la empresa comparte contigo.</p>
          )}
        </div>
      </motion.div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-xl font-extrabold text-primary sm:text-2xl">Actividad y avisos</h2>
          <p className="text-tiny text-default-500">También en la campana del encabezado</p>
        </div>
        {notifications.length === 0 ? (
          <Card className="border border-dashed border-default-300 bg-gradient-to-br from-default-50 to-default-100/80">
            <CardBody className="py-10 text-center">
              <p className="text-default-600">Aún no hay avisos.</p>
              <p className="mt-1 text-small text-default-500">
                Cuando la empresa publique archivos nuevos o haya novedades, aparecerán aquí.
              </p>
            </CardBody>
          </Card>
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {notifications.map((n, i) => (
              <motion.li
                key={n.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.06, 0.35) }}
              >
                <Card className={`h-full border border-default-200 shadow-sm ${KIND_SURFACE[n.kind]}`}>
                  <CardBody className="gap-2 p-4">
                    <p className={`text-sm leading-snug ${n.read ? "text-default-700" : "font-semibold text-foreground"}`}>
                      {n.message}
                    </p>
                    <p className="text-tiny text-default-500">{formatRelativeTimeEs(n.createdAt)}</p>
                  </CardBody>
                </Card>
              </motion.li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-extrabold text-primary sm:text-2xl">Biblioteca de archivos</h2>
        <p className="-mt-2 text-small text-default-500">
          Descarga o previsualiza los documentos corporativos disponibles.
        </p>
        <EmpresaCorporativosClient mode="cliente" showPageTitle={false} />
      </section>
    </div>
  );
}
