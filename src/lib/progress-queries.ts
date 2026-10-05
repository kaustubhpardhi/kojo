/**
 * Progress analytics. Everything is derived from set_logs joined to the user's
 * completed sessions, so it works for any template or freestyle session.
 *
 * Sessions are fetched once and logs are pulled in id chunks — the old version
 * put every session id in one query string, which breaks once a user has a few
 * hundred sessions.
 */

import { supabase } from "./supabase";
import { addDays, computeStreaks, isoDayOfWeek, todayStr, weekStart } from "./dates";
import type { Exercise, MuscleGroup } from "./database.types";
import type {
  AmrapViewData,
  ConsistencyCell,
  ConsistencyViewData,
  PersonalBestRow,
  PersonalBestsViewData,
  ProgressExercise,
  StrengthViewData,
  VolumeDataPoint,
  VolumeViewData,
} from "./types/progress";

const epley = (weight: number, reps: number) => weight * (1 + reps / 30);
const CHUNK = 150;

interface LogRow {
  exercise_id: string;
  set_number: number;
  weight: number;
  reps: number;
  is_amrap: boolean;
  date: string;
}

interface HistoryCache {
  logs: LogRow[];
  exercises: Map<string, Exercise>;
  sessionDates: string[];
}

const cache = new Map<string, { at: number; value: Promise<HistoryCache> }>();
const TTL = 30_000;

/** One fetch of the user's whole logged history, reused across views. */
export function getHistory(userId: string, force = false): Promise<HistoryCache> {
  const hit = cache.get(userId);
  if (!force && hit && Date.now() - hit.at < TTL) return hit.value;

  const value = loadHistory(userId);
  cache.set(userId, { at: Date.now(), value });
  return value;
}

export function invalidateHistory(userId?: string): void {
  if (userId) cache.delete(userId);
  else cache.clear();
}

async function loadHistory(userId: string): Promise<HistoryCache> {
  const { data: sessionsData, error: sErr } = await supabase
    .from("sessions")
    .select("id, date")
    .eq("user_id", userId)
    .not("completed_at", "is", null)
    .order("date");
  if (sErr) throw sErr;

  const sessions = (sessionsData ?? []) as { id: string; date: string }[];
  const dateById = new Map(sessions.map((s) => [s.id, s.date]));

  const logs: LogRow[] = [];
  for (let i = 0; i < sessions.length; i += CHUNK) {
    const ids = sessions.slice(i, i + CHUNK).map((s) => s.id);
    const { data, error } = await supabase
      .from("set_logs")
      .select("session_id, exercise_id, set_number, weight, reps, is_amrap")
      .in("session_id", ids);
    if (error) throw error;
    for (const row of (data ?? []) as {
      session_id: string;
      exercise_id: string;
      set_number: number;
      weight: number | string;
      reps: number | string;
      is_amrap: boolean;
    }[]) {
      const date = dateById.get(row.session_id);
      if (!date) continue;
      logs.push({
        exercise_id: row.exercise_id,
        set_number: row.set_number,
        weight: Number(row.weight),
        reps: Number(row.reps),
        is_amrap: !!row.is_amrap,
        date,
      });
    }
  }

  const exerciseIds = [...new Set(logs.map((l) => l.exercise_id))];
  const exercises = new Map<string, Exercise>();
  for (let i = 0; i < exerciseIds.length; i += CHUNK) {
    const { data, error } = await supabase
      .from("exercises")
      .select("*")
      .in("id", exerciseIds.slice(i, i + CHUNK));
    if (error) throw error;
    for (const ex of (data ?? []) as Exercise[]) exercises.set(ex.id, ex);
  }

  return { logs, exercises, sessionDates: sessions.map((s) => s.date) };
}

// ─── Selectors ────────────────────────────────────────────────────────────

/** Only exercises the user has actually logged, most-used first. */
export async function getProgressExercises(userId: string): Promise<ProgressExercise[]> {
  const { logs, exercises } = await getHistory(userId);
  const stats = new Map<string, { setCount: number; hasAmrap: boolean }>();
  for (const log of logs) {
    const s = stats.get(log.exercise_id) ?? { setCount: 0, hasAmrap: false };
    s.setCount++;
    s.hasAmrap = s.hasAmrap || log.is_amrap;
    stats.set(log.exercise_id, s);
  }

  return [...stats.entries()]
    .map(([id, s]) => {
      const ex = exercises.get(id);
      return {
        id,
        name: ex?.name ?? "Unknown exercise",
        primaryMuscle: ex?.primary_muscle ?? null,
        setCount: s.setCount,
        hasAmrap: s.hasAmrap,
      };
    })
    .sort((a, b) => b.setCount - a.setCount || a.name.localeCompare(b.name));
}

// ─── 1. Strength ──────────────────────────────────────────────────────────

export async function getStrengthData(
  userId: string,
  exerciseId: string,
): Promise<StrengthViewData> {
  const { logs } = await getHistory(userId);
  const forExercise = logs.filter((l) => l.exercise_id === exerciseId);

  const byDate = new Map<string, { best1RM: number; topWeight: number }>();
  for (const log of forExercise) {
    const entry = byDate.get(log.date) ?? { best1RM: 0, topWeight: 0 };
    entry.best1RM = Math.max(entry.best1RM, epley(log.weight, log.reps));
    entry.topWeight = Math.max(entry.topWeight, log.weight);
    byDate.set(log.date, entry);
  }

  const series = [...byDate.entries()]
    .map(([date, v]) => ({
      date,
      estimated1RM: Math.round(v.best1RM * 10) / 10,
      topSetWeight: v.topWeight,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const today = todayStr();
  const avg = (points: typeof series) =>
    points.length ? points.reduce((s, p) => s + p.estimated1RM, 0) / points.length : 0;
  const last4 = series.filter((p) => p.date >= addDays(today, -28));
  const prev4 = series.filter(
    (p) => p.date >= addDays(today, -56) && p.date < addDays(today, -28),
  );
  const deltaKg = Math.round((avg(last4) - avg(prev4)) * 10) / 10;

  return {
    series,
    callout: {
      allTimeBest: series.length ? Math.max(...series.map((p) => p.estimated1RM)) : 0,
      lastSession: series.length ? series[series.length - 1].estimated1RM : 0,
      trend:
        prev4.length === 0 || deltaKg === 0
          ? { direction: "neutral", deltaKg: 0 }
          : { direction: deltaKg > 0 ? "up" : "down", deltaKg: Math.abs(deltaKg) },
    },
  };
}

// ─── 2. Volume (by muscle group, all exercises) ───────────────────────────

export async function getVolumeData(
  userId: string,
  exerciseId?: string | null,
): Promise<VolumeViewData> {
  const { logs, exercises } = await getHistory(userId);
  const scoped = exerciseId ? logs.filter((l) => l.exercise_id === exerciseId) : logs;

  const byWeek = new Map<string, Map<MuscleGroup, number>>();
  const muscleTotals = new Map<MuscleGroup, number>();

  for (const log of scoped) {
    const week = weekStart(log.date);
    const muscle = (exercises.get(log.exercise_id)?.primary_muscle ?? "other") as MuscleGroup;
    const volume = log.weight * log.reps;
    const weekMap = byWeek.get(week) ?? new Map<MuscleGroup, number>();
    weekMap.set(muscle, (weekMap.get(muscle) ?? 0) + volume);
    byWeek.set(week, weekMap);
    muscleTotals.set(muscle, (muscleTotals.get(muscle) ?? 0) + volume);
  }

  const thisWeek = weekStart(todayStr());
  const series: VolumeDataPoint[] = [...byWeek.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-16)
    .map(([week, muscleMap]) => {
      const byMuscle: Partial<Record<MuscleGroup, number>> = {};
      let total = 0;
      for (const [muscle, volume] of muscleMap) {
        byMuscle[muscle] = Math.round(volume);
        total += volume;
      }
      return {
        weekStart: week,
        label: `${week.slice(8, 10)}/${week.slice(5, 7)}`,
        totalVolume: Math.round(total),
        isCurrentWeek: week === thisWeek,
        byMuscle,
      };
    });

  const last4 = series.slice(-4);
  return {
    series,
    muscles: [...muscleTotals.entries()].sort((a, b) => b[1] - a[1]).map(([m]) => m),
    callout: {
      bestWeek: series.length ? Math.max(...series.map((p) => p.totalVolume)) : 0,
      thisWeek: series.find((p) => p.isCurrentWeek)?.totalVolume ?? 0,
      avgLast4Weeks: last4.length
        ? Math.round(last4.reduce((s, p) => s + p.totalVolume, 0) / last4.length)
        : 0,
    },
  };
}

// ─── 3. Consistency ───────────────────────────────────────────────────────

export async function getConsistencyData(userId: string): Promise<ConsistencyViewData> {
  const { logs, sessionDates } = await getHistory(userId);

  const sessionsPerDate = new Map<string, number>();
  for (const date of sessionDates) {
    sessionsPerDate.set(date, (sessionsPerDate.get(date) ?? 0) + 1);
  }

  // A date is a PR date if any exercise hit a new best weight that day.
  const bestSoFar = new Map<string, number>();
  const prDates = new Set<string>();
  const sortedLogs = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const dailyMax = new Map<string, Map<string, number>>();
  for (const log of sortedLogs) {
    const perDay = dailyMax.get(log.date) ?? new Map<string, number>();
    perDay.set(log.exercise_id, Math.max(perDay.get(log.exercise_id) ?? 0, log.weight));
    dailyMax.set(log.date, perDay);
  }
  for (const date of [...dailyMax.keys()].sort()) {
    for (const [exerciseId, weight] of dailyMax.get(date)!) {
      const prev = bestSoFar.get(exerciseId);
      if (weight > 0 && (prev == null || weight > prev)) {
        bestSoFar.set(exerciseId, weight);
        if (prev != null) prDates.add(date);
      }
    }
  }

  // Trailing 12 weeks, so the grid has a stable shape even early on.
  const WEEKS = 12;
  const current = weekStart(todayStr());
  const weekStarts = Array.from({ length: WEEKS }, (_, i) =>
    addDays(current, -7 * (WEEKS - 1 - i)),
  );

  const cells: ConsistencyCell[] = [];
  weekStarts.forEach((week, weekIndex) => {
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const date = addDays(week, dayOfWeek);
      const count = sessionsPerDate.get(date) ?? 0;
      cells.push({
        weekIndex,
        dayOfWeek,
        date,
        sessionCount: count,
        status: count === 0 ? "empty" : prDates.has(date) ? "pr" : "completed",
      });
    }
  });

  const activeWeeks = new Set(sessionDates.map(weekStart)).size;
  const streaks = computeStreaks(sessionDates);

  return {
    weekStarts,
    cells,
    currentStreak: streaks.current,
    longestStreak: streaks.longest,
    totalSessions: sessionDates.length,
    sessionsPerWeek: activeWeeks
      ? Math.round((sessionDates.length / activeWeeks) * 10) / 10
      : 0,
  };
}

/** Day-of-week labels matching ConsistencyCell.dayOfWeek (0 = Monday). */
export const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"] as const;
export { isoDayOfWeek };

// ─── 4. AMRAP ─────────────────────────────────────────────────────────────

export async function getAmrapData(
  userId: string,
  exerciseId: string,
): Promise<AmrapViewData> {
  const { logs } = await getHistory(userId);
  const amrapLogs = logs.filter((l) => l.exercise_id === exerciseId && l.is_amrap);

  const byDate = new Map<string, { reps: number; weight: number }>();
  for (const log of amrapLogs) {
    const existing = byDate.get(log.date);
    if (!existing || log.reps > existing.reps) {
      byDate.set(log.date, { reps: log.reps, weight: log.weight });
    }
  }

  let runningMax = 0;
  const series = [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => {
      const isNewHigh = v.reps > runningMax;
      if (isNewHigh) runningMax = v.reps;
      return { date, reps: v.reps, weight: v.weight, isNewHigh };
    });

  const last6 = series.slice(-6);
  return {
    series,
    callout: {
      bestAmrap: series.length ? Math.max(...series.map((p) => p.reps)) : 0,
      lastAmrap: series.length ? series[series.length - 1].reps : 0,
      avgLast6Sessions: last6.length
        ? Math.round((last6.reduce((s, p) => s + p.reps, 0) / last6.length) * 10) / 10
        : 0,
    },
  };
}

// ─── 5. Personal bests ────────────────────────────────────────────────────

export async function getPersonalBests(userId: string): Promise<PersonalBestsViewData> {
  const { logs, exercises } = await getHistory(userId);

  const best = new Map<string, { weight: number; reps: number; date: string; e1rm: number }>();
  for (const log of logs) {
    if (log.weight <= 0) continue;
    const e1rm = epley(log.weight, log.reps);
    const existing = best.get(log.exercise_id);
    if (!existing || e1rm > existing.e1rm) {
      best.set(log.exercise_id, { weight: log.weight, reps: log.reps, date: log.date, e1rm });
    }
  }

  const cutoff = addDays(todayStr(), -7);
  const items: PersonalBestRow[] = [...best.entries()]
    .map(([exerciseId, pr]) => ({
      exerciseId,
      exerciseName: exercises.get(exerciseId)?.name ?? "Unknown exercise",
      weight: pr.weight,
      reps: pr.reps,
      estimated1RM: Math.round(pr.e1rm * 10) / 10,
      date: pr.date,
      isNew: pr.date >= cutoff,
    }))
    .sort((a, b) => b.date.localeCompare(a.date) || b.estimated1RM - a.estimated1RM);

  return { items };
}

// ─── Export ───────────────────────────────────────────────────────────────

export async function buildExportData(userId: string) {
  const { logs, exercises, sessionDates } = await getHistory(userId, true);
  const byExercise = new Map<string, LogRow[]>();
  for (const log of logs) {
    const list = byExercise.get(log.exercise_id) ?? [];
    list.push(log);
    byExercise.set(log.exercise_id, list);
  }

  return {
    exportedAt: new Date().toISOString(),
    summary: {
      totalSessions: sessionDates.length,
      totalSetsLogged: logs.length,
      firstSessionDate: sessionDates[0] ?? null,
      lastSessionDate: sessionDates[sessionDates.length - 1] ?? null,
    },
    exercises: [...byExercise.entries()].map(([id, exLogs]) => {
      const ex = exercises.get(id);
      const sorted = [...exLogs].sort(
        (a, b) => a.date.localeCompare(b.date) || a.set_number - b.set_number,
      );
      const dates = [...new Set(sorted.map((l) => l.date))];
      return {
        name: ex?.name ?? "Unknown exercise",
        primaryMuscle: ex?.primary_muscle ?? null,
        equipment: ex?.equipment ?? null,
        totalSets: sorted.length,
        bestWeight: Math.max(...sorted.map((l) => l.weight)),
        sessions: dates.map((date) => ({
          date,
          sets: sorted
            .filter((l) => l.date === date)
            .map((l) => ({
              setNumber: l.set_number,
              weight: l.weight,
              reps: l.reps,
              isAmrap: l.is_amrap,
            })),
        })),
      };
    }),
  };
}
