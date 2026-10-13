import { supabase } from "../supabase";
import { todayStr } from "../dates";
import type {
  ExercisePlan,
  InclineVariant,
  Program,
  ProgramDay,
  ProgramRun,
  ProgramSlot,
  ProgramWeek,
} from "../database.types";
import { decideProgression, type ProgressionSet } from "../programs/progression";
import { accessorySetsForWeek } from "../programs/block1";
import { newId, type SessionSeed } from "./sessions";

/** Untyped access for new program tables until generated types catch up. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export async function getProgramBySlug(slug: string): Promise<Program | null> {
  const { data, error } = await db
    .from("programs")
    .select("*")
    .eq("slug", slug)
    .eq("is_archived", false)
    .maybeSingle();
  if (error) throw error;
  return (data as Program | null) ?? null;
}

export async function getActiveProgramRun(userId: string): Promise<{
  run: ProgramRun;
  program: Program;
  nextDay: number | null;
  completedDaysThisWeek: number[];
} | null> {
  const { data, error } = await db
    .from("program_runs")
    .select("*, programs(*)")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as ProgramRun & { programs: Program };
  const program = row.programs;
  const run: ProgramRun = {
    id: row.id,
    user_id: row.user_id,
    program_id: row.program_id,
    block_number: row.block_number,
    start_date: row.start_date,
    current_week: row.current_week,
    status: row.status,
    incline_variant: row.incline_variant,
    source_run_id: row.source_run_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };

  const { data: done } = await db
    .from("program_run_days")
    .select("day_number")
    .eq("run_id", run.id)
    .eq("week_number", run.current_week)
    .not("completed_at", "is", null);

  const completedDaysThisWeek = ((done ?? []) as { day_number: number }[])
    .map((d) => d.day_number)
    .sort();
  let nextDay: number | null = null;
  for (let d = 1; d <= 4; d++) {
    if (!completedDaysThisWeek.includes(d)) {
      nextDay = d;
      break;
    }
  }

  return { run, program, nextDay, completedDaysThisWeek };
}

export async function startProgramRun(
  userId: string,
  programId: string,
  opts?: { blockNumber?: number; inclineVariant?: InclineVariant; sourceRunId?: string | null },
): Promise<ProgramRun> {
  await db
    .from("program_runs")
    .update({ status: "abandoned", updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("program_id", programId)
    .eq("status", "active");

  const { data, error } = await db
    .from("program_runs")
    .insert({
      user_id: userId,
      program_id: programId,
      block_number: opts?.blockNumber ?? 1,
      start_date: todayStr(),
      current_week: 1,
      status: "active",
      incline_variant: opts?.inclineVariant ?? "barbell",
      source_run_id: opts?.sourceRunId ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as ProgramRun;
}

export async function skipToNextWeek(runId: string): Promise<void> {
  const { data: run, error } = await db
    .from("program_runs")
    .select("*, programs(week_count)")
    .eq("id", runId)
    .single();
  if (error) throw error;
  const weekCount = (run.programs as { week_count: number }).week_count;
  const next = Math.min(weekCount, (run.current_week as number) + 1);
  if (next === run.current_week) return;
  await db
    .from("program_runs")
    .update({ current_week: next, updated_at: new Date().toISOString() })
    .eq("id", runId);
}

export async function maybeAdvanceWeek(runId: string): Promise<boolean> {
  const { data: run, error } = await db
    .from("program_runs")
    .select("*, programs(week_count)")
    .eq("id", runId)
    .single();
  if (error) throw error;

  const { count } = await db
    .from("program_run_days")
    .select("id", { count: "exact", head: true })
    .eq("run_id", runId)
    .eq("week_number", run.current_week)
    .not("completed_at", "is", null);

  if ((count ?? 0) < 4) return false;

  const weekCount = (run.programs as { week_count: number }).week_count;
  if (run.current_week >= weekCount) {
    await db
      .from("program_runs")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", runId);
    return true;
  }

  await db
    .from("program_runs")
    .update({
      current_week: run.current_week + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", runId);
  return true;
}

export async function markProgramDayComplete(
  runId: string,
  weekNumber: number,
  dayNumber: number,
  sessionId: string,
): Promise<void> {
  const { error } = await db.from("program_run_days").upsert(
    {
      run_id: runId,
      week_number: weekNumber,
      day_number: dayNumber,
      session_id: sessionId,
      completed_at: new Date().toISOString(),
    },
    { onConflict: "run_id,week_number,day_number" },
  );
  if (error) throw error;
  await maybeAdvanceWeek(runId);
}

async function lastWorkingSetsForExercise(
  userId: string,
  exerciseId: string,
): Promise<{ sets: ProgressionSet[]; anyPriorWeight: number | null }> {
  const { data: sessions } = await db
    .from("sessions")
    .select("id")
    .eq("user_id", userId)
    .not("completed_at", "is", null)
    .order("date", { ascending: false })
    .limit(40);

  const sessionIds = ((sessions ?? []) as { id: string }[]).map((s) => s.id);
  if (sessionIds.length === 0) return { sets: [], anyPriorWeight: null };

  const { data: logs } = await db
    .from("set_logs")
    .select("session_id, weight, reps, set_type, logged_at")
    .eq("exercise_id", exerciseId)
    .in("session_id", sessionIds)
    .order("logged_at", { ascending: false });

  if (!logs?.length) return { sets: [], anyPriorWeight: null };

  const bySession = new Map<string, ProgressionSet[]>();
  let anyPriorWeight: number | null = null;
  for (const log of logs as {
    session_id: string;
    weight: number;
    reps: number;
    set_type: string | null;
  }[]) {
    const t = (log.set_type ?? "working") as ProgressionSet["setType"];
    if (t === "warmup") continue;
    const w = Number(log.weight);
    anyPriorWeight = anyPriorWeight == null ? w : Math.max(anyPriorWeight, w);
    const list = bySession.get(log.session_id) ?? [];
    list.push({ weight: w, reps: Number(log.reps), setType: t });
    bySession.set(log.session_id, list);
  }

  for (const sid of sessionIds) {
    const sets = bySession.get(sid);
    if (sets?.length) return { sets, anyPriorWeight };
  }
  return { sets: [], anyPriorWeight };
}

async function week3TopWeight(
  userId: string,
  runId: string,
  exerciseId: string,
): Promise<number | null> {
  void userId;
  const { data: days } = await db
    .from("program_run_days")
    .select("session_id")
    .eq("run_id", runId)
    .eq("week_number", 3)
    .not("session_id", "is", null);
  const ids = ((days ?? []) as { session_id: string | null }[])
    .map((d) => d.session_id)
    .filter(Boolean) as string[];
  if (!ids.length) return null;

  const { data: logs } = await db
    .from("set_logs")
    .select("weight, set_type")
    .eq("exercise_id", exerciseId)
    .in("session_id", ids);
  let top: number | null = null;
  for (const log of (logs ?? []) as { weight: number; set_type: string | null }[]) {
    if ((log.set_type ?? "working") === "warmup") continue;
    const w = Number(log.weight);
    top = top == null ? w : Math.max(top, w);
  }
  return top;
}

/**
 * Build a session seed for a program day with progression-computed targets.
 */
export async function buildProgramDaySeed(
  userId: string,
  runId: string,
  dayNumber: number,
  date = todayStr(),
): Promise<
  SessionSeed & {
    programWeekNumber: number;
    programDayNumber: number;
    programRunId: string;
  }
> {
  const { data: runRaw, error: runErr } = await db
    .from("program_runs")
    .select("*, programs(*)")
    .eq("id", runId)
    .eq("user_id", userId)
    .single();
  if (runErr) throw runErr;

  const run = runRaw as ProgramRun & { programs: Program };
  const weekNumber = run.current_week;
  const programId = run.program_id;
  const incline = run.incline_variant;

  const { data: weekRaw } = await db
    .from("program_weeks")
    .select("*")
    .eq("program_id", programId)
    .eq("week_number", weekNumber)
    .single();
  if (!weekRaw) throw new Error("Program week not found");
  const week = weekRaw as ProgramWeek;

  const { data: dayRaw } = await db
    .from("program_days")
    .select("*")
    .eq("program_id", programId)
    .eq("day_number", dayNumber)
    .single();
  if (!dayRaw) throw new Error("Program day not found");
  const day = dayRaw as ProgramDay;

  const { data: slotsRaw } = await db
    .from("program_slots")
    .select("*")
    .eq("program_day_id", day.id)
    .order("position");

  const sessionId = newId();
  const title = `${run.programs.name} · ${day.short_label} ${day.name}`;
  const exercises: (ExercisePlan & {
    id: string;
    program_slot_id: string | null;
    failure_last_set: boolean;
  })[] = [];

  for (const slot of (slotsRaw ?? []) as ProgramSlot[]) {
    const { data: altsRaw } = await db
      .from("program_slot_exercises")
      .select("exercise_id, is_default, position, exercises(name)")
      .eq("slot_id", slot.id)
      .order("position");

    type Alt = {
      exercise_id: string;
      is_default: boolean;
      position: number;
      exercises: { name: string } | null;
    };
    const alts = (altsRaw ?? []) as Alt[];

    let chosen = alts.find((a) => a.is_default) ?? alts[0];
    if (day.day_number === 4 && slot.slot_key === "2" && alts.length) {
      const want =
        incline === "barbell"
          ? (alts.find((a) => (a.exercises?.name ?? "").toLowerCase().includes("barbell")) ??
            alts.find((a) => a.is_default))
          : (alts.find((a) => (a.exercises?.name ?? "").toLowerCase().includes("dumbbell")) ??
            alts.find((a) => a.is_default));
      if (want) chosen = want;
    }
    if (!chosen) continue;

    const { data: ovRaw } = await db
      .from("program_slot_week_overrides")
      .select("*")
      .eq("slot_id", slot.id)
      .eq("week_number", weekNumber)
      .maybeSingle();
    const ov = ovRaw as {
      target_sets: number;
      rep_min: number | null;
      rep_max: number | null;
    } | null;

    let targetSets = ov?.target_sets ?? slot.target_sets;
    if (slot.role === "accessory" && !ov) {
      targetSets = accessorySetsForWeek(slot.target_sets, week.accessory_set_delta);
    }
    const repMin = ov?.rep_min ?? slot.rep_min;
    const repMax = ov?.rep_max ?? slot.rep_max;

    const history = await lastWorkingSetsForExercise(userId, chosen.exercise_id);
    const w3 = week.is_deload
      ? await week3TopWeight(userId, runId, chosen.exercise_id)
      : null;

    const decision = decideProgression({
      lastSessionSets: history.sets,
      repMin,
      repMax,
      incrementKg: Number(slot.increment_kg),
      isDeload: week.is_deload,
      week3TopWeight: w3,
      keepWeight: slot.keep_weight,
      anyPriorWeight: history.anyPriorWeight,
    });

    const targetWeight =
      decision.targetWeight ??
      (decision.kind === "no_history" ? decision.hintWeight : null);

    const failureLast = week.accessory_to_failure_last && slot.role === "accessory";
    const cueParts = [slot.notes, decision.cue].filter(Boolean);

    exercises.push({
      id: newId(),
      exercise_id: chosen.exercise_id,
      position: slot.position,
      target_sets: targetSets,
      rep_range_low: repMin,
      rep_range_high: repMax,
      target_weight: targetWeight,
      rest_seconds: slot.rest_seconds,
      amrap_last_set: failureLast,
      notes: cueParts.join(" · ") || null,
      role: slot.role,
      slot_key: slot.slot_key,
      superset_group: slot.superset_group,
      superset_order: slot.superset_order,
      increment_kg: Number(slot.increment_kg),
      keep_weight: slot.keep_weight,
      unilateral: slot.unilateral,
      rir_label: slot.role === "main" ? week.main_rir_label : week.is_deload ? "4" : "1–2",
      program_slot_id: slot.id,
      failure_last_set: failureLast,
    });
  }

  return {
    id: sessionId,
    userId,
    date,
    templateId: day.template_id,
    title,
    exercises,
    programWeekNumber: weekNumber,
    programDayNumber: dayNumber,
    programRunId: runId,
  };
}
