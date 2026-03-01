"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useProgressExercises, useVolumeData } from "@/hooks/progress";
import { ExerciseChipRow } from "../ExerciseChipRow";
import { CalloutStrip, type CalloutItem } from "../CalloutStrip";
import { LoadingStripes } from "../LoadingStripes";
import { EmptyState } from "../EmptyState";

interface VolumeViewProps {
  userId: string | null;
}

/** VOLUME chip view: exercise selector, weekly volume bar chart, callout strip. */
export function VolumeView({ userId }: VolumeViewProps) {
  const { data: exercises, loading: exercisesLoading } = useProgressExercises(
    userId,
  );
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    null,
  );

  const { data: volumeData, loading: volumeLoading } = useVolumeData(
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

  const loading = exercisesLoading || (selectedExerciseId && volumeLoading);
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

  const hasChartData = volumeData && volumeData.series.length > 0;
  const calloutItems: [CalloutItem, CalloutItem, CalloutItem] = volumeData
    ? [
        {
          value: volumeData.callout.bestWeek > 0 ? formatVolume(volumeData.callout.bestWeek) : "—",
          label: "BEST WEEK",
          accent: volumeData.callout.bestWeek > 0,
        },
        {
          value: volumeData.callout.thisWeek > 0 ? formatVolume(volumeData.callout.thisWeek) : "—",
          label: "THIS WEEK",
          accent: false,
        },
        {
          value: volumeData.callout.avgLast4Weeks > 0 ? formatVolume(volumeData.callout.avgLast4Weeks) : "—",
          label: "AVG LAST 4 WEEKS",
          accent: false,
        },
      ]
    : [
        { value: "—", label: "BEST WEEK", accent: false },
        { value: "—", label: "THIS WEEK", accent: false },
        { value: "—", label: "AVG LAST 4 WEEKS", accent: false },
      ];

  const chartData = volumeData?.series ?? [];

  return (
    <div className="w-full bg-[#0A0A0A]">
      <div className="px-4 pt-4">
        <h2 className="text-lg font-bold uppercase tracking-wide text-[#F2F2F0]">
          VOLUME — {selectedExercise?.name.toUpperCase() ?? "—"}
        </h2>
        <p className="mt-1 text-[10px] font-normal uppercase tracking-[0.2em] text-[#3A3A3A]">
          Sets × reps × weight by week
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
              <BarChart
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
                  dataKey="weekLabel"
                  tick={{ fill: "#3A3A3A", fontSize: 10 }}
                  axisLine={{ stroke: "#3A3A3A" }}
                  tickLine={false}
                />
                <YAxis
                  dataKey="totalVolume"
                  tick={{ fill: "#3A3A3A", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatVolume(v)}
                  width={48}
                />
                <Tooltip
                  contentStyle={{
                    background: "#0A0A0A",
                    border: "1px solid #3A3A3A",
                  }}
                  labelStyle={{ color: "#3A3A3A", fontSize: 10 }}
                  itemStyle={{ color: "#F2F2F0", fontWeight: "bold" }}
                  formatter={(value: number | undefined) => [value != null ? formatVolume(value) : "—", "Volume"]}
                  labelFormatter={(label) => label}
                />
                <Bar
                  dataKey="totalVolume"
                  fill="#F2F2F0"
                  radius={0}
                  shape={(props) => {
                    const { x, y, width, height, payload } = props;
                    const fill = payload?.isCurrentWeek ? "#C8FF00" : "#F2F2F0";
                    return (
                      <rect
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        fill={fill}
                      />
                    );
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <CalloutStrip items={calloutItems} />
    </div>
  );
}

function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}k kg`;
  return `${Math.round(kg)} kg`;
}
