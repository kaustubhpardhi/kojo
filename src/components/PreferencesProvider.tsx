"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import type { Prefs } from "@/lib/prefs";
import {
  getServerSnapshot,
  getSnapshot,
  subscribe,
  updatePrefs,
  watchSystemTheme,
} from "@/lib/prefs-store";

export function usePrefs(): { prefs: Prefs; setPrefs: (patch: Partial<Prefs>) => void } {
  const prefs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { prefs, setPrefs: updatePrefs };
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  useEffect(watchSystemTheme, []);
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
