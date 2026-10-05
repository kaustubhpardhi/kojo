"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { SetLog } from "@/lib/database.types";

export type WorkoutSessionContextValue = {
  replacements: Record<string, string>;
  setReplacement: (exerciseId: string, name: string) => void;
  clearReplacement: (exerciseId: string) => void;
  clearAllReplacements: () => void;
  /** Rebuild replacement labels from persisted set_logs (e.g. resume session). */
  syncReplacementsFromLogs: (logs: SetLog[]) => void;
};

const WorkoutSessionContext = createContext<WorkoutSessionContextValue | null>(
  null,
);

function buildReplacementsFromLogs(logs: SetLog[]): Record<string, string> {
  const byExercise = new Map<string, SetLog[]>();
  for (const log of logs) {
    if (!byExercise.has(log.exercise_id)) {
      byExercise.set(log.exercise_id, []);
    }
    byExercise.get(log.exercise_id)!.push(log);
  }
  const next: Record<string, string> = {};
  for (const ls of byExercise.values()) {
    ls.sort((a, b) => a.set_number - b.set_number);
    const last = ls[ls.length - 1];
    if (last.override_exercise_name) {
      next[last.exercise_id] = last.override_exercise_name;
    }
  }
  return next;
}

export function WorkoutSessionProvider({ children }: { children: ReactNode }) {
  const [replacements, setReplacements] = useState<Record<string, string>>({});

  const setReplacement = useCallback((exerciseId: string, name: string) => {
    setReplacements((prev) => ({ ...prev, [exerciseId]: name }));
  }, []);

  const clearReplacement = useCallback((exerciseId: string) => {
    setReplacements((prev) => {
      const n = { ...prev };
      delete n[exerciseId];
      return n;
    });
  }, []);

  const clearAllReplacements = useCallback(() => {
    setReplacements({});
  }, []);

  const syncReplacementsFromLogs = useCallback((logs: SetLog[]) => {
    setReplacements(buildReplacementsFromLogs(logs));
  }, []);

  const value = useMemo(
    () => ({
      replacements,
      setReplacement,
      clearReplacement,
      clearAllReplacements,
      syncReplacementsFromLogs,
    }),
    [
      replacements,
      setReplacement,
      clearReplacement,
      clearAllReplacements,
      syncReplacementsFromLogs,
    ],
  );

  return (
    <WorkoutSessionContext.Provider value={value}>
      {children}
    </WorkoutSessionContext.Provider>
  );
}

export function useWorkoutSession(): WorkoutSessionContextValue {
  const ctx = useContext(WorkoutSessionContext);
  if (!ctx) {
    throw new Error("useWorkoutSession must be used within WorkoutSessionProvider");
  }
  return ctx;
}
