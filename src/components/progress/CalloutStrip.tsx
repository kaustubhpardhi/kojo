"use client";

export interface CalloutItem {
  /** Big number or short text (e.g. "12", "3.2", "↑ 2.5") */
  value: string | number;
  /** Optional small line between value and label (e.g. "EST. 1RM") */
  valueSub?: string;
  /** Small label below (e.g. "ALL-TIME BEST", "THIS WEEK") */
  label: string;
  /** If true, value uses lime accent */
  accent?: boolean;
}

interface CalloutStripProps {
  /** Exactly three items for the 3-column strip */
  items: [CalloutItem, CalloutItem, CalloutItem];
}

/**
 * Bottom callout strip: 3 key numbers in bold/small-label format.
 * Full-width, 1px rules between columns. No data dependencies — pure UI.
 */
export function CalloutStrip({ items }: CalloutStripProps) {
  return (
    <div className="grid w-full grid-cols-3 gap-0 border-t border-[#3A3A3A] bg-[#0A0A0A] py-4">
      {items.map((item, i) => (
        <div
          key={i}
          className={`flex flex-col items-center justify-center ${
            i > 0 ? "border-l border-[#3A3A3A]" : ""
          }`}
        >
          <p
            className={`text-xl font-bold tabular-nums ${
              item.accent ? "text-[#C8FF00]" : "text-[#F2F2F0]"
            }`}
          >
            {item.value}
          </p>
          {item.valueSub ? (
            <p className="mt-0.5 text-[9px] font-normal uppercase tracking-widest text-[#3A3A3A]">
              {item.valueSub}
            </p>
          ) : null}
          <p className={`text-[10px] font-normal uppercase tracking-[0.2em] text-[#3A3A3A] ${item.valueSub ? "mt-0.5" : "mt-1"}`}>
            {item.label}
          </p>
        </div>
      ))}
    </div>
  );
}
