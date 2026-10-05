"use client";

import { motion } from "framer-motion";
import { relativeDays } from "@/lib/dates";
import { getPersonalBests } from "@/lib/progress-queries";
import { useAsync } from "@/hooks/useAsync";
import { EmptyState } from "../../ui/EmptyState";
import { Icon } from "../../ui/Icon";
import { SkeletonList } from "../../ui/Skeleton";

export function PersonalBestsView({ userId }: { userId: string }) {
  const { data, loading } = useAsync(() => getPersonalBests(userId), [userId]);

  if (loading) return <SkeletonList rows={5} />;

  if (!data || data.items.length === 0) {
    return (
      <EmptyState
        icon="trophy"
        title="No personal bests yet"
        body="Every first set you log becomes your baseline. Beat it and it shows up here."
      />
    );
  }

  return (
    <div className="space-y-2">
      {data.items.map((pb, i) => (
        <motion.div
          key={pb.exerciseId}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(i * 0.03, 0.3) }}
          className="flex min-h-[72px] items-center gap-3 rounded-[var(--radius-lg)] bg-surface px-4 py-3 shadow-soft"
        >
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
              pb.isNew ? "bg-pop/20 text-pop" : "bg-surface-2 text-fg-subtle"
            }`}
          >
            <Icon name="trophy" size={20} />
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="min-w-0 truncate text-[15px] font-semibold">
                {pb.exerciseName}
              </span>
              {pb.isNew && (
                <span className="shrink-0 rounded-full bg-pop/20 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-pop">
                  New
                </span>
              )}
            </span>
            <span className="mt-0.5 block text-[12.5px] text-fg-muted">
              {relativeDays(pb.date)} · est. 1RM {pb.estimated1RM} kg
            </span>
          </span>

          <span className="shrink-0 text-right">
            <span className="block font-display text-[19px] font-extrabold leading-none tabular">
              {pb.weight} kg
            </span>
            <span className="mt-0.5 block text-[12px] text-fg-muted tabular">
              × {pb.reps}
            </span>
          </span>
        </motion.div>
      ))}
    </div>
  );
}
