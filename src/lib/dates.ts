/**
 * Local-date helpers. Everything here works on "YYYY-MM-DD" strings in the
 * user's own timezone.
 *
 * The old code built dates at local midnight and then called toISOString(),
 * which shifts the date backwards in any timezone ahead of UTC (e.g. IST,
 * UTC+5:30) — that silently broke streaks and the consistency heatmap.
 */

/** YYYY-MM-DD for a Date, in local time. */
export function toDateStr(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayStr(): string {
  return toDateStr(new Date());
}

export function addDays(dateStr: string, days: number): string {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

/** Monday of the ISO week containing dateStr. */
export function weekStart(dateStr: string): string {
  const d = parseDate(dateStr);
  const dow = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return toDateStr(d);
}

/** 0 = Monday … 6 = Sunday. */
export function isoDayOfWeek(dateStr: string): number {
  const dow = parseDate(dateStr).getDay();
  return dow === 0 ? 6 : dow - 1;
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86_400_000);
}

export function monthRange(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end = toDateStr(new Date(year, month, 0));
  return { start, end };
}

export function formatDate(
  dateStr: string,
  opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" },
): string {
  return parseDate(dateStr).toLocaleDateString(undefined, opts);
}

/** "Today", "Yesterday", "Mon 3 Mar". */
export function friendlyDate(dateStr: string): string {
  const today = todayStr();
  if (dateStr === today) return "Today";
  if (dateStr === addDays(today, -1)) return "Yesterday";
  if (dateStr === addDays(today, 1)) return "Tomorrow";
  return formatDate(dateStr, { weekday: "short", month: "short", day: "numeric" });
}

/** "3 days ago", "2 weeks ago". */
export function relativeDays(dateStr: string): string {
  const diff = daysBetween(dateStr, todayStr());
  if (diff <= 0) return "today";
  if (diff === 1) return "yesterday";
  if (diff < 7) return `${diff} days ago`;
  const weeks = Math.floor(diff / 7);
  if (weeks === 1) return "last week";
  if (weeks < 5) return `${weeks} weeks ago`;
  const months = Math.floor(diff / 30);
  return months <= 1 ? "a month ago" : `${months} months ago`;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Weeks with >= 1 completed session, counted back from the current week. */
export function computeStreaks(dates: string[]): { current: number; longest: number } {
  if (dates.length === 0) return { current: 0, longest: 0 };

  const weeks = new Set(dates.map(weekStart));
  const sorted = [...weeks].sort();
  const thisWeek = weekStart(todayStr());

  // A streak survives until the current week has ended.
  let cursor = weeks.has(thisWeek) ? thisWeek : addDays(thisWeek, -7);
  let current = 0;
  while (weeks.has(cursor)) {
    current++;
    cursor = addDays(cursor, -7);
  }

  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    run = sorted[i] === addDays(sorted[i - 1], 7) ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  return { current, longest: Math.max(longest, current) };
}
