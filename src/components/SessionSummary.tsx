"use client";

import { motion, AnimatePresence } from "framer-motion";
import { SessionWithLogs } from "@/lib/database.types";

interface SessionSummaryProps {
  session: SessionWithLogs | null;
  isOpen: boolean;
  onClose: () => void;
}

const DAY_KANJI: Record<string, string> = { A: "脚", B: "押", C: "引" };
const DAY_LABELS: Record<string, string> = {
  A: "Legs & Core",
  B: "Push",
  C: "Pull",
};

export function SessionSummary({
  session,
  isOpen,
  onClose,
}: SessionSummaryProps) {
  if (!session) return null;

  // Group set logs by exercise
  const exerciseMap = new Map<
    string,
    {
      name: string;
      sets: {
        setNumber: number;
        weight: number;
        reps: number;
        isAmrap: boolean;
      }[];
    }
  >();

  for (const log of session.set_logs) {
    const exerciseName = log.exercise?.name || "Unknown";
    const exerciseId = log.exercise_id;
    if (!exerciseMap.has(exerciseId)) {
      exerciseMap.set(exerciseId, { name: exerciseName, sets: [] });
    }
    exerciseMap.get(exerciseId)!.sets.push({
      setNumber: log.set_number,
      weight: log.weight,
      reps: log.reps,
      isAmrap: log.is_amrap,
    });
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.5)" }}
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl p-6 pb-10 overflow-y-auto"
            style={{
              background: "var(--bg-primary)",
              borderTop: "1px solid var(--border-color)",
              maxHeight: "85dvh",
            }}
          >
            <div
              className="w-10 h-1 rounded-full mx-auto mb-6"
              style={{ background: "var(--border-color)" }}
            />

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{
                  background: "var(--stamp-bg)",
                  border: "1px solid var(--stamp-color)",
                }}
              >
                <span
                  className="text-xl font-bold"
                  style={{
                    fontFamily: "var(--font-jp)",
                    color: "var(--stamp-color)",
                  }}
                >
                  {DAY_KANJI[session.day] || session.day}
                </span>
              </div>
              <div>
                <h3
                  className="font-bold text-lg"
                  style={{ color: "var(--text-primary)" }}
                >
                  Day {session.day} — {DAY_LABELS[session.day]}
                </h3>
                <p
                  className="text-sm"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {new Date(session.date + "T00:00:00").toLocaleDateString(
                    "en-US",
                    {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    },
                  )}
                </p>
              </div>
            </div>

            {/* Exercises */}
            <div className="space-y-4">
              {Array.from(exerciseMap.entries()).map(([id, exercise], i) => (
                <motion.div
                  key={id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl p-4"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <h4
                    className="font-medium text-sm mb-3"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {exercise.name}
                  </h4>
                  <div className="space-y-2">
                    {exercise.sets
                      .sort((a, b) => a.setNumber - b.setNumber)
                      .map((set) => (
                        <div
                          key={set.setNumber}
                          className="flex items-center gap-3 text-sm"
                        >
                          <span
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0"
                            style={{
                              background: "var(--bg-secondary)",
                              color: "var(--text-secondary)",
                            }}
                          >
                            {set.setNumber}
                          </span>
                          <span
                            className="font-medium tabular-nums"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {set.weight} kg × {set.reps}
                          </span>
                          {set.isAmrap && (
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                              style={{
                                background: "var(--amrap-bg)",
                                color: "var(--amrap-color)",
                              }}
                            >
                              AMRAP
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                </motion.div>
              ))}
            </div>

            {exerciseMap.size === 0 && (
              <div className="text-center py-8">
                <p style={{ color: "var(--text-tertiary)" }}>
                  No logged sets for this session.
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
