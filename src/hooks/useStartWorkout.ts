"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { todayStr } from "@/lib/dates";
import { haptic } from "@/lib/haptics";
import { queueSession } from "@/lib/offline";
import { buildSessionSeed, insertSessionSeed, pruneEmptySessions } from "@/lib/queries";
import { useToast } from "@/components/ui/Toast";

/**
 * Starts a session and navigates to the logger. Works offline: the session is
 * built with client-generated ids, so it can be queued and replayed later.
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
        const seed = await buildSessionSeed(userId, date, templateId);
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
