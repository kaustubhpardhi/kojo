"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

const DAY_STAMPS: Record<DayType, string> = {
  A: "胸",
  B: "脚",
  C: "肩",
};

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
  return (
    now.getFullYear() === year &&
    now.getMonth() + 1 === month &&
    now.getDate() === day
  );
}

function isPast(year: number, month: number, day: number) {
  const date = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

const MONTH_NAMES = [
  "一月",
  "二月",
  "三月",
  "四月",
  "五月",
  "六月",
  "七月",
  "八月",
  "九月",
  "十月",
  "十一月",
  "十二月",
];

const MONTH_NAMES_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
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

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }

  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
      const offset = info.offset.x;
      const velocity = info.velocity.x;
      if (offset < -SWIPE_THRESHOLD || velocity < -200) {
        onNextMonth();
      } else if (offset > SWIPE_THRESHOLD || velocity > 200) {
        onPrevMonth();
      }
      setDragX(0);
    },
    [onPrevMonth, onNextMonth],
  );

  return (
    <div className="w-full">
      {/* Month Header */}
      <div className="flex items-center justify-between mb-6 px-1">
        <button
          onClick={onPrevMonth}
          className="w-10 h-10 flex items-center justify-center transition-all active:opacity-60"
        >
          <span
            className="text-2xl font-light opacity-60"
            style={{ color: "var(--text-secondary)" }}
          >
            ‹
          </span>
        </button>

        <div className="text-center">
          <h2
            className="text-xl font-bold tracking-tight"
            style={{
              fontFamily: "var(--font-jp)",
              color: "var(--text-primary)",
            }}
          >
            {MONTH_NAMES[month - 1]}
          </h2>
          <p
            className="text-xs tracking-wider"
            style={{ color: "var(--text-tertiary)" }}
          >
            {MONTH_NAMES_EN[month - 1]} {year}
          </p>
        </div>

        <button
          onClick={onNextMonth}
          className="w-10 h-10 flex items-center justify-center transition-all active:opacity-60"
        >
          <span
            className="text-2xl font-light opacity-60"
            style={{ color: "var(--text-secondary)" }}
          >
            ›
          </span>
        </button>
      </div>

      {/* Swipeable calendar grid */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDrag={(_, info) => setDragX(info.offset.x)}
        onDragEnd={handleDragEnd}
        style={{ x: dragX }}
        className="cursor-grab active:cursor-grabbing"
      >
        {/* Day Labels */}
        <div className="grid grid-cols-7 mb-2">
          {DAY_LABELS.map((label, i) => (
            <div
              key={i}
              className="text-center text-xs font-medium py-2"
              style={{
                color:
                  i === 0 || i === 6
                    ? "var(--accent-primary)"
                    : "var(--text-tertiary)",
                fontFamily: "var(--font-jp)",
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${year}-${month}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-7 gap-1"
          >
            {days.map((day, idx) => {
              if (!day) {
                return <div key={`empty-${idx}`} className="aspect-square" />;
              }

              const dateStr = formatDate(year, month, day);
              const session = sessionMap.get(dateStr);
              const today = isToday(year, month, day);
              const past = isPast(year, month, day);

              return (
                <motion.button
                  key={dateStr}
                  onClick={() => onDayClick(dateStr, session || undefined)}
                  whileTap={{ scale: 0.9 }}
                  className="aspect-square relative rounded-xl flex flex-col items-center justify-center transition-all duration-200"
                  style={{
                    background: today
                      ? "var(--accent-glow)"
                      : session
                        ? "var(--stamp-bg)"
                        : "transparent",
                    border: today
                      ? "2px solid var(--accent-primary)"
                      : session
                        ? "1px solid var(--stamp-color)"
                        : "1px solid transparent",
                  }}
                >
                  {/* Day number */}
                  <span
                    className="text-sm font-medium relative z-10"
                    style={{
                      color: session
                        ? "var(--stamp-color)"
                        : today
                          ? "var(--accent-primary)"
                          : past
                            ? "var(--text-secondary)"
                            : "var(--text-tertiary)",
                    }}
                  >
                    {day}
                  </span>

                  {/* Stamp indicator for completed sessions */}
                  {session && (
                    <motion.span
                      initial={{ scale: 0, rotate: -15 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="absolute text-[10px] font-bold bottom-0.5"
                      style={{
                        color: "var(--stamp-color)",
                        fontFamily: "var(--font-jp)",
                        opacity: 0.7,
                      }}
                    >
                      {DAY_STAMPS[session.day] || "✓"}
                    </motion.span>
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
