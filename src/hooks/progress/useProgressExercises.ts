"use client";

import { useState, useEffect } from "react";
import { getProgressExercises } from "@/lib/progress-queries";
import type { Exercise } from "@/lib/database.types";
import type { ProgressDataResult } from "@/lib/types/progress";

/** All exercises for progress selectors (Strength/Volume). Returns { data, loading, error }. */
export function useProgressExercises(
  userId: string | null,
): ProgressDataResult<Exercise[]> {
  const [data, setData] = useState<Exercise[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getProgressExercises()
      .then((exercises) => {
        if (!cancelled) setData(exercises);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error(String(e)));
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { data, loading, error };
}
