import type { MuscleGroup } from "../database.types";

export type ProgressChipId =
  | "strength"
  | "volume"
  | "consistency"
  | "amrap"
  | "personal-bests";

export interface StrengthDataPoint {
  date: string;
  estimated1RM: number;
  topSetWeight: number;
}

export interface StrengthViewData {
  series: StrengthDataPoint[];
  callout: {
    allTimeBest: number;
    lastSession: number;
    trend: { direction: "up" | "down" | "neutral"; deltaKg: number };
  };
}

export interface VolumeDataPoint {
  weekStart: string;
  label: string;
  totalVolume: number;
  isCurrentWeek: boolean;
  /** Volume split by primary muscle group for the stacked bars. */
  byMuscle: Partial<Record<MuscleGroup, number>>;
}

export interface VolumeViewData {
  series: VolumeDataPoint[];
  muscles: MuscleGroup[];
  callout: { bestWeek: number; thisWeek: number; avgLast4Weeks: number };
}

export type ConsistencyCellStatus = "empty" | "completed" | "pr";

export interface ConsistencyCell {
  weekIndex: number;
  dayOfWeek: number;
  status: ConsistencyCellStatus;
  date: string;
  sessionCount: number;
}

export interface ConsistencyViewData {
  weekStarts: string[];
  cells: ConsistencyCell[];
  currentStreak: number;
  longestStreak: number;
  totalSessions: number;
  sessionsPerWeek: number;
}

export interface AmrapDataPoint {
  date: string;
  reps: number;
  weight: number;
  isNewHigh: boolean;
}

export interface AmrapViewData {
  series: AmrapDataPoint[];
  callout: { bestAmrap: number; lastAmrap: number; avgLast6Sessions: number };
}

export interface PersonalBestRow {
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  estimated1RM: number;
  date: string;
  isNew: boolean;
}

export interface PersonalBestsViewData {
  items: PersonalBestRow[];
}

export interface ProgressExercise {
  id: string;
  name: string;
  primaryMuscle: MuscleGroup | null;
  setCount: number;
  hasAmrap: boolean;
}

export interface ProgressDataResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}
