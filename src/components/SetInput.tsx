"use client";

import { motion, AnimatePresence } from "framer-motion";

interface SetInputProps {
  setNumber: number;
  totalSets: number;
  weight: string;
  reps: string;
  previousWeight?: number;
  previousReps?: number;
  isAmrap: boolean;
  isCompleted: boolean;
  onWeightChange: (val: string) => void;
  onRepsChange: (val: string) => void;
  onComplete: () => void;
}

export function SetInput({
  setNumber,
  totalSets,
  weight,
  reps,
  previousWeight,
  previousReps,
  isAmrap,
  isCompleted,
  onWeightChange,
  onRepsChange,
  onComplete,
}: SetInputProps) {
  const canComplete =
    weight !== "" && reps !== "" && Number(weight) >= 0 && Number(reps) > 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl p-4 relative"
      style={{
        background: isAmrap ? "var(--amrap-bg)" : "var(--bg-card)",
        border: isAmrap
          ? "1px solid var(--amrap-color)"
          : "1px solid var(--border-subtle)",
        boxShadow: isAmrap ? "0 0 20px var(--amrap-bg)" : "var(--shadow-sm)",
      }}
    >
      {/* Set header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
            style={{
              background: isCompleted
                ? "var(--success)"
                : "var(--bg-secondary)",
              color: isCompleted ? "#fff" : "var(--text-secondary)",
            }}
          >
            {isCompleted ? "✓" : setNumber}
          </span>
          <span
            className="text-sm font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            Set {setNumber} of {totalSets}
          </span>
        </div>

        {isAmrap && (
          <motion.span
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            className="px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider animate-glow-pulse"
            style={{
              background: "var(--amrap-bg)",
              color: "var(--amrap-color)",
              border: "1px solid var(--amrap-color)",
            }}
          >
            ∞ AMRAP
          </motion.span>
        )}
      </div>

      {/* Inputs */}
      <div className="flex gap-3">
        {/* Weight */}
        <div className="flex-1">
          <label
            className="text-[10px] uppercase tracking-widest block mb-1.5"
            style={{ color: "var(--text-tertiary)" }}
          >
            Weight (kg)
          </label>
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              value={weight}
              onChange={(e) => onWeightChange(e.target.value)}
              disabled={isCompleted}
              placeholder={
                previousWeight !== undefined ? String(previousWeight) : "0"
              }
              className="w-full py-3 px-4 rounded-xl text-xl font-bold text-center tabular-nums transition-all disabled:opacity-50"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-color)",
                color: "var(--text-primary)",
              }}
            />
            {previousWeight !== undefined && !isCompleted && !weight && (
              <span
                className="absolute left-0 right-0 top-1/2 -translate-y-1/2 text-center text-xl font-bold pointer-events-none"
                style={{ color: "var(--text-ghost)" }}
              >
                {previousWeight}
              </span>
            )}
          </div>
          {previousWeight !== undefined && (
            <p
              className="text-[10px] mt-1 text-center"
              style={{ color: "var(--text-ghost)" }}
            >
              last: {previousWeight} kg
            </p>
          )}
        </div>

        {/* Reps */}
        <div className="flex-1">
          <label
            className="text-[10px] uppercase tracking-widest block mb-1.5"
            style={{ color: "var(--text-tertiary)" }}
          >
            {isAmrap ? "Reps (no limit)" : "Reps"}
          </label>
          <div className="relative">
            <input
              type="number"
              inputMode="numeric"
              value={reps}
              onChange={(e) => onRepsChange(e.target.value)}
              disabled={isCompleted}
              placeholder={
                previousReps !== undefined ? String(previousReps) : "0"
              }
              className="w-full py-3 px-4 rounded-xl text-xl font-bold text-center tabular-nums transition-all disabled:opacity-50"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-color)",
                color: "var(--text-primary)",
              }}
            />
            {previousReps !== undefined && !isCompleted && !reps && (
              <span
                className="absolute left-0 right-0 top-1/2 -translate-y-1/2 text-center text-xl font-bold pointer-events-none"
                style={{ color: "var(--text-ghost)" }}
              >
                {previousReps}
              </span>
            )}
          </div>
          {previousReps !== undefined && (
            <p
              className="text-[10px] mt-1 text-center"
              style={{ color: "var(--text-ghost)" }}
            >
              last: {previousReps}
            </p>
          )}
        </div>
      </div>

      {/* Log Set button */}
      <AnimatePresence>
        {!isCompleted && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onClick={onComplete}
            disabled={!canComplete}
            whileTap={{ scale: 0.97 }}
            className="w-full mt-4 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-30"
            style={{
              background: canComplete
                ? "var(--accent-primary)"
                : "var(--bg-secondary)",
              color: canComplete ? "#fff" : "var(--text-tertiary)",
              boxShadow: canComplete ? "var(--shadow-md)" : "none",
            }}
          >
            {isAmrap ? "Lock In AMRAP 🔥" : `Log Set ${setNumber} →`}
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
