"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import type { LoggedSet } from "@/lib/database.types";
import { spring } from "@/lib/motion";
import { Icon } from "../ui/Icon";

interface SetRowProps {
  setNumber: number;
  set?: LoggedSet;
  ghost?: LoggedSet;
  isAmrapTarget: boolean;
  isPR?: boolean;
  onEdit?: () => void;
}

/** A completed (or not-yet-reached) set in the current exercise's list. */
export function SetRow({
  setNumber,
  set,
  ghost,
  isAmrapTarget,
  isPR,
  onEdit,
}: SetRowProps) {
  const done = Boolean(set);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring.snappy}
      className={cn(
        "flex min-h-14 items-center gap-3 rounded-[var(--radius-md)] px-3.5",
        done ? "bg-surface-2" : "border border-dashed border-line",
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold tabular",
          done ? "bg-accent text-on-accent" : "bg-surface-2 text-fg-subtle",
        )}
      >
        {done ? <Icon name="check" size={16} strokeWidth={2.6} /> : setNumber}
      </span>

      {done && set ? (
        <>
          <span className="flex items-baseline gap-1.5">
            <span className="font-display text-xl font-bold tabular">{set.weight}</span>
            <span className="text-[13px] text-fg-muted">kg</span>
            <span className="mx-1 text-fg-subtle">×</span>
            <span className="font-display text-xl font-bold tabular">{set.reps}</span>
            <span className="text-[13px] text-fg-muted">reps</span>
          </span>
          <span className="flex flex-1 items-center justify-end gap-1.5">
            {set.isAmrap && (
              <span className="rounded-full bg-pop/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-pop">
                AMRAP
              </span>
            )}
            {isPR && (
              <span className="flex items-center gap-1 rounded-full bg-success/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-success">
                <Icon name="trophy" size={11} /> PR
              </span>
            )}
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                aria-label={`Edit set ${setNumber}`}
                className="flex h-10 w-10 items-center justify-center rounded-full text-fg-subtle active:scale-90"
              >
                <Icon name="edit" size={17} />
              </button>
            )}
          </span>
        </>
      ) : (
        <span className="flex flex-1 items-center justify-between gap-2">
          <span className="text-[14px] text-fg-subtle">
            {ghost ? `${ghost.weight} kg × ${ghost.reps}` : "Not logged yet"}
          </span>
          {isAmrapTarget && (
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-fg-subtle">
              AMRAP
            </span>
          )}
        </span>
      )}
    </motion.div>
  );
}
