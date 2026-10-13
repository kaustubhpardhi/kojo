/**
 * Hypertrophy Block 1 — source of truth for the 4-week program.
 * Seed scripts and runtime resolve this into DB rows / session snapshots.
 */

export type SlotRole = "main" | "accessory";
export type MainLiftKey = "squat" | "bench" | "ohp" | "deadlift";

export interface SlotExerciseRef {
  /** Preferred library name (matched case-insensitively). */
  name: string;
  /** Fallback names tried in order if preferred is missing. */
  aliases?: string[];
  isDefault?: boolean;
}

export interface ProgramSlotDef {
  slotKey: string;
  role: SlotRole;
  mainLiftKey?: MainLiftKey;
  position: number;
  targetSets: number;
  repMin: number;
  repMax: number;
  restSeconds: number;
  incrementKg?: number;
  keepWeight?: boolean;
  unilateral?: boolean;
  supersetGroup?: string;
  /** 0 = A, 1 = B within the group. */
  supersetOrder?: number;
  notes?: string;
  exercises: SlotExerciseRef[];
  /** Per-week set/rep overrides (main lifts + deload accessories). */
  weekOverrides?: Partial<
    Record<number, { targetSets?: number; repMin?: number; repMax?: number }>
  >;
}

export interface ProgramDayDef {
  dayNumber: number;
  name: string;
  shortLabel: string;
  emoji: string;
  estimatedMinutes: number;
  color: string;
  slots: ProgramSlotDef[];
}

export interface ProgramWeekDef {
  weekNumber: number;
  isDeload: boolean;
  mainRirLabel: string;
  accessoryToFailureLast: boolean;
  accessorySetDelta: number;
  notes?: string;
}

export interface ProgramDef {
  slug: string;
  name: string;
  description: string;
  weekCount: number;
  weeks: ProgramWeekDef[];
  days: ProgramDayDef[];
}

const MAIN_W123 = { targetSets: 3 as const };
const MAIN_W4 = { targetSets: 2 as const };

export const HYPERTROPHY_BLOCK1: ProgramDef = {
  slug: "hypertrophy-block-1",
  name: "Hypertrophy Block 1",
  description:
    "4-week hypertrophy block. Weeks 1–3 build (RIR 3 → 1–2); week 4 deload. Keep sessions under 60 minutes.",
  weekCount: 4,
  weeks: [
    {
      weekNumber: 1,
      isDeload: false,
      mainRirLabel: "3",
      accessoryToFailureLast: false,
      accessorySetDelta: 0,
      notes: "Pick main-lift weights that finish the range with ~3 reps in reserve.",
    },
    {
      weekNumber: 2,
      isDeload: false,
      mainRirLabel: "2",
      accessoryToFailureLast: false,
      accessorySetDelta: 0,
      notes: "Add weight once every working set hits the top of the rep range.",
    },
    {
      weekNumber: 3,
      isDeload: false,
      mainRirLabel: "1–2",
      accessoryToFailureLast: true,
      accessorySetDelta: 0,
      notes: "Last accessory set to failure. Never to failure on squat, deadlift, or OHP.",
    },
    {
      weekNumber: 4,
      isDeload: true,
      mainRirLabel: "4",
      accessoryToFailureLast: false,
      accessorySetDelta: -1,
      notes: "Deload — about 10% lighter than week 3. One fewer accessory set.",
    },
  ],
  days: [
    {
      dayNumber: 1,
      name: "Lower A",
      shortLabel: "Day 1",
      emoji: "🦵",
      estimatedMinutes: 50,
      color: "matcha",
      slots: [
        {
          slotKey: "1",
          role: "main",
          mainLiftKey: "squat",
          position: 0,
          targetSets: 3,
          repMin: 6,
          repMax: 8,
          restSeconds: 150,
          notes: "Ramp-up sets on this lift only (2–3). Stop with listed RIR — never to failure.",
          exercises: [{ name: "Barbell Back Squat", isDefault: true }],
          weekOverrides: { 1: MAIN_W123, 2: MAIN_W123, 3: MAIN_W123, 4: MAIN_W4 },
        },
        {
          slotKey: "2",
          role: "accessory",
          position: 1,
          targetSets: 3,
          repMin: 10,
          repMax: 12,
          restSeconds: 90,
          notes: "One light warm-up set is enough. Stop 1–2 reps short of failure.",
          exercises: [{ name: "Leg Press", isDefault: true }],
        },
        {
          slotKey: "3",
          role: "accessory",
          position: 2,
          targetSets: 3,
          repMin: 8,
          repMax: 10,
          restSeconds: 120,
          notes: "Hinge — soft knees, bar close, feel hamstrings.",
          exercises: [{ name: "Romanian Deadlift", isDefault: true }],
        },
        {
          slotKey: "4a",
          role: "accessory",
          position: 3,
          targetSets: 4,
          repMin: 15,
          repMax: 20,
          restSeconds: 45,
          keepWeight: true,
          supersetGroup: "4",
          supersetOrder: 0,
          notes: "Superset with standing calf raise. Prefer more reps over big load jumps.",
          exercises: [{ name: "Cable Lateral Raises", isDefault: true }],
        },
        {
          slotKey: "4b",
          role: "accessory",
          position: 4,
          targetSets: 4,
          repMin: 10,
          repMax: 15,
          restSeconds: 45,
          supersetGroup: "4",
          supersetOrder: 1,
          notes: "Full stretch at the bottom. Rest starts after this set.",
          exercises: [{ name: "Standing Calf Raises", isDefault: true }],
        },
        {
          slotKey: "5",
          role: "accessory",
          position: 5,
          targetSets: 3,
          repMin: 10,
          repMax: 15,
          restSeconds: 60,
          notes: "Controlled tempo; avoid swinging.",
          exercises: [{ name: "Hanging Leg Raises", isDefault: true }],
        },
      ],
    },
    {
      dayNumber: 2,
      name: "Upper A",
      shortLabel: "Day 2",
      emoji: "💪",
      estimatedMinutes: 50,
      color: "sunrise",
      slots: [
        {
          slotKey: "1",
          role: "main",
          mainLiftKey: "bench",
          position: 0,
          targetSets: 3,
          repMin: 6,
          repMax: 8,
          restSeconds: 150,
          notes: "Ramp-up on this lift only. Plant feet, controlled descent. Never to failure.",
          exercises: [{ name: "Flat Barbell Bench Press", isDefault: true }],
          weekOverrides: { 1: MAIN_W123, 2: MAIN_W123, 3: MAIN_W123, 4: MAIN_W4 },
        },
        {
          slotKey: "2",
          role: "accessory",
          position: 1,
          targetSets: 3,
          repMin: 8,
          repMax: 12,
          restSeconds: 90,
          notes: "~30° incline. Stop 1–2 reps short of failure.",
          exercises: [
            {
              name: "Incline Dumbbell Press (30–45°)",
              aliases: ["Incline Bench Press - Dumbbell"],
              isDefault: true,
            },
          ],
        },
        {
          slotKey: "3",
          role: "accessory",
          position: 2,
          targetSets: 3,
          repMin: 8,
          repMax: 12,
          restSeconds: 90,
          notes: "Chest support — no torso swing.",
          exercises: [{ name: "Chest-Supported Row", isDefault: true }],
        },
        {
          slotKey: "4a",
          role: "accessory",
          position: 3,
          targetSets: 3,
          repMin: 15,
          repMax: 20,
          restSeconds: 45,
          keepWeight: true,
          supersetGroup: "4",
          supersetOrder: 0,
          notes: "Superset with face pulls.",
          exercises: [{ name: "Cable Lateral Raises", isDefault: true }],
        },
        {
          slotKey: "4b",
          role: "accessory",
          position: 4,
          targetSets: 3,
          repMin: 15,
          repMax: 20,
          restSeconds: 45,
          keepWeight: true,
          supersetGroup: "4",
          supersetOrder: 1,
          notes: "High cable, externally rotate at the finish. Rest after this set.",
          exercises: [{ name: "Face Pulls (High Cable)", isDefault: true }],
        },
        {
          slotKey: "5a",
          role: "accessory",
          position: 5,
          targetSets: 4,
          repMin: 10,
          repMax: 12,
          restSeconds: 45,
          keepWeight: true,
          supersetGroup: "5",
          supersetOrder: 0,
          notes: "Superset with overhead triceps extension.",
          exercises: [
            {
              name: "Incline Dumbbell Curl",
              aliases: ["Incline dumbbell curl"],
              isDefault: true,
            },
          ],
        },
        {
          slotKey: "5b",
          role: "accessory",
          position: 6,
          targetSets: 4,
          repMin: 10,
          repMax: 12,
          restSeconds: 45,
          keepWeight: true,
          supersetGroup: "5",
          supersetOrder: 1,
          notes: "Cable or dumbbell. Rest after this set.",
          exercises: [
            {
              name: "Overhead Triceps Extension",
              aliases: ["Tricep Extension"],
              isDefault: true,
            },
            { name: "Cable Pushdown", aliases: ["Triceps Pushdown"] },
          ],
        },
      ],
    },
    {
      dayNumber: 3,
      name: "Lower B",
      shortLabel: "Day 3",
      emoji: "🧱",
      estimatedMinutes: 55,
      color: "grape",
      slots: [
        {
          slotKey: "1",
          role: "main",
          mainLiftKey: "deadlift",
          position: 0,
          targetSets: 3,
          repMin: 5,
          repMax: 6,
          restSeconds: 180,
          notes: "Ramp-up on this lift only. Brace hard. Never to failure.",
          exercises: [{ name: "Conventional Deadlift", isDefault: true }],
          weekOverrides: {
            1: { targetSets: 3, repMin: 5, repMax: 6 },
            2: { targetSets: 3, repMin: 5, repMax: 6 },
            3: { targetSets: 3, repMin: 5, repMax: 6 },
            4: { targetSets: 2, repMin: 5, repMax: 6 },
          },
        },
        {
          slotKey: "2",
          role: "accessory",
          position: 1,
          targetSets: 3,
          repMin: 8,
          repMax: 10,
          restSeconds: 90,
          notes: "Pull-up or overhand lat pulldown — pick one and stick with it for the block.",
          exercises: [
            {
              name: "Weighted Pull-Ups / Lat Pulldown",
              isDefault: true,
            },
            { name: "Pull-Up" },
            { name: "Overhand Lat Pulldown" },
          ],
        },
        {
          slotKey: "3",
          role: "accessory",
          position: 2,
          targetSets: 3,
          repMin: 8,
          repMax: 10,
          restSeconds: 90,
          unilateral: true,
          notes: "Reps are per leg. Same weight both sides.",
          exercises: [{ name: "Bulgarian Split Squat", isDefault: true }],
        },
        {
          slotKey: "4a",
          role: "accessory",
          position: 3,
          targetSets: 3,
          repMin: 15,
          repMax: 20,
          restSeconds: 45,
          keepWeight: true,
          supersetGroup: "4",
          supersetOrder: 0,
          notes: "Superset with seated calf raise.",
          exercises: [{ name: "Cable Lateral Raises", isDefault: true }],
        },
        {
          slotKey: "4b",
          role: "accessory",
          position: 4,
          targetSets: 3,
          repMin: 12,
          repMax: 15,
          restSeconds: 45,
          supersetGroup: "4",
          supersetOrder: 1,
          notes: "Rest starts after this set.",
          exercises: [{ name: "Seated Calf Raises", isDefault: true }],
        },
        {
          slotKey: "5",
          role: "accessory",
          position: 5,
          targetSets: 3,
          repMin: 10,
          repMax: 15,
          restSeconds: 60,
          notes: "Squeeze at the bottom; don’t yank the stack.",
          exercises: [
            {
              name: "Weighted Cable Crunches",
              aliases: ["Cable Crunch"],
              isDefault: true,
            },
          ],
        },
      ],
    },
    {
      dayNumber: 4,
      name: "Upper B",
      shortLabel: "Day 4",
      emoji: "⚡",
      estimatedMinutes: 50,
      color: "sunrise",
      slots: [
        {
          slotKey: "1",
          role: "main",
          mainLiftKey: "ohp",
          position: 0,
          targetSets: 3,
          repMin: 6,
          repMax: 8,
          restSeconds: 150,
          notes: "Ramp-up on this lift only. Glutes tight, slight lean. Never to failure.",
          exercises: [{ name: "Barbell Overhead Press", isDefault: true }],
          weekOverrides: { 1: MAIN_W123, 2: MAIN_W123, 3: MAIN_W123, 4: MAIN_W4 },
        },
        {
          slotKey: "2",
          role: "accessory",
          position: 1,
          targetSets: 3,
          repMin: 8,
          repMax: 12,
          restSeconds: 90,
          notes:
            "Block 1 default: barbell. Each new block swaps barbell ↔ dumbbell.",
          exercises: [
            { name: "Incline Barbell Press", isDefault: true },
            {
              name: "Incline Dumbbell Press (30–45°)",
              aliases: ["Incline Bench Press - Dumbbell"],
            },
          ],
        },
        {
          slotKey: "3",
          role: "accessory",
          position: 2,
          targetSets: 3,
          repMin: 10,
          repMax: 12,
          restSeconds: 90,
          notes: "Underhand grip — elbows track toward the body.",
          exercises: [{ name: "Underhand Lat Pulldown", isDefault: true }],
        },
        {
          slotKey: "4",
          role: "accessory",
          position: 3,
          targetSets: 3,
          repMin: 12,
          repMax: 15,
          restSeconds: 45,
          keepWeight: true,
          notes: "Low-to-high path; soft elbows.",
          exercises: [
            {
              name: "Cable Chest Fly (Low to High)",
              aliases: ["Low-to-High Cable Fly"],
              isDefault: true,
            },
          ],
        },
        {
          slotKey: "5a",
          role: "accessory",
          position: 4,
          targetSets: 4,
          repMin: 10,
          repMax: 12,
          restSeconds: 45,
          keepWeight: true,
          supersetGroup: "5",
          supersetOrder: 0,
          notes: "Superset with triceps pushdown.",
          exercises: [{ name: "Hammer Curl", isDefault: true }],
        },
        {
          slotKey: "5b",
          role: "accessory",
          position: 5,
          targetSets: 4,
          repMin: 10,
          repMax: 12,
          restSeconds: 45,
          keepWeight: true,
          supersetGroup: "5",
          supersetOrder: 1,
          notes: "Rest after this set.",
          exercises: [
            {
              name: "Cable Pushdown",
              aliases: ["Triceps Pushdown", "Tricep Extension"],
              isDefault: true,
            },
          ],
        },
      ],
    },
  ],
};

/** Accessory set count for a week (deload = listed minus 1, minimum 1). */
export function accessorySetsForWeek(baseSets: number, accessorySetDelta: number): number {
  return Math.max(1, baseSets + accessorySetDelta);
}
