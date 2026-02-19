"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { DayType } from "@/lib/database.types";

interface SessionCompleteProps {
  day: DayType;
  totalExercises: number;
  totalSets: number;
  streakCount: number;
}

const DAY_KANJI: Record<DayType, string> = { A: "脚", B: "押", C: "引" };
const DAY_NAMES: Record<DayType, string> = {
  A: "Legs & Core",
  B: "Push",
  C: "Pull",
};

export function SessionComplete({
  day,
  totalExercises,
  totalSets,
  streakCount,
}: SessionCompleteProps) {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden kanji-watermark"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* Decorative circles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 3 + i, opacity: 0 }}
            transition={{ delay: i * 0.15, duration: 2, ease: "easeOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: 100,
              height: 100,
              border: "1px solid var(--accent-primary)",
            }}
          />
        ))}
      </div>

      <div className="relative z-10 text-center px-8">
        {/* Big kanji 完 */}
        <motion.div
          initial={{ scale: 3, opacity: 0, rotate: -10 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{
            delay: 0.3,
            duration: 0.6,
            type: "spring",
            damping: 12,
          }}
          className="mb-6"
        >
          <span
            className="text-8xl font-black neon-text"
            style={{
              fontFamily: "var(--font-jp)",
              color: "var(--accent-primary)",
            }}
          >
            完
          </span>
        </motion.div>

        {/* Session Complete text */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-3xl font-black tracking-tight mb-2"
          style={{ color: "var(--text-primary)" }}
        >
          Session Complete
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-sm mb-8"
          style={{ color: "var(--text-secondary)" }}
        >
          Day {day} — {DAY_NAMES[day]}
        </motion.p>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="flex justify-center gap-6 mb-10"
        >
          <div className="text-center">
            <p
              className="text-3xl font-black tabular-nums"
              style={{ color: "var(--accent-primary)" }}
            >
              {totalExercises}
            </p>
            <p
              className="text-[10px] uppercase tracking-widest"
              style={{ color: "var(--text-tertiary)" }}
            >
              exercises
            </p>
          </div>
          <div className="w-px" style={{ background: "var(--border-color)" }} />
          <div className="text-center">
            <p
              className="text-3xl font-black tabular-nums"
              style={{ color: "var(--accent-secondary)" }}
            >
              {totalSets}
            </p>
            <p
              className="text-[10px] uppercase tracking-widest"
              style={{ color: "var(--text-tertiary)" }}
            >
              sets
            </p>
          </div>
          <div className="w-px" style={{ background: "var(--border-color)" }} />
          <div className="text-center">
            <p
              className="text-3xl font-black tabular-nums"
              style={{ color: "var(--streak-color)" }}
            >
              {streakCount}🔥
            </p>
            <p
              className="text-[10px] uppercase tracking-widest"
              style={{ color: "var(--text-tertiary)" }}
            >
              streak
            </p>
          </div>
        </motion.div>

        {/* Day kanji badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2, type: "spring", damping: 10 }}
          className="w-20 h-20 rounded-2xl mx-auto mb-8 flex items-center justify-center animate-stamp"
          style={{
            background: "var(--stamp-bg)",
            border: "2px solid var(--stamp-color)",
            boxShadow: "0 0 30px var(--accent-glow)",
          }}
        >
          <span
            className="text-4xl font-black"
            style={{
              fontFamily: "var(--font-jp)",
              color: "var(--stamp-color)",
            }}
          >
            {DAY_KANJI[day]}
          </span>
        </motion.div>

        {/* Return button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          onClick={() => router.push("/")}
          whileTap={{ scale: 0.97 }}
          className="w-full max-w-sm mx-auto py-4 rounded-2xl font-bold text-base transition-all"
          style={{
            background: "var(--accent-primary)",
            color: "#fff",
            boxShadow: "0 4px 30px var(--accent-glow)",
          }}
        >
          Return to Calendar ⛩️
        </motion.button>
      </div>
    </motion.div>
  );
}
