/**
 * Idempotent seed for Hypertrophy Block 1.
 *
 * Prerequisites: run migration 20261013120000_programs.sql first.
 * Usage: npm run seed:block1
 *
 * Prints an exercise-matching report (matched / created / aliases) and
 * suspect set_logs (e.g. calf raises with absurd reps). Does NOT merge
 * or delete exercises or historical logs.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  accessorySetsForWeek,
  HYPERTROPHY_BLOCK1,
  type ProgramSlotDef,
} from "../src/lib/programs/block1";

function loadEnv(): Record<string, string> {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  const env: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

const env = loadEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

interface ExRow {
  id: string;
  name: string;
  owner_id: string | null;
  primary_muscle: string | null;
  equipment: string | null;
  is_archived: boolean;
}

const matchReport: { slot: string; chosen: string; via: string; id: string }[] = [];
const created: string[] = [];
const missing: string[] = [];

async function loadExercises(): Promise<ExRow[]> {
  const { data, error } = await supabase
    .from("exercises")
    .select("id, name, owner_id, primary_muscle, equipment, is_archived")
    .eq("is_archived", false);
  if (error) throw error;
  return (data ?? []) as ExRow[];
}

function findByNames(pool: ExRow[], names: string[]): ExRow | undefined {
  for (const name of names) {
    const hit = pool.find((e) => e.name.toLowerCase() === name.toLowerCase());
    if (hit) return hit;
  }
  return undefined;
}

/** Prefer global seed, then user row with most historical affinity via name match. */
async function resolveExercise(
  pool: ExRow[],
  preferred: string,
  aliases: string[] = [],
): Promise<ExRow | null> {
  const names = [preferred, ...aliases];
  const candidates = names
    .map((n) => pool.filter((e) => e.name.toLowerCase() === n.toLowerCase()))
    .flat();
  if (candidates.length === 0) return null;

  // Prefer global (owner_id null), then exact preferred name.
  const globalPreferred = candidates.find(
    (e) => !e.owner_id && e.name.toLowerCase() === preferred.toLowerCase(),
  );
  if (globalPreferred) return globalPreferred;

  const anyPreferred = candidates.find((e) => e.name.toLowerCase() === preferred.toLowerCase());
  if (anyPreferred) return anyPreferred;

  const globalAlias = candidates.find((e) => !e.owner_id);
  return globalAlias ?? candidates[0];
}

async function ensureExercise(
  pool: ExRow[],
  name: string,
  meta: { primary_muscle: string; equipment: string },
): Promise<ExRow> {
  const existing = findByNames(pool, [name]);
  if (existing) return existing;
  const { data, error } = await supabase
    .from("exercises")
    .insert({
      name,
      owner_id: null,
      source: "seed",
      primary_muscle: meta.primary_muscle,
      equipment: meta.equipment,
      secondary_muscles: [],
    })
    .select("id, name, owner_id, primary_muscle, equipment, is_archived")
    .single();
  if (error) throw error;
  created.push(name);
  pool.push(data as ExRow);
  return data as ExRow;
}

const CREATE_META: Record<string, { primary_muscle: string; equipment: string }> = {
  "Incline Barbell Press": { primary_muscle: "chest", equipment: "barbell" },
  "Pull-Up": { primary_muscle: "back", equipment: "bodyweight" },
  "Overhand Lat Pulldown": { primary_muscle: "back", equipment: "cable" },
  "Incline Dumbbell Curl": { primary_muscle: "biceps", equipment: "dumbbell" },
  "Cable Crunch": { primary_muscle: "core", equipment: "cable" },
};

async function main() {
  const def = HYPERTROPHY_BLOCK1;
  let pool = await loadExercises();

  // Ensure create-list exists
  for (const [name, meta] of Object.entries(CREATE_META)) {
    await ensureExercise(pool, name, meta);
  }
  pool = await loadExercises();

  // Upsert program
  const { data: existingProgram } = await supabase
    .from("programs")
    .select("id")
    .eq("slug", def.slug)
    .maybeSingle();

  let programId = existingProgram?.id as string | undefined;
  if (!programId) {
    const { data, error } = await supabase
      .from("programs")
      .insert({
        slug: def.slug,
        name: def.name,
        description: def.description,
        week_count: def.weekCount,
        is_starter: true,
      })
      .select("id")
      .single();
    if (error) throw error;
    programId = data.id;
  } else {
    await supabase
      .from("programs")
      .update({
        name: def.name,
        description: def.description,
        week_count: def.weekCount,
        is_starter: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", programId);
  }

  // Weeks
  for (const w of def.weeks) {
    const { data: ew } = await supabase
      .from("program_weeks")
      .select("id")
      .eq("program_id", programId)
      .eq("week_number", w.weekNumber)
      .maybeSingle();
    const row = {
      program_id: programId,
      week_number: w.weekNumber,
      is_deload: w.isDeload,
      main_rir_label: w.mainRirLabel,
      accessory_to_failure_last: w.accessoryToFailureLast,
      accessory_set_delta: w.accessorySetDelta,
      notes: w.notes ?? null,
    };
    if (ew?.id) {
      await supabase.from("program_weeks").update(row).eq("id", ew.id);
    } else {
      await supabase.from("program_weeks").insert(row);
    }
  }

  // Days + slots + templates
  for (const day of def.days) {
    const templateName = `${def.name} · ${day.shortLabel} ${day.name}`;

    let templateId: string | undefined;
    const { data: et } = await supabase
      .from("templates")
      .select("id")
      .eq("name", templateName)
      .is("user_id", null)
      .eq("is_starter", true)
      .maybeSingle();

    if (et?.id) {
      templateId = et.id;
      await supabase
        .from("templates")
        .update({
          emoji: day.emoji,
          color: day.color,
          program_id: programId,
          is_superseded: false,
          position: 20 + day.dayNumber,
        })
        .eq("id", templateId);
    } else {
      const { data: createdTpl, error } = await supabase
        .from("templates")
        .insert({
          user_id: null,
          name: templateName,
          emoji: day.emoji,
          color: day.color,
          position: 20 + day.dayNumber,
          is_starter: true,
          program_id: programId,
          is_superseded: false,
        })
        .select("id")
        .single();
      if (error) throw error;
      templateId = createdTpl.id;
    }

    // Replace template_exercises for week-1 baseline
    await supabase.from("template_exercises").delete().eq("template_id", templateId);

    const { data: ed } = await supabase
      .from("program_days")
      .select("id")
      .eq("program_id", programId)
      .eq("day_number", day.dayNumber)
      .maybeSingle();

    let dayId = ed?.id as string | undefined;
    const dayRow = {
      program_id: programId,
      day_number: day.dayNumber,
      name: day.name,
      short_label: day.shortLabel,
      emoji: day.emoji,
      estimated_minutes: day.estimatedMinutes,
      template_id: templateId,
    };
    if (dayId) {
      await supabase.from("program_days").update(dayRow).eq("id", dayId);
    } else {
      const { data: createdDay, error } = await supabase
        .from("program_days")
        .insert(dayRow)
        .select("id")
        .single();
      if (error) throw error;
      dayId = createdDay.id;
    }

    // Clear slots for day (cascade clears slot exercises / overrides)
    const { data: oldSlots } = await supabase
      .from("program_slots")
      .select("id")
      .eq("program_day_id", dayId);
    if (oldSlots?.length) {
      await supabase
        .from("program_slots")
        .delete()
        .in(
          "id",
          oldSlots.map((s) => s.id),
        );
    }

    const week1 = def.weeks.find((w) => w.weekNumber === 1)!;
    const templateExerciseRows: Record<string, unknown>[] = [];

    for (const slot of day.slots) {
      const slotId = await insertSlot(dayId!, slot, pool, `${day.shortLabel} ${slot.slotKey}`);

      // Week overrides
      if (slot.weekOverrides) {
        for (const [wk, ov] of Object.entries(slot.weekOverrides)) {
          if (!ov) continue;
          await supabase.from("program_slot_week_overrides").upsert({
            slot_id: slotId,
            week_number: Number(wk),
            target_sets: ov.targetSets ?? slot.targetSets,
            rep_min: ov.repMin ?? slot.repMin,
            rep_max: ov.repMax ?? slot.repMax,
          });
        }
      } else {
        // Accessory deload: sets - 1
        for (const w of def.weeks) {
          if (w.accessorySetDelta === 0 && !slot.weekOverrides) continue;
          if (slot.role !== "accessory") continue;
          await supabase.from("program_slot_week_overrides").upsert({
            slot_id: slotId,
            week_number: w.weekNumber,
            target_sets: accessorySetsForWeek(slot.targetSets, w.accessorySetDelta),
            rep_min: slot.repMin,
            rep_max: slot.repMax,
          });
        }
      }

      const defaultEx = slot.exercises.find((e) => e.isDefault) ?? slot.exercises[0];
      const resolved = await resolveExercise(pool, defaultEx.name, defaultEx.aliases ?? []);
      if (!resolved) {
        missing.push(defaultEx.name);
        continue;
      }

      const sets =
        slot.role === "accessory"
          ? accessorySetsForWeek(slot.targetSets, week1.accessorySetDelta)
          : (slot.weekOverrides?.[1]?.targetSets ?? slot.targetSets);

      templateExerciseRows.push({
        template_id: templateId,
        exercise_id: resolved.id,
        position: slot.position,
        target_sets: sets,
        rep_range_low: slot.repMin,
        rep_range_high: slot.repMax,
        target_weight: null,
        rest_seconds: slot.restSeconds,
        amrap_last_set: false,
        notes: slot.notes ?? null,
        role: slot.role,
        slot_key: slot.slotKey,
        superset_group: slot.supersetGroup ?? null,
        superset_order: slot.supersetOrder ?? null,
        increment_kg: slot.incrementKg ?? 2.5,
        keep_weight: slot.keepWeight ?? false,
        unilateral: slot.unilateral ?? false,
        rir_label: week1.mainRirLabel,
      });
    }

    if (templateExerciseRows.length) {
      const { error } = await supabase.from("template_exercises").insert(templateExerciseRows);
      if (error) throw error;
    }

    // Personal copies for users who already train
    const { data: users } = await supabase.from("sessions").select("user_id");
    const userIds = [...new Set((users ?? []).map((u) => u.user_id as string))];
    for (const userId of userIds) {
      const personalName = templateName;
      const { data: existingPersonal } = await supabase
        .from("templates")
        .select("id")
        .eq("user_id", userId)
        .eq("name", personalName)
        .maybeSingle();
      if (existingPersonal?.id) continue;

      const { data: copy, error } = await supabase
        .from("templates")
        .insert({
          user_id: userId,
          name: personalName,
          emoji: day.emoji,
          color: day.color,
          position: 20 + day.dayNumber,
          is_starter: false,
          program_id: programId,
          source_template_id: templateId,
        })
        .select("id")
        .single();
      if (error) throw error;

      const rows = templateExerciseRows.map((r) => ({
        ...r,
        template_id: copy.id,
      }));
      if (rows.length) {
        await supabase.from("template_exercises").insert(rows);
      }
    }
  }

  // Mark J&T superseded
  await supabase
    .from("templates")
    .update({ is_superseded: true })
    .in("name", [
      "J&T · Squat Day",
      "J&T · Bench Day",
      "J&T · Deadlift Day",
      "J&T · OHP Day",
    ]);

  // Suspect data scan
  const { data: calf } = await supabase
    .from("exercises")
    .select("id, name")
    .ilike("name", "%calf%");
  const suspect: { exercise: string; reps: number; weight: number; logged_at: string }[] = [];
  for (const ex of calf ?? []) {
    const { data: logs } = await supabase
      .from("set_logs")
      .select("reps, weight, logged_at")
      .eq("exercise_id", ex.id)
      .gte("reps", 50);
    for (const l of logs ?? []) {
      suspect.push({
        exercise: ex.name,
        reps: Number(l.reps),
        weight: Number(l.weight),
        logged_at: l.logged_at,
      });
    }
  }

  console.log("\n══ Hypertrophy Block 1 seed complete ══");
  console.log(`Program id: ${programId}`);
  console.log("\n— Exercise matches —");
  for (const m of matchReport) {
    console.log(`  ${m.slot.padEnd(12)} → ${m.chosen} (${m.via})`);
  }
  if (created.length) {
    console.log("\n— Created —");
    created.forEach((n) => console.log(`  + ${n}`));
  }
  if (missing.length) {
    console.log("\n— MISSING (failed to resolve) —");
    missing.forEach((n) => console.log(`  ! ${n}`));
  }
  console.log("\n— Suspect set_logs (not auto-fixed) —");
  if (suspect.length === 0) console.log("  (none)");
  else suspect.forEach((s) => console.log(`  ${s.exercise}: ${s.reps} reps @ ${s.weight} on ${s.logged_at}`));
  console.log("\nJ&T templates marked is_superseded=true (kept).");
}

async function insertSlot(
  dayId: string,
  slot: ProgramSlotDef,
  pool: ExRow[],
  label: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("program_slots")
    .insert({
      program_day_id: dayId,
      position: slot.position,
      slot_key: slot.slotKey,
      role: slot.role,
      main_lift_key: slot.mainLiftKey ?? null,
      superset_group: slot.supersetGroup ?? null,
      superset_order: slot.supersetOrder ?? null,
      target_sets: slot.targetSets,
      rep_min: slot.repMin,
      rep_max: slot.repMax,
      rest_seconds: slot.restSeconds,
      increment_kg: slot.incrementKg ?? 2.5,
      keep_weight: slot.keepWeight ?? false,
      unilateral: slot.unilateral ?? false,
      notes: slot.notes ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  const slotId = data.id as string;

  let pos = 0;
  for (const ref of slot.exercises) {
    let resolved = await resolveExercise(pool, ref.name, ref.aliases ?? []);
    if (!resolved && CREATE_META[ref.name]) {
      resolved = await ensureExercise(pool, ref.name, CREATE_META[ref.name]);
    }
    if (!resolved) {
      missing.push(ref.name);
      continue;
    }
    const via =
      resolved.name.toLowerCase() === ref.name.toLowerCase()
        ? "exact"
        : `alias→${resolved.name}`;
    matchReport.push({
      slot: label,
      chosen: resolved.name,
      via: ref.isDefault ? `default/${via}` : `alt/${via}`,
      id: resolved.id,
    });
    await supabase.from("program_slot_exercises").upsert({
      slot_id: slotId,
      exercise_id: resolved.id,
      is_default: Boolean(ref.isDefault),
      position: pos++,
    });
  }

  return slotId;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
