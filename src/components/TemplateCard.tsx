"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { relativeDays } from "@/lib/dates";
import type { TemplateSummary } from "@/lib/database.types";
import { Icon } from "./ui/Icon";

interface TemplateCardProps {
  template: TemplateSummary;
  onPress: () => void;
  onMore?: () => void;
  compact?: boolean;
}

export function TemplateCard({ template, onPress, onMore, compact }: TemplateCardProps) {
  const muscles = template.muscles.slice(0, 3).join(" · ");

  return (
    <div className="relative">
      <motion.button
        type="button"
        onClick={onPress}
        whileTap={{ scale: 0.985 }}
        className={cn(
          "flex w-full items-center gap-3.5 rounded-[var(--radius-lg)] bg-surface text-left shadow-soft",
          compact ? "p-3.5" : "p-4",
          onMore && "pr-14",
        )}
      >
        <span
          aria-hidden
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-accent-soft text-xl"
        >
          {template.emoji ?? "🏋️"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-[17px] font-bold">
            {template.name}
          </span>
          <span className="mt-0.5 block truncate text-[13px] text-fg-muted">
            {template.exerciseCount} exercises · {template.totalSets} sets
            {muscles && ` · ${muscles}`}
          </span>
          {template.lastPerformed && (
            <span className="mt-1 flex items-center gap-1 text-[12px] text-fg-subtle">
              <Icon name="clock" size={13} />
              {relativeDays(template.lastPerformed)}
            </span>
          )}
        </span>
        {!onMore && <Icon name="chevronRight" size={20} className="shrink-0 text-fg-subtle" />}
      </motion.button>

      {onMore && (
        <button
          type="button"
          onClick={onMore}
          aria-label={`Options for ${template.name}`}
          className="absolute right-1 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full text-fg-subtle active:scale-90"
        >
          <Icon name="more" size={22} />
        </button>
      )}
    </div>
  );
}
