"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { todayStr } from "@/lib/dates";
import { StartWorkoutSheet } from "./StartWorkoutSheet";

interface StartWorkoutApi {
  /** Open the start sheet; pass a YYYY-MM-DD to log against a past day. */
  openStart: (date?: string) => void;
}

const StartWorkoutContext = createContext<StartWorkoutApi | null>(null);

export function useStartWorkoutSheet(): StartWorkoutApi {
  const ctx = useContext(StartWorkoutContext);
  if (!ctx) throw new Error("useStartWorkoutSheet must be used inside StartWorkoutProvider");
  return ctx;
}

export function StartWorkoutProvider({
  userId,
  children,
}: {
  userId: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayStr);

  const openStart = useCallback((next?: string) => {
    setDate(next ?? todayStr());
    setOpen(true);
  }, []);

  const value = useMemo(() => ({ openStart }), [openStart]);

  return (
    <StartWorkoutContext.Provider value={value}>
      {children}
      <StartWorkoutSheet
        open={open}
        onClose={() => setOpen(false)}
        userId={userId}
        date={date}
        onDateChange={setDate}
      />
    </StartWorkoutContext.Provider>
  );
}
