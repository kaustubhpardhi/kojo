import { supabase } from "../supabase";
import type { Equipment, Exercise, MuscleGroup } from "../database.types";

const LIBRARY_SELECT = "*";

export async function getExerciseLibrary(userId: string): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from("exercises")
    .select(LIBRARY_SELECT)
    .eq("is_archived", false)
    .or(`owner_id.is.null,owner_id.eq.${userId}`)
    .order("name");
  if (error) throw error;
  return (data ?? []) as Exercise[];
}

export async function getExercisesByIds(ids: string[]): Promise<Exercise[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("exercises")
    .select(LIBRARY_SELECT)
    .in("id", ids);
  if (error) throw error;
  return (data ?? []) as Exercise[];
}

export async function getFavoriteExerciseIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("exercise_favorites")
    .select("exercise_id")
    .eq("user_id", userId);
  if (error) throw error;
  return ((data ?? []) as { exercise_id: string }[]).map((r) => r.exercise_id);
}

export async function toggleFavorite(
  userId: string,
  exerciseId: string,
  favorite: boolean,
): Promise<void> {
  if (favorite) {
    const { error } = await supabase
      .from("exercise_favorites")
      .upsert({ user_id: userId, exercise_id: exerciseId } as never);
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from("exercise_favorites")
    .delete()
    .eq("user_id", userId)
    .eq("exercise_id", exerciseId);
  if (error) throw error;
}

/** Most recently logged exercises, newest first. */
export async function getRecentExerciseIds(userId: string, limit = 12): Promise<string[]> {
  const { data, error } = await supabase
    .from("set_logs")
    .select("exercise_id, logged_at, sessions!inner(user_id)")
    .eq("sessions.user_id", userId)
    .order("logged_at", { ascending: false })
    .limit(240);
  if (error) throw error;

  const seen: string[] = [];
  for (const row of (data ?? []) as { exercise_id: string }[]) {
    if (!seen.includes(row.exercise_id)) seen.push(row.exercise_id);
    if (seen.length >= limit) break;
  }
  return seen;
}

export interface NewExercise {
  name: string;
  primary_muscle: MuscleGroup | null;
  equipment: Equipment | null;
  notes?: string | null;
  wger_id?: number | null;
  source?: "custom" | "wger";
}

export async function createExercise(
  userId: string,
  input: NewExercise,
): Promise<Exercise> {
  const name = input.name.trim();

  // Reuse an existing row rather than creating near-duplicates, so history and
  // PRs for the same lift stay on one exercise.
  const { data: existing } = await supabase
    .from("exercises")
    .select(LIBRARY_SELECT)
    .ilike("name", name)
    .eq("is_archived", false)
    .or(`owner_id.is.null,owner_id.eq.${userId}`)
    .limit(1)
    .maybeSingle();
  if (existing) return existing as Exercise;

  const { data, error } = await supabase
    .from("exercises")
    .insert({
      name,
      owner_id: userId,
      source: input.source ?? "custom",
      primary_muscle: input.primary_muscle,
      equipment: input.equipment,
      notes: input.notes ?? null,
      wger_id: input.wger_id ?? null,
      secondary_muscles: [],
    } as never)
    .select(LIBRARY_SELECT)
    .single();
  if (error) throw error;
  return data as Exercise;
}

export async function updateExercise(
  exerciseId: string,
  patch: Partial<Pick<Exercise, "name" | "primary_muscle" | "equipment" | "notes">>,
): Promise<void> {
  const { error } = await supabase
    .from("exercises")
    .update(patch as never)
    .eq("id", exerciseId);
  if (error) throw error;
}

/**
 * Custom exercises are archived rather than deleted — set_logs.exercise_id is
 * ON DELETE RESTRICT, so a hard delete would either fail or destroy history.
 */
export async function archiveExercise(exerciseId: string): Promise<void> {
  const { error } = await supabase
    .from("exercises")
    .update({ is_archived: true } as never)
    .eq("id", exerciseId);
  if (error) throw error;
}
