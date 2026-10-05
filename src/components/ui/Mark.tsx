"use client";

import { motion } from "framer-motion";
import { spring } from "@/lib/motion";

/**
 * App mark — a loaded barbell seen end-on: two plates and a bar.
 * Doubles as the app icon and the mascot's face frame.
 */
export function Mark({ size = 40, animated }: { size?: number; animated?: boolean }) {
  const Wrap = animated ? motion.g : "g";
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden focusable={false}>
      <rect width="48" height="48" rx="13" fill="var(--accent)" />
      <Wrap
        {...(animated
          ? {
              initial: { scaleX: 0.7 },
              animate: { scaleX: 1 },
              transition: spring.bouncy,
              style: { originX: "24px", originY: "24px" },
            }
          : {})}
      >
        <rect x="11" y="12" width="26" height="5.5" rx="2.75" fill="var(--on-accent)" />
        <rect x="11" y="30.5" width="26" height="5.5" rx="2.75" fill="var(--on-accent)" />
        <rect x="21.25" y="16" width="5.5" height="16" rx="2.75" fill="var(--on-accent)" />
      </Wrap>
    </svg>
  );
}

/** Mascot: the mark with eyes — used in empty states and the complete screen. */
export function Mascot({ size = 72, mood = "happy" }: { size?: number; mood?: "happy" | "proud" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" aria-hidden focusable={false}>
      <rect x="4" y="8" width="64" height="56" rx="20" fill="var(--accent-soft)" />
      <rect x="18" y="20" width="36" height="6" rx="3" fill="var(--accent)" />
      <rect x="18" y="46" width="36" height="6" rx="3" fill="var(--accent)" />
      <rect x="32" y="24" width="8" height="24" rx="4" fill="var(--accent)" />
      {mood === "happy" ? (
        <>
          <circle cx="25" cy="36" r="3" fill="var(--fg)" />
          <circle cx="47" cy="36" r="3" fill="var(--fg)" />
        </>
      ) : (
        <>
          <path d="M22 36l6-4M50 36l-6-4" stroke="var(--fg)" strokeWidth="3" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
