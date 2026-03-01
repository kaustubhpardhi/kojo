/**
 * Progress page — all six query functions using Supabase client.
 * Returns typed shapes from @/lib/types/progress. No component code.
 */

import { supabase } from "./supabase";
import { getStreaks } from "./queries";
import type { DayType, Exercise } from "./database.types";
import type {
  StrengthViewData,
  StrengthDataPoint,
  StrengthCallout,
  VolumeViewData,
  VolumeDataPoint,
  VolumeCallout,
  ConsistencyViewData,
  ConsistencyCell,
  ConsistencyCellStatus,
  AmrapViewData,
  AmrapDataPoint,
  AmrapCallout,
  FrequencyViewData,
  FrequencyDayBar,
  FrequencyWeekPoint,
  FrequencyCallout,
  PersonalBestsViewData,
  PersonalBestRow,
} from "./types/progress";

// ─── Helpers ───────────────────────────────────────────────────────────────

const EPLEY = (weight: number, reps: number) => weight * (1 + reps / 30);

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getISOWeek(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  const year = monday.getFullYear();
  const start = new Date(year, 0, 1);
  const week = Math.ceil(
    ((monday.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7,
  );
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function getISOWeekStart(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().split("T")[0];
}

function weekLabel(isoWeek: string): string {
  const [, w] = isoWeek.split("-W");
  return `W${w}`;
}

// ─── Exercise lists (for selectors) ────────────────────────────────────────

/** All exercises for progress selectors (Strength/Volume). Ordered by day then order. */
export async function getProgressExercises(): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from("exercises")
    .select("*")
    .order("day")
    .order("order");
  if (error) throw error;
  return (data || []) as Exercise[];
}

/** Exercises where amrap_last_set = true, for AMRAP view selector. */
export async function getAmrapExercises(): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from("exercises")
    .select("*")
    .eq("amrap_last_set", true)
    .order("day")
    .order("order");
  if (error) throw error;
  return (data || []) as Exercise[];
}

// ─── 1. STRENGTH ───────────────────────────────────────────────────────────

/**
 * Fetches set_logs for exercise joined with user's completed sessions;
 * computes estimated 1RM (Epley) per session date and callout.
 *
 * Filtering: one query joins set_logs → sessions and filters by sessions.user_id
 * and sessions.completed_at IS NOT NULL so only this user's completed sessions
 * are included. No separate session ID list; DB enforces user_id.
 *
 * Epley per set: weight * (1 + reps/30). Max per session date: we group sets by
 * session date and take Math.max(...epleyValues) for that date.
 */
export async function getStrengthData(
  userId: string,
  exerciseId: string,
): Promise<StrengthViewData> {
  type Row = {
    session_id: string;
    weight: number | string;
    reps: number | string;
    sessions: { date: string; user_id: string; completed_at: string | null } | null;
  };

  const { data: logsData, error: lErr } = await supabase
    .from("set_logs")
    .select("session_id, weight, reps, sessions!inner(date, user_id, completed_at)")
    .eq("exercise_id", exerciseId)
    .eq("sessions.user_id", userId)
    .not("sessions.completed_at", "is", null);

  if (lErr) throw lErr;
  const rawRows = (logsData || []) as Row[];

  const logs = rawRows
    .filter((r) => r.sessions?.date != null && r.sessions?.completed_at != null)
    .map((r) => ({
      session_id: r.session_id,
      date: r.sessions!.date,
      weight: Number(r.weight),
      reps: Number(r.reps),
    }));

  const byDate = new Map<string, number[]>();
  for (const log of logs) {
    const epley = EPLEY(log.weight, log.reps);
    if (!byDate.has(log.date)) byDate.set(log.date, []);
    byDate.get(log.date)!.push(epley);
  }

  const series: StrengthDataPoint[] = [];
  for (const [date, values] of byDate.entries()) {
    const max = Math.max(...values);
    series.push({ date, estimated1RM: Math.round(max * 10) / 10 });
  }
  series.sort((a, b) => a.date.localeCompare(b.date));

  const allTimeBest =
    series.length ? Math.max(...series.map((p) => p.estimated1RM)) : 0;
  const lastSession =
    series.length ? series[series.length - 1].estimated1RM : 0;

  const now = new Date();
  const fourWeeksAgo = new Date(now);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const eightWeeksAgo = new Date(now);
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

  const last4 = series.filter((p) => p.date >= toDateStr(fourWeeksAgo));
  const prev4 = series.filter(
    (p) =>
      p.date >= toDateStr(eightWeeksAgo) && p.date < toDateStr(fourWeeksAgo),
  );
  const avgLast4 =
    last4.length
      ? last4.reduce((s, p) => s + p.estimated1RM, 0) / last4.length
      : 0;
  const avgPrev4 =
    prev4.length
      ? prev4.reduce((s, p) => s + p.estimated1RM, 0) / prev4.length
      : 0;
  const deltaKg = Math.round((avgLast4 - avgPrev4) * 10) / 10;
  const trend: StrengthCallout["trend"] =
    deltaKg > 0
      ? { direction: "up", deltaKg }
      : deltaKg < 0
        ? { direction: "down", deltaKg: Math.abs(deltaKg) }
        : { direction: "neutral", deltaKg: 0 };

  return {
    series,
    callout: { allTimeBest, lastSession, trend },
  };
}

// ─── 2. VOLUME ─────────────────────────────────────────────────────────────

/**
 * Fetches set_logs for exercise; groups by ISO week; sums weight×reps per set.
 */
export async function getVolumeData(
  userId: string,
  exerciseId: string,
): Promise<VolumeViewData> {
  const { data: sessionsData, error: sErr } = await supabase
    .from("sessions")
    .select("id, date")
    .eq("user_id", userId)
    .not("completed_at", "is", null)
    .order("date");

  if (sErr) throw sErr;
  const sessions = (sessionsData || []) as { id: string; date: string }[];
  const sessionIds = sessions.map((s) => s.id);
  const dateBySessionId = new Map(
    sessions.map((s) => [s.id, s.date]),
  );

  if (sessionIds.length === 0) {
    return {
      series: [],
      callout: { bestWeek: 0, thisWeek: 0, avgLast4Weeks: 0 },
    };
  }

  const { data: logsData, error: lErr } = await supabase
    .from("set_logs")
    .select("session_id, weight, reps")
    .eq("exercise_id", exerciseId)
    .in("session_id", sessionIds);

  if (lErr) throw lErr;
  const logs = (logsData || []) as {
    session_id: string;
    weight: number | string;
    reps: number | string;
  }[];

  const byWeek = new Map<string, number>();
  for (const log of logs) {
    const date = dateBySessionId.get(log.session_id);
    if (!date) continue;
    const iso = getISOWeek(date);
    const vol = Number(log.weight) * Number(log.reps);
    byWeek.set(iso, (byWeek.get(iso) || 0) + vol);
  }

  const thisWeekISO = getISOWeek(toDateStr(new Date()));
  const series: VolumeDataPoint[] = [];
  for (const [isoWeek, totalVolume] of byWeek.entries()) {
    series.push({
      weekLabel: weekLabel(isoWeek),
      isoWeek,
      totalVolume: Math.round(totalVolume),
      isCurrentWeek: isoWeek === thisWeekISO,
    });
  }
  series.sort((a, b) => a.isoWeek.localeCompare(b.isoWeek));

  const bestWeek = series.length
    ? Math.max(...series.map((p) => p.totalVolume))
    : 0;
  const thisWeekVal = byWeek.get(thisWeekISO) || 0;
  const last4 = series.slice(-4);
  const avgLast4Weeks =
    last4.length
      ? last4.reduce((s, p) => s + p.totalVolume, 0) / last4.length
      : 0;

  return {
    series,
    callout: {
      bestWeek,
      thisWeek: Math.round(thisWeekVal),
      avgLast4Weeks: Math.round(avgLast4Weeks),
    },
  };
}

// ─── 3. CONSISTENCY ────────────────────────────────────────────────────────

/**
 * Fetches completed sessions + PR flags per date; builds week×day heatmap
 * and streak numbers.
 */
export async function getConsistencyData(
  userId: string,
): Promise<ConsistencyViewData> {
  const [sessionsRes, streaks] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, date")
      .eq("user_id", userId)
      .not("completed_at", "is", null)
      .order("date"),
    getStreaks(userId),
  ]);

  if (sessionsRes.error) throw sessionsRes.error;
  const sessions = (sessionsRes.data || []) as { id: string; date: string }[];
  const sessionIds = sessions.map((s) => s.id);
  const datesWithSession = new Set(sessions.map((s) => s.date));

  const datesWithPR = new Set<string>();
  if (sessionIds.length > 0) {
    const { data: logsData, error: lErr } = await supabase
      .from("set_logs")
      .select("session_id, exercise_id, weight")
      .in("session_id", sessionIds);
    if (lErr) throw lErr;
    const logs = (logsData || []) as {
      session_id: string;
      exercise_id: string;
      weight: number | string;
    }[];
    const sessionDateMap = new Map(sessions.map((s) => [s.id, s.date]));

    const SEP = "||";
    const maxWeightPerSessionPerExercise = new Map<string, number>();
    for (const log of logs) {
      const date = sessionDateMap.get(log.session_id);
      if (!date) continue;
      const w = Number(log.weight);
      const key = `${log.exercise_id}${SEP}${date}`;
      const prev = maxWeightPerSessionPerExercise.get(key);
      if (prev == null || w > prev) {
        maxWeightPerSessionPerExercise.set(key, w);
      }
    }

    const sortedDates = [...new Set(sessions.map((s) => s.date))].sort();
    const exerciseMaxSoFar = new Map<string, number>();
    for (const date of sortedDates) {
      let dateIsPR = false;
      const suffix = `${SEP}${date}`;
      for (const [key, weight] of maxWeightPerSessionPerExercise) {
        if (!key.endsWith(suffix)) continue;
        const exerciseId = key.slice(0, -suffix.length);
        const prevMax = exerciseMaxSoFar.get(exerciseId);
        if (prevMax == null || weight > prevMax) {
          exerciseMaxSoFar.set(exerciseId, weight);
          dateIsPR = true;
        }
      }
      if (dateIsPR) datesWithPR.add(date);
    }
  }

  const weekStarts = new Set<string>();
  for (const s of sessions) {
    weekStarts.add(getISOWeekStart(s.date));
  }
  const weeksSorted = [...weekStarts].sort();
  const weeks = weeksSorted.map((_, i) => `W${i + 1}`);
  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

  const cells: ConsistencyCell[] = [];
  for (let weekIndex = 0; weekIndex < weeksSorted.length; weekIndex++) {
    const weekStart = weeksSorted[weekIndex];
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const d = new Date(weekStart + "T00:00:00");
      d.setDate(d.getDate() + dayOfWeek);
      const dateStr = d.toISOString().split("T")[0];
      const hasSession = datesWithSession.has(dateStr);
      const hasPR = datesWithPR.has(dateStr);
      const status: ConsistencyCellStatus = hasPR
        ? "pr"
        : hasSession
          ? "completed"
          : "empty";
      cells.push({ weekIndex, dayOfWeek, status, date: dateStr });
    }
  }

  return {
    weeks,
    dayLabels,
    cells,
    currentStreak: streaks.current,
    longestStreak: streaks.longest,
  };
}

// ─── 4. AMRAP ──────────────────────────────────────────────────────────────

/**
 * Fetches set_logs where is_amrap = true for exercise; computes isNewHigh
 * per point and callout.
 */
export async function getAmrapData(
  userId: string,
  exerciseId: string,
): Promise<AmrapViewData> {
  const { data: sessionsData, error: sErr } = await supabase
    .from("sessions")
    .select("id, date")
    .eq("user_id", userId)
    .not("completed_at", "is", null)
    .order("date");

  if (sErr) throw sErr;
  const sessions = (sessionsData || []) as { id: string; date: string }[];
  const sessionIds = sessions.map((s) => s.id);
  const dateBySessionId = new Map(
    sessions.map((s) => [s.id, s.date]),
  );

  if (sessionIds.length === 0) {
    return {
      series: [],
      callout: { bestAmrap: 0, lastAmrap: 0, avgLast6Sessions: 0 },
    };
  }

  const { data: logsData, error: lErr } = await supabase
    .from("set_logs")
    .select("session_id, reps")
    .eq("exercise_id", exerciseId)
    .eq("is_amrap", true)
    .in("session_id", sessionIds);

  if (lErr) throw lErr;
  const logs = (logsData || []) as { session_id: string; reps: number }[];

  const byDate = new Map<string, number>();
  for (const log of logs) {
    const date = dateBySessionId.get(log.session_id);
    if (!date) continue;
    const existing = byDate.get(date);
    if (existing == null || log.reps > existing) {
      byDate.set(date, log.reps);
    }
  }

  const sortedDates = [...byDate.keys()].sort();
  let runningMax = 0;
  const series: AmrapDataPoint[] = sortedDates.map((date) => {
    const reps = byDate.get(date)!;
    const isNewHigh = reps > runningMax;
    if (reps > runningMax) runningMax = reps;
    return { date, reps, isNewHigh };
  });

  const bestAmrap = series.length ? Math.max(...series.map((p) => p.reps)) : 0;
  const lastAmrap = series.length ? series[series.length - 1].reps : 0;
  const last6 = series.slice(-6);
  const avgLast6Sessions =
    last6.length ? last6.reduce((s, p) => s + p.reps, 0) / last6.length : 0;

  return {
    series,
    callout: {
      bestAmrap,
      lastAmrap,
      avgLast6Sessions: Math.round(avgLast6Sessions * 10) / 10,
    },
  };
}

// ─── 5. FREQUENCY ─────────────────────────────────────────────────────────

const TARGET_SESSIONS_PER_WEEK = 3;

/**
 * Fetches completed sessions; groups by week and by day letter; builds
 * 12-week line + A/B/C bars + callout.
 */
export async function getFrequencyData(
  userId: string,
): Promise<FrequencyViewData> {
  const { data: sessionsData, error: e } = await supabase
    .from("sessions")
    .select("date, day")
    .eq("user_id", userId)
    .not("completed_at", "is", null)
    .order("date");

  if (e) throw e;
  const sessions = (sessionsData || []) as { date: string; day: DayType }[];

  const byWeek = new Map<string, number>();
  const byDay = new Map<DayType, number[]>();
  for (const s of sessions) {
    const weekStart = getISOWeekStart(s.date);
    byWeek.set(weekStart, (byWeek.get(weekStart) || 0) + 1);
    if (!byDay.has(s.day)) byDay.set(s.day, []);
    byDay.get(s.day)!.push(1);
  }

  const weekStarts = [...byWeek.keys()].sort();
  const last12 = weekStarts.slice(-12);
  const weeklyLine: FrequencyWeekPoint[] = last12.map((weekStart, i) => ({
    weekLabel: `W${i + 1}`,
    weekStart,
    sessionsCount: byWeek.get(weekStart) || 0,
  }));

  const totalWeeks = weekStarts.length || 1;
  const dayBars: FrequencyDayBar[] = (["A", "B", "C"] as DayType[]).map(
    (day) => {
      const count = (byDay.get(day) || []).length;
      const sessionsPerWeek =
        totalWeeks > 0 ? Math.round((count / totalWeeks) * 100) / 100 : 0;
      return { day, sessionsPerWeek };
    },
  );

  const totalSessions = sessions.length;
  const now = new Date();
  const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const thisMonth = sessions.filter((s) => s.date >= thisMonthStart).length;
  const avgPerWeek = weekStarts.length
    ? totalSessions / weekStarts.length
    : 0;

  const callout: FrequencyCallout = {
    totalSessions,
    thisMonth,
    avgPerWeek: Math.round(avgPerWeek * 100) / 100,
  };

  return {
    dayBars,
    weeklyLine,
    targetSessionsPerWeek: TARGET_SESSIONS_PER_WEEK,
    callout,
  };
}

// ─── 6. PERSONAL BESTS ────────────────────────────────────────────────────

/**
 * For each exercise, finds the set_log with highest weight (then reps);
 * returns list sorted by PR date descending; isNew if in last 7 days.
 */
export async function getPersonalBestsData(
  userId: string,
): Promise<PersonalBestsViewData> {
  const { data: exercisesData, error: exErr } = await supabase
    .from("exercises")
    .select("id, name")
    .order("day")
    .order("order");
  if (exErr) throw exErr;
  const exercises = (exercisesData || []) as { id: string; name: string }[];

  const { data: sessionsData, error: sErr } = await supabase
    .from("sessions")
    .select("id, date")
    .eq("user_id", userId)
    .not("completed_at", "is", null)
    .order("date");
  if (sErr) throw sErr;
  const sessions = (sessionsData || []) as { id: string; date: string }[];
  const sessionIds = sessions.map((s) => s.id);
  const dateBySessionId = new Map(sessions.map((s) => [s.id, s.date]));

  if (sessionIds.length === 0) {
    return { items: [] };
  }

  const { data: logsData, error: lErr } = await supabase
    .from("set_logs")
    .select("session_id, exercise_id, weight, reps")
    .in("session_id", sessionIds);
  if (lErr) throw lErr;
  const logs = (logsData || []) as {
    session_id: string;
    exercise_id: string;
    weight: number;
    reps: number;
  }[];

  const byExercise = new Map<
    string,
    { weight: number; reps: number; date: string }
  >();
  for (const log of logs) {
    const date = dateBySessionId.get(log.session_id)!;
    const key = log.exercise_id;
    const existing = byExercise.get(key);
    if (
      !existing ||
      log.weight > existing.weight ||
      (log.weight === existing.weight && log.reps > existing.reps)
    ) {
      byExercise.set(key, {
        weight: log.weight,
        reps: log.reps,
        date,
      });
    }
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoff = toDateStr(sevenDaysAgo);

  const items: PersonalBestRow[] = [];
  for (const ex of exercises) {
    const pr = byExercise.get(ex.id);
    if (!pr) continue;
    const isNew = pr.date >= cutoff;
    items.push({
      exerciseId: ex.id,
      exerciseName: ex.name,
      weight: pr.weight,
      reps: pr.reps,
      date: pr.date,
      isNew,
    });
  }
  items.sort((a, b) => b.date.localeCompare(a.date));

  return { items };
}
