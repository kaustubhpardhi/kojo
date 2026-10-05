"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { todayStr } from "@/lib/dates";
import { haptic } from "@/lib/haptics";
import { queueSession } from "@/lib/offline";
import { buildSessionSeed, insertSessionSeed } from "@/lib/queries";
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
