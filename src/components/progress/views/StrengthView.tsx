"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useProgressExercises, useStrengthData } from "@/hooks/progress";
import type { StrengthCallout } from "@/lib/types/progress";
import { ExerciseChipRow } from "../ExerciseChipRow";
import { CalloutStrip, type CalloutItem } from "../CalloutStrip";
import { LoadingStripes } from "../LoadingStripes";
import { EmptyState } from "../EmptyState";

interface StrengthViewProps {
  userId: string | null;
}

/** STRENGTH chip view: exercise selector, estimated 1RM line chart, callout strip. */
export function StrengthView({ userId }: StrengthViewProps) {
  const { data: exercises, loading: exercisesLoading } = useProgressExercises(
    userId,
  );
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    null,
  );

  const { data: strengthData, loading: strengthLoading } = useStrengthData(
    userId,
    selectedExerciseId,
  );

  useEffect(() => {
    if (exercises && exercises.length > 0 && selectedExerciseId === null) {
      const first =
        exercises.find((e) => e.is_priority) ?? exercises[0];
      setSelectedExerciseId(first.id);
    }
  }, [exercises, selectedExerciseId]);

  const loading = exercisesLoading || (selectedExerciseId && strengthLoading);
  const selectedExercise = exercises?.find((e) => e.id === selectedExerciseId);

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
        <EmptyState />
      </div>
    );
  }

  const hasChartData = strengthData && strengthData.series.length > 0;
  const dateRangeLabel = hasChartData
    ? `${strengthData.series[0].date} – ${strengthData.series[strengthData.series.length - 1].date}`
    : "No sessions yet";

  const calloutItems: [CalloutItem, CalloutItem, CalloutItem] = strengthData
    ? [
        {
          value: strengthData.callout.allTimeBest > 0 ? `${strengthData.callout.allTimeBest} kg` : "—",
          valueSub: "EST. 1RM",
          label: "ALL-TIME BEST",
          accent: strengthData.callout.allTimeBest > 0,
        },
        {
          value: strengthData.callout.lastSession > 0 ? `${strengthData.callout.lastSession} kg` : "—",
          valueSub: "EST. 1RM",
          label: "LAST SESSION",
          accent: false,
        },
        formatTrendItem(strengthData.callout.trend),
      ]
    : [
        { value: "—", label: "ALL-TIME BEST", accent: false },
        { value: "—", label: "LAST SESSION", accent: false },
        { value: "—", label: "TREND", accent: false },
      ];

  const chartData = strengthData?.series ?? [];

  return (
    <div className="w-full bg-[#0A0A0A]">
      <div className="px-4 pt-4">
        <h2 className="text-lg font-bold uppercase tracking-wide text-[#F2F2F0]">
          ESTIMATED 1RM — {selectedExercise?.name.toUpperCase() ?? "—"}
        </h2>
        <p className="mt-1 text-[10px] font-normal uppercase tracking-[0.2em] text-[#3A3A3A]">
          {dateRangeLabel}
        </p>
        <p className="mt-0.5 text-[9px] font-normal uppercase tracking-widest text-[#3A3A3A]/80">
          ESTIMATED — BASED ON EPLEY FORMULA
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
              <LineChart
                data={chartData}
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
                  tickFormatter={(v) => formatChartDate(v)}
                  axisLine={{ stroke: "#3A3A3A" }}
                  tickLine={false}
                />
                <YAxis
                  dataKey="estimated1RM"
                  domain={["auto", "auto"]}
                  tick={{ fill: "#3A3A3A", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v} kg`}
                  label={{ value: "EST. 1RM", angle: -90, position: "insideLeft", style: { fill: "#3A3A3A", fontSize: 10 } }}
                  width={48}
                />
                <Tooltip
                  contentStyle={{
                    background: "#0A0A0A",
                    border: "1px solid #3A3A3A",
                  }}
                  labelStyle={{ color: "#3A3A3A", fontSize: 10 }}
                  itemStyle={{ color: "#F2F2F0", fontWeight: "bold" }}
                  formatter={(value: number | undefined) => [value != null ? `${value} kg` : "—", "EST. 1RM"]}
                  labelFormatter={(label) => formatChartDate(label)}
                />
                <Line
                  type="monotone"
                  dataKey="estimated1RM"
                  stroke="#C8FF00"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ fill: "#C8FF00", stroke: "#0A0A0A", strokeWidth: 1 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <CalloutStrip items={calloutItems} />
    </div>
  );
}

function formatTrendItem(
  trend: StrengthCallout["trend"],
): CalloutItem {
  if (trend.direction === "neutral" || trend.deltaKg === 0) {
    return { value: "—", label: "TREND", accent: false };
  }
  const arrow = trend.direction === "up" ? "↑" : "↓";
  return {
    value: `${arrow} ${trend.deltaKg} kg`,
    label: "TREND",
    accent: trend.direction === "up",
  };
}

function formatChartDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
