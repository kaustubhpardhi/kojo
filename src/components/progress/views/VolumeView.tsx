"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getVolumeData } from "@/lib/progress-queries";
import { useAsync } from "@/hooks/useAsync";
import type { ProgressExercise } from "@/lib/types/progress";
import { Chip } from "../../ui/Chip";
import { SkeletonList } from "../../ui/Skeleton";
import {
  ChartCard,
  ChartEmpty,
  MUSCLE_COLORS,
  StatRow,
  chartColors,
} from "../ChartShell";

export function VolumeView({
  userId,
  exercises,
}: {
  userId: string;
  exercises: ProgressExercise[];
}) {
  const [scope, setScope] = useState<string | null>(null);
  const { data, loading } = useAsync(() => getVolumeData(userId, scope), [userId, scope]);
  const colors = chartColors();

  const compact = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);

  return (
    <div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-3">
        <Chip size="sm" selected={scope === null} onClick={() => setScope(null)}>
          All exercises
        </Chip>
        {exercises.map((e) => (
          <Chip key={e.id} size="sm" selected={scope === e.id} onClick={() => setScope(e.id)}>
            {e.name}
          </Chip>
        ))}
      </div>

      {loading && <SkeletonList rows={2} />}

      {!loading && data && (
        <>
          <ChartCard
            title="Weekly volume"
            subtitle={
              scope ? "Weight × reps per week" : "Weight × reps per week, split by muscle group"
            }
          >
            {data.series.length === 0 ? (
              <ChartEmpty message="No sets logged yet." />
            ) : (
              <div className="h-[240px] w-full pr-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.series} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid stroke={colors.grid} vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: colors.text, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={16}
                    />
                    <YAxis
                      tick={{ fill: colors.text, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={44}
                      tickFormatter={compact}
                    />
                    <Tooltip
                      contentStyle={{
                        background: colors.surface,
                        border: "none",
                        borderRadius: 14,
                        boxShadow: "0 8px 30px rgb(0 0 0 / 0.25)",
                      }}
                      formatter={(value, name) => [
                        `${Math.round(Number(value ?? 0)).toLocaleString()} kg`,
                        String(name),
                      ]}
                      labelFormatter={(label) => `Week of ${label}`}
                    />
                    {scope ? (
                      <Bar dataKey="totalVolume" name="Volume" fill={colors.accent} radius={[6, 6, 0, 0]} />
                    ) : (
                      data.muscles.map((muscle, i) => (
                        <Bar
                          key={muscle}
                          dataKey={`byMuscle.${muscle}`}
                          name={muscle}
                          stackId="volume"
                          fill={MUSCLE_COLORS[muscle] ?? colors.accent}
                          radius={i === data.muscles.length - 1 ? [6, 6, 0, 0] : undefined}
                        />
                      ))
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {!scope && data.muscles.length > 0 && (
              <div className="flex flex-wrap gap-x-3 gap-y-1.5 px-4 pt-3">
                {data.muscles.map((muscle) => (
                  <span key={muscle} className="flex items-center gap-1.5 text-[12px] text-fg-muted">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: MUSCLE_COLORS[muscle] ?? colors.accent }}
                    />
                    {muscle}
                  </span>
                ))}
              </div>
            )}
          </ChartCard>

          <div className="mt-3">
            <StatRow
              items={[
                { value: `${compact(data.callout.thisWeek)} kg`, label: "This week", tone: "accent" },
                { value: `${compact(data.callout.bestWeek)} kg`, label: "Best week" },
                { value: `${compact(data.callout.avgLast4Weeks)} kg`, label: "4-week avg" },
              ]}
            />
          </div>
        </>
      )}
    </div>
  );
}
