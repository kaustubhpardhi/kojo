"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { todayStr } from "@/lib/dates";
import { haptic } from "@/lib/haptics";
import { queueSession } from "@/lib/offline";
import { buildSessionSeed, insertSessionSeed, pruneEmptySessions } from "@/lib/queries";
import { useToast } from "@/components/ui/Toast";

/** Clamp to today or earlier — future sessions aren't allowed. */
function resolveSessionDate(date: string): string {
  const today = todayStr();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today) return today;
  return date;
}

/**
 * Starts a session and navigates to the logger. Works offline: the session is
 * built with client-generated ids, so it can be queued and replayed later.
 * Pass a past YYYY-MM-DD to backfill a session you already trained.
 */
export function useStartWorkout(userId: string) {
  const router = useRouter();
  const { toast } = useToast();
  const [starting, setStarting] = useState(false);

  const start = useCallback(
    async (templateId: string | null, date = todayStr()) => {
      if (starting) return;
      setStarting(true);
      try {
        // Drop unfinished sessions that never logged a set so they don't stick
        // around as a fake "in progress" card after a cancelled start.
        if (typeof navigator === "undefined" || navigator.onLine) {
          await pruneEmptySessions(userId).catch(() => {});
        }
        const seed = await buildSessionSeed(userId, resolveSessionDate(date), templateId);
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          await queueSession(seed);
        } else {
          await insertSessionSeed(seed);
        }
        haptic("success");
        router.push(`/log/${seed.id}`);
      } catch (err) {
        console.error("Failed to start workout", err);
        toast({ message: "Couldn't start that workout", icon: "x", tone: "danger" });
      } finally {
        setStarting(false);
      }
    },
    [router, starting, toast, userId],
  );

  return { start, starting };
}
