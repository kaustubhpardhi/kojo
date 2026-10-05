const KEY = "kojo-weekly-goal";
export const DEFAULT_GOAL = 3;

export function readGoal(): number {
  if (typeof window === "undefined") return DEFAULT_GOAL;
  const raw = Number(localStorage.getItem(KEY));
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_GOAL;
}

export function writeGoal(goal: number): void {
  localStorage.setItem(KEY, String(goal));
}
