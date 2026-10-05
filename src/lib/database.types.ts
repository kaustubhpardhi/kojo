/** Legacy A/B/C marker. Read-only: kept so old sessions still render. */
export type DayType = "A" | "B" | "C";

export type ExerciseSource = "seed" | "wger" | "custom";
export type SessionExerciseStatus = "pending" | "done" | "skipped";

export const MUSCLE_GROUPS = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "forearms",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "core",
  "cardio",
  "other",
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const EQUIPMENT = [
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "bodyweight",
  "kettlebell",
  "band",
  "other",
] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export interface Exercise {
  id: string;
  name: string;
  owner_id: string | null;
  source: ExerciseSource;
  primary_muscle: MuscleGroup | null;
  secondary_muscles: string[];
  equipment: Equipment | null;
  wger_id: number | null;
  is_archived: boolean;
  merged_into_id: string | null;
  notes: string | null;
  created_at: string;
  /** Legacy columns — present on seeded rows only. */
  day: DayType | null;
  order: number | null;
  sets: number | null;
  rep_range_low: number | null;
  rep_range_high: number | null;
  is_priority: boolean | null;
  amrap_last_set: boolean | null;
}

export interface Template {
  id: string;
  user_id: string | null;
  name: string;
  emoji: string | null;
  color: string | null;
  position: number;
  is_starter: boolean;
  is_archived: boolean;
  source_template_id: string | null;
  created_at: string;
  updated_at: string;
}

/** Shared plan fields between a template row and a session's snapshot of it. */
export interface ExercisePlan {
  exercise_id: string;
  position: number;
  target_sets: number;
  rep_range_low: number | null;
  rep_range_high: number | null;
  target_weight: number | null;
  rest_seconds: number;
  amrap_last_set: boolean;
  notes: string | null;
}

export interface TemplateExercise extends ExercisePlan {
  id: string;
  template_id: string;
  rep_range_low: number;
  rep_range_high: number;
  created_at: string;
}

export interface SessionExercise extends ExercisePlan {
  id: string;
  session_id: string;
  status: SessionExerciseStatus;
  swapped_from_exercise_id: string | null;
  created_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  template_id: string | null;
  title: string | null;
  notes: string | null;
  date: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  /** Legacy. Null for every session created by the new app. */
  day: DayType | null;
}

export interface SetLog {
  id: string;
  session_id: string;
  session_exercise_id: string | null;
  exercise_id: string;
  set_number: number;
  weight: number;
  reps: number;
  is_amrap: boolean;
  logged_at: string;
  /** Legacy display-name override; superseded by swapped_from_exercise_id. */
  override_exercise_name: string | null;
}

export interface ExerciseFavorite {
  user_id: string;
  exercise_id: string;
  created_at: string;
}

// ─── Composed shapes used by the UI ───────────────────────────────────────

export interface TemplateWithExercises extends Template {
  exercises: (TemplateExercise & { exercise: Exercise })[];
}

export interface TemplateSummary extends Template {
  exerciseCount: number;
  totalSets: number;
  /** Distinct primary muscles, ordered by frequency. */
  muscles: MuscleGroup[];
  lastPerformed: string | null;
}

export interface LoggedSet {
  setNumber: number;
  weight: number;
  reps: number;
  isAmrap: boolean;
}

export interface LiveExercise extends SessionExercise {
  exercise: Exercise;
  /** Sets logged in this session, by set number. */
  logged: Map<number, LoggedSet>;
  /** Same exercise from the user's previous session that included it. */
  previousSets: LoggedSet[];
  /** Best single-set weight before this session, for PR detection. */
  previousBestWeight: number;
}

export interface SessionWithDetail extends Session {
  exercises: (SessionExercise & { exercise: Exercise; sets: LoggedSet[] })[];
  totalVolume: number;
  totalSets: number;
}

export interface StreakData {
  current: number;
  longest: number;
}

export interface WeekProgress {
  completed: number;
  goal: number;
}

// ─── Supabase generated-style map ─────────────────────────────────────────

type Insertable<T, Generated extends keyof T, Optional extends keyof T = never> = Omit<
  T,
  Generated | Optional
> &
  Partial<Pick<T, Optional>>;

export interface Database {
  public: {
    Tables: {
      exercises: {
        Row: Exercise;
        Insert: Insertable<
          Exercise,
          "id" | "created_at",
          | "owner_id"
          | "source"
          | "primary_muscle"
          | "secondary_muscles"
          | "equipment"
          | "wger_id"
          | "is_archived"
          | "merged_into_id"
          | "notes"
          | "day"
          | "order"
          | "sets"
          | "rep_range_low"
          | "rep_range_high"
          | "is_priority"
          | "amrap_last_set"
        >;
        Update: Partial<Omit<Exercise, "id">>;
      };
      templates: {
        Row: Template;
        Insert: Insertable<
          Template,
          "created_at" | "updated_at",
          | "id"
          | "emoji"
          | "color"
          | "position"
          | "is_starter"
          | "is_archived"
          | "source_template_id"
        >;
        Update: Partial<Omit<Template, "id">>;
      };
      template_exercises: {
        Row: TemplateExercise;
        Insert: Insertable<
          TemplateExercise,
          "created_at",
          | "id"
          | "position"
          | "target_sets"
          | "rep_range_low"
          | "rep_range_high"
          | "target_weight"
          | "rest_seconds"
          | "amrap_last_set"
          | "notes"
        >;
        Update: Partial<Omit<TemplateExercise, "id">>;
      };
      sessions: {
        Row: Session;
        Insert: Insertable<
          Session,
          "created_at" | "updated_at",
          | "id"
          | "template_id"
          | "title"
          | "notes"
          | "started_at"
          | "completed_at"
          | "day"
        >;
        Update: Partial<Omit<Session, "id">>;
      };
      session_exercises: {
        Row: SessionExercise;
        Insert: Insertable<
          SessionExercise,
          "created_at",
          | "id"
          | "position"
          | "target_sets"
          | "rep_range_low"
          | "rep_range_high"
          | "target_weight"
          | "rest_seconds"
          | "amrap_last_set"
          | "notes"
          | "status"
          | "swapped_from_exercise_id"
        >;
        Update: Partial<Omit<SessionExercise, "id">>;
      };
      set_logs: {
        Row: SetLog;
        Insert: Insertable<
          SetLog,
          "logged_at",
          "id" | "session_exercise_id" | "is_amrap" | "override_exercise_name"
        >;
        Update: Partial<Omit<SetLog, "id">>;
      };
      exercise_favorites: {
        Row: ExerciseFavorite;
        Insert: Insertable<ExerciseFavorite, "created_at">;
        Update: Partial<ExerciseFavorite>;
      };
    };
  };
}
