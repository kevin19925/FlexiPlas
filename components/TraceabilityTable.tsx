"use client";

import type { DocumentRequest } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

const YEARS = [2024, 2025, 2026] as const;

type Props = {
  documents: DocumentRequest[];
  onCellClick?: (doc: DocumentRequest, docType: string, year: number) => void;
};

export function TraceabilityTable({ documents, onCellClick }: Props) {
  const types = Array.from(new Set(documents.map((d) => d.documentType))).sort();

  function cell(docType: string, year: number): DocumentRequest | undefined {
    return documents.find((d) => d.documentType === docType && d.year === year);
  }

  return (
    <div className="overflow-auto rounded-xl border border-default-200 bg-content1 shadow-sm">
      <table className="w-full min-w-[480px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-default-200 bg-default-50">
            <th className="px-3 py-2 text-left font-bold">Tipo de documento</th>
            {YEARS.map((y) => (
              <th key={y} className="px-3 py-2 text-left font-bold">
                {y}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {types.length === 0 ? (
            <tr>
              <td colSpan={1 + YEARS.length} className="px-3 py-8 text-center text-default-500">
                Sin documentos para mostrar.
              </td>
            </tr>
          ) : (
            types.map((t) => (
              <tr key={t} className="border-b border-default-100 hover:bg-default-50/80">
                <td className="px-3 py-2 align-top font-semibold">{t}</td>
                {YEARS.map((y) => {
                  const d = cell(t, y);
                  const interactive = !!onCellClick && !!d;
                  return (
                    <td key={y} className="px-3 py-2 align-top">
                      {d ? (
                        <button
                          type="button"
                          disabled={!interactive}
                          onClick={() => interactive && onCellClick?.(d, t, y)}
                          className={
                            interactive
                              ? "block w-full rounded-md p-1 text-left transition-colors hover:bg-default-100"
                              : "block w-full rounded-md p-1 text-left"
                          }
                        >
                          <StatusBadge status={d.status} />
                        </button>
                      ) : (
                        <span className="text-default-300">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
