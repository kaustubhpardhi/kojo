"use client";

import { useState, useEffect } from "react";
import { getStrengthData } from "@/lib/progress-queries";
import type { StrengthViewData } from "@/lib/types/progress";
import type { ProgressDataResult } from "@/lib/types/progress";

/** Estimated 1RM over time for the selected exercise. Returns { data, loading, error }. */
export function useStrengthData(
  userId: string | null,
  exerciseId: string | null,
): ProgressDataResult<StrengthViewData> {
  const [data, setData] = useState<StrengthViewData | null>(null);
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

    getStrengthData(userId, exerciseId)
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
