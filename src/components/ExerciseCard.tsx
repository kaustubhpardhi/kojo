"use client";

import { useState, useMemo } from "react";
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

  const canLogCurrentSet = (() => {
    const num = currentSetNumber;
    const data = setData[num];
    if (!data) return false;
    return (
      data.weight !== "" &&
      data.reps !== "" &&
      Number(data.weight) >= 0 &&
      Number(data.reps) > 0
    );
  })();

  return (
    <div>
      {/* Exercise name — dominates top */}
      <div className="mb-4">
        <p className="text-[10px] font-normal uppercase tracking-[0.2em] text-[#3A3A3A] mb-1">
          Exercise {exerciseIndex + 1} of {totalExercises}
        </p>
        <h2 className="text-2xl font-bold text-[#F2F2F0] leading-tight">
          {exercise.name}
        </h2>
        <p className="text-xs text-[#3A3A3A] mt-1 tracking-wide">
          {exercise.sets} sets × {exercise.rep_range_low}–{exercise.rep_range_high} reps
          {exercise.amrap_last_set && " · last AMRAP"}
        </p>
      </div>

      {/* Sets table — stark, monospace, vertical rules */}
      <div className="border border-[#3A3A3A] mb-4">
        {/* Header row */}
        <div className="grid grid-cols-[3rem_1fr_1fr] border-b border-[#3A3A3A] text-[10px] font-bold uppercase tracking-[0.15em] text-[#3A3A3A]">
          <div className="py-2 text-center border-r border-[#3A3A3A]">Set</div>
          <div className="py-2 text-center border-r border-[#3A3A3A]">Weight</div>
          <div className="py-2 text-center">Reps</div>
        </div>
        {Array.from({ length: exercise.sets }, (_, i) => i + 1).map((setNum) => {
          const isCompleted = completedSets.has(setNum);
          const isCurrent = setNum === currentSetNumber;
          const isLastSet = setNum === exercise.sets;
          const isAmrap = isLastSet && exercise.amrap_last_set;
          if (!isCompleted && !isCurrent) return null;
          return (
            <SetInput
              key={`set-${setNum}`}
              setNumber={setNum}
              totalSets={exercise.sets}
              weight={
                isCompleted
                  ? String(completedSets.get(setNum)!.weight)
                  : setData[setNum]?.weight ?? ""
              }
              reps={
                isCompleted
                  ? String(completedSets.get(setNum)!.reps)
                  : setData[setNum]?.reps ?? ""
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
        })}
      </div>

      {/* Full-width LOG SET — black bg, lime text, all caps, heavy */}
      {!allSetsComplete && (
        <button
          type="button"
          onClick={() => handleSetComplete(currentSetNumber)}
          disabled={!canLogCurrentSet}
          className="tap-flash w-full py-4 bg-[#0A0A0A] border border-[#3A3A3A] text-[#C8FF00] font-bold text-sm uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {exercise.amrap_last_set && currentSetNumber === exercise.sets
            ? "LOG AMRAP"
            : "LOG SET"}
        </button>
      )}

      {/* Next exercise / Complete session — same CTA style */}
      {allSetsComplete && (
        <button
          type="button"
          onClick={onExerciseComplete}
          className="tap-flash w-full py-4 bg-[#0A0A0A] border border-[#3A3A3A] text-[#C8FF00] font-bold text-sm uppercase tracking-widest"
        >
          {exerciseIndex + 1 < totalExercises ? "NEXT EXERCISE" : "COMPLETE SESSION"}
        </button>
      )}

      {/* Add weight next session — lime accent, no glow */}
      {allSetsComplete && exercise.is_priority && (() => {
        let leveledUp = true;
        for (let i = 1; i <= exercise.sets; i++) {
          const set = completedSets.get(i);
          if (!set) { leveledUp = false; break; }
          if (i === exercise.sets && exercise.amrap_last_set) continue;
          if (set.reps < exercise.rep_range_high) { leveledUp = false; break; }
        }
        return leveledUp ? (
          <p className="mt-4 pt-4 border-t border-[#3A3A3A] text-[10px] uppercase tracking-widest text-[#C8FF00] font-bold">
            Add weight next session
          </p>
        ) : null;
      })()}
    </div>
  );
}
