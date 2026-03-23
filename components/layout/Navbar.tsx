"use client";

import { Menu } from "lucide-react";
import type { SessionUser } from "@/lib/types";
import NotificationBell from "./NotificationBell";

interface NavbarProps {
  user: SessionUser;
  title: string;
  onMenuClick?: () => void;
}

export default function Navbar({ user, title, onMenuClick }: NavbarProps) {
  return (
    <header className="sticky top-0 z-20 bg-white border-b border-slate-200/80 backdrop-blur-sm">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left side */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <NotificationBell userId={user.id} />

          <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-900">{user.name}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold text-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
