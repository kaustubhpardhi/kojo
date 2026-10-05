"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { spring } from "@/lib/motion";

interface RingProps {
  /** 0..1 */
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  label: string;
  children?: ReactNode;
}

export function Ring({
  value,
  size = 96,
  stroke = 10,
  color = "var(--accent)",
  track = "var(--surface-3)",
  label,
  children,
}: RingProps) {
  const r = (size - stroke) / 2;
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: clamped === 0 ? 0.0001 : clamped }}
          transition={spring.gentle}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}
