"use client";

import { useEffect, useState } from "react";

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

const WEIGHT_STEP = 2.5;
const REPS_STEP = 1;

function parseNum(s: string): number {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
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
  const [showPrFlash, setShowPrFlash] = useState(false);

  const canComplete =
    weight !== "" && reps !== "" && Number(weight) >= 0 && Number(reps) > 0;

  const currentWeight = parseNum(weight);
  const currentReps = parseNum(reps);
  const deltaWeight =
    previousWeight !== undefined && currentWeight > previousWeight
      ? currentWeight - previousWeight
      : null;
  const deltaReps =
    previousReps !== undefined && currentReps > previousReps
      ? currentReps - previousReps
      : null;

  useEffect(() => {
    if (!isCompleted || showPrFlash) return;
    const w = parseNum(weight);
    const r = parseNum(reps);
    const beatWeight = previousWeight !== undefined && w > previousWeight;
    const beatReps = previousReps !== undefined && r > previousReps;
    if (beatWeight || beatReps) {
      setShowPrFlash(true);
      const t = setTimeout(() => setShowPrFlash(false), 100);
      return () => clearTimeout(t);
    }
  }, [isCompleted, weight, reps, previousWeight, previousReps, showPrFlash]);

  const stepWeight = (delta: number) => {
    const next = (parseNum(weight) || previousWeight || 0) + delta;
    onWeightChange(String(Math.max(0, Math.round(next * 10) / 10)));
  };

  const stepReps = (delta: number) => {
    const next = (parseNum(reps) || previousReps || 0) + delta;
    onRepsChange(String(Math.max(0, Math.round(next))));
  };

  const isActive = !isCompleted;

  return (
    <div
      className={`border-b border-[#3A3A3A] flex items-stretch border-l-4 ${isActive ? "border-l-[#C8FF00]" : "border-l-[#3A3A3A]"}`}
      style={{ transition: "opacity 100ms ease", ...(showPrFlash ? { opacity: 0.7 } : {}) }}
    >
      <div className="w-12 flex items-center justify-center border-r border-[#3A3A3A] py-3 font-mono text-sm font-bold text-[#F2F2F0] shrink-0">
        {setNumber}
      </div>

      <div className="flex-1 min-w-0 flex items-center border-r border-[#3A3A3A] px-2">
        <div className="flex items-center w-full">
          <button
            type="button"
            onClick={() => stepWeight(-WEIGHT_STEP)}
            disabled={isCompleted}
            className="tap-flash w-10 h-10 flex items-center justify-center text-[#3A3A3A] font-bold text-lg disabled:opacity-40"
            aria-label="Decrease weight"
          >
            −
          </button>
          <div className="relative flex-1 flex justify-center">
            <input
              type="number"
              inputMode="decimal"
              value={weight}
              onChange={(e) => onWeightChange(e.target.value)}
              disabled={isCompleted}
              placeholder={previousWeight !== undefined ? String(previousWeight) : "0"}
              className="w-full max-w-[80px] py-2 text-center font-mono text-lg font-bold tabular-nums bg-transparent border-none text-[#F2F2F0] focus:outline-none focus:ring-0 disabled:opacity-60"
            />
            {previousWeight !== undefined && !isCompleted && !weight && (
              <span className="absolute inset-0 flex items-center justify-center font-mono text-sm text-[#3A3A3A] pointer-events-none">
                {previousWeight}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => stepWeight(WEIGHT_STEP)}
            disabled={isCompleted}
            className="tap-flash w-10 h-10 flex items-center justify-center text-[#3A3A3A] font-bold text-lg disabled:opacity-40"
            aria-label="Increase weight"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex-1 min-w-0 flex items-center px-2">
        <div className="flex items-center w-full">
          <button
            type="button"
            onClick={() => stepReps(-REPS_STEP)}
            disabled={isCompleted}
            className="tap-flash w-10 h-10 flex items-center justify-center text-[#3A3A3A] font-bold text-lg disabled:opacity-40"
            aria-label="Decrease reps"
          >
            −
          </button>
          <div className="relative flex-1 flex justify-center">
            <input
              type="number"
              inputMode="numeric"
              value={reps}
              onChange={(e) => onRepsChange(e.target.value)}
              disabled={isCompleted}
              placeholder={previousReps !== undefined ? String(previousReps) : "0"}
              className="w-full max-w-[80px] py-2 text-center font-mono text-lg font-bold tabular-nums bg-transparent border-none text-[#F2F2F0] focus:outline-none focus:ring-0 disabled:opacity-60"
            />
            {previousReps !== undefined && !isCompleted && !reps && (
              <span className="absolute inset-0 flex items-center justify-center font-mono text-sm text-[#3A3A3A] pointer-events-none">
                {previousReps}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => stepReps(REPS_STEP)}
            disabled={isCompleted}
            className="tap-flash w-10 h-10 flex items-center justify-center text-[#3A3A3A] font-bold text-lg disabled:opacity-40"
            aria-label="Increase reps"
          >
            +
          </button>
        </div>
      </div>

      {isCompleted && (deltaWeight !== null || deltaReps !== null) && (
        <div className="hidden sm:flex items-center gap-2 px-2 border-l border-[#3A3A3A] text-[10px] font-mono text-[#C8FF00]">
          {deltaWeight !== null && deltaWeight > 0 && <span>+{deltaWeight} kg</span>}
          {deltaReps !== null && deltaReps > 0 && <span>+{deltaReps}</span>}
        </div>
      )}
    </div>
  );
}
