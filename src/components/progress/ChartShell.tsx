"use client";

import type { ReactNode } from "react";
import { Card } from "../ui/Card";
import { Chip } from "../ui/Chip";
import { Icon } from "../ui/Icon";
import type { ProgressExercise } from "@/lib/types/progress";

export function StatRow({
  items,
}: {
  items: { value: string; label: string; tone?: "accent" | "success" | "danger" }[];
}) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-[var(--radius-lg)] bg-surface p-3.5 text-center shadow-soft"
        >
          <p
            className={`font-display text-[20px] font-extrabold leading-none tabular ${
              item.tone === "accent"
                ? "text-accent-fg"
                : item.tone === "success"
                  ? "text-success"
                  : item.tone === "danger"
                    ? "text-danger"
                    : ""
            }`}
          >
            {item.value}
          </p>
          <p className="mt-1 text-[11.5px] font-medium text-fg-muted">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

export function ExerciseSelector({
  exercises,
  selectedId,
  onSelect,
}: {
  exercises: ProgressExercise[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-3">
      {exercises.map((e) => (
        <Chip key={e.id} size="sm" selected={e.id === selectedId} onClick={() => onSelect(e.id)}>
          {e.name}
        </Chip>
      ))}
    </div>
  );
}

export function ChartCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Card padded={false} className="overflow-hidden pb-3 pt-4">
      <div className="px-4 pb-3">
        <h2 className="font-display text-[17px] font-bold">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[13px] text-fg-muted">{subtitle}</p>}
      </div>
      {children}
      {footer && <div className="px-4 pt-2">{footer}</div>}
    </Card>
  );
}

export function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-[200px] flex-col items-center justify-center gap-2 px-6 text-center">
      <span className="text-fg-subtle">
        <Icon name="chart" size={26} />
      </span>
      <p className="text-[13.5px] text-fg-muted">{message}</p>
    </div>
  );
}

/** Theme-aware colours for Recharts, which needs real values not CSS vars. */
export function chartColors() {
  if (typeof window === "undefined") {
    return { accent: "#ff7a59", pop: "#ffc94d", grid: "#2c313d", text: "#b0b6c2", surface: "#181b22" };
  }
  const css = getComputedStyle(document.documentElement);
  const get = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    accent: get("--accent", "#ff7a59"),
    pop: get("--pop", "#ffc94d"),
    grid: get("--line", "#2c313d"),
    text: get("--fg-muted", "#b0b6c2"),
    surface: get("--surface", "#181b22"),
  };
}

export const MUSCLE_COLORS: Record<string, string> = {
  chest: "#ff7a59",
  back: "#4cc9f0",
  shoulders: "#ffc94d",
  biceps: "#a78bfa",
  triceps: "#f472b6",
  forearms: "#94a3b8",
  quads: "#34d399",
  hamstrings: "#22d3ee",
  glutes: "#fb923c",
  calves: "#c084fc",
  core: "#facc15",
  cardio: "#f87171",
  other: "#64748b",
};
