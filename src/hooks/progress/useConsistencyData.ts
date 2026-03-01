"use client";

import { useState, useEffect } from "react";
import { getConsistencyData } from "@/lib/progress-queries";
import type { ConsistencyViewData } from "@/lib/types/progress";
import type { ProgressDataResult } from "@/lib/types/progress";

/** Session heatmap (week × day) and streak numbers. Returns { data, loading, error }. */
export function useConsistencyData(
  userId: string | null,
): ProgressDataResult<ConsistencyViewData> {
  const [data, setData] = useState<ConsistencyViewData | null>(null);
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

    getConsistencyData(userId)
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
  }, [userId]);

  return { data, loading, error };
}
