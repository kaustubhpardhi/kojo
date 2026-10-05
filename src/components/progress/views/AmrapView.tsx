"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDate } from "@/lib/dates";
import { getAmrapData } from "@/lib/progress-queries";
import { useAsync } from "@/hooks/useAsync";
import type { ProgressExercise } from "@/lib/types/progress";
import { EmptyState } from "../../ui/EmptyState";
import { SkeletonList } from "../../ui/Skeleton";
import { ChartCard, ChartEmpty, ExerciseSelector, StatRow, chartColors } from "../ChartShell";

export function AmrapView({
  userId,
  exercises,
}: {
  userId: string;
  exercises: ProgressExercise[];
}) {
  const amrapExercises = exercises.filter((e) => e.hasAmrap);
  const [picked, setPicked] = useState<string | null>(null);
  const selected = picked ?? amrapExercises[0]?.id ?? null;

  const { data, loading } = useAsync(
    () => getAmrapData(userId, selected!),
    [userId, selected],
    Boolean(selected),
  );

  const colors = chartColors();

  if (amrapExercises.length === 0) {
    return (
      <EmptyState
        icon="bolt"
        title="No AMRAP sets yet"
        body="Turn on 'AMRAP last set' for an exercise in your template, then log it to failure."
      />
    );
  }

  return (
    <div>
      <ExerciseSelector
        exercises={amrapExercises}
        selectedId={selected}
        onSelect={setPicked}
      />

      {loading && <SkeletonList rows={2} />}

      {!loading && data && (
        <>
          <ChartCard title="AMRAP reps" subtitle="Reps on your to-failure set. Gold = new high.">
            {data.series.length === 0 ? (
              <ChartEmpty message="No AMRAP sets logged for this exercise yet." />
            ) : (
              <div className="h-[240px] w-full pr-3">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid stroke={colors.grid} vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: colors.text, fontSize: 11 }}
                      tickFormatter={(v: string) => formatDate(v)}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={24}
                    />
                    <YAxis
                      dataKey="reps"
                      tick={{ fill: colors.text, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={44}
                    />
                    <Tooltip
                      contentStyle={{
                        background: colors.surface,
                        border: "none",
                        borderRadius: 14,
                        boxShadow: "0 8px 30px rgb(0 0 0 / 0.25)",
                      }}
                      labelFormatter={() => ""}
                      formatter={(value, name) => [
                        name === "reps" ? `${value ?? 0} reps` : `${value ?? 0} kg`,
                        name === "reps" ? "Reps" : "Weight",
                      ]}
                    />
                    <Scatter data={data.series} dataKey="reps">
                      {data.series.map((point) => (
                        <Cell
                          key={point.date}
                          fill={point.isNewHigh ? colors.pop : colors.accent}
                          r={point.isNewHigh ? 7 : 5}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>

          <div className="mt-3">
            <StatRow
              items={[
                { value: `${data.callout.bestAmrap || "—"}`, label: "Best reps", tone: "accent" },
                { value: `${data.callout.lastAmrap || "—"}`, label: "Last set" },
                { value: `${data.callout.avgLast6Sessions || "—"}`, label: "Avg last 6" },
              ]}
            />
          </div>
        </>
      )}
    </div>
  );
}
