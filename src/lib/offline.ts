import { del, get, keys, set } from "idb-keyval";
import { supabase } from "./supabase";
import {
  completeSession,
  insertSessionSeed,
  logSet,
  type SessionSeed,
  type SetLogInput,
} from "./queries/sessions";

/**
 * Offline outbox.
 *
 * Operations are keyed with a monotonic sequence so they replay in the order
 * they happened: a session must exist before its sets land, and completion must
 * come last. Every operation is idempotent, so a partial sync can safely retry.
 */

type Operation =
  | { kind: "session"; seed: SessionSeed }
  | { kind: "set"; input: SetLogInput }
  | { kind: "complete"; sessionId: string };

interface QueueEntry {
  key: string;
  seq: number;
  attempts: number;
  op: Operation;
}

const PREFIX = "kojo_outbox_";
const SEQ_KEY = "kojo_outbox_seq";
const LEGACY_PREFIX = "offline_set_";
const MAX_ATTEMPTS = 8;

/** Pre-revamp queue entries, so sets queued by the old app still sync. */
interface LegacySetLog {
  session_id: string;
  exercise_id: string;
  set_number: number;
  weight: number;
  reps: number;
  is_amrap: boolean;
}

let listeners: (() => void)[] = [];

export function onOutboxChange(fn: () => void): () => void {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

function notify(): void {
  listeners.forEach((l) => l());
}

async function nextSeq(): Promise<number> {
  const current = (await get<number>(SEQ_KEY)) ?? 0;
  const next = current + 1;
  await set(SEQ_KEY, next);
  return next;
}

async function enqueue(op: Operation): Promise<void> {
  const seq = await nextSeq();
  const key = `${PREFIX}${String(seq).padStart(9, "0")}`;
  await set(key, { key, seq, attempts: 0, op } satisfies QueueEntry);
  notify();
}

export const queueSession = (seed: SessionSeed) => enqueue({ kind: "session", seed });
export const queueSet = (input: SetLogInput) => enqueue({ kind: "set", input });
export const queueComplete = (sessionId: string) => enqueue({ kind: "complete", sessionId });

async function readQueue(): Promise<QueueEntry[]> {
  const all = await keys();
  const entries: QueueEntry[] = [];
  for (const k of all) {
    const name = String(k);
    if (!name.startsWith(PREFIX)) continue;
    const entry = await get<QueueEntry>(k);
    if (entry) entries.push(entry);
  }
  return entries.sort((a, b) => a.seq - b.seq);
}

async function readLegacyQueue(): Promise<{ key: string; log: LegacySetLog }[]> {
  const all = await keys();
  const out: { key: string; log: LegacySetLog }[] = [];
  for (const k of all) {
    const name = String(k);
    if (!name.startsWith(LEGACY_PREFIX)) continue;
    const log = await get<LegacySetLog>(k);
    if (log) out.push({ key: name, log });
  }
  return out;
}

export async function pendingCount(): Promise<number> {
  const [queue, legacy] = await Promise.all([readQueue(), readLegacyQueue()]);
  return queue.length + legacy.length;
}

async function runOperation(op: Operation): Promise<void> {
  if (op.kind === "session") return insertSessionSeed(op.seed);
  if (op.kind === "set") return logSet(op.input);
  return completeSession(op.sessionId);
}

let syncing = false;

export async function syncOutbox(): Promise<number> {
  if (syncing || typeof navigator === "undefined" || !navigator.onLine) return 0;

  const { data } = await supabase.auth.getSession();
  if (!data.session) return 0;

  syncing = true;
  let synced = 0;

  try {
    // Legacy set logs first: they belong to sessions that already exist.
    for (const { key, log } of await readLegacyQueue()) {
      try {
        await logSet({
          sessionId: log.session_id,
          sessionExerciseId: null,
          exerciseId: log.exercise_id,
          setNumber: log.set_number,
          weight: log.weight,
          reps: log.reps,
          isAmrap: log.is_amrap,
        });
        await del(key);
        synced++;
      } catch {
        break;
      }
    }

    for (const entry of await readQueue()) {
      try {
        await runOperation(entry.op);
        await del(entry.key);
        synced++;
      } catch (err) {
        const attempts = entry.attempts + 1;
        if (attempts >= MAX_ATTEMPTS) {
          console.warn("Dropping outbox entry after repeated failures", entry.op, err);
          await del(entry.key);
        } else {
          await set(entry.key, { ...entry, attempts });
        }
        // Stop on first failure to preserve ordering.
        break;
      }
    }
  } finally {
    syncing = false;
    if (synced > 0) notify();
  }

  return synced;
}

let started = false;

export function setupOnlineSync(): void {
  if (typeof window === "undefined" || started) return;
  started = true;

  const trigger = () => {
    void syncOutbox();
  };

  window.addEventListener("online", trigger);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") trigger();
  });
  setInterval(trigger, 30_000);
  trigger();
}
