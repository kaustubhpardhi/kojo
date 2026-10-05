type HapticKind = "tap" | "success" | "pr" | "warning";

const PATTERNS: Record<HapticKind, number | number[]> = {
  tap: 8,
  success: [12, 40, 18],
  pr: [20, 50, 20, 50, 40],
  warning: [30, 60, 30],
};

let enabled = true;

export function setHapticsEnabled(value: boolean): void {
  enabled = value;
}

export function haptic(kind: HapticKind = "tap"): void {
  if (!enabled || typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    navigator.vibrate(PATTERNS[kind]);
  } catch {
    // Some browsers throw when vibrate is called without a user gesture.
  }
}
