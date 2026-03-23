"use client";

import { Badge, Button, Divider, Popover, PopoverContent, PopoverTrigger } from "@nextui-org/react";
import { Bell } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Notification, NotificationKind } from "@/lib/types";
import { formatRelativeTimeEs } from "@/lib/time";
import { useNotifyToasts } from "./ToastHost";

const POLL_MS = 30_000;

const KIND_DOT: Record<NotificationKind, string> = {
  success: "bg-success",
  error: "bg-danger",
  warning: "bg-warning",
  info: "bg-primary",
};

export function NotificationBell({ role }: { role: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const pollToasts = role === "proveedor" || role === "empresa";

  const load = useCallback(async () => {
    const res = await fetch("/api/notifications", { credentials: "include" });
    if (!res.ok) return;
    const data = (await res.json()) as { notifications?: Notification[] };
    setItems(data.notifications ?? []);
  }, []);

  useEffect(() => {
    load();
    const t = window.setInterval(load, POLL_MS);
    return () => window.clearInterval(t);
  }, [load]);

  useNotifyToasts(pollToasts, items);

  const unread = items.filter((n) => !n.read).length;

  async function markRead(ids?: string[]) {
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(ids?.length ? { ids } : {}),
    });
    load();
  }

  return (
    <Popover
      isOpen={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next && unread) void markRead();
      }}
      placement="bottom-end"
      showArrow
    >
      <PopoverTrigger>
        <Button
          isIconOnly
          variant="light"
          className="text-white"
          aria-label="Notificaciones"
        >
          <Badge content={unread > 9 ? "9+" : unread} color="danger" isInvisible={unread === 0} shape="circle">
            <Bell className="h-5 w-5" />
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <p className="text-sm font-bold">Notificaciones</p>
          {items.some((n) => !n.read) && (
            <Button size="sm" variant="light" className="h-7 min-w-0 text-tiny" onPress={() => void markRead()}>
              Marcar todas leídas
            </Button>
          )}
        </div>
        <Divider />
        <ul className="max-h-[280px] list-none overflow-auto p-0">
          {items.length === 0 ? (
            <li className="px-3 py-4">
              <p className="text-sm">Sin notificaciones</p>
              <p className="text-tiny text-default-500">Te avisaremos aquí</p>
            </li>
          ) : (
            items.map((n) => (
              <li
                key={n.id}
                className={`flex gap-2 border-b border-default-100 px-3 py-2 ${n.read ? "" : "bg-default-100"}`}
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${KIND_DOT[n.kind]}`}
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className={`text-sm ${n.read ? "font-normal" : "font-semibold"}`}>{n.message}</p>
                  <p className="text-tiny text-default-500">{formatRelativeTimeEs(n.createdAt)}</p>
                </div>
              </li>
            ))
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
