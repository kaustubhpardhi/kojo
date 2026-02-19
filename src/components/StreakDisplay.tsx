"use client";

import { motion } from "framer-motion";
import { StreakData } from "@/lib/database.types";

interface StreakDisplayProps {
  streaks: StreakData;
}

export function StreakDisplay({ streaks }: StreakDisplayProps) {
  return (
    <div className="flex items-center justify-center gap-6 mb-6">
      {/* Current Streak */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-2"
      >
        <div className="relative">
          {streaks.current >= 7 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 text-xs"
            >
              ✨
            </motion.span>
          )}
        </div>
        <div>
          <p
            className="text-2xl font-bold tabular-nums leading-none"
            style={{ color: "var(--streak-color)" }}
          >
            {streaks.current}
          </p>
          <p
            className="text-[10px] uppercase tracking-widest leading-tight"
            style={{ color: "var(--text-tertiary)" }}
          >
            streak
          </p>
        </div>
      </motion.div>

      {/* Divider */}
      <div
        className="w-px h-10"
        style={{ background: "var(--border-color)" }}
      />

      {/* Longest Streak */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex items-center gap-2"
      >
        <div>
          <p
            className="text-2xl font-bold tabular-nums leading-none"
            style={{ color: "var(--accent-gold)" }}
          >
            {streaks.longest}
          </p>
          <p
            className="text-[10px] uppercase tracking-widest leading-tight"
            style={{ color: "var(--text-tertiary)" }}
          >
            best
          </p>
        </div>
      </motion.div>
    </div>
  );
}
