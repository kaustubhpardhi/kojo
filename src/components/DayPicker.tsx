"use client";

import { DayType } from "@/lib/database.types";

interface DayPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (day: DayType) => void;
  lastDayDates: Record<DayType, string | null>;
  selectedDate: string;
}

interface DayInfo {
  day: DayType;
  label: string;
}

const DAYS: DayInfo[] = [
  { day: "A", label: "Chest + Back + Arms" },
  { day: "B", label: "Legs + Posterior Chain" },
  { day: "C", label: "Back + Shoulders + Arms" },
];

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return "Never done";
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor(
    (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff} days ago`;
  if (diff < 30) return `${Math.floor(diff / 7)} weeks ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function DayPicker({
  isOpen,
  onClose,
  onSelect,
  lastDayDates,
  selectedDate,
}: DayPickerProps) {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-[#0A0A0A]"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        role="button"
        tabIndex={0}
        aria-label="Close"
      />
      <div className="fixed inset-0 z-50 bg-[#0A0A0A] p-4 overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-[#F2F2F0] uppercase tracking-wide">
            Choose workout
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="tap-flash w-10 h-10 flex items-center justify-center border border-[#3A3A3A] text-[#F2F2F0] font-bold"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <p className="text-[10px] uppercase tracking-widest text-[#3A3A3A] mb-6">
          {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>

        <hr className="border-0 h-px bg-[#3A3A3A] w-full mb-6" />

        <div>
          {DAYS.map((dayInfo) => (
            <button
              key={dayInfo.day}
              type="button"
              onClick={() => onSelect(dayInfo.day)}
              className="tap-flash w-full py-4 flex items-center justify-between border-b border-[#3A3A3A] text-left"
            >
              <span className="font-bold text-[#F2F2F0]">
                {dayInfo.label}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-[#3A3A3A]">
                Last: {formatRelativeDate(lastDayDates[dayInfo.day])}
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
