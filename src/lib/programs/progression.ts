/**
 * Double-progression engine for Hypertrophy Block 1.
 * Pure functions only — no UI, no DB.
 *
 * Only WORKING sets count. Warm-ups are ignored. When the last completed
 * session mixed weights, only sets at the heaviest working weight (W) decide.
 */

export type ProgressionSetType = "warmup" | "working" | "failure";

export interface ProgressionSet {
  weight: number;
  reps: number;
  setType?: ProgressionSetType;
}

export interface ProgressionInput {
  /** Working (+ failure) sets from the last completed session for this exercise. */
  lastSessionSets: ProgressionSet[];
  repMin: number;
  repMax: number;
  incrementKg: number;
  /** Week 4 deload: skip double progression. */
  isDeload: boolean;
  /**
   * Heaviest working weight from week 3 (any session that week).
   * Required for a sensible deload; if missing, falls back to last session W.
   */
  week3TopWeight?: number | null;
  /** Prefer holding load and adding reps (small accessories). */
  keepWeight?: boolean;
  /**
   * Any prior logged working weight for this exercise (hint only when there is
   * no last-session history for the decision path).
   */
  anyPriorWeight?: number | null;
}

export type ProgressionDecision =
  | {
      kind: "no_history";
      targetWeight: null;
      targetReps: number;
      cue: string;
      hintWeight: number | null;
    }
  | {
      kind: "increase_load";
      targetWeight: number;
      targetReps: number;
      cue: string;
      hintWeight: null;
    }
  | {
      kind: "add_reps";
      targetWeight: number;
      /** Per working-set rep targets, length = number of top-weight sets last time. */
      targetRepsPerSet: number[];
      targetReps: number;
      cue: string;
      hintWeight: null;
    }
  | {
      kind: "repeat";
      targetWeight: number;
      targetReps: number;
      cue: string;
      hintWeight: null;
    }
  | {
      kind: "deload";
      targetWeight: number;
      targetReps: number;
      cue: string;
      hintWeight: null;
    };

function isWorking(set: ProgressionSet): boolean {
  const t = set.setType ?? "working";
  return t === "working" || t === "failure";
}

/** Round to the nearest loadable increment (always >= 0). */
export function roundToIncrement(weight: number, incrementKg: number): number {
  if (incrementKg <= 0) return Math.max(0, Math.round(weight * 100) / 100);
  const rounded = Math.round(weight / incrementKg) * incrementKg;
  return Math.max(0, Math.round(rounded * 100) / 100);
}

export function workingSetsOnly(sets: ProgressionSet[]): ProgressionSet[] {
  return sets.filter(isWorking);
}

/** Heaviest working weight in the session, or null if none. */
export function topWorkingWeight(sets: ProgressionSet[]): number | null {
  const working = workingSetsOnly(sets);
  if (working.length === 0) return null;
  return working.reduce((max, s) => Math.max(max, s.weight), -Infinity);
}

/** Sets performed at the top working weight W. */
export function setsAtTopWeight(sets: ProgressionSet[]): ProgressionSet[] {
  const W = topWorkingWeight(sets);
  if (W == null) return [];
  return workingSetsOnly(sets).filter((s) => s.weight === W);
}

/**
 * Decide next session targets for one exercise.
 * Bodyweight (weight 0) follows the same rules — increase is +increment (plates)
 * or add reps when keepWeight / no plate jump.
 */
export function decideProgression(input: ProgressionInput): ProgressionDecision {
  const {
    lastSessionSets,
    repMin,
    repMax,
    incrementKg,
    isDeload,
    week3TopWeight,
    keepWeight = false,
    anyPriorWeight = null,
  } = input;

  if (isDeload) {
    const base =
      week3TopWeight != null && week3TopWeight > 0
        ? week3TopWeight
        : topWorkingWeight(lastSessionSets);
    if (base == null) {
      return {
        kind: "no_history",
        targetWeight: null,
        targetReps: repMin,
        cue: "Deload — pick a light weight (~90% of a normal week).",
        hintWeight: anyPriorWeight,
      };
    }
    const targetWeight = roundToIncrement(base * 0.9, incrementKg);
    return {
      kind: "deload",
      targetWeight,
      targetReps: repMin,
      cue: `Deload — about 90% of week 3 (${base} → ${targetWeight}). RIR 4.`,
      hintWeight: null,
    };
  }

  const topSets = setsAtTopWeight(lastSessionSets);
  if (topSets.length === 0) {
    return {
      kind: "no_history",
      targetWeight: null,
      targetReps: repMin,
      cue: "Pick a weight that finishes the range with the listed RIR.",
      hintWeight: anyPriorWeight,
    };
  }

  const W = topSets[0].weight;
  const allHitMax = topSets.every((s) => s.reps >= repMax);
  const allHitMin = topSets.every((s) => s.reps >= repMin);
  const anyBelowMin = topSets.some((s) => s.reps < repMin);

  if (allHitMax) {
    if (keepWeight) {
      // Small lifts: hold load, keep chasing top reps / slower eccentrics.
      return {
        kind: "add_reps",
        targetWeight: W,
        targetRepsPerSet: topSets.map(() => repMax),
        targetReps: repMax,
        cue: "Top reps hit — keep this weight; add reps or slow the lowering.",
        hintWeight: null,
      };
    }
    const next = roundToIncrement(W + incrementKg, incrementKg);
    return {
      kind: "increase_load",
      targetWeight: next,
      targetReps: repMin,
      cue: `Every set hit ${repMax} — go to ${next} kg, start at ${repMin} reps.`,
      hintWeight: null,
    };
  }

  if (anyBelowMin || !allHitMin) {
    return {
      kind: "repeat",
      targetWeight: W,
      targetReps: repMin,
      cue: `Repeat ${W} kg — get every set to at least ${repMin} before jumping.`,
      hintWeight: null,
    };
  }

  // All sets >= repMin, not all at repMax → +1 rep per set, capped at repMax.
  const targetRepsPerSet = topSets.map((s) => Math.min(s.reps + 1, repMax));
  return {
    kind: "add_reps",
    targetWeight: W,
    targetRepsPerSet,
    targetReps: Math.min(...targetRepsPerSet),
    cue: `Keep ${W} kg — add a rep on each set (cap ${repMax}).`,
    hintWeight: null,
  };
}

/** Suggested ramp-up sets for the first main lift (percent of target). */
export function suggestedWarmups(targetWeight: number): ProgressionSet[] {
  if (targetWeight <= 0) return [];
  const sets: ProgressionSet[] = [
    { weight: roundToIncrement(targetWeight * 0.5, 2.5), reps: 5, setType: "warmup" },
    { weight: roundToIncrement(targetWeight * 0.7, 2.5), reps: 3, setType: "warmup" },
    { weight: roundToIncrement(targetWeight * 0.85, 2.5), reps: 2, setType: "warmup" },
  ];
  return sets.filter((s) => s.weight > 0 && s.weight < targetWeight);
}
