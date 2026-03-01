"use client";

import { StreakData } from "@/lib/database.types";

interface StreakDisplayProps {
  streaks: StreakData;
}

export function StreakDisplay({ streaks }: StreakDisplayProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <p className={`text-2xl font-bold tabular-nums ${streaks.current > 0 ? "text-[#C8FF00]" : "text-[#F2F2F0]"}`}>
          {streaks.current}
        </p>
        <p className="text-[10px] font-normal uppercase tracking-[0.2em] text-[#3A3A3A] mt-1">
          Streak
        </p>
      </div>
      <div>
        <p className="text-2xl font-bold tabular-nums text-[#F2F2F0]">
          {streaks.longest}
        </p>
        <p className="text-[10px] font-normal uppercase tracking-[0.2em] text-[#3A3A3A] mt-1">
          Best
        </p>
      </div>
    </div>
  );
}
