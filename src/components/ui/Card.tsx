import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
  tone?: "default" | "accent" | "muted";
}

const TONES = {
  default: "bg-surface shadow-soft",
  accent: "bg-accent text-on-accent shadow-lift",
  muted: "bg-surface-2",
};

export function Card({ padded = true, tone = "default", className, ...rest }: CardProps) {
  return (
    <div
      className={cn("rounded-[var(--radius-lg)]", TONES[tone], padded && "p-5", className)}
      {...rest}
    />
  );
}
