"use client";

import { useRouter } from "next/navigation";
import { DayType } from "@/lib/database.types";

interface SessionCompleteProps {
  day: DayType;
  totalExercises: number;
  totalSets: number;
  streakCount: number;
}

const DAY_NAMES: Record<DayType, string> = {
  A: "Chest + Back + Arms",
  B: "Legs + Posterior Chain",
  C: "Back + Shoulders + Arms",
};

export function SessionComplete({
  day,
  totalExercises,
  totalSets,
  streakCount,
}: SessionCompleteProps) {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0A0A0A] text-[#F2F2F0] px-6">
      <span className="font-display text-5xl font-bold text-[#C8FF00] tracking-tight">
        DONE
      </span>
      <h1 className="text-2xl font-bold mt-4 text-[#F2F2F0]">
        Session complete
      </h1>
      <p className="text-xs text-[#3A3A3A] uppercase tracking-widest mt-1">
        {DAY_NAMES[day]}
      </p>

      <hr className="border-0 h-px bg-[#3A3A3A] w-full max-w-xs my-8" />

      <div className="grid grid-cols-3 gap-8 mb-10">
        <div className="text-center">
          <p className="text-2xl font-bold tabular-nums text-[#C8FF00]">
            {totalExercises}
          </p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#3A3A3A] mt-1">
            exercises
          </p>
        </div>
        <div className="text-center border-x border-[#3A3A3A] px-8">
          <p className="text-2xl font-bold tabular-nums text-[#C8FF00]">
            {totalSets}
          </p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#3A3A3A] mt-1">
            sets
          </p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold tabular-nums text-[#C8FF00]">
            {streakCount}
          </p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#3A3A3A] mt-1">
            streak
          </p>
        </div>
      </div>

      <span className="text-xl font-bold text-[#3A3A3A] border border-[#3A3A3A] w-14 h-14 flex items-center justify-center mb-8">
        {day}
      </span>

      <button
        type="button"
        onClick={() => router.push("/")}
        className="tap-flash w-full max-w-sm py-4 bg-[#0A0A0A] border border-[#3A3A3A] text-[#C8FF00] font-bold text-sm uppercase tracking-widest"
      >
        Back to calendar
      </button>
    </div>
  );
}
