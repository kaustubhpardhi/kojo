import { set, get, keys, del } from "idb-keyval";
import { supabase } from "./supabase";
import type { Database } from "./database.types";

type SetLogUpdate = Database["public"]["Tables"]["set_logs"]["Update"];
type SetLogInsert = Database["public"]["Tables"]["set_logs"]["Insert"];

interface OfflineSetLog {
  id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  weight: number;
  reps: number;
  is_amrap: boolean;
  override_exercise_name?: string | null;
  timestamp: number;
}

const QUEUE_PREFIX = "offline_set_";

export async function queueSetLog(
  log: Omit<OfflineSetLog, "id" | "timestamp">,
): Promise<void> {
  const id = `${QUEUE_PREFIX}${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const entry: OfflineSetLog = { ...log, id, timestamp: Date.now() };
  await set(id, entry);
}

export async function syncOfflineLogs(): Promise<number> {
  const allKeys = await keys();
  const offlineKeys = allKeys.filter((k) => String(k).startsWith(QUEUE_PREFIX));

  let synced = 0;
  for (const key of offlineKeys) {
    const log = await get<OfflineSetLog>(key);
    if (!log) continue;

    try {
      // Check for existing
      const { data: existingRow } = await supabase
        .from("set_logs")
        .select("id")
        .eq("session_id", log.session_id)
        .eq("exercise_id", log.exercise_id)
        .eq("set_number", log.set_number)
        .maybeSingle();

      const existing = existingRow as { id: string } | null;
      if (existing) {
        const updatePayload: SetLogUpdate = {
          weight: log.weight,
          reps: log.reps,
          is_amrap: log.is_amrap,
          override_exercise_name: log.override_exercise_name ?? null,
        };
        await supabase
          .from("set_logs")
          .update(updatePayload as never)
          .eq("id", existing.id);
      } else {
        const insertPayload: SetLogInsert = {
          session_id: log.session_id,
          exercise_id: log.exercise_id,
          set_number: log.set_number,
          weight: log.weight,
          reps: log.reps,
          is_amrap: log.is_amrap,
          override_exercise_name: log.override_exercise_name ?? null,
        };
        await supabase.from("set_logs").insert(insertPayload as never);
      }

      await del(key);
      synced++;
    } catch {
      // Will retry next sync
      console.warn("Failed to sync log, will retry:", key);
    }
  }

  return synced;
}

export function setupOnlineSync(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("online", () => {
    syncOfflineLogs().then((count) => {
      if (count > 0) console.log(`Synced ${count} offline logs`);
    });
  });

  // Also try syncing periodically
  setInterval(() => {
    if (navigator.onLine) {
      syncOfflineLogs();
    }
  }, 30000);
}
