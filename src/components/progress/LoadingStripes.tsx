"use client";

/**
 * Full-width repeating horizontal rules (10px spacing, #1A1A1A on black),
 * pulsing opacity 0.3 → 0.8. No data dependencies — pure UI.
 */
export function LoadingStripes() {
  return (
    <div
      className="progress-loading-stripes min-h-[40dvh] w-full bg-[#0A0A0A]"
      aria-hidden
    />
  );
}
