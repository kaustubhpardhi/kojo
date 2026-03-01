"use client";

/**
 * Centered empty state: large bold "NO DATA YET", small gray sub-label.
 * No data dependencies — pure UI.
 */
export function EmptyState() {
  return (
    <div className="flex min-h-[40dvh] w-full flex-col items-center justify-center px-4 py-12 text-center">
      <p className="text-xl font-bold text-[#F2F2F0]">
        NO DATA YET
      </p>
      <p className="mt-2 text-[10px] font-normal uppercase tracking-[0.2em] text-[#3A3A3A]">
        Log more sessions to see this
      </p>
    </div>
  );
}
