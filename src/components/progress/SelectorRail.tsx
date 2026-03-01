"use client";

import type { ProgressChipId } from "@/lib/types/progress";

const CHIPS: { id: ProgressChipId; label: string }[] = [
  { id: "strength", label: "STRENGTH" },
  { id: "volume", label: "VOLUME" },
  { id: "consistency", label: "CONSISTENCY" },
  { id: "amrap", label: "AMRAP" },
  { id: "frequency", label: "FREQUENCY" },
  { id: "personal-bests", label: "PERSONAL BESTS" },
];

interface SelectorRailProps {
  activeChip: ProgressChipId;
  onSelect: (id: ProgressChipId) => void;
}

/** Horizontally scrollable single row of rectangular chips, flush to edges. Selected = lime bg, black text. */
export function SelectorRail({ activeChip, onSelect }: SelectorRailProps) {
  return (
    <div className="sticky top-0 z-20 w-full overflow-x-auto overflow-y-hidden border-b border-[#3A3A3A] bg-[#0A0A0A]">
      <div className="flex w-max">
        {CHIPS.map(({ id, label }) => {
          const isActive = activeChip === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              className={`tap-flash shrink-0 border-r border-[#3A3A3A] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em] last:border-r-0 ${
                isActive
                  ? "bg-[#C8FF00] text-[#0A0A0A]"
                  : "bg-[#0A0A0A] text-[#F2F2F0]"
              }`}
              aria-pressed={isActive}
              aria-label={label}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
