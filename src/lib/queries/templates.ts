import { supabase } from "../supabase";
import type {
  Exercise,
  ExercisePlan,
  MuscleGroup,
  Template,
  TemplateExercise,
  TemplateSummary,
  TemplateWithExercises,
} from "../database.types";

type TemplateRowWithExercises = Template & {
  template_exercises: (TemplateExercise & { exercise: Exercise })[];
};

const TEMPLATE_SELECT = "*, template_exercises(*, exercise:exercises(*))";

function sortPlans<T extends { position: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.position - b.position);
}

function toSummary(row: TemplateRowWithExercises, lastPerformed: string | null): TemplateSummary {
  const plans = row.template_exercises ?? [];
  const counts = new Map<MuscleGroup, number>();
  for (const p of plans) {
    const m = p.exercise?.primary_muscle;
    if (m) counts.set(m, (counts.get(m) ?? 0) + 1);
  }
  return {
    ...row,
    exerciseCount: plans.length,
    totalSets: plans.reduce((sum, p) => sum + p.target_sets, 0),
    muscles: [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([m]) => m),
    lastPerformed,
  };
}

export async function getTemplates(userId: string): Promise<TemplateSummary[]> {
  const [templatesRes, sessionsRes] = await Promise.all([
    supabase
      .from("templates")
      .select(TEMPLATE_SELECT)
      .eq("user_id", userId)
      .eq("is_archived", false)
      .order("position"),
    supabase
      .from("sessions")
      .select("template_id, date")
      .eq("user_id", userId)
      .not("completed_at", "is", null)
      .not("template_id", "is", null)
      .order("date", { ascending: false }),
  ]);

  if (templatesRes.error) throw templatesRes.error;
  if (sessionsRes.error) throw sessionsRes.error;

  const lastByTemplate = new Map<string, string>();
  for (const s of (sessionsRes.data ?? []) as { template_id: string; date: string }[]) {
    if (!lastByTemplate.has(s.template_id)) lastByTemplate.set(s.template_id, s.date);
  }

  return ((templatesRes.data ?? []) as TemplateRowWithExercises[]).map((row) =>
    toSummary(row, lastByTemplate.get(row.id) ?? null),
  );
}

export async function getStarterTemplates(): Promise<TemplateSummary[]> {
  const { data, error } = await supabase
    .from("templates")
    .select(TEMPLATE_SELECT)
    .eq("is_starter", true)
    .order("position");
  if (error) throw error;
  return ((data ?? []) as TemplateRowWithExercises[]).map((row) => toSummary(row, null));
}

export async function getTemplate(templateId: string): Promise<TemplateWithExercises | null> {
  const { data, error } = await supabase
    .from("templates")
    .select(TEMPLATE_SELECT)
    .eq("id", templateId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as TemplateRowWithExercises;
  return { ...row, exercises: sortPlans(row.template_exercises ?? []) };
}

export interface TemplateDraft {
  name: string;
  emoji: string | null;
  color: string | null;
  exercises: Omit<ExercisePlan, "position">[];
}

export async function createTemplate(
  userId: string,
  draft: TemplateDraft,
): Promise<string> {
  const { data: maxRow } = await supabase
    .from("templates")
    .select("position")
    .eq("user_id", userId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = ((maxRow as { position: number } | null)?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("templates")
    .insert({
      user_id: userId,
      name: draft.name.trim() || "Untitled",
      emoji: draft.emoji,
      color: draft.color,
      position,
    } as never)
    .select("id")
    .single();
  if (error) throw error;

  const templateId = (data as { id: string }).id;
  await replaceTemplateExercises(templateId, draft.exercises);
  return templateId;
}

export async function updateTemplate(
  templateId: string,
  draft: TemplateDraft,
): Promise<void> {
  const { error } = await supabase
    .from("templates")
    .update({
      name: draft.name.trim() || "Untitled",
      emoji: draft.emoji,
      color: draft.color,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", templateId);
  if (error) throw error;
  await replaceTemplateExercises(templateId, draft.exercises);
}

/** Rows are cheap and order changes constantly, so replace the whole list. */
async function replaceTemplateExercises(
  templateId: string,
  exercises: Omit<ExercisePlan, "position">[],
): Promise<void> {
  const { error: delError } = await supabase
    .from("template_exercises")
    .delete()
    .eq("template_id", templateId);
  if (delError) throw delError;

  if (exercises.length === 0) return;

  const rows = exercises.map((e, i) => ({
    template_id: templateId,
    exercise_id: e.exercise_id,
    position: i,
    target_sets: e.target_sets,
    rep_range_low: e.rep_range_low ?? 8,
    rep_range_high: e.rep_range_high ?? 12,
    target_weight: e.target_weight,
    rest_seconds: e.rest_seconds,
    amrap_last_set: e.amrap_last_set,
    notes: e.notes,
  }));

  const { error } = await supabase.from("template_exercises").insert(rows as never);
  if (error) throw error;
}

export async function duplicateTemplate(
  userId: string,
  templateId: string,
  nameSuffix = "copy",
): Promise<string> {
  const source = await getTemplate(templateId);
  if (!source) throw new Error("Template not found");

  const name = source.is_starter ? source.name : `${source.name} ${nameSuffix}`;
  const newId = await createTemplate(userId, {
    name,
    emoji: source.emoji,
    color: source.color,
    exercises: source.exercises.map(toPlan),
  });

  await supabase
    .from("templates")
    .update({ source_template_id: templateId } as never)
    .eq("id", newId);

  return newId;
}

export function toPlan(row: TemplateExercise | (ExercisePlan & { id?: string })): Omit<
  ExercisePlan,
  "position"
> {
  return {
    exercise_id: row.exercise_id,
    target_sets: row.target_sets,
    rep_range_low: row.rep_range_low,
    rep_range_high: row.rep_range_high,
    target_weight: row.target_weight,
    rest_seconds: row.rest_seconds,
    amrap_last_set: row.amrap_last_set,
    notes: row.notes,
  };
}

export async function reorderTemplates(ids: string[]): Promise<void> {
  await Promise.all(
    ids.map((id, i) =>
      supabase.from("templates").update({ position: i } as never).eq("id", id),
    ),
  );
}

export async function setTemplateArchived(
  templateId: string,
  archived: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("templates")
    .update({ is_archived: archived, updated_at: new Date().toISOString() } as never)
    .eq("id", templateId);
  if (error) throw error;
}

export async function getArchivedTemplates(userId: string): Promise<TemplateSummary[]> {
  const { data, error } = await supabase
    .from("templates")
    .select(TEMPLATE_SELECT)
    .eq("user_id", userId)
    .eq("is_archived", true)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as TemplateRowWithExercises[]).map((row) => toSummary(row, null));
}

/**
 * Deleting a template leaves its past sessions intact: sessions.template_id is
 * ON DELETE SET NULL and each session keeps its own title + exercise snapshot.
 */
export async function deleteTemplate(templateId: string): Promise<void> {
  const { error } = await supabase.from("templates").delete().eq("id", templateId);
  if (error) throw error;
}
