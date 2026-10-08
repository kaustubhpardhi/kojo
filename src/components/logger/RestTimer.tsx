"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { formatDuration } from "@/lib/dates";
import { haptic } from "@/lib/haptics";
import { spring } from "@/lib/motion";
import { Icon } from "../ui/Icon";

interface RestTimerProps {
  /** Seconds to count down. Remount (via key) to restart. */
  duration: number;
  onDismiss: () => void;
  onExtend: (seconds: number) => void;
}

export function RestTimer({ duration, onDismiss, onExtend }: RestTimerProps) {
  const [remaining, setRemaining] = useState(duration);
  const startedAt = useRef(0);
  const buzzed = useRef(false);

  useEffect(() => {
    // Wall-clock based so a backgrounded tab stays accurate.
    if (startedAt.current === 0) startedAt.current = Date.now();
    const started = startedAt.current;

    const tick = setInterval(() => {
      const elapsed = Math.floor((Date.now() - started) / 1000);
      const left = Math.max(0, duration - elapsed);
      setRemaining(left);
      if (left === 0 && !buzzed.current) {
        buzzed.current = true;
        haptic("warning");
      }
    }, 250);

    return () => clearInterval(tick);
  }, [duration]);

  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  // Clear "Rest's up" after a short beat so it doesn't crowd the logger.
  useEffect(() => {
    if (remaining !== 0) return;
    const t = window.setTimeout(() => dismissRef.current(), 3500);
    return () => window.clearTimeout(t);
  }, [remaining]);

  const done = remaining === 0;
  const progress = duration > 0 ? remaining / duration : 0;
  const circumference = 2 * Math.PI * 24;

  return (
    <motion.div
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 24, opacity: 0 }}
      transition={spring.snappy}
      className="flex items-center gap-3 rounded-[var(--radius-lg)] bg-surface-2 p-3"
      role="timer"
      aria-live="off"
    >
      <div className="relative h-14 w-14 shrink-0">
        <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90" aria-hidden>
          <circle cx="28" cy="28" r="24" fill="none" stroke="var(--surface-3)" strokeWidth="5" />
          <circle
            cx="28"
            cy="28"
            r="24"
            fill="none"
            stroke={done ? "var(--success)" : "var(--accent)"}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            style={{ transition: "stroke-dashoffset 250ms linear" }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-display text-[15px] font-bold tabular">
          {done ? <Icon name="check" size={20} /> : formatDuration(remaining)}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold">{done ? "Rest's up" : "Resting"}</p>
        <p className="text-[13px] text-fg-muted">
          {done ? "Go when you're ready." : "Breathe. Shake it out."}
        </p>
      </div>

      <button
        type="button"
        onClick={() => {
          haptic("tap");
          onExtend(30);
        }}
        className="h-11 shrink-0 rounded-full bg-surface px-3.5 text-[13px] font-semibold text-fg-muted active:scale-95"
      >
        +30s
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Skip rest"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-fg-muted active:scale-95"
      >
        <Icon name="x" size={18} />
      </button>
    </motion.div>
  );
}
