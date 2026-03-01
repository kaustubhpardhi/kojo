"use client";

export interface ExerciseOption {
  id: string;
  name: string;
}

interface ExerciseChipRowProps {
  exercises: ExerciseOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/**
 * Horizontal scroll row of exercise name chips. Same style as selector rail
 * but smaller: rectangular, 1px border #3A3A3A, selected = lime bg, black text.
 * No data dependencies — pure UI.
 */
export function ExerciseChipRow({
  exercises,
  selectedId,
  onSelect,
}: ExerciseChipRowProps) {
  if (exercises.length === 0) return null;

  return (
    <div className="w-full overflow-x-auto overflow-y-hidden border-b border-[#3A3A3A]">
      <div className="flex w-max py-2">
        {exercises.map((ex) => {
          const isActive = selectedId === ex.id;
          return (
            <button
              key={ex.id}
              type="button"
              onClick={() => onSelect(ex.id)}
              className={`tap-flash shrink-0 border-r border-[#3A3A3A] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.15em] last:border-r-0 ${
                isActive
                  ? "bg-[#C8FF00] text-[#0A0A0A]"
                  : "bg-[#0A0A0A] text-[#F2F2F0]"
              }`}
              aria-pressed={isActive}
              aria-label={ex.name}
            >
              {ex.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
