"use client";

import { useState, useEffect } from "react";
import { getPersonalBests } from "@/lib/progress-queries";
import type { PersonalBestsViewData } from "@/lib/types/progress";
import type { ProgressDataResult } from "@/lib/types/progress";

/** All-time best weight+reps per exercise, sorted by PR date. Returns { data, loading, error }. */
export function usePersonalBestsData(
  userId: string | null,
): ProgressDataResult<PersonalBestsViewData> {
  const [data, setData] = useState<PersonalBestsViewData | null>(null);
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

    getPersonalBests(userId)
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
