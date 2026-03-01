"use client";

import { useState, useCallback } from "react";
import { Session, DayType } from "@/lib/database.types";

const SWIPE_THRESHOLD = 50;

interface CalendarProps {
  year: number;
  month: number;
  sessions: Session[];
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onDayClick: (date: string, session?: Session) => void;
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_STAMPS: Record<DayType, string> = { A: "A", B: "B", C: "C" };

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay();
}
function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function isToday(year: number, month: number, day: number) {
  const now = new Date();
  return now.getFullYear() === year && now.getMonth() + 1 === month && now.getDate() === day;
}
function isPast(year: number, month: number, day: number) {
  const date = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function Calendar({
  year,
  month,
  sessions,
  onPrevMonth,
  onNextMonth,
  onDayClick,
}: CalendarProps) {
  const [dragX, setDragX] = useState(0);
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const sessionMap = new Map(sessions.map((s) => [s.date, s]));

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
      const { offset, velocity } = info;
      if (offset.x < -SWIPE_THRESHOLD || velocity.x < -200) onNextMonth();
      else if (offset.x > SWIPE_THRESHOLD || velocity.x > 200) onPrevMonth();
      setDragX(0);
    },
    [onPrevMonth, onNextMonth],
  );

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4 px-1">
        <button
          type="button"
          onClick={onPrevMonth}
          className="tap-flash w-10 h-10 flex items-center justify-center text-[#3A3A3A] font-bold text-xl"
        >
          ‹
        </button>
        <div className="text-center">
          <h2 className="text-lg font-bold text-[#F2F2F0] uppercase tracking-wide">
            {MONTH_NAMES[month - 1]}
          </h2>
          <p className="text-[10px] uppercase tracking-widest text-[#3A3A3A] mt-0.5">
            {year}
          </p>
        </div>
        <button
          type="button"
          onClick={onNextMonth}
          className="tap-flash w-10 h-10 flex items-center justify-center text-[#3A3A3A] font-bold text-xl"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px mb-2">
        {DAY_LABELS.map((label, i) => (
          <div
            key={i}
            className="text-center py-2 text-[10px] font-bold uppercase tracking-widest text-[#3A3A3A]"
          >
            {label}
          </div>
        ))}
      </div>

      <div
        className="grid grid-cols-7 gap-px"
        style={{ transform: `translateX(${dragX}px)` }}
      >
        {days.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="aspect-square" />;
          }
          const dateStr = formatDate(year, month, day);
          const session = sessionMap.get(dateStr);
          const today = isToday(year, month, day);
          const past = isPast(year, month, day);

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onDayClick(dateStr, session)}
              className="tap-flash aspect-square flex flex-col items-center justify-center border border-[#3A3A3A] bg-[#0A0A0A]"
              style={{
                background: today || session ? "#1A1A1A" : "#0A0A0A",
                borderColor: session?.completed_at ? "#C8FF00" : "#3A3A3A",
              }}
            >
              <span
                className="text-sm font-bold tabular-nums"
                style={{
                  color: session?.completed_at
                    ? "#C8FF00"
                    : today
                      ? "#F2F2F0"
                      : past
                        ? "#3A3A3A"
                        : "#F2F2F0",
                }}
              >
                {day}
              </span>
              {session?.completed_at && (
                <span className="text-[9px] font-bold text-[#C8FF00] mt-0.5">
                  {DAY_STAMPS[session.day] ?? "✓"}
                </span>
              )}
              {session && !session.completed_at && (
                <span className="text-[9px] text-[#3A3A3A] mt-0.5">…</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
