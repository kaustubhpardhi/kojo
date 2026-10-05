"use client";

import { useState } from "react";
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
import { getStrengthData } from "@/lib/progress-queries";
import { useAsync } from "@/hooks/useAsync";
import type { ProgressExercise } from "@/lib/types/progress";
import { SkeletonList } from "../../ui/Skeleton";
import { ChartCard, ChartEmpty, ExerciseSelector, StatRow, chartColors } from "../ChartShell";

export function StrengthView({
  userId,
  exercises,
}: {
  userId: string;
  exercises: ProgressExercise[];
}) {
  const [picked, setPicked] = useState<string | null>(null);
  // Default to the first exercise without an effect round-trip.
  const selected = picked ?? exercises[0]?.id ?? null;

  const { data, loading } = useAsync(
    () => getStrengthData(userId, selected!),
    [userId, selected],
    Boolean(selected),
  );

  const exercise = exercises.find((e) => e.id === selected);
  const colors = chartColors();

  return (
    <div>
      <ExerciseSelector exercises={exercises} selectedId={selected} onSelect={setPicked} />

      {loading && <SkeletonList rows={2} />}

      {!loading && data && (
        <>
          <ChartCard
            title={exercise?.name ?? "Strength"}
            subtitle="Estimated 1RM over time (Epley)"
          >
            {data.series.length < 2 ? (
              <ChartEmpty message="Log this exercise in two or more sessions to see a trend." />
            ) : (
              <div className="h-[240px] w-full pr-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.series} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
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
                      tick={{ fill: colors.text, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={44}
                      tickFormatter={(v: number) => `${v}`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: colors.surface,
                        border: "none",
                        borderRadius: 14,
                        boxShadow: "0 8px 30px rgb(0 0 0 / 0.25)",
                      }}
                      labelFormatter={(v) =>
                        formatDate(String(v), {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })
                      }
                      formatter={(value) => [`${value ?? 0} kg`, "Est. 1RM"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="estimated1RM"
                      stroke={colors.accent}
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 5, fill: colors.accent }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>

          <div className="mt-3">
            <StatRow
              items={[
                {
                  value: data.callout.allTimeBest ? `${data.callout.allTimeBest}` : "—",
                  label: "Best est. 1RM",
                  tone: "accent",
                },
                {
                  value: data.callout.lastSession ? `${data.callout.lastSession}` : "—",
                  label: "Last session",
                },
                {
                  value:
                    data.callout.trend.direction === "neutral"
                      ? "—"
                      : `${data.callout.trend.direction === "up" ? "+" : "−"}${data.callout.trend.deltaKg}`,
                  label: "4-week trend",
                  tone:
                    data.callout.trend.direction === "up"
                      ? "success"
                      : data.callout.trend.direction === "down"
                        ? "danger"
                        : undefined,
                },
              ]}
            />
          </div>
        </>
      )}
    </div>
  );
}
