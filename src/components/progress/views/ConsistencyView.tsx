"use client";

import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/dates";
import { DAY_LABELS, getConsistencyData } from "@/lib/progress-queries";
import { useAsync } from "@/hooks/useAsync";
import { Icon } from "../../ui/Icon";
import { SkeletonList } from "../../ui/Skeleton";
import { ChartCard, StatRow } from "../ChartShell";

export function ConsistencyView({ userId }: { userId: string }) {
  const { data, loading } = useAsync(() => getConsistencyData(userId), [userId]);

  if (loading) return <SkeletonList rows={3} />;
  if (!data) return null;

  return (
    <div>
      <ChartCard title="Last 12 weeks" subtitle="Each square is a day. Gold means a PR.">
        <div className="flex gap-2 px-4 pb-1">
          <div className="flex flex-col justify-around pt-0.5" aria-hidden>
            {DAY_LABELS.map((label, i) => (
              <span key={i} className="h-5 text-[10.5px] font-semibold leading-5 text-fg-subtle">
                {label}
              </span>
            ))}
          </div>

          <div
            className="grid flex-1 grid-flow-col gap-1"
            style={{ gridTemplateRows: "repeat(7, minmax(0, 1fr))" }}
            role="img"
            aria-label={`Training heatmap: ${data.totalSessions} sessions over the last 12 weeks`}
          >
            {data.cells
              .slice()
              .sort((a, b) => a.weekIndex - b.weekIndex || a.dayOfWeek - b.dayOfWeek)
              .map((cell) => (
                <span
                  key={`${cell.weekIndex}-${cell.dayOfWeek}`}
                  title={`${formatDate(cell.date, { day: "numeric", month: "short" })}${
                    cell.sessionCount ? ` · ${cell.sessionCount} session(s)` : ""
                  }`}
                  className={cn(
                    "h-5 rounded-[5px]",
                    cell.status === "pr"
                      ? "bg-pop"
                      : cell.status === "completed"
                        ? "bg-accent"
                        : "bg-surface-2",
                  )}
                />
              ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-4 pt-3 text-[11.5px] text-fg-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-surface-2" /> rest
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-accent" /> trained
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-pop" /> PR
          </span>
        </div>
      </ChartCard>

      <div className="mt-3 flex items-center gap-3 rounded-[var(--radius-lg)] bg-accent-soft p-4 text-accent-fg">
        <Icon name="flame" size={22} filled={data.currentStreak > 0} />
        <p className="font-display text-[17px] font-bold">
          {data.currentStreak > 0
            ? `${data.currentStreak} week streak`
            : "No active streak — train this week to start one"}
        </p>
      </div>

      <div className="mt-3">
        <StatRow
          items={[
            { value: String(data.totalSessions), label: "Total sessions" },
            { value: String(data.longestStreak), label: "Longest streak" },
            { value: String(data.sessionsPerWeek), label: "Per active week" },
          ]}
        />
      </div>
    </div>
  );
}
