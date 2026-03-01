"use client";

import { useState, useMemo } from "react";
import { useConsistencyData } from "@/hooks/progress";
import type { ConsistencyCellStatus } from "@/lib/types/progress";
import { LoadingStripes } from "../LoadingStripes";
import { EmptyState } from "../EmptyState";

const CELL_SIZE = 14;
const CELL_GAP = 2;
const RECT_SIZE = CELL_SIZE - CELL_GAP;
const LABEL_WIDTH = 10;
const WEEK_LABEL_HEIGHT = 12;

const FILL: Record<ConsistencyCellStatus, string> = {
  empty: "#1A1A1A",
  completed: "#F2F2F0",
  pr: "#C8FF00",
};

const MONTH_NAMES = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

type ViewMode = "monthly" | "weekly";

interface ConsistencyViewProps {
  userId: string | null;
}

/** Calendar day for monthly grid: date YYYY-MM-DD, whether it's in the displayed month. */
function getCalendarDays(year: number, month: number): { dateStr: string; inMonth: boolean }[] {
  const first = new Date(year, month, 1);
  const dayOfWeek = first.getDay(); // 0 Sun, 1 Mon, ...
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const start = new Date(year, month, 1 - mondayOffset);

  const lastDay = new Date(year, month + 1, 0);
  const lastDayOfWeek = lastDay.getDay();
  const daysAfterLast = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;
  const end = new Date(year, month + 1, 0);
  end.setDate(end.getDate() + daysAfterLast);

  const out: { dateStr: string; inMonth: boolean }[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    const dateStr = cur.toISOString().split("T")[0];
    out.push({
      dateStr,
      inMonth: cur.getMonth() === month,
    });
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/** CONSISTENCY chip view: week×day heatmap or monthly calendar, current/longest streak. */
export function ConsistencyView({ userId }: ConsistencyViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const { data, loading, error } = useConsistencyData(userId);

  const dateToStatus = useMemo(() => {
    const map = new Map<string, ConsistencyCellStatus>();
    if (data?.cells) {
      for (const c of data.cells) {
        if (c.date != null) map.set(c.date, c.status);
      }
    }
    return map;
  }, [data?.cells]);

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

  const { weeks, dayLabels, cells, currentStreak, longestStreak } = data;
  const numWeeks = weeks.length;
  const numDays = 7;
  const gridWidth = numWeeks * CELL_SIZE;
  const gridHeight = numDays * CELL_SIZE;
  const svgWidth = LABEL_WIDTH + gridWidth;
  const svgHeight = gridHeight + WEEK_LABEL_HEIGHT;

  const goPrevMonth = () => {
    setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  };
  const goNextMonth = () => {
    setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  };

  const calendarDays = getCalendarDays(viewMonth.getFullYear(), viewMonth.getMonth());
  const monthTitle = `${MONTH_NAMES[viewMonth.getMonth()]} ${viewMonth.getFullYear()}`;

  return (
    <div className="w-full bg-[#0A0A0A]">
      <div className="px-4 pt-4">
        <h2 className="text-lg font-bold uppercase tracking-wide text-[#F2F2F0]">
          CONSISTENCY
        </h2>
        <p className="mt-1 text-[10px] font-normal uppercase tracking-[0.2em] text-[#3A3A3A]">
          Sessions and PR days by week
        </p>
      </div>

      {/* Toggle: MONTHLY | WEEKLY */}
      <div className="mt-3 flex w-full px-4">
        <div className="flex border border-[#3A3A3A]">
          <button
            type="button"
            onClick={() => setViewMode("monthly")}
            className={`shrink-0 border-r border-[#3A3A3A] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] ${
              viewMode === "monthly"
                ? "bg-[#C8FF00] text-[#0A0A0A]"
                : "bg-[#0A0A0A] text-[#F2F2F0]"
            }`}
            aria-pressed={viewMode === "monthly"}
          >
            MONTHLY
          </button>
          <button
            type="button"
            onClick={() => setViewMode("weekly")}
            className={`shrink-0 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] ${
              viewMode === "weekly"
                ? "bg-[#C8FF00] text-[#0A0A0A]"
                : "bg-[#0A0A0A] text-[#F2F2F0]"
            }`}
            aria-pressed={viewMode === "weekly"}
          >
            WEEKLY
          </button>
        </div>
      </div>

      <div className="w-full px-4 py-4">
        {viewMode === "monthly" ? (
          /* MONTHLY: calendar grid for current month */
          <div className="flex flex-col">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wide text-[#F2F2F0]">
                {monthTitle}
              </h3>
              <div className="flex border border-[#3A3A3A]">
                <button
                  type="button"
                  onClick={goPrevMonth}
                  className="flex h-8 w-8 items-center justify-center border-r border-[#3A3A3A] bg-[#0A0A0A] text-[#F2F2F0] hover:bg-[#1A1A1A]"
                  aria-label="Previous month"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={goNextMonth}
                  className="flex h-8 w-8 items-center justify-center bg-[#0A0A0A] text-[#F2F2F0] hover:bg-[#1A1A1A]"
                  aria-label="Next month"
                >
                  →
                </button>
              </div>
            </div>
            <div className="w-full">
              <svg
                viewBox={`0 0 ${7 * CELL_SIZE} ${Math.ceil(calendarDays.length / 7) * CELL_SIZE}`}
                className="w-full"
                style={{ display: "block", verticalAlign: "top" }}
                preserveAspectRatio="xMinYMin meet"
              >
                {calendarDays.map(({ dateStr, inMonth }, i) => {
                  const col = i % 7;
                  const row = Math.floor(i / 7);
                  const status = inMonth ? (dateToStatus.get(dateStr) ?? "empty") : "empty";
                  const fill = inMonth ? FILL[status] : "transparent";
                  return (
                    <rect
                      key={dateStr}
                      x={col * CELL_SIZE}
                      y={row * CELL_SIZE}
                      width={RECT_SIZE}
                      height={RECT_SIZE}
                      fill={fill}
                    />
                  );
                })}
              </svg>
            </div>
          </div>
        ) : numWeeks === 0 ? (
          <EmptyState />
        ) : (
          /* WEEKLY: all-time horizontal scrolling heatmap */
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full"
            style={{ display: "block", verticalAlign: "top" }}
            preserveAspectRatio="xMinYMin meet"
          >
            {dayLabels.map((label, i) => (
              <text
                key={i}
                x={LABEL_WIDTH - 2}
                y={i * CELL_SIZE + CELL_SIZE / 2 + 3}
                textAnchor="end"
                fill="#3A3A3A"
                fontSize={8}
              >
                {label}
              </text>
            ))}
            {weeks.map((label, i) => (
              <text
                key={i}
                x={LABEL_WIDTH + i * CELL_SIZE + CELL_SIZE / 2}
                y={gridHeight + WEEK_LABEL_HEIGHT - 2}
                textAnchor="middle"
                fill="#3A3A3A"
                fontSize={8}
              >
                {label}
              </text>
            ))}
            {cells.map((c) => {
              const x = LABEL_WIDTH + c.weekIndex * CELL_SIZE;
              const y = c.dayOfWeek * CELL_SIZE;
              return (
                <rect
                  key={`${c.weekIndex}-${c.dayOfWeek}`}
                  x={x}
                  y={y}
                  width={RECT_SIZE}
                  height={RECT_SIZE}
                  fill={FILL[c.status]}
                />
              );
            })}
          </svg>
        )}
      </div>

      <div className="grid grid-cols-2 gap-0 border-t border-[#3A3A3A] py-4">
        <div className="flex flex-col items-center justify-center border-r border-[#3A3A3A]">
          <p className="text-2xl font-bold tabular-nums text-[#F2F2F0]">
            {currentStreak}
          </p>
          <p className="mt-1 text-[10px] font-normal uppercase tracking-[0.2em] text-[#3A3A3A]">
            CURRENT STREAK
          </p>
        </div>
        <div className="flex flex-col items-center justify-center">
          <p className="text-2xl font-bold tabular-nums text-[#F2F2F0]">
            {longestStreak}
          </p>
          <p className="mt-1 text-[10px] font-normal uppercase tracking-[0.2em] text-[#3A3A3A]">
            LONGEST STREAK
          </p>
        </div>
      </div>
    </div>
  );
}
