/**
 * Seeds Jacked & Tan Block 1 (Week 3 prescription) into Supabase.
 * Uses the service role from .env.local. Idempotent by template name.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

const env = loadEnv();
const BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;

async function api(path, { method = "GET", body, prefer } = {}) {
  const res = await fetch(`${BASE}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      Prefer: prefer ?? (method === "POST" ? "return=representation" : ""),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`${method} ${path}: ${JSON.stringify(data)}`);
  return data;
}

const LIBRARY = [
  { name: "Barbell Back Squat", primary_muscle: "quads", equipment: "barbell" },
  { name: "Romanian Deadlift", primary_muscle: "hamstrings", equipment: "barbell", notes: "Barbell or dumbbells" },
  { name: "Leg Press", primary_muscle: "quads", equipment: "machine" },
  { name: "Leg Extension", primary_muscle: "quads", equipment: "machine" },
  { name: "Standing Calf Raises", primary_muscle: "calves", equipment: "machine" },
  { name: "Flat Barbell Bench Press", primary_muscle: "chest", equipment: "barbell" },
  { name: "Incline Dumbbell Press (30–45°)", primary_muscle: "chest", equipment: "dumbbell" },
  { name: "Chest-Supported Row", primary_muscle: "back", equipment: "machine" },
  { name: "Cable Lateral Raises", primary_muscle: "shoulders", equipment: "cable" },
  { name: "Tricep Extension", primary_muscle: "triceps", equipment: "cable" },
  { name: "Conventional Deadlift", primary_muscle: "back", equipment: "barbell", notes: "Adjust by feel / form" },
  { name: "Front Squat", primary_muscle: "quads", equipment: "barbell", notes: "Or pause squat" },
  { name: "Weighted Pull-Ups / Lat Pulldown", primary_muscle: "back", equipment: "cable" },
  { name: "Lying Leg Curl", primary_muscle: "hamstrings", equipment: "machine" },
  { name: "Ab Work", primary_muscle: "core", equipment: "bodyweight", notes: "Plank, cable crunch, or hanging raise" },
  { name: "Barbell Overhead Press", primary_muscle: "shoulders", equipment: "barbell" },
  { name: "Push Press", primary_muscle: "shoulders", equipment: "barbell", notes: "Or incline bench" },
  { name: "Underhand Lat Pulldown", primary_muscle: "back", equipment: "cable" },
  { name: "Dumbbell Curl", primary_muscle: "biceps", equipment: "dumbbell" },
  { name: "Face Pulls (High Cable)", primary_muscle: "shoulders", equipment: "cable" },
];

const DAYS = [
  {
    name: "J&T · Squat Day",
    emoji: "🦵",
    color: "matcha",
    exercises: [
      ["Barbell Back Squat", 5, 3, 3, 120, true, "T1 · Week 3 Block 1 — your working weight"],
      ["Romanian Deadlift", 3, 8, 8, 90, false, "T2 · Barbell or DB"],
      ["Leg Press", 3, 10, 10, 90, false, "T2b"],
      ["Leg Extension", 3, 14, 14, 60, false, "T3 · Week 3 of 12→15"],
      ["Standing Calf Raises", 4, 15, 15, 60, false, "T3"],
    ],
  },
  {
    name: "J&T · Bench Day",
    emoji: "💪",
    color: "sunrise",
    exercises: [
      ["Flat Barbell Bench Press", 5, 3, 3, 120, true, "T1 · Week 3 Block 1 — your working weight"],
      ["Incline Dumbbell Press (30–45°)", 3, 8, 8, 90, false, "T2"],
      ["Chest-Supported Row", 3, 10, 10, 90, false, "T2b"],
      ["Cable Lateral Raises", 3, 15, 15, 60, false, "T3"],
      ["Tricep Extension", 3, 14, 14, 60, false, "T3 · Week 3 of 12→15"],
    ],
  },
  {
    name: "J&T · Deadlift Day",
    emoji: "🧱",
    color: "grape",
    exercises: [
      ["Conventional Deadlift", 5, 3, 3, 120, true, "T1 · Week 3 — adjust by feel / form"],
      ["Front Squat", 3, 8, 8, 90, false, "T2 · Or pause squat"],
      ["Weighted Pull-Ups / Lat Pulldown", 3, 10, 10, 90, false, "T2b"],
      ["Lying Leg Curl", 3, 14, 14, 60, false, "T3 · Week 3 of 12→15"],
      ["Ab Work", 3, 15, 15, 60, false, "T3"],
    ],
  },
  {
    name: "J&T · OHP Day",
    emoji: "⚡",
    color: "sunrise",
    exercises: [
      ["Barbell Overhead Press", 5, 3, 3, 120, true, "T1 · Week 3 Block 1 — your working weight"],
      ["Push Press", 3, 8, 8, 90, false, "T2 · Or incline bench"],
      ["Underhand Lat Pulldown", 3, 10, 10, 90, false, "T2b"],
      ["Dumbbell Curl", 3, 14, 14, 60, false, "T3 · Week 3 of 12→15"],
      ["Face Pulls (High Cable)", 3, 15, 15, 60, false, "T3"],
    ],
  },
];

async function ensureExercise(def) {
  const existing = await api(
    `exercises?select=id,merged_into_id&name=eq.${encodeURIComponent(def.name)}&owner_id=is.null&is_archived=eq.false&limit=1`,
  );
  if (existing[0]) return existing[0].merged_into_id ?? existing[0].id;

  const created = await api("exercises", {
    method: "POST",
    body: {
      name: def.name,
      owner_id: null,
      source: "seed",
      primary_muscle: def.primary_muscle,
      equipment: def.equipment,
      notes: def.notes ?? null,
      secondary_muscles: [],
    },
  });
  return created[0].id;
}

async function ensureTemplate({ userId, isStarter, name, emoji, color, position, exerciseIds, plans }) {
  const filter = isStarter
    ? `templates?select=id&is_starter=eq.true&user_id=is.null&name=eq.${encodeURIComponent(name)}&limit=1`
    : `templates?select=id&user_id=eq.${userId}&name=eq.${encodeURIComponent(name)}&is_archived=eq.false&limit=1`;
  const existing = await api(filter);
  if (existing[0]) {
    console.log(`  skip (exists): ${name}`);
    return existing[0].id;
  }

  const created = await api("templates", {
    method: "POST",
    body: {
      user_id: userId,
      name,
      emoji,
      color,
      position,
      is_starter: isStarter,
    },
  });
  const tid = created[0].id;

  await api("template_exercises", {
    method: "POST",
    prefer: "return=minimal",
    body: plans.map((p, i) => ({
      template_id: tid,
      exercise_id: exerciseIds[p[0]],
      position: i,
      target_sets: p[1],
      rep_range_low: p[2],
      rep_range_high: p[3],
      rest_seconds: p[4],
      amrap_last_set: p[5],
      notes: p[6],
      target_weight: null,
    })),
  });
  console.log(`  created: ${name}`);
  return tid;
}

const USER = "972c1c59-be56-449d-b9e5-58e2f2126f15";

const ids = {};
for (const def of LIBRARY) {
  ids[def.name] = await ensureExercise(def);
  console.log("exercise", def.name, ids[def.name].slice(0, 8));
}

const existingUser = await api(
  `templates?select=position&user_id=eq.${USER}&order=position.desc&limit=1`,
);
let pos = (existingUser[0]?.position ?? -1) + 1;

for (let i = 0; i < DAYS.length; i++) {
  const day = DAYS[i];
  await ensureTemplate({
    userId: null,
    isStarter: true,
    name: day.name,
    emoji: day.emoji,
    color: day.color,
    position: 10 + i,
    exerciseIds: ids,
    plans: day.exercises,
  });
  await ensureTemplate({
    userId: USER,
    isStarter: false,
    name: day.name,
    emoji: day.emoji,
    color: day.color,
    position: pos++,
    exerciseIds: ids,
    plans: day.exercises,
  });
}

const mine = await api(
  `templates?select=name,emoji&user_id=eq.${USER}&name=like.J%26T*&order=position`,
);
console.log("\nYour J&T templates:", mine);
