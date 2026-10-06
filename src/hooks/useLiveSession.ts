"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { haptic } from "@/lib/haptics";
import { queueComplete, queueSet, syncOutbox } from "@/lib/offline";
import {
  addSessionExercise,
  completeSession,
  deleteSet,
  getExerciseHistory,
  getLiveSession,
  logSet,
  removeSessionExercise,
  reorderSessionExercises,
  setSessionExerciseStatus,
  swapSessionExercise,
  updateSessionExercisePlan,
} from "@/lib/queries";
import { invalidateHistory } from "@/lib/progress-queries";
import type {
  Exercise,
  LiveExercise,
  LoggedSet,
  Session,
  SessionExerciseStatus,
} from "@/lib/database.types";

export interface LogSetResult {
  isPR: boolean;
  weight: number;
}

const isOffline = () => typeof navigator !== "undefined" && !navigator.onLine;

/**
 * Owns live session state. Writes are optimistic: local state updates first,
 * then Supabase (or the offline outbox), so logging never blocks on network.
 */
export function useLiveSession(userId: string, sessionId: string) {
  const [session, setSession] = useState<Session | null>(null);
  const [exercises, setExercises] = useState<LiveExercise[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getLiveSession(userId, sessionId)
      .then((result) => {
        if (cancelled) return;
        if (!result) {
          setNotFound(true);
          return;
        }
        setSession(result.session);
        setExercises(result.exercises);
        // Resume at the first exercise that still has sets to log.
        const resumeAt = result.exercises.findIndex(
          (e) => e.status === "pending" && e.logged.size < e.target_sets,
        );
        setIndex(resumeAt === -1 ? 0 : resumeAt);
      })
      .catch((err) => {
        console.error("Failed to load session", err);
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, sessionId]);

  const current = exercises[index] ?? null;

  const totals = useMemo(() => {
    let logged = 0;
    let target = 0;
    let volume = 0;
    for (const e of exercises) {
      if (e.status === "skipped") continue;
      target += e.target_sets;
      logged += e.logged.size;
      for (const s of e.logged.values()) volume += s.weight * s.reps;
    }
    return { logged, target, volume };
  }, [exercises]);

  const patchExercise = useCallback(
    (sessionExerciseId: string, patch: Partial<LiveExercise>) => {
      setExercises((prev) =>
        prev.map((e) => (e.id === sessionExerciseId ? { ...e, ...patch } : e)),
      );
    },
    [],
  );

  const recordSet = useCallback(
    async (set: LoggedSet): Promise<LogSetResult> => {
      if (!current) return { isPR: false, weight: 0 };

      const next = new Map(current.logged);
      next.set(set.setNumber, set);
      patchExercise(current.id, { logged: next });

      const isPR = set.weight > current.previousBestWeight && current.previousBestWeight > 0;
      haptic(isPR ? "pr" : "success");

      const input = {
        sessionId,
        sessionExerciseId: current.id,
        exerciseId: current.exercise_id,
        setNumber: set.setNumber,
        weight: set.weight,
        reps: set.reps,
        isAmrap: set.isAmrap,
      };

      try {
        if (isOffline()) await queueSet(input);
        else await logSet(input);
        invalidateHistory(userId);
      } catch (err) {
        console.error("Failed to log set, queueing", err);
        await queueSet(input);
      }

      return { isPR, weight: set.weight };
    },
    [current, patchExercise, sessionId, userId],
  );

  const removeSet = useCallback(
    async (setNumber: number) => {
      if (!current) return;
      const next = new Map(current.logged);
      next.delete(setNumber);
      patchExercise(current.id, { logged: next });
      try {
        await deleteSet(sessionId, current.exercise_id, setNumber);
        invalidateHistory(userId);
      } catch (err) {
        console.error("Failed to delete set", err);
      }
    },
    [current, patchExercise, sessionId, userId],
  );

  const setStatus = useCallback(
    async (sessionExerciseId: string, status: SessionExerciseStatus) => {
      patchExercise(sessionExerciseId, { status });
      try {
        await setSessionExerciseStatus(sessionExerciseId, status);
      } catch (err) {
        console.error("Failed to update exercise status", err);
      }
    },
    [patchExercise],
  );

  const setTargetSets = useCallback(
    async (sessionExerciseId: string, targetSets: number) => {
      patchExercise(sessionExerciseId, { target_sets: targetSets });
      try {
        await updateSessionExercisePlan(sessionExerciseId, { target_sets: targetSets });
      } catch (err) {
        console.error("Failed to update target sets", err);
      }
    },
    [patchExercise],
  );

  const addExercise = useCallback(
    async (exercise: Exercise) => {
      const position = exercises.length;
      try {
        const row = await addSessionExercise(sessionId, exercise.id, position);
        const history = await getExerciseHistory(userId, [exercise.id], sessionId);
        const past = history.get(exercise.id);
        setExercises((prev) => [
          ...prev,
          {
            ...row,
            exercise,
            logged: new Map(),
            previousSets: past?.previousSets ?? [],
            previousBestWeight: past?.bestWeight ?? 0,
          },
        ]);
      } catch (err) {
        console.error("Failed to add exercise", err);
      }
    },
    [exercises.length, sessionId, userId],
  );

  /** Swap the current exercise. Sets already logged keep their own exercise. */
  const swapExercise = useCallback(
    async (sessionExerciseId: string, to: Exercise) => {
      const row = exercises.find((e) => e.id === sessionExerciseId);
      if (!row) return;
      const fromId = row.exercise_id;
      const previous = {
        exercise: row.exercise,
        exercise_id: row.exercise_id,
        swapped_from_exercise_id: row.swapped_from_exercise_id,
        logged: row.logged,
        previousSets: row.previousSets,
        previousBestWeight: row.previousBestWeight,
      };
      const history = await getExerciseHistory(userId, [to.id], sessionId);
      const past = history.get(to.id);
      patchExercise(sessionExerciseId, {
        exercise: to,
        exercise_id: to.id,
        swapped_from_exercise_id: fromId,
        logged: new Map(),
        previousSets: past?.previousSets ?? [],
        previousBestWeight: past?.bestWeight ?? 0,
      });
      try {
        await swapSessionExercise(sessionExerciseId, fromId, to.id);
      } catch (err) {
        patchExercise(sessionExerciseId, previous);
        throw err;
      }
    },
    [exercises, patchExercise, sessionId, userId],
  );

  const removeExercise = useCallback(
    async (sessionExerciseId: string) => {
      setExercises((prev) => prev.filter((e) => e.id !== sessionExerciseId));
      setIndex((i) => Math.max(0, Math.min(i, exercises.length - 2)));
      try {
        await removeSessionExercise(sessionExerciseId);
      } catch (err) {
        console.error("Failed to remove exercise", err);
      }
    },
    [exercises.length],
  );

  const reorder = useCallback(
    async (next: LiveExercise[]) => {
      setExercises(next);
      try {
        await reorderSessionExercises(next.map((e) => e.id));
      } catch (err) {
        console.error("Failed to reorder", err);
      }
    },
    [],
  );

  const finish = useCallback(async () => {
    setCompleting(true);
    try {
      if (isOffline()) await queueComplete(sessionId);
      else await completeSession(sessionId);
      invalidateHistory(userId);
      void syncOutbox();
      haptic("pr");
      return true;
    } catch (err) {
      console.error("Failed to complete session", err);
      await queueComplete(sessionId);
      return true;
    } finally {
      setCompleting(false);
    }
  }, [sessionId, userId]);

  return {
    session,
    exercises,
    current,
    index,
    setIndex,
    loading,
    notFound,
    completing,
    totals,
    recordSet,
    removeSet,
    setStatus,
    setTargetSets,
    addExercise,
    swapExercise,
    removeExercise,
    reorder,
    finish,
  };
}
