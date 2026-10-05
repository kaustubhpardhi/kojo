import { applyPrefs, DEFAULT_PREFS, readPrefs, writePrefs, type Prefs } from "./prefs";
import { setHapticsEnabled } from "./haptics";

/**
 * External store for preferences so components can read them with
 * useSyncExternalStore — no setState-in-effect, and SSR gets the defaults.
 */

let snapshot: Prefs = DEFAULT_PREFS;
let hydrated = false;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void): () => void {
  // First subscriber hydrates from localStorage.
  if (!hydrated) {
    hydrated = true;
    const stored = readPrefs();
    setHapticsEnabled(stored.haptics);
    if (
      stored.theme !== snapshot.theme ||
      stored.palette !== snapshot.palette ||
      stored.haptics !== snapshot.haptics
    ) {
      snapshot = stored;
      queueMicrotask(emit);
    }
  }

  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): Prefs {
  return snapshot;
}

export function getServerSnapshot(): Prefs {
  return DEFAULT_PREFS;
}

export function updatePrefs(patch: Partial<Prefs>): void {
  snapshot = { ...snapshot, ...patch };
  writePrefs(snapshot);
  applyPrefs(snapshot);
  setHapticsEnabled(snapshot.haptics);
  emit();
}

/** Re-applies the resolved theme when the OS preference changes. */
export function watchSystemTheme(): () => void {
  const mq = window.matchMedia("(prefers-color-scheme: light)");
  const onChange = () => {
    if (snapshot.theme === "system") applyPrefs(snapshot);
  };
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
