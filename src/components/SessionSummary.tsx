"use client";

import { SessionWithLogs } from "@/lib/database.types";

interface SessionSummaryProps {
  session: SessionWithLogs | null;
  isOpen: boolean;
  onClose: () => void;
}

const DAY_LABELS: Record<string, string> = {
  A: "Chest + Back + Arms",
  B: "Legs + Posterior Chain",
  C: "Back + Shoulders + Arms",
};

export function SessionSummary({
  session,
  isOpen,
  onClose,
}: SessionSummaryProps) {
  if (!session) return null;

  const exerciseMap = new Map<
    string,
    {
      name: string;
      overrideName: string | null;
      sets: { setNumber: number; weight: number; reps: number; isAmrap: boolean }[];
    }
  >();

  for (const log of session.set_logs) {
    const exerciseName = log.exercise?.name || "Unknown";
    const exerciseId = log.exercise_id;
    if (!exerciseMap.has(exerciseId)) {
      exerciseMap.set(exerciseId, {
        name: exerciseName,
        overrideName: null,
        sets: [],
      });
    }
    exerciseMap.get(exerciseId)!.sets.push({
      setNumber: log.set_number,
      weight: log.weight,
      reps: log.reps,
      isAmrap: log.is_amrap,
    });
  }

  for (const [exerciseId, ex] of exerciseMap) {
    const logsForEx = session.set_logs
      .filter((l) => l.exercise_id === exerciseId)
      .sort((a, b) => a.set_number - b.set_number);
    const last = logsForEx[logsForEx.length - 1];
    ex.overrideName = last?.override_exercise_name ?? null;
  }

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-[#0A0A0A]"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        role="button"
        tabIndex={0}
        aria-label="Close"
      />
      <div className="fixed inset-0 z-50 bg-[#0A0A0A] p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-2xl font-bold text-[#3A3A3A] border border-[#3A3A3A] w-12 h-12 flex items-center justify-center inline-block mr-3">
              {session.day}
            </span>
            <div className="inline-block align-middle">
              <h3 className="font-bold text-lg text-[#F2F2F0]">
                {DAY_LABELS[session.day]}
              </h3>
              <p className="text-[10px] uppercase tracking-widest text-[#3A3A3A]">
                {new Date(session.date + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="tap-flash w-10 h-10 flex items-center justify-center border border-[#3A3A3A] text-[#F2F2F0] font-bold text-lg"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <hr className="border-0 h-px bg-[#3A3A3A] w-full mb-6" />

        <div>
          {Array.from(exerciseMap.entries()).map(([id, exercise]) => (
            <div key={id} className="border-b border-[#3A3A3A] py-4">
              <div className="mb-3">
                <h4 className="font-bold text-sm text-[#F2F2F0]">
                  {exercise.name}
                </h4>
                {exercise.overrideName && (
                  <p className="text-xs text-[#3A3A3A] mt-1">
                    {exercise.overrideName} (sub for {exercise.name})
                  </p>
                )}
              </div>
              <div className="space-y-2">
                {exercise.sets
                  .sort((a, b) => a.setNumber - b.setNumber)
                  .map((set) => (
                    <div
                      key={set.setNumber}
                      className="flex items-center gap-3 text-sm font-mono"
                    >
                      <span className="w-6 text-[#3A3A3A]">{set.setNumber}</span>
                      <span className="text-[#F2F2F0] tabular-nums">
                        {set.weight} kg × {set.reps}
                      </span>
                      {set.isAmrap && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#3A3A3A]">
                          AMRAP
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {exerciseMap.size === 0 && (
          <p className="text-[#3A3A3A] text-xs uppercase tracking-widest py-8">
            No logged sets for this session.
          </p>
        )}
      </div>
    </>
  );
}
