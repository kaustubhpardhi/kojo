"use client";

import { useState } from "react";
import { usePersonalBestsData } from "@/hooks/progress";
import { buildExportData } from "@/lib/progress-queries";
import { LoadingStripes } from "../LoadingStripes";
import { EmptyState } from "../EmptyState";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDate();
  const month = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

interface PersonalBestsViewProps {
  userId: string | null;
}

function downloadExport(data: object, dateStr: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `lifting-export-${dateStr}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** PERSONAL BESTS chip view: full-width list of exercise PRs, no callout. */
export function PersonalBestsView({ userId }: PersonalBestsViewProps) {
  const [exporting, setExporting] = useState(false);
  const { data, loading, error } = usePersonalBestsData(userId);

  const handleExport = async () => {
    if (!userId || exporting) return;
    setExporting(true);
    try {
      const payload = await buildExportData(userId);
      downloadExport(payload, payload.exportedAt);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full bg-[#0A0A0A]">
        <LoadingStripes />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-full bg-[#0A0A0A] px-4 py-6">
        <EmptyState />
      </div>
    );
  }

  const { items } = data;

  const exportButton = (
    <div className="w-full px-4 pb-4 pt-2">
      <button
        type="button"
        onClick={handleExport}
        disabled={!userId || exporting}
        className="w-full border border-[#C8FF00] bg-transparent py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#C8FF00] disabled:opacity-50"
      >
        {exporting ? "EXPORTING…" : "EXPORT LIFTING DATA"}
      </button>
    </div>
  );

  if (items.length === 0) {
    return (
      <div className="w-full bg-[#0A0A0A]">
        <div className="px-4 pt-4">
          <h2 className="text-lg font-bold uppercase tracking-wide text-[#F2F2F0]">
            PERSONAL BESTS
          </h2>
          <p className="mt-1 text-[10px] font-normal uppercase tracking-[0.2em] text-[#3A3A3A]">
            Heaviest set per exercise, most recent first
          </p>
        </div>
        <div className="px-4 py-6">
          <EmptyState />
        </div>
        {exportButton}
      </div>
    );
  }

  return (
    <div className="w-full bg-[#0A0A0A]">
      <div className="px-4 pt-4">
        <h2 className="text-lg font-bold uppercase tracking-wide text-[#F2F2F0]">
          PERSONAL BESTS
        </h2>
        <p className="mt-1 text-[10px] font-normal uppercase tracking-[0.2em] text-[#3A3A3A]">
          Heaviest set per exercise, most recent first
        </p>
      </div>

      <ul className="w-full list-none px-4 py-4">
        {items.map((row, i) => (
          <li
            key={row.exerciseId}
            className={`flex w-full items-start justify-between py-3 ${
              i > 0 ? "border-t border-[#3A3A3A]" : ""
            }`}
          >
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#F2F2F0]">
                  {row.exerciseName}
                </span>
                {row.isNew && (
                  <span className="shrink-0 bg-[#C8FF00] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#0A0A0A]">
                    NEW
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[10px] font-normal uppercase tracking-[0.2em] text-[#3A3A3A]">
                {formatDate(row.date)}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end text-right">
              <p className="text-lg font-bold text-[#C8FF00]">
                {row.weight} KG
              </p>
              <p className="mt-0.5 text-[10px] font-normal uppercase tracking-[0.2em] text-[#3A3A3A]">
                × {row.reps} REPS
              </p>
            </div>
          </li>
        ))}
      </ul>

      {exportButton}
    </div>
  );
}
