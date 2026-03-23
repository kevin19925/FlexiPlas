"use client";

import { motion } from "framer-motion";
import { Building2, FileText, ChevronRight, Phone, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IProviderWithStats } from "@/lib/types";

interface ProviderCardProps {
  provider: IProviderWithStats;
  onClick: () => void;
}

export default function ProviderCard({ provider, onClick }: ProviderCardProps) {
  const { stats } = provider;

  const statItems = [
    { label: "Pendientes", value: stats.pending, color: "text-amber-700 bg-amber-50" },
    { label: "Subidos", value: stats.uploaded, color: "text-blue-700 bg-blue-50" },
    { label: "Aprobados", value: stats.approved, color: "text-green-700 bg-green-50" },
    { label: "Rechazados", value: stats.rejected, color: "text-red-700 bg-red-50" },
  ];

  return (
    <motion.div
      whileHover={{ y: -3, boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className="card cursor-pointer group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">
              {provider.name}
            </h3>
            <p className="text-xs text-slate-500">RUC: {provider.ruc}</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
      </div>

      {/* Contact info */}
      <div className="space-y-1.5 mb-4">
        {provider.email && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Mail className="w-3.5 h-3.5" />
            <span className="truncate">{provider.email}</span>
          </div>
        )}
        {provider.phone && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Phone className="w-3.5 h-3.5" />
            <span>{provider.phone}</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1.5 mb-2">
          <FileText className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-500 font-medium">
            {stats.total} documento{stats.total !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {statItems.map((item) => (
            <div
              key={item.label}
              className={cn("rounded-lg p-1.5 text-center", item.color)}
            >
              <p className="text-base font-bold">{item.value}</p>
              <p className="text-xs leading-tight opacity-80">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
