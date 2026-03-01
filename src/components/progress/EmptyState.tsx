"use client";

interface EmptyStateProps {
  /** Override main message (e.g. "NO AMRAP SETS CONFIGURED") */
  message?: string;
  /** Override sub-label */
  sublabel?: string;
}

/**
 * Centered empty state: large bold message, small gray sub-label.
 * No data dependencies — pure UI.
 */
export function EmptyState({ message = "NO DATA YET", sublabel = "Log more sessions to see this" }: EmptyStateProps) {
  return (
    <div className="flex min-h-[40dvh] w-full flex-col items-center justify-center px-4 py-12 text-center">
      <p className="text-xl font-bold text-[#F2F2F0]">
        {message}
      </p>
      <p className="mt-2 text-[10px] font-normal uppercase tracking-[0.2em] text-[#3A3A3A]">
        {sublabel}
      </p>
    </div>
  );
}
