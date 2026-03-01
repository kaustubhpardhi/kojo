"use client";

import { useState, useEffect } from "react";
import { getAmrapData } from "@/lib/progress-queries";
import type { AmrapViewData } from "@/lib/types/progress";
import type { ProgressDataResult } from "@/lib/types/progress";

/** AMRAP reps over time for the selected exercise. Returns { data, loading, error }. */
export function useAmrapData(
  userId: string | null,
  exerciseId: string | null,
): ProgressDataResult<AmrapViewData> {
  const [data, setData] = useState<AmrapViewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId || !exerciseId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getAmrapData(userId, exerciseId)
      .then((result) => {
        if (!cancelled) setData(result);
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
  }, [userId, exerciseId]);

  return { data, loading, error };
}
