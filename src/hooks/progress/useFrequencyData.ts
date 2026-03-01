"use client";

import { useState, useEffect } from "react";
import { getFrequencyData } from "@/lib/progress-queries";
import type { FrequencyViewData } from "@/lib/types/progress";
import type { ProgressDataResult } from "@/lib/types/progress";

/** Sessions per week by day letter and 12-week line. Returns { data, loading, error }. */
export function useFrequencyData(
  userId: string | null,
): ProgressDataResult<FrequencyViewData> {
  const [data, setData] = useState<FrequencyViewData | null>(null);
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

    getFrequencyData(userId)
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
