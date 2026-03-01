"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useAmrapExercises, useAmrapData } from "@/hooks/progress";
import type { AmrapDataPoint } from "@/lib/types/progress";
import { ExerciseChipRow } from "../ExerciseChipRow";
import { CalloutStrip, type CalloutItem } from "../CalloutStrip";
import { LoadingStripes } from "../LoadingStripes";
import { EmptyState } from "../EmptyState";

/** Linear regression: returns { m, b } for y = m*x + b (x = index 0..n-1). */
function linearRegression(points: { x: number; y: number }[]): { m: number; b: number } {
  const n = points.length;
  if (n === 0) return { m: 0, b: 0 };
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumXX += p.x * p.x;
  }
  const denom = n * sumXX - sumX * sumX;
  const m = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const b = (sumY - m * sumX) / n;
  return { m, b };
}

/** 6×6 square for Scatter point. */
function AmrapPointShape(props: {
  cx?: number;
  cy?: number;
  payload?: AmrapDataPoint;
}) {
  const { cx = 0, cy = 0, payload } = props;
  const fill = payload?.isNewHigh ? "#C8FF00" : "#F2F2F0";
  const size = 6;
  return (
    <rect
      x={cx - size / 2}
      y={cy - size / 2}
      width={size}
      height={size}
      fill={fill}
    />
  );
}

function formatChartDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

interface AmrapViewProps {
  userId: string | null;
}

/** AMRAP chip view: exercise selector, reps scatter + trend line, callout strip. */
export function AmrapView({ userId }: AmrapViewProps) {
  const { data: exercises, loading: exercisesLoading } = useAmrapExercises(userId);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);

  const { data: amrapData, loading: amrapLoading } = useAmrapData(
    userId,
    selectedExerciseId,
  );

  useEffect(() => {
    if (exercises && exercises.length > 0 && selectedExerciseId === null) {
      const first = exercises.find((e) => e.is_priority) ?? exercises[0];
      setSelectedExerciseId(first.id);
    }
  }, [exercises, selectedExerciseId]);

  const loading = exercisesLoading || (selectedExerciseId && amrapLoading);
  const selectedExercise = exercises?.find((e) => e.id === selectedExerciseId);

  const trendSegment = useMemo(() => {
    const series = amrapData?.series ?? [];
    if (series.length < 2) return null;
    const points = series.map((p, i) => ({ x: i, y: p.reps }));
    const { m, b } = linearRegression(points);
    const n = series.length;
    const y0 = b;
    const y1 = m * (n - 1) + b;
    return [
      { x: series[0].date, y: y0 },
      { x: series[series.length - 1].date, y: y1 },
    ] as const;
  }, [amrapData?.series]);

  if (loading) {
    return (
      <div className="w-full bg-[#0A0A0A]">
        <LoadingStripes />
      </div>
    );
  }

  if (!exercises || exercises.length === 0) {
    return (
      <div className="w-full bg-[#0A0A0A] px-4 py-6">
        <EmptyState message="NO AMRAP SETS CONFIGURED" />
      </div>
    );
  }

  const calloutItems: [CalloutItem, CalloutItem, CalloutItem] = amrapData
    ? [
        {
          value: amrapData.callout.bestAmrap > 0 ? amrapData.callout.bestAmrap : "—",
          label: "BEST AMRAP",
          accent: amrapData.callout.bestAmrap > 0,
        },
        {
          value: amrapData.callout.lastAmrap > 0 ? amrapData.callout.lastAmrap : "—",
          label: "LAST AMRAP",
          accent: false,
        },
        {
          value:
            amrapData.callout.avgLast6Sessions > 0
              ? amrapData.callout.avgLast6Sessions
              : "—",
          label: "AVG LAST 6 SESSIONS",
          accent: false,
        },
      ]
    : [
        { value: "—", label: "BEST AMRAP", accent: false },
        { value: "—", label: "LAST AMRAP", accent: false },
        { value: "—", label: "AVG LAST 6 SESSIONS", accent: false },
      ];

  const chartData = amrapData?.series ?? [];
  const hasChartData = chartData.length > 0;

  return (
    <div className="w-full bg-[#0A0A0A]">
      <div className="px-4 pt-4">
        <h2 className="text-lg font-bold uppercase tracking-wide text-[#F2F2F0]">
          AMRAP — {selectedExercise?.name.toUpperCase() ?? "—"}
        </h2>
        <p className="mt-1 text-[10px] font-normal uppercase tracking-[0.2em] text-[#3A3A3A]">
          Reps on last set (AMRAP) by session
        </p>
      </div>

      <ExerciseChipRow
        exercises={exercises.map((e) => ({ id: e.id, name: e.name }))}
        selectedId={selectedExerciseId}
        onSelect={setSelectedExerciseId}
      />

      <div className="px-4 py-4">
        {!hasChartData ? (
          <EmptyState />
        ) : (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart
                margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
              >
                <CartesianGrid
                  stroke="#1A1A1A"
                  strokeWidth={1}
                  horizontal
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#3A3A3A", fontSize: 10 }}
                  tickFormatter={formatChartDate}
                  axisLine={{ stroke: "#3A3A3A" }}
                  tickLine={false}
                />
                <YAxis
                  dataKey="reps"
                  tick={{ fill: "#3A3A3A", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <Tooltip
                  contentStyle={{
                    background: "#0A0A0A",
                    border: "1px solid #3A3A3A",
                  }}
                  labelStyle={{ color: "#3A3A3A", fontSize: 10 }}
                  formatter={(value: number | undefined) => [value ?? "--", "Reps"]}
                  labelFormatter={(label) => formatChartDate(label)}
                />
                {trendSegment && (
                  <ReferenceLine
                    segment={trendSegment}
                    stroke="#3A3A3A"
                    strokeWidth={1}
                  />
                )}
                <Scatter
                  data={chartData}
                  dataKey="reps"
                  name="Reps"
                  shape={(props: { cx?: number; cy?: number; payload?: AmrapDataPoint }) => (
                    <AmrapPointShape {...props} />
                  )}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <CalloutStrip items={calloutItems} />
    </div>
  );
}
