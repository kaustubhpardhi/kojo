import type { ExercisePlan } from "@/lib/database.types";

/** Defaults for program-aware plan fields on non-program templates / freestyle adds. */
export const PLAN_FIELD_DEFAULTS: Pick<
  ExercisePlan,
  | "role"
  | "slot_key"
  | "superset_group"
  | "superset_order"
  | "increment_kg"
  | "keep_weight"
  | "unilateral"
  | "rir_label"
> = {
  role: null,
  slot_key: null,
  superset_group: null,
  superset_order: null,
  increment_kg: 2.5,
  keep_weight: false,
  unilateral: false,
  rir_label: null,
};
