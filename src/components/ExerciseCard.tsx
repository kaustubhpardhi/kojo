"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExerciseWithPrevious } from "@/lib/database.types";
import { SetInput } from "./SetInput";

interface ExerciseCardProps {
  exercise: ExerciseWithPrevious;
  exerciseIndex: number;
  totalExercises: number;
  completedSets: Map<number, { weight: number; reps: number }>;
  onSetComplete: (
    setNumber: number,
    weight: number,
    reps: number,
    isAmrap: boolean,
  ) => void;
  onExerciseComplete: () => void;
}

export function ExerciseCard({
  exercise,
  exerciseIndex,
  totalExercises,
  completedSets,
  onSetComplete,
  onExerciseComplete,
}: ExerciseCardProps) {
  const [setData, setSetData] = useState<
    Record<number, { weight: string; reps: string }>
  >(() => {
    const data: Record<number, { weight: string; reps: string }> = {};
    for (let i = 1; i <= exercise.sets; i++) {
      data[i] = { weight: "", reps: "" };
    }
    return data;
  });

  const allSetsComplete = useMemo(() => {
    for (let i = 1; i <= exercise.sets; i++) {
      if (!completedSets.has(i)) return false;
    }
    return true;
  }, [completedSets, exercise.sets]);

  // Check level up: all sets hit top of rep range
  const leveledUp = useMemo(() => {
    if (!allSetsComplete || !exercise.is_priority) return false;
    for (let i = 1; i <= exercise.sets; i++) {
      const set = completedSets.get(i);
      if (!set) return false;
      // Don't check last set if AMRAP
      if (i === exercise.sets && exercise.amrap_last_set) continue;
      if (set.reps < exercise.rep_range_high) return false;
    }
    return true;
  }, [allSetsComplete, completedSets, exercise]);

  const currentSetNumber = useMemo(() => {
    for (let i = 1; i <= exercise.sets; i++) {
      if (!completedSets.has(i)) return i;
    }
    return exercise.sets;
  }, [completedSets, exercise.sets]);

  const handleSetComplete = (setNumber: number) => {
    const data = setData[setNumber];
    if (!data || !data.weight || !data.reps) return;

    const isLastSet = setNumber === exercise.sets;
    const isAmrap = isLastSet && exercise.amrap_last_set;

    onSetComplete(setNumber, Number(data.weight), Number(data.reps), isAmrap);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
      className="relative"
    >
      {/* Exercise Header */}
      <div
        className="rounded-2xl p-5 mb-4 relative overflow-hidden"
        style={{
          background: exercise.is_priority
            ? "var(--priority-bg)"
            : "var(--bg-card)",
          border: exercise.is_priority
            ? "1.5px solid var(--priority-border)"
            : "1px solid var(--border-subtle)",
          boxShadow: exercise.is_priority
            ? "0 0 30px var(--accent-glow)"
            : "var(--shadow-sm)",
        }}
      >
        {/* Priority badge */}
        {exercise.is_priority && (
          <div
            className="absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-[10px] font-bold uppercase tracking-wider"
            style={{
              background: "var(--accent-primary)",
              color: "#fff",
            }}
          >
            Priority
          </div>
        )}

        <div className="flex items-start justify-between mb-1">
          <div>
            <p
              className="text-[10px] uppercase tracking-widest mb-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              Exercise {exerciseIndex + 1} of {totalExercises}
            </p>
            <h3
              className="text-xl font-bold leading-tight"
              style={{
                color: "var(--text-primary)",
                fontFamily: exercise.is_priority ? "var(--font-jp)" : undefined,
              }}
            >
              {exercise.name}
            </h3>
          </div>
        </div>

        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          {exercise.sets} sets × {exercise.rep_range_low}–
          {exercise.rep_range_high} reps
          {exercise.amrap_last_set && (
            <span style={{ color: "var(--amrap-color)" }}>
              {" "}
              (last set AMRAP)
            </span>
          )}
        </p>

        {exercise.notes && (
          <p
            className="text-xs italic mt-2"
            style={{ color: "var(--text-tertiary)" }}
          >
            {exercise.notes}
          </p>
        )}

        {/* Progress bar */}
        <div
          className="mt-4 h-1 rounded-full overflow-hidden"
          style={{ background: "var(--bg-secondary)" }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ background: "var(--accent-primary)" }}
            initial={{ width: 0 }}
            animate={{
              width: `${(completedSets.size / exercise.sets) * 100}%`,
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Sets */}
      <div className="space-y-3">
        <AnimatePresence mode="wait">
          {Array.from({ length: exercise.sets }, (_, i) => i + 1).map(
            (setNum) => {
              const isCompleted = completedSets.has(setNum);
              const isCurrent = setNum === currentSetNumber;
              const isLastSet = setNum === exercise.sets;
              const isAmrap = isLastSet && exercise.amrap_last_set;

              // Only show completed sets and the current set
              if (!isCompleted && !isCurrent) return null;

              return (
                <SetInput
                  key={`set-${setNum}`}
                  setNumber={setNum}
                  totalSets={exercise.sets}
                  weight={
                    isCompleted
                      ? String(completedSets.get(setNum)!.weight)
                      : setData[setNum]?.weight || ""
                  }
                  reps={
                    isCompleted
                      ? String(completedSets.get(setNum)!.reps)
                      : setData[setNum]?.reps || ""
                  }
                  previousWeight={exercise.previousSets[setNum - 1]?.weight}
                  previousReps={exercise.previousSets[setNum - 1]?.reps}
                  isAmrap={isAmrap}
                  isCompleted={isCompleted}
                  onWeightChange={(val) =>
                    setSetData((prev) => ({
                      ...prev,
                      [setNum]: { ...prev[setNum], weight: val },
                    }))
                  }
                  onRepsChange={(val) =>
                    setSetData((prev) => ({
                      ...prev,
                      [setNum]: { ...prev[setNum], reps: val },
                    }))
                  }
                  onComplete={() => handleSetComplete(setNum)}
                />
              );
            },
          )}
        </AnimatePresence>
      </div>

      {/* Level Up celebration */}
      <AnimatePresence>
        {leveledUp && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", damping: 15 }}
            className="mt-4 p-4 rounded-2xl text-center relative overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, var(--level-up-from), var(--level-up-to))",
              boxShadow: "0 4px 30px rgba(255, 183, 0, 0.3)",
            }}
          >
            <p className="text-2xl mb-1">⬆️</p>
            <p className="text-white font-black text-base tracking-wide uppercase">
              Level Up
            </p>
            <p className="text-white/80 text-xs mt-1">
              Add weight next session — you earned it
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Next Exercise button */}
      <AnimatePresence>
        {allSetsComplete && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            whileTap={{ scale: 0.97 }}
            onClick={onExerciseComplete}
            className="w-full mt-4 py-4 rounded-2xl font-bold text-base transition-all"
            style={{
              background: "var(--success)",
              color: "#fff",
              boxShadow: "0 4px 20px var(--success-glow)",
            }}
          >
            {exerciseIndex + 1 < totalExercises
              ? "Next Exercise →"
              : "Complete Session 🏁"}
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
