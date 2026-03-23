"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import StatusBadge from "@/components/ui/StatusBadge";
import type { IDocument, DocStatus } from "@/lib/types";

interface TraceabilityTableProps {
  documents: IDocument[];
  onCellClick?: (doc: IDocument) => void;
}

export default function TraceabilityTable({
  documents,
  onCellClick,
}: TraceabilityTableProps) {
  const { years, types, matrix } = useMemo(() => {
    const yearsSet = new Set<number>();
    const typesSet = new Set<string>();

    for (const doc of documents) {
      yearsSet.add(doc.year);
      typesSet.add(doc.documentType);
    }

    const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);
    const sortedTypes = Array.from(typesSet).sort();

    // matrix[type][year] = doc | undefined
    const mat: Record<string, Record<number, IDocument>> = {};
    for (const type of sortedTypes) {
      mat[type] = {};
      for (const doc of documents) {
        if (doc.documentType === type) {
          mat[type][doc.year] = doc;
        }
      }
    }

    return { years: sortedYears, types: sortedTypes, matrix: mat };
  }, [documents]);

  if (types.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-slate-500">
        No hay documentos para mostrar en la tabla de trazabilidad.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200">
      <table className="w-full min-w-[600px] text-sm">
        <thead>
          <tr className="bg-slate-50">
            <th className="table-header text-left border-r border-slate-200 min-w-[180px]">
              Tipo de Documento
            </th>
            {years.map((year) => (
              <th key={year} className="table-header text-center min-w-[110px]">
                {year}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {types.map((type, idx) => (
            <motion.tr
              key={type}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors"
            >
              <td className="table-cell font-medium text-slate-800 border-r border-slate-200">
                {type}
              </td>
              {years.map((year) => {
                const doc = matrix[type]?.[year];
                return (
                  <td key={year} className="table-cell text-center">
                    {doc ? (
                      <button
                        onClick={() => onCellClick?.(doc)}
                        className="hover:scale-105 transition-transform inline-flex"
                      >
                        <StatusBadge status={doc.status as DocStatus} />
                      </button>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>
                );
              })}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
