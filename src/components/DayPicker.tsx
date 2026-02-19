"use client";

import { motion, AnimatePresence } from "framer-motion";
import { DayType } from "@/lib/database.types";

interface DayPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (day: DayType) => void;
  lastDayDates: Record<DayType, string | null>;
  selectedDate: string;
}

interface DayInfo {
  day: DayType;
  label: string;
  kanji: string;
  muscles: string;
  color: string;
}

const DAYS: DayInfo[] = [
  {
    day: "A",
    label: "Chest + Back + Arms",
    kanji: "胸",
    muscles: "Chest + Back + Arms",
    color: "var(--accent-primary)",
  },
  {
    day: "B",
    label: "Legs + Posterior Chain + Rear Delts",
    kanji: "脚",
    muscles: "Legs + Posterior Chain + Rear Delts",
    color: "var(--accent-secondary)",
  },
  {
    day: "C",
    label: "Back Thickness + Shoulders + Arms",
    kanji: "肩",
    muscles: "Back Thickness + Shoulders + Arms",
    color: "var(--accent-gold)",
  },
];

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return "Never done";
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor(
    (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff} days ago`;
  if (diff < 30) return `${Math.floor(diff / 7)} weeks ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function DayPicker({
  isOpen,
  onClose,
  onSelect,
  lastDayDates,
  selectedDate,
}: DayPickerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.5)" }}
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl p-6 pb-10"
            style={{
              background: "var(--bg-primary)",
              borderTop: "1px solid var(--border-color)",
              maxHeight: "80dvh",
            }}
          >
            {/* Handle */}
            <div
              className="w-10 h-1 rounded-full mx-auto mb-6"
              style={{ background: "var(--border-color)" }}
            />

            {/* Header */}
            <div className="text-center mb-6">
              <h3
                className="text-lg font-bold"
                style={{
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-jp)",
                }}
              >
                Choose your workout
              </h3>
              <p
                className="text-sm mt-1"
                style={{ color: "var(--text-tertiary)" }}
              >
                {new Date(selectedDate + "T00:00:00").toLocaleDateString(
                  "en-US",
                  {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  },
                )}
              </p>
            </div>

            {/* Day Cards */}
            <div className="space-y-3">
              {DAYS.map((dayInfo, i) => (
                <motion.button
                  key={dayInfo.day}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                  onClick={() => onSelect(dayInfo.day)}
                  whileTap={{ scale: 0.97 }}
                  className="w-full p-5 rounded-2xl text-left transition-all duration-200 relative overflow-hidden group"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  {/* Kanji watermark */}
                  <span
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-6xl font-black opacity-[0.04] group-hover:opacity-[0.08] transition-opacity"
                    style={{
                      fontFamily: "var(--font-jp)",
                      color: dayInfo.color,
                    }}
                  >
                    {dayInfo.kanji}
                  </span>

                  <div className="flex items-center gap-4 relative z-10">
                    {/* Kanji badge */}
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                      style={{
                        background: `color-mix(in srgb, ${dayInfo.color} 12%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${dayInfo.color} 25%, transparent)`,
                      }}
                    >
                      <span
                        className="text-2xl font-bold"
                        style={{
                          fontFamily: "var(--font-jp)",
                          color: dayInfo.color,
                        }}
                      >
                        {dayInfo.kanji}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        className="font-semibold text-base"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {dayInfo.label}
                      </p>
                      <p
                        className="text-xs mt-1"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        Last: {formatRelativeDate(lastDayDates[dayInfo.day])}
                      </p>
                    </div>

                    {/* Arrow */}
                    <span
                      className="text-lg shrink-0 group-hover:translate-x-1 transition-transform"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      →
                    </span>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
