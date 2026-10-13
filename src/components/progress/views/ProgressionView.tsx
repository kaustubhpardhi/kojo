"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDate } from "@/lib/dates";
import { getHardSetsThisWeek, getProgressionData } from "@/lib/progress-queries";
import { useAsync } from "@/hooks/useAsync";
import { SkeletonList } from "../../ui/Skeleton";
import { ChartCard, ChartEmpty, StatRow, chartColors } from "../ChartShell";

export function ProgressionView({ userId }: { userId: string }) {
  const { data, loading } = useAsync(() => getProgressionData(userId), [userId]);
  const { data: hardSets } = useAsync(() => getHardSetsThisWeek(userId), [userId]);
  const colors = chartColors();

  if (loading) return <SkeletonList rows={3} />;
  if (!data?.rows.length) {
    return <ChartEmpty message="Log a few working sets to see progression." />;
  }

  const ready = data.rows.filter((r) => r.readyToIncrease);

  return (
    <div className="space-y-4">
      {hardSets && hardSets.length > 0 && (
        <ChartCard title="This week · hard sets" subtitle="Working sets by primary muscle">
          <div className="flex flex-wrap gap-2">
            {hardSets.map((h) => (
              <span
                key={h.muscle}
                className="rounded-full bg-surface-2 px-3 py-1.5 text-[13px] font-semibold text-fg-muted"
              >
                {h.muscle}{" "}
                <span className="tabular text-fg">{h.hardSets}</span>
              </span>
            ))}
          </div>
        </ChartCard>
      )}

      {ready.length > 0 && (
        <ChartCard title="Ready to increase" subtitle="Every top-weight set hit the rep ceiling">
          <ul className="space-y-2">
            {ready.slice(0, 6).map((r) => (
              <li
                key={r.exerciseId}
                className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] bg-accent-soft px-3 py-2.5"
              >
                <span className="min-w-0 truncate text-[14px] font-semibold text-accent-fg">
                  {r.exerciseName}
                </span>
                <span className="shrink-0 text-[13px] font-bold tabular text-accent-fg">
                  → {r.nextWeight} kg × {r.nextReps}
                </span>
              </li>
            ))}
          </ul>
        </ChartCard>
      )}

      {data.rows.slice(0, 8).map((row) => (
        <ChartCard
          key={row.exerciseId}
          title={row.exerciseName}
          subtitle={row.cue}
        >
          {row.readyToIncrease && (
            <p className="mb-2 inline-flex rounded-full bg-success/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-success">
              Ready to increase
            </p>
          )}
          {row.series.length < 2 ? (
            <ChartEmpty message="Need two sessions for a trend line." />
          ) : (
            <div className="h-[180px] w-full pr-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={row.series} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke={colors.grid} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => formatDate(String(d))}
                    tick={{ fill: colors.text, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: colors.text, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                  />
                  <Tooltip
                    contentStyle={{
                      background: colors.surface,
                      border: "none",
                      borderRadius: 12,
                      fontSize: 13,
                    }}
                    labelFormatter={(d) => formatDate(String(d))}
                    formatter={(value, name) => [
                      value as number,
                      name === "topWeight" ? "kg" : "reps",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="topWeight"
                    stroke={colors.accent}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: colors.accent }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <StatRow
            items={[
              {
                label: "Top now",
                value: `${row.series[row.series.length - 1]?.topWeight ?? "—"} kg`,
              },
              {
                label: "Best reps @ top",
                value: String(row.series[row.series.length - 1]?.topReps ?? "—"),
              },
            ]}
          />
        </ChartCard>
      ))}
    </div>
  );
}
