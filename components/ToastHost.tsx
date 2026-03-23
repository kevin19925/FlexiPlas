"use client";

import { Alert } from "@nextui-org/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { NotificationKind } from "@/lib/types";

type ToastKind = "success" | "error" | "warning" | "info";

type Toast = { id: number; message: string; kind: ToastKind };

const ToastCtx = createContext<(message: string, kind: ToastKind) => void>(() => {});

export function useToast() {
  return useContext(ToastCtx);
}

const alertColor: Record<ToastKind, "success" | "danger" | "warning" | "primary"> = {
  success: "success",
  error: "danger",
  warning: "warning",
  info: "primary",
};

export function ToastHost({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const push = useCallback((message: string, kind: ToastKind) => {
    idRef.current += 1;
    const id = idRef.current;
    setItems((prev) => [...prev, { id, message, kind }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 5200);
  }, []);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-[9999] flex max-w-[360px] flex-col gap-2">
        {items.map((t) => (
          <div key={t.id} className="pointer-events-auto shadow-lg">
            <Alert
              color={alertColor[t.kind]}
              variant="solid"
              isClosable
              onClose={() => dismiss(t.id)}
              title={t.message}
            />
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

function notifKindToToast(k: NotificationKind): ToastKind {
  if (k === "success" || k === "error" || k === "warning" || k === "info") {
    return k;
  }
  return "info";
}

export function useNotifyToasts(
  enabled: boolean,
  notifications: {
    id: string;
    message: string;
    read: boolean;
    kind?: NotificationKind;
  }[]
) {
  const toast = useToast();
  const seen = useRef<Set<string>>(new Set());
  const first = useRef(true);

  useEffect(() => {
    if (!enabled) return;
    if (first.current) {
      notifications.forEach((n) => seen.current.add(n.id));
      first.current = false;
      return;
    }
    for (const n of notifications) {
      if (seen.current.has(n.id)) continue;
      seen.current.add(n.id);
      const kind = n.kind
        ? notifKindToToast(n.kind)
        : n.message.toLowerCase().includes("aprobado")
          ? "success"
          : "error";
      toast(n.message, kind);
    }
  }, [enabled, notifications, toast]);
}
