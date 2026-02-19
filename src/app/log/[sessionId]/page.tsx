"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/AuthProvider";
import { useTheme } from "@/components/ThemeProvider";
import { ExerciseCard } from "@/components/ExerciseCard";
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

export default function LogPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<Session | null>(null);
  const [exercises, setExercises] = useState<ExerciseWithPrevious[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [completedSetsMap, setCompletedSetsMap] = useState<
    Map<string, Map<number, { weight: number; reps: number }>>
  >(new Map());
  const [isComplete, setIsComplete] = useState(false);
  const [streaks, setStreaks] = useState<StreakData>({
    current: 0,
    longest: 0,
  });
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSession = useCallback(async () => {
    if (!user || !sessionId) return;
    setLoadingData(true);

    try {
      // Get session info
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
        router.push("/");
        return;
      }

      setSession(sessionRow);

      // Load exercises with previous data
      const exercisesData = await getExercisesWithPrevious(
        user.id,
        sessionRow.day,
      );
      setExercises(exercisesData);

      // Load any already-logged sets for this session
      const existingLogs = await getSetLogsForSession(sessionId);
      if (existingLogs.length > 0) {
        const map = new Map<
          string,
          Map<number, { weight: number; reps: number }>
        >();
        for (const log of existingLogs) {
          if (!map.has(log.exercise_id)) {
            map.set(log.exercise_id, new Map());
          }
          map.get(log.exercise_id)!.set(log.set_number, {
            weight: log.weight,
            reps: log.reps,
          });
        }
        setCompletedSetsMap(map);

        // Find current exercise (first one with incomplete sets)
        for (let i = 0; i < exercisesData.length; i++) {
          const exerciseSets = map.get(exercisesData[i].id);
          if (!exerciseSets || exerciseSets.size < exercisesData[i].sets) {
            setCurrentExerciseIndex(i);
            break;
          }
          if (i === exercisesData.length - 1) {
            setCurrentExerciseIndex(i);
          }
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
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!loading && user) {
      loadSession();
    }
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
    completedSetsMap.forEach((m) => {
      total += m.size;
    });
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
      // All exercises done — complete the session
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
    return (
      <div
        className="min-h-dvh flex items-center justify-center"
        style={{ background: "var(--bg-primary)" }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <span
            className="text-5xl font-black animate-pulse neon-text"
            style={{
              fontFamily: "var(--font-jp)",
              color: "var(--accent-primary)",
            }}
          >
            鍛
          </span>
          <p className="text-xs mt-3" style={{ color: "var(--text-tertiary)" }}>
            Loading workout...
          </p>
        </motion.div>
      </div>
    );
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
    <div className="min-h-dvh" style={{ background: "var(--bg-primary)" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-30 px-5 py-4 glass"
        style={{
          background: "var(--bg-overlay)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
              }}
            >
              <span
                className="text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                ←
              </span>
            </button>
            <div>
              <h2
                className="text-sm font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                Day {session.day}
              </h2>
              <p
                className="text-[10px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                {new Date(session.date + "T00:00:00").toLocaleDateString(
                  "en-US",
                  {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  },
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
              }}
            >
              <span className="text-xs">{theme === "dark" ? "🌅" : "🌙"}</span>
            </button>

            {/* Progress */}
            <div className="text-right">
              <p
                className="text-sm font-bold tabular-nums"
                style={{ color: "var(--accent-primary)" }}
              >
                {totalCompletedSets}/{totalSets}
              </p>
              <p
                className="text-[10px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                sets
              </p>
            </div>
          </div>
        </div>

        {/* Overall progress bar */}
        <div
          className="mt-3 h-1 rounded-full overflow-hidden"
          style={{ background: "var(--bg-secondary)" }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ background: "var(--accent-primary)" }}
            animate={{
              width: `${totalSets > 0 ? (totalCompletedSets / totalSets) * 100 : 0}%`,
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>

        {/* Exercise dots */}
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {exercises.map((ex, i) => {
            const exerciseSets = completedSetsMap.get(ex.id);
            const isFullyDone = exerciseSets && exerciseSets.size >= ex.sets;
            const isCurrent = i === currentExerciseIndex;

            return (
              <div
                key={ex.id}
                className="rounded-full transition-all duration-300"
                style={{
                  width: isCurrent ? 20 : 6,
                  height: 6,
                  background: isFullyDone
                    ? "var(--success)"
                    : isCurrent
                      ? "var(--accent-primary)"
                      : "var(--border-color)",
                }}
              />
            );
          })}
        </div>
      </header>

      {/* Exercise */}
      <div className="px-5 py-6 relative z-10">
        <AnimatePresence mode="wait">
          <ExerciseCard
            key={currentExercise.id}
            exercise={currentExercise}
            exerciseIndex={currentExerciseIndex}
            totalExercises={exercises.length}
            completedSets={currentCompletedSets}
            onSetComplete={handleSetComplete}
            onExerciseComplete={handleExerciseComplete}
          />
        </AnimatePresence>
      </div>

      {/* Saving indicator */}
      <AnimatePresence>
        {saving && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full text-xs glass"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              color: "var(--text-secondary)",
            }}
          >
            Saving...
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
