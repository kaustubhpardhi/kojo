"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/haptics";
import { spring } from "@/lib/motion";

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("flex gap-1 rounded-full bg-surface-2 p-1", className)}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => {
              haptic("tap");
              onChange(opt.value);
            }}
            className="relative h-11 flex-1 rounded-full text-sm font-semibold"
          >
            {selected && (
              <motion.span
                layoutId={`seg-${label}`}
                transition={spring.snappy}
                className="absolute inset-0 rounded-full bg-surface shadow-soft"
              />
            )}
            <span className={cn("relative", selected ? "text-fg" : "text-fg-muted")}>
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
