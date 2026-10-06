"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { isoDayOfWeek, parseDate, todayStr } from "@/lib/dates";
import { haptic } from "@/lib/haptics";
import { getSessionsForMonth } from "@/lib/queries";
import { useAsync } from "@/hooks/useAsync";
import type { Session } from "@/lib/database.types";
import { IconButton } from "./ui/Button";
import { Skeleton } from "./ui/Skeleton";

interface CalendarProps {
  userId: string;
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
  onSelectSession: (session: Session) => void;
  /** Empty past/today cells — used to backfill a missed session. */
  onSelectEmptyDate?: (date: string) => void;
}

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export function Calendar({
  userId,
  year,
  month,
  onMonthChange,
  onSelectSession,
  onSelectEmptyDate,
}: CalendarProps) {
  const [direction, setDirection] = useState(1);
  const { data: sessions, loading } = useAsync(
    () => getSessionsForMonth(userId, year, month),
    [userId, year, month],
  );

  const byDate = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const s of sessions ?? []) {
      const list = map.get(s.date) ?? [];
      list.push(s);
      map.set(s.date, list);
    }
    return map;
  }, [sessions]);

  const cells = useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lead = isoDayOfWeek(firstDate);
    const out: (string | null)[] = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= daysInMonth; d++) {
      out.push(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    }
    return out;
  }, [year, month]);

  const shift = (delta: number) => {
    haptic("tap");
    setDirection(delta);
    const next = month + delta;
    if (next < 1) onMonthChange(year - 1, 12);
    else if (next > 12) onMonthChange(year + 1, 1);
    else onMonthChange(year, next);
  };

  const label = parseDate(`${year}-${String(month).padStart(2, "0")}-01`).toLocaleDateString(
    undefined,
    { month: "long", year: "numeric" },
  );
  const today = todayStr();

  return (
    <div className="rounded-[var(--radius-lg)] bg-surface p-3 shadow-soft">
      <div className="flex items-center justify-between px-1 pb-2">
        <IconButton icon="chevronLeft" label="Previous month" variant="ghost" onClick={() => shift(-1)} />
        <p className="font-display text-[17px] font-bold">{label}</p>
        <IconButton icon="chevronRight" label="Next month" variant="ghost" onClick={() => shift(1)} />
      </div>

      <div className="grid grid-cols-7 gap-1 pb-1" aria-hidden>
        {DAY_LABELS.map((d, i) => (
          <span key={i} className="py-1 text-center text-[11px] font-semibold text-fg-subtle">
            {d}
          </span>
        ))}
      </div>

      {loading ? (
        <Skeleton className="h-[232px] w-full" />
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${year}-${month}`}
            initial={{ opacity: 0, x: direction * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -24 }}
            transition={{ duration: 0.18 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) shift(1);
              else if (info.offset.x > 60) shift(-1);
            }}
            className="grid grid-cols-7 gap-1 touch-pan-y"
          >
            {cells.map((date, i) => {
              if (!date) return <span key={`pad-${i}`} />;

              const daySessions = byDate.get(date) ?? [];
              const completed = daySessions.filter((s) => s.completed_at);
              const inProgress = daySessions.find((s) => !s.completed_at);
              const isToday = date === today;
              const isFuture = date > today;
              const canBackfill = !isFuture && daySessions.length === 0 && Boolean(onSelectEmptyDate);
              const dayNum = Number(date.slice(8, 10));
              const disabled = daySessions.length === 0 && !canBackfill;

              return (
                <button
                  key={date}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    haptic("tap");
                    if (daySessions.length > 0) {
                      onSelectSession(inProgress ?? completed[0]);
                    } else if (canBackfill) {
                      onSelectEmptyDate?.(date);
                    }
                  }}
                  aria-label={`${date}${
                    completed.length ? `, ${completed.length} completed` : ""
                  }${inProgress ? ", in progress" : ""}${
                    canBackfill ? ", tap to log a workout" : ""
                  }`}
                  className={cn(
                    "relative flex aspect-square flex-col items-center justify-center rounded-[12px] text-[14px] font-semibold tabular transition-colors",
                    completed.length > 0 && "bg-accent text-on-accent",
                    inProgress && "bg-accent-soft text-accent-fg ring-1 ring-accent",
                    daySessions.length === 0 && "text-fg-subtle",
                    canBackfill && "active:bg-surface-2",
                    isToday && daySessions.length === 0 && "ring-1 ring-line",
                    isFuture && "opacity-40",
                    daySessions.length > 0 && "active:scale-90",
                  )}
                >
                  {dayNum}
                  {isToday && (
                    <span
                      className={cn(
                        "absolute bottom-1 h-1 w-1 rounded-full",
                        completed.length > 0 ? "bg-on-accent" : "bg-accent",
                      )}
                    />
                  )}
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      )}

      {onSelectEmptyDate && (
        <p className="mt-2 px-1 text-center text-[12px] text-fg-subtle">
          Tap an empty past day to log a missed session.
        </p>
      )}
    </div>
  );
}
