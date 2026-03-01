/**
 * Progress page — TypeScript types for every view's data shape.
 * Used by progress hooks and components.
 */

// ─── Chip / navigation ─────────────────────────────────────────────────────

export type ProgressChipId =
  | "strength"
  | "volume"
  | "consistency"
  | "amrap"
  | "personal-bests";

// ─── STRENGTH ──────────────────────────────────────────────────────────────

/** One point on the estimated 1RM over time chart (max Epley per session date). */
export interface StrengthDataPoint {
  date: string; // YYYY-MM-DD
  estimated1RM: number; // kg
}

export interface StrengthCallout {
  allTimeBest: number; // kg
  lastSession: number; // kg
  trend: {
    direction: "up" | "down" | "neutral";
    deltaKg: number; // over last 4 weeks
  };
}

export interface StrengthViewData {
  series: StrengthDataPoint[];
  callout: StrengthCallout;
}

// ─── VOLUME ────────────────────────────────────────────────────────────────

/** One bar: weekly total volume (sum of weight × reps for all sets that week). */
export interface VolumeDataPoint {
  weekLabel: string;
  isoWeek: string; // e.g. "2026-W09"
  totalVolume: number;
  isCurrentWeek: boolean;
}

export interface VolumeCallout {
  bestWeek: number;
  thisWeek: number;
  avgLast4Weeks: number;
}

export interface VolumeViewData {
  series: VolumeDataPoint[];
  callout: VolumeCallout;
}

// ─── CONSISTENCY ───────────────────────────────────────────────────────────

export type ConsistencyCellStatus = "empty" | "completed" | "pr";

/** One cell in the week × day heatmap. */
export interface ConsistencyCell {
  weekIndex: number;
  dayOfWeek: number; // 0 = Monday, 6 = Sunday (ISO)
  status: ConsistencyCellStatus;
  date?: string; // YYYY-MM-DD when status is completed or pr
}

export interface ConsistencyViewData {
  weeks: string[]; // week labels for X axis, e.g. ["W1", "W2", ...]
  dayLabels: string[]; // ["M", "T", "W", "T", "F", "S", "S"] Mon–Sun
  cells: ConsistencyCell[];
  currentStreak: number;
  longestStreak: number;
}

// ─── AMRAP ────────────────────────────────────────────────────────────────

/** One point on the AMRAP scatter: date vs reps, with new-high flag. */
export interface AmrapDataPoint {
  date: string;
  reps: number;
  isNewHigh: boolean;
}

export interface AmrapCallout {
  bestAmrap: number; // reps
  lastAmrap: number;
  avgLast6Sessions: number;
}

export interface AmrapViewData {
  series: AmrapDataPoint[];
  callout: AmrapCallout;
}

// ─── PERSONAL BESTS ───────────────────────────────────────────────────────

/** One row: exercise + all-time best weight+reps + date; isNew if PR in last 7 days. */
export interface PersonalBestRow {
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  date: string; // YYYY-MM-DD
  isNew: boolean;
}

export interface PersonalBestsViewData {
  items: PersonalBestRow[];
}

// ─── Union / hook result helpers ───────────────────────────────────────────

export type ProgressViewData =
  | { chip: "strength"; data: StrengthViewData }
  | { chip: "volume"; data: VolumeViewData }
  | { chip: "consistency"; data: ConsistencyViewData }
  | { chip: "amrap"; data: AmrapViewData }
  | { chip: "personal-bests"; data: PersonalBestsViewData };

/** Generic result shape for progress data hooks. */
export interface ProgressDataResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}
