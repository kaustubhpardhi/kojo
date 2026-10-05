"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

const COLORS = ["var(--accent)", "var(--pop)", "var(--success)"];

interface Bit {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotate: number;
}

/** Deterministic scatter: varied enough to look organic, pure to compute. */
function makeBits(count: number): Bit[] {
  const golden = 2.399963; // radians; spreads points without clustering
  return Array.from({ length: count }, (_, i) => {
    const angle = i * golden;
    const spread = ((i * 37) % 70) + 60;
    return {
      id: i,
      x: Math.cos(angle) * spread,
      y: Math.sin(angle) * spread - 20,
      color: COLORS[i % COLORS.length],
      size: 6 + ((i * 13) % 7),
      rotate: (i * 47) % 180,
    };
  });
}

/**
 * Subtle PR celebration: particles fly out once and unmount with the parent.
 * Renders nothing when the user prefers reduced motion.
 */
export function Burst({ count = 14, origin = "center" }: { count?: number; origin?: "center" | "top" }) {
  const reduced = useReducedMotion();
  const [bits, setBits] = useState<Bit[]>([]);

  useEffect(() => {
    setBits(makeBits(count));
  }, [count]);

  if (reduced) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 flex justify-center"
      style={origin === "top" ? { top: "20%" } : { top: "50%" }}
      aria-hidden
    >
      {bits.map((b) => (
        <motion.span
          key={b.id}
          className="absolute block rounded-[2px]"
          style={{ width: b.size, height: b.size, background: b.color }}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
          animate={{ x: b.x, y: b.y, scale: [0, 1, 0.9], opacity: [1, 1, 0], rotate: b.rotate }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      ))}
    </div>
  );
}
