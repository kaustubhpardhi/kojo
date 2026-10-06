import { supabase } from "../supabase";
import { addDays, computeStreaks, monthRange, todayStr, weekStart } from "../dates";
import type {
  Exercise,
  ExercisePlan,
  LiveExercise,
  LoggedSet,
  Session,
  SessionExercise,
  SessionWithDetail,
  SetLog,
  StreakData,
  WeekProgress,
} from "../database.types";
import { getTemplate } from "./templates";

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  // Fallback for older WebViews; only needs to be unique per device.
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
}

function toLoggedSet(log: Pick<SetLog, "set_number" | "weight" | "reps" | "is_amrap">): LoggedSet {
  return {
    setNumber: log.set_number,
    weight: Number(log.weight),
    reps: Number(log.reps),
    isAmrap: !!log.is_amrap,
  };
}

// ─── Creating sessions ────────────────────────────────────────────────────

export interface SessionSeed {
  id: string;
  userId: string;
  date: string;
  templateId: string | null;
  title: string | null;
  exercises: (ExercisePlan & { id: string })[];
}

/**
 * Builds the full session payload client-side (ids included) so the same shape
 * can be written straight to Supabase or parked in the offline outbox.
 */
export async function buildSessionSeed(
  userId: string,
  date: string,
  templateId: string | null,
): Promise<SessionSeed> {
  const sessionId = newId();
  if (!templateId) {
    return { id: sessionId, userId, date, templateId: null, title: null, exercises: [] };
  }

  const template = await getTemplate(templateId);
  if (!template) throw new Error("Template not found");

  return {
    id: sessionId,
    userId,
    date,
    templateId,
    title: template.name,
    exercises: template.exercises.map((e, i) => ({
      id: newId(),
      exercise_id: e.exercise_id,
      position: i,
      target_sets: e.target_sets,
      rep_range_low: e.rep_range_low,
      rep_range_high: e.rep_range_high,
      target_weight: e.target_weight,
      rest_seconds: e.rest_seconds,
      amrap_last_set: e.amrap_last_set,
      notes: e.notes,
    })),
  };
}

export async function insertSessionSeed(seed: SessionSeed): Promise<void> {
  const { error } = await supabase.from("sessions").insert({
    id: seed.id,
    user_id: seed.userId,
    date: seed.date,
    template_id: seed.templateId,
    title: seed.title,
    started_at: new Date().toISOString(),
  } as never);
  if (error && error.code !== "23505") throw error;

  if (seed.exercises.length === 0) return;

  const rows = seed.exercises.map((e) => ({
    id: e.id,
    session_id: seed.id,
    exercise_id: e.exercise_id,
    position: e.position,
    target_sets: e.target_sets,
    rep_range_low: e.rep_range_low,
    rep_range_high: e.rep_range_high,
    target_weight: e.target_weight,
    rest_seconds: e.rest_seconds,
    amrap_last_set: e.amrap_last_set,
    notes: e.notes,
  }));
  const { error: exError } = await supabase
    .from("session_exercises")
    .upsert(rows as never, { onConflict: "id", ignoreDuplicates: true });
  if (exError) throw exError;
}

export async function completeSession(sessionId: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("sessions")
    .update({ completed_at: now, updated_at: now } as never)
    .eq("id", sessionId);
  if (error) throw error;
}

export async function deleteSession(sessionId: string): Promise<void> {
  const { error } = await supabase.from("sessions").delete().eq("id", sessionId);
  if (error) throw error;
}

// ─── Mid-session edits ────────────────────────────────────────────────────

export async function addSessionExercise(
  sessionId: string,
  exerciseId: string,
  position: number,
  plan?: Partial<ExercisePlan>,
): Promise<SessionExercise> {
  const { data, error } = await supabase
    .from("session_exercises")
    .insert({
      id: newId(),
      session_id: sessionId,
      exercise_id: exerciseId,
      position,
      target_sets: plan?.target_sets ?? 3,
      rep_range_low: plan?.rep_range_low ?? 8,
      rep_range_high: plan?.rep_range_high ?? 12,
      target_weight: plan?.target_weight ?? null,
      rest_seconds: plan?.rest_seconds ?? 90,
      amrap_last_set: plan?.amrap_last_set ?? false,
      notes: plan?.notes ?? null,
    } as never)
    .select("*")
    .single();
  if (error) throw error;
  return data as SessionExercise;
}

/**
 * Swap the exercise on a session row. Any sets already logged keep pointing at
 * the old exercise so history stays truthful; only the remaining sets move.
 */
export async function swapSessionExercise(
  sessionExerciseId: string,
  fromExerciseId: string,
  toExerciseId: string,
): Promise<void> {
  const { error } = await supabase
    .from("session_exercises")
    .update({
      exercise_id: toExerciseId,
      swapped_from_exercise_id: fromExerciseId,
    } as never)
    .eq("id", sessionExerciseId);
  if (error) throw error;
}

export async function setSessionExerciseStatus(
  sessionExerciseId: string,
  status: SessionExercise["status"],
): Promise<void> {
  const { error } = await supabase
    .from("session_exercises")
    .update({ status } as never)
    .eq("id", sessionExerciseId);
  if (error) throw error;
}

export async function updateSessionExercisePlan(
  sessionExerciseId: string,
  patch: Partial<Pick<ExercisePlan, "target_sets" | "rest_seconds" | "amrap_last_set">>,
): Promise<void> {
  const { error } = await supabase
    .from("session_exercises")
    .update(patch as never)
    .eq("id", sessionExerciseId);
  if (error) throw error;
}

export async function reorderSessionExercises(ids: string[]): Promise<void> {
  await Promise.all(
    ids.map((id, i) =>
      supabase.from("session_exercises").update({ position: i } as never).eq("id", id),
    ),
  );
}

export async function removeSessionExercise(sessionExerciseId: string): Promise<void> {
  const { error } = await supabase
    .from("session_exercises")
    .delete()
    .eq("id", sessionExerciseId);
  if (error) throw error;
}

// ─── Logging sets ─────────────────────────────────────────────────────────

export interface SetLogInput {
  id?: string;
  sessionId: string;
  /** Null when replaying a set queued by the pre-templates app. */
  sessionExerciseId: string | null;
  exerciseId: string;
  setNumber: number;
  weight: number;
  reps: number;
  isAmrap: boolean;
}

/**
 * Upsert on (session_id, exercise_id, set_number) — the unique index added by
 * the cleanup migration makes re-logging a set idempotent, which is what the
 * offline queue needs on replay.
 */
export async function logSet(input: SetLogInput): Promise<void> {
  const row = {
    id: input.id ?? newId(),
    session_id: input.sessionId,
    session_exercise_id: input.sessionExerciseId || null,
    exercise_id: input.exerciseId,
    set_number: input.setNumber,
    weight: input.weight,
    reps: input.reps,
    is_amrap: input.isAmrap,
    logged_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("set_logs")
    .upsert(row as never, { onConflict: "session_id,exercise_id,set_number" });

  // Before the unique index exists, upsert-on-conflict fails; fall back to
  // read-then-write so the app works against an unmigrated database too.
  if (error) {
    const { data: existing } = await supabase
      .from("set_logs")
      .select("id")
      .eq("session_id", input.sessionId)
      .eq("exercise_id", input.exerciseId)
      .eq("set_number", input.setNumber)
      .maybeSingle();

    if (existing) {
      const { error: upError } = await supabase
        .from("set_logs")
        .update({
          weight: row.weight,
          reps: row.reps,
          is_amrap: row.is_amrap,
          session_exercise_id: row.session_exercise_id,
          logged_at: row.logged_at,
        } as never)
        .eq("id", (existing as { id: string }).id);
      if (upError) throw upError;
      return;
    }
    const { error: insError } = await supabase.from("set_logs").insert(row as never);
    if (insError) throw insError;
  }
}

export async function deleteSet(
  sessionId: string,
  exerciseId: string,
  setNumber: number,
): Promise<void> {
  const { error } = await supabase
    .from("set_logs")
    .delete()
    .eq("session_id", sessionId)
    .eq("exercise_id", exerciseId)
    .eq("set_number", setNumber);
  if (error) throw error;
}

// ─── Reading sessions ─────────────────────────────────────────────────────

type SessionExerciseRow = SessionExercise & { exercise: Exercise };

export interface LiveSession {
  session: Session;
  exercises: LiveExercise[];
}

/** Everything the logger screen needs, including ghost values and PR baselines. */
export async function getLiveSession(
  userId: string,
  sessionId: string,
): Promise<LiveSession | null> {
  const { data: sessionData, error: sErr } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (sErr) throw sErr;
  if (!sessionData) return null;
  const session = sessionData as Session;

  const [exercisesRes, logsRes] = await Promise.all([
    supabase
      .from("session_exercises")
      // Disambiguate: session_exercises also FKs exercises via swapped_from_exercise_id.
      .select("*, exercise:exercises!session_exercises_exercise_id_fkey(*)")
      .eq("session_id", sessionId)
      .order("position"),
    supabase.from("set_logs").select("*").eq("session_id", sessionId).order("set_number"),
  ]);
  if (exercisesRes.error) throw exercisesRes.error;
  if (logsRes.error) throw logsRes.error;

  const rows = (exercisesRes.data ?? []) as SessionExerciseRow[];
  const logs = (logsRes.data ?? []) as SetLog[];
  const history = await getExerciseHistory(
    userId,
    rows.map((r) => r.exercise_id),
    sessionId,
  );

  const exercises: LiveExercise[] = rows.map((row) => {
    const logged = new Map<number, LoggedSet>();
    for (const log of logs) {
      if (log.exercise_id !== row.exercise_id) continue;
      logged.set(log.set_number, toLoggedSet(log));
    }
    const past = history.get(row.exercise_id);
    return {
      ...row,
      logged,
      previousSets: past?.previousSets ?? [],
      previousBestWeight: past?.bestWeight ?? 0,
    };
  });

  return { session, exercises };
}

interface ExerciseHistory {
  previousSets: LoggedSet[];
  bestWeight: number;
}

/**
 * For each exercise: the sets from the most recent other session that included
 * it, plus the best single-set weight ever. Drives ghost values and PR badges.
 */
export async function getExerciseHistory(
  userId: string,
  exerciseIds: string[],
  excludeSessionId?: string,
): Promise<Map<string, ExerciseHistory>> {
  const result = new Map<string, ExerciseHistory>();
  if (exerciseIds.length === 0) return result;

  const { data, error } = await supabase
    .from("set_logs")
    .select("exercise_id, session_id, set_number, weight, reps, is_amrap, sessions!inner(date, user_id)")
    .in("exercise_id", exerciseIds)
    .eq("sessions.user_id", userId)
    .order("logged_at", { ascending: false })
    .limit(1200);
  if (error) throw error;

  type Row = SetLog & { sessions: { date: string } | null };
  const rows = ((data ?? []) as unknown as Row[]).filter(
    (r) => r.session_id !== excludeSessionId,
  );

  const latestSessionByExercise = new Map<string, { sessionId: string; date: string }>();
  for (const r of rows) {
    const date = r.sessions?.date;
    if (!date) continue;
    const current = latestSessionByExercise.get(r.exercise_id);
    if (!current || date > current.date) {
      latestSessionByExercise.set(r.exercise_id, { sessionId: r.session_id, date });
    }
  }

  for (const exerciseId of exerciseIds) {
    const latest = latestSessionByExercise.get(exerciseId);
    const forExercise = rows.filter((r) => r.exercise_id === exerciseId);
    const previousSets = latest
      ? forExercise
          .filter((r) => r.session_id === latest.sessionId)
          .map(toLoggedSet)
          .sort((a, b) => a.setNumber - b.setNumber)
      : [];
    const bestWeight = forExercise.reduce((max, r) => Math.max(max, Number(r.weight)), 0);
    result.set(exerciseId, { previousSets, bestWeight });
  }

  return result;
}

export async function getSessionDetail(sessionId: string): Promise<SessionWithDetail | null> {
  const { data: sessionData, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw error;
  if (!sessionData) return null;
  const session = sessionData as Session;

  const [exercisesRes, logsRes] = await Promise.all([
    supabase
      .from("session_exercises")
      .select("*, exercise:exercises!session_exercises_exercise_id_fkey(*)")
      .eq("session_id", sessionId)
      .order("position"),
    supabase.from("set_logs").select("*").eq("session_id", sessionId).order("set_number"),
  ]);
  if (exercisesRes.error) throw exercisesRes.error;
  if (logsRes.error) throw logsRes.error;

  const logs = (logsRes.data ?? []) as SetLog[];
  const exercises = ((exercisesRes.data ?? []) as SessionExerciseRow[]).map((row) => ({
    ...row,
    sets: logs
      .filter((l) => l.exercise_id === row.exercise_id)
      .map(toLoggedSet)
      .sort((a, b) => a.setNumber - b.setNumber),
  }));

  const totalVolume = logs.reduce((sum, l) => sum + Number(l.weight) * Number(l.reps), 0);

  return { ...session, exercises, totalSets: logs.length, totalVolume };
}

// ─── Home screen data ─────────────────────────────────────────────────────

export async function getSessionsForMonth(
  userId: string,
  year: number,
  month: number,
): Promise<Session[]> {
  const { start, end } = monthRange(year, month);
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", userId)
    .gte("date", start)
    .lte("date", end)
    .order("date");
  if (error) throw error;
  return (data ?? []) as Session[];
}

/**
 * An unfinished session from the last few days — powers the "resume" card.
 * Older abandoned drafts (and empty ghosts from failed starts) are ignored so
 * finishing today's workout doesn't leave a months-old template stuck on Home.
 */
export async function getActiveSession(userId: string): Promise<Session | null> {
  const since = addDays(todayStr(), -2);
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", userId)
    .is("completed_at", null)
    .gte("date", since)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as Session | null) ?? null;
}

/** Deletes unfinished sessions that never logged a set (safe to throw away). */
export async function pruneEmptySessions(userId: string): Promise<number> {
  const { data: open, error } = await supabase
    .from("sessions")
    .select("id")
    .eq("user_id", userId)
    .is("completed_at", null);
  if (error) throw error;
  if (!open?.length) return 0;

  let removed = 0;
  for (const row of open as { id: string }[]) {
    const { count, error: cErr } = await supabase
      .from("set_logs")
      .select("id", { count: "exact", head: true })
      .eq("session_id", row.id);
    if (cErr) throw cErr;
    if ((count ?? 0) > 0) continue;
    await deleteSession(row.id);
    removed += 1;
  }
  return removed;
}

export async function getSessionsOnDate(userId: string, date: string): Promise<Session[]> {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as Session[];
}

export async function getRecentSessions(userId: string, limit = 8): Promise<Session[]> {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", userId)
    .not("completed_at", "is", null)
    .order("date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Session[];
}

async function getCompletedDates(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("sessions")
    .select("date")
    .eq("user_id", userId)
    .not("completed_at", "is", null)
    .order("date");
  if (error) throw error;
  return ((data ?? []) as { date: string }[]).map((s) => s.date);
}

export async function getStreaks(userId: string): Promise<StreakData> {
  return computeStreaks(await getCompletedDates(userId));
}

export async function getHomeStats(
  userId: string,
  weeklyGoal: number,
): Promise<{ streaks: StreakData; week: WeekProgress }> {
  const dates = await getCompletedDates(userId);
  const thisWeek = weekStart(todayStr());
  const completed = new Set(dates.filter((d) => weekStart(d) === thisWeek)).size;
  return {
    streaks: computeStreaks(dates),
    week: { completed, goal: weeklyGoal },
  };
}
