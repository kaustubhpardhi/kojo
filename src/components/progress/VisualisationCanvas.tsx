"use client";

import type { ProgressChipId } from "@/lib/types/progress";
import { LoadingStripes } from "./LoadingStripes";
import { StrengthView } from "./views/StrengthView";
import { VolumeView } from "./views/VolumeView";
import { ConsistencyView } from "./views/ConsistencyView";
import { AmrapView } from "./views/AmrapView";
import { PersonalBestsView } from "./views/PersonalBestsView";

interface VisualisationCanvasProps {
  activeChip: ProgressChipId;
  userId: string | null;
}

/**
 * Zone 2: Renders the active view by chip.
 * STRENGTH: StrengthView. VOLUME: VolumeView. Others: LoadingStripes for now.
 */
export function VisualisationCanvas({
  activeChip,
  userId,
}: VisualisationCanvasProps) {
  if (activeChip === "strength") {
    return <StrengthView userId={userId} />;
  }
  if (activeChip === "volume") {
    return <VolumeView userId={userId} />;
  }
  if (activeChip === "consistency") {
    return <ConsistencyView userId={userId} />;
  }
  if (activeChip === "amrap") {
    return <AmrapView userId={userId} />;
  }
  if (activeChip === "personal-bests") {
    return <PersonalBestsView userId={userId} />;
  }

  return (
    <div className="w-full bg-[#0A0A0A] px-4 py-6">
      <LoadingStripes />
    </div>
  );
}
