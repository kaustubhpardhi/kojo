"use client";

import { useId, useRef } from "react";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/haptics";
import { Icon } from "./Icon";

interface StepperProps {
  label: string;
  value: number | "";
  onChange: (value: number | "") => void;
  step?: number;
  quickSteps?: number[];
  min?: number;
  max?: number;
  unit?: string;
  placeholder?: string;
  decimals?: boolean;
  ghost?: string;
  onGhostFill?: () => void;
  onInteract?: () => void;
}

export function Stepper({
  label,
  value,
  onChange,
  step = 1,
  quickSteps,
  min = 0,
  max = 9999,
  unit,
  placeholder = "0",
  decimals,
  ghost,
  onGhostFill,
  onInteract,
}: StepperProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const current = value === "" ? 0 : value;

  const nudge = (delta: number) => {
    const next = Math.min(max, Math.max(min, Math.round((current + delta) * 100) / 100));
    haptic("tap");
    onInteract?.();
    onChange(next);
    // Keep Log set reachable — steppers shouldn't leave the keyboard open.
    inputRef.current?.blur();
  };

  return (
    <div className="min-w-0 w-full">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={inputId} className="shrink-0 text-[13px] font-medium text-fg-muted">
          {label}
          {unit ? ` (${unit})` : ""}
        </label>
        {ghost && (
          <button
            type="button"
            onClick={() => {
              haptic("tap");
              onInteract?.();
              onGhostFill?.();
            }}
            className="min-w-0 truncate text-right text-[12px] font-medium text-accent-fg"
          >
            last: {ghost}
          </button>
        )}
      </div>

      <div className="flex min-w-0 items-center gap-1.5 rounded-[var(--radius-md)] bg-surface-2 p-1.5">
        <button
          type="button"
          onClick={() => nudge(-step)}
          aria-label={`Decrease ${label} by ${step}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-surface text-fg active:scale-95"
        >
          <Icon name="minus" size={20} />
        </button>
        <input
          ref={inputRef}
          id={inputId}
          type="number"
          inputMode={decimals ? "decimal" : "numeric"}
          enterKeyHint="done"
          step={decimals ? "0.5" : "1"}
          min={min}
          max={max}
          value={value}
          placeholder={placeholder}
          onFocus={() => onInteract?.()}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") return onChange("");
            const parsed = Number(raw);
            if (Number.isNaN(parsed)) return;
            onChange(parsed);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              inputRef.current?.blur();
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-center font-display text-[28px] font-bold tabular text-fg outline-none placeholder:text-fg-subtle/50"
        />
        <button
          type="button"
          onClick={() => nudge(step)}
          aria-label={`Increase ${label} by ${step}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-surface text-fg active:scale-95"
        >
          <Icon name="plus" size={20} />
        </button>
      </div>

      {quickSteps && quickSteps.length > 0 && (
        <div className="mt-1.5 flex min-w-0 gap-1.5">
          {quickSteps.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => nudge(q)}
              aria-label={`Add ${q} to ${label}`}
              className={cn(
                "h-9 min-w-0 flex-1 rounded-full bg-surface-2 text-[13px] font-semibold text-fg-muted active:scale-95",
              )}
            >
              +{q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
