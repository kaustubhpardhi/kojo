"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { ExerciseCard } from "@/components/ExerciseCard";
import { LoadingScreen } from "@/components/LoadingScreen";
import { SessionComplete } from "@/components/SessionComplete";
import {
  getExercisesWithPrevious,
  logSet,
  completeSession,
  getSetLogsForSession,
  getStreaks,
} from "@/lib/queries";
import { queueSetLog } from "@/lib/offline";
import type {
  ExerciseWithPrevious,
  Session,
  StreakData,
} from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

const DAY_FOCUS: Record<string, string> = {
  A: "Chest + Back + Arms",
  B: "Legs + Posterior Chain",
  C: "Back + Shoulders + Arms",
};

export default function LogPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<Session | null>(null);
  const [exercises, setExercises] = useState<ExerciseWithPrevious[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [completedSetsMap, setCompletedSetsMap] = useState<
    Map<string, Map<number, { weight: number; reps: number }>>
  >(new Map());
  const [isComplete, setIsComplete] = useState(false);
  const [streaks, setStreaks] = useState<StreakData>({ current: 0, longest: 0 });
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSessionOverview, setShowSessionOverview] = useState(false);

  const loadSession = useCallback(async () => {
    if (!user || !sessionId) return;
    setLoadingData(true);
    try {
      const { data: sessionData } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      const sessionRow = sessionData as Session | null;
      if (!sessionRow) {
        router.push("/");
        return;
      }
      if (sessionRow.completed_at) {
        router.push(`/?summary=${sessionId}`);
        return;
      }

      setSession(sessionRow);
      const exercisesData = await getExercisesWithPrevious(user.id, sessionRow.day);
      setExercises(exercisesData);

      const existingLogs = await getSetLogsForSession(sessionId);
      if (existingLogs.length > 0) {
        const map = new Map<string, Map<number, { weight: number; reps: number }>>();
        for (const log of existingLogs) {
          if (!map.has(log.exercise_id)) map.set(log.exercise_id, new Map());
          map.get(log.exercise_id)!.set(log.set_number, {
            weight: log.weight,
            reps: log.reps,
          });
        }
        setCompletedSetsMap(map);
        for (let i = 0; i < exercisesData.length; i++) {
          const exerciseSets = map.get(exercisesData[i].id);
          if (!exerciseSets || exerciseSets.size < exercisesData[i].sets) {
            setCurrentExerciseIndex(i);
            break;
          }
          if (i === exercisesData.length - 1) setCurrentExerciseIndex(i);
        }
      }
    } catch (err) {
      console.error("Failed to load session:", err);
      router.push("/");
    } finally {
      setLoadingData(false);
    }
  }, [user, sessionId, router]);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!loading && user) loadSession();
  }, [user, loading, loadSession]);

  const currentExercise = exercises[currentExerciseIndex];
  const currentCompletedSets = useMemo(
    () =>
      completedSetsMap.get(currentExercise?.id || "") ||
      new Map<number, { weight: number; reps: number }>(),
    [completedSetsMap, currentExercise?.id],
  );

  const totalCompletedSets = useMemo(() => {
    let total = 0;
    completedSetsMap.forEach((m) => { total += m.size; });
    return total;
  }, [completedSetsMap]);

  const totalSets = useMemo(
    () => exercises.reduce((sum, e) => sum + e.sets, 0),
    [exercises],
  );

  const handleSetComplete = async (
    setNumber: number,
    weight: number,
    reps: number,
    isAmrap: boolean,
  ) => {
    if (!currentExercise || saving) return;
    setSaving(true);
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await queueSetLog({
          session_id: sessionId,
          exercise_id: currentExercise.id,
          set_number: setNumber,
          weight,
          reps,
          is_amrap: isAmrap,
        });
      } else {
        await logSet(
          sessionId,
          currentExercise.id,
          setNumber,
          weight,
          reps,
          isAmrap,
        );
      }
      setCompletedSetsMap((prev) => {
        const next = new Map(prev);
        const exerciseSets = new Map(next.get(currentExercise.id) || new Map());
        exerciseSets.set(setNumber, { weight, reps });
        next.set(currentExercise.id, exerciseSets);
        return next;
      });
    } catch (err) {
      console.error("Failed to log set:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleExerciseComplete = async () => {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex((prev) => prev + 1);
    } else {
      try {
        await completeSession(sessionId);
        if (user) {
          const streakData = await getStreaks(user.id);
          setStreaks(streakData);
        }
        setIsComplete(true);
      } catch (err) {
        console.error("Failed to complete session:", err);
      }
    }
  };

  if (loading || loadingData) {
    return <LoadingScreen />;
  }

  if (isComplete && session) {
    return (
      <SessionComplete
        day={session.day}
        totalExercises={exercises.length}
        totalSets={totalCompletedSets}
        streakCount={streaks.current}
      />
    );
  }

  if (!session || !currentExercise) return null;

  return (
    <div className="min-h-dvh bg-[#0A0A0A] text-[#F2F2F0]">
      <header className="sticky top-0 z-30 border-b border-[#3A3A3A] px-4 py-4 bg-[#0A0A0A]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="tap-flash w-10 h-10 flex items-center justify-center border border-[#3A3A3A] text-[#F2F2F0] font-bold"
              aria-label="Back"
            >
              ←
            </button>
            <div>
              <h2 className="text-sm font-bold text-[#F2F2F0]">
                {DAY_FOCUS[session.day] ?? session.day}
              </h2>
              <p className="text-[10px] uppercase tracking-widest text-[#3A3A3A]">
                {new Date(session.date + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSessionOverview(true)}
              className="tap-flash w-10 h-10 flex items-center justify-center border border-[#3A3A3A] text-[#F2F2F0] font-bold text-sm"
              title="View all exercises"
              aria-label="View all exercises"
            >
              ≡
            </button>
            <div className="text-right">
              <p className={`text-sm font-bold tabular-nums ${totalCompletedSets > 0 ? "text-[#C8FF00]" : "text-[#F2F2F0]"}`}>
                {totalCompletedSets}/{totalSets}
              </p>
              <p className="text-[10px] uppercase tracking-widest text-[#3A3A3A]">
                sets
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3 h-1 bg-[#3A3A3A] w-full overflow-hidden">
          <div
            className="h-full bg-[#C8FF00]"
            style={{
              width: `${totalSets > 0 ? (totalCompletedSets / totalSets) * 100 : 0}%`,
              transition: "width 200ms ease",
            }}
          />
        </div>

        <div className="flex items-center justify-center gap-1 mt-3">
          {exercises.map((ex, i) => {
            const exerciseSets = completedSetsMap.get(ex.id);
            const isFullyDone = exerciseSets && exerciseSets.size >= ex.sets;
            const isCurrent = i === currentExerciseIndex;
            return (
              <div
                key={ex.id}
                className="h-1 flex-1 max-w-[20px] bg-[#3A3A3A]"
                style={{
                  background: isFullyDone || isCurrent ? "#C8FF00" : "#3A3A3A",
                  width: isCurrent ? 20 : 6,
                }}
              />
            );
          })}
        </div>
      </header>

      <div className="px-4 py-6">
        <ExerciseCard
          key={currentExercise.id}
          exercise={currentExercise}
          exerciseIndex={currentExerciseIndex}
          totalExercises={exercises.length}
          completedSets={currentCompletedSets}
          onSetComplete={handleSetComplete}
          onExerciseComplete={handleExerciseComplete}
        />
      </div>

      {/* Session overview — full-screen takeover */}
      {showSessionOverview && (
        <>
          <div
            className="fixed inset-0 z-40 bg-[#0A0A0A]"
            onClick={() => setShowSessionOverview(false)}
            onKeyDown={(e) => e.key === "Escape" && setShowSessionOverview(false)}
            role="button"
            tabIndex={0}
            aria-label="Close"
          />
          <div className="fixed inset-0 z-50 bg-[#0A0A0A] p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-[#F2F2F0]">
                {DAY_FOCUS[session.day] ?? session.day}
              </h3>
              <button
                type="button"
                onClick={() => setShowSessionOverview(false)}
                className="tap-flash w-10 h-10 flex items-center justify-center border border-[#3A3A3A] text-[#F2F2F0] font-bold"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <ul>
              {exercises.map((ex, i) => {
                const completedCount = completedSetsMap.get(ex.id)?.size ?? 0;
                const isCurrent = i === currentExerciseIndex;
                const isFullyDone = completedCount >= ex.sets;
                return (
                  <li key={ex.id} className="border-b border-[#3A3A3A]">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentExerciseIndex(i);
                        setShowSessionOverview(false);
                      }}
                      className={`tap-flash w-full flex items-center justify-between py-4 text-left border-l-4 ${isCurrent ? "border-l-[#C8FF00]" : "border-l-transparent"}`}
                    >
                      <span className={`font-bold text-sm ${isCurrent ? "text-[#C8FF00]" : "text-[#F2F2F0]"}`}>
                        {i + 1}. {ex.name}
                      </span>
                      <span className={`text-xs tabular-nums font-mono ${isFullyDone ? "text-[#C8FF00]" : "text-[#3A3A3A]"}`}>
                        {completedCount}/{ex.sets}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}

      {saving && (
        <div className="fixed bottom-4 left-4 right-4 py-3 border border-[#3A3A3A] bg-[#0A0A0A] text-center text-[10px] uppercase tracking-widest text-[#3A3A3A]">
          Saving…
        </div>
      )}
    </div>
  );
}
