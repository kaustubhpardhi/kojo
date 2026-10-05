"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "../AuthProvider";
import { PageHeader } from "../PageHeader";
import { Button } from "../ui/Button";
import { Chip } from "../ui/Chip";
import { EmptyState } from "../ui/EmptyState";
import { SkeletonList } from "../ui/Skeleton";
import { useAsync } from "@/hooks/useAsync";
import { getProgressExercises } from "@/lib/progress-queries";
import type { ProgressChipId } from "@/lib/types/progress";

/** Recharts is heavy, so each view is split out of the initial bundle. */
const StrengthView = dynamic(() => import("./views/StrengthView").then((m) => m.StrengthView), {
  loading: () => <SkeletonList rows={3} />,
  ssr: false,
});
const VolumeView = dynamic(() => import("./views/VolumeView").then((m) => m.VolumeView), {
  loading: () => <SkeletonList rows={3} />,
  ssr: false,
});
const ConsistencyView = dynamic(
  () => import("./views/ConsistencyView").then((m) => m.ConsistencyView),
  { loading: () => <SkeletonList rows={3} />, ssr: false },
);
const AmrapView = dynamic(() => import("./views/AmrapView").then((m) => m.AmrapView), {
  loading: () => <SkeletonList rows={3} />,
  ssr: false,
});
const PersonalBestsView = dynamic(
  () => import("./views/PersonalBestsView").then((m) => m.PersonalBestsView),
  { loading: () => <SkeletonList rows={3} />, ssr: false },
);

const CHIPS: { id: ProgressChipId; label: string }[] = [
  { id: "strength", label: "Strength" },
  { id: "volume", label: "Volume" },
  { id: "consistency", label: "Consistency" },
  { id: "amrap", label: "AMRAP" },
  { id: "personal-bests", label: "Personal bests" },
];

export function ProgressContent() {
  const { user } = useAuth();
  const userId = user!.id;
  const router = useRouter();
  const [chip, setChip] = useState<ProgressChipId>("strength");

  const { data: exercises, loading } = useAsync(
    () => getProgressExercises(userId),
    [userId],
  );

  const hasData = (exercises?.length ?? 0) > 0;

  return (
    <div className="pt-safe">
      <div className="px-4">
        <PageHeader title="Progress" subtitle="Everything you've logged, in shape." />
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-4">
        {CHIPS.map((c) => (
          <Chip key={c.id} selected={chip === c.id} onClick={() => setChip(c.id)}>
            {c.label}
          </Chip>
        ))}
      </div>

      {loading && (
        <div className="px-4">
          <SkeletonList rows={4} />
        </div>
      )}

      {!loading && !hasData && (
        <EmptyState
          icon="chart"
          title="No data yet"
          body="Log a session or two and your charts will start filling in."
          action={<Button onClick={() => router.push("/workouts")}>Pick a workout</Button>}
        />
      )}

      {!loading && hasData && exercises && (
        <div className="px-4 pb-4">
          {chip === "strength" && <StrengthView userId={userId} exercises={exercises} />}
          {chip === "volume" && <VolumeView userId={userId} exercises={exercises} />}
          {chip === "consistency" && <ConsistencyView userId={userId} />}
          {chip === "amrap" && <AmrapView userId={userId} exercises={exercises} />}
          {chip === "personal-bests" && <PersonalBestsView userId={userId} />}
        </div>
      )}
    </div>
  );
}
