import { supabase } from "./supabase";
import {
  Exercise,
  Session,
  SetLog,
  DayType,
  StreakData,
  SessionWithLogs,
  ExerciseWithPrevious,
} from "./database.types";

// ─── Exercises ────────────────────────────────────────
export async function getExercisesByDay(day: DayType): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from("exercises")
    .select("*")
    .eq("day", day)
    .order("order");
  if (error) throw error;
  return data || [];
}

// ─── Sessions ─────────────────────────────────────────
export async function getSessionsByMonth(
  userId: string,
  year: number,
  month: number,
): Promise<Session[]> {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(year, month, 0).toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate)
    .not("completed_at", "is", null)
    .order("date");
  if (error) throw error;
  return data || [];
}

export async function getLastSession(
  userId: string,
  day: DayType,
): Promise<Session | null> {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("day", day)
    .not("completed_at", "is", null)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getLastDayDates(
  userId: string,
): Promise<Record<DayType, string | null>> {
  const result: Record<DayType, string | null> = { A: null, B: null, C: null };
  for (const day of ["A", "B", "C"] as DayType[]) {
    const session = await getLastSession(userId, day);
    result[day] = session?.date || null;
  }
  return result;
}

export async function createSession(
  userId: string,
  day: DayType,
  date: string,
): Promise<Session> {
  const { data, error } = await supabase
    .from("sessions")
    .insert({ user_id: userId, day, date } as never)
    .select()
    .single();
  if (error) throw error;
  return data as Session;
}

export async function completeSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from("sessions")
    .update({ completed_at: new Date().toISOString() } as never)
    .eq("id", sessionId);
  if (error) throw error;
}

// ─── Set Logs ─────────────────────────────────────────
export async function logSet(
  sessionId: string,
  exerciseId: string,
  setNumber: number,
  weight: number,
  reps: number,
  isAmrap: boolean = false,
): Promise<SetLog> {
  // Check if set already exists (upsert)
  const { data: existingRow } = await supabase
    .from("set_logs")
    .select("id")
    .eq("session_id", sessionId)
    .eq("exercise_id", exerciseId)
    .eq("set_number", setNumber)
    .maybeSingle();

  const existing = existingRow as { id: string } | null;
  if (existing) {
    const { data, error } = await supabase
      .from("set_logs")
      .update({
        weight,
        reps,
        is_amrap: isAmrap,
        logged_at: new Date().toISOString(),
      } as never)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw error;
    return data as SetLog;
  }

  const { data, error } = await supabase
    .from("set_logs")
    .insert({
      session_id: sessionId,
      exercise_id: exerciseId,
      set_number: setNumber,
      weight,
      reps,
      is_amrap: isAmrap,
    } as never)
    .select()
    .single();
  if (error) throw error;
  return data as SetLog;
}

// ─── Session Detail ───────────────────────────────────
export async function getSessionDetail(
  sessionId: string,
): Promise<SessionWithLogs | null> {
  const { data: session, error: sErr } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .single();
  if (sErr) throw sErr;
  if (!session) return null;

  const { data: logs, error: lErr } = await supabase
    .from("set_logs")
    .select("*, exercise:exercises(*)")
    .eq("session_id", sessionId)
    .order("set_number");
  if (lErr) throw lErr;

  return { ...(session as Session), set_logs: logs || [] } as SessionWithLogs;
}

export async function getSessionByDate(
  userId: string,
  date: string,
): Promise<Session | null> {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .not("completed_at", "is", null)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ─── Previous Session Data (for ghost text) ───────────
export async function getExercisesWithPrevious(
  userId: string,
  day: DayType,
): Promise<ExerciseWithPrevious[]> {
  const exercises = await getExercisesByDay(day);
  const lastSession = await getLastSession(userId, day);

  if (!lastSession) {
    return exercises.map((e) => ({ ...e, previousSets: [] }));
  }

  const { data: logsData } = await supabase
    .from("set_logs")
    .select("*")
    .eq("session_id", lastSession.id)
    .order("set_number");

  const logs = (logsData || []) as SetLog[];

  return exercises.map((exercise) => ({
    ...exercise,
    previousSets: logs
      .filter((l) => l.exercise_id === exercise.id)
      .map((l) => ({ weight: l.weight, reps: l.reps })),
  }));
}

// ─── Streaks ──────────────────────────────────────────
export async function getStreaks(userId: string): Promise<StreakData> {
  const { data: sessionsData, error } = await supabase
    .from("sessions")
    .select("date")
    .eq("user_id", userId)
    .not("completed_at", "is", null)
    .order("date", { ascending: false });
  if (error) throw error;
  const sessions = (sessionsData || []) as { date: string }[];
  if (sessions.length === 0) return { current: 0, longest: 0 };

  // Get unique dates
  const uniqueDates = [...new Set(sessions.map((s) => s.date))]
    .sort()
    .reverse();

  // Calculate current streak (consecutive days from today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let currentStreak = 0;
  const checkDate = new Date(today);

  for (const dateStr of uniqueDates) {
    const sessionDate = new Date(dateStr + "T00:00:00");
    const diffDays = Math.floor(
      (checkDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 0) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (diffDays === 1 && currentStreak === 0) {
      // Yesterday counts as current streak start
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 2);
    } else {
      break;
    }
  }

  // Calculate longest streak
  let longest = 0;
  let streak = 1;
  const sortedDates = [...new Set(sessions.map((s) => s.date))].sort();

  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1] + "T00:00:00");
    const curr = new Date(sortedDates[i] + "T00:00:00");
    const diff = Math.floor(
      (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diff === 1) {
      streak++;
    } else {
      longest = Math.max(longest, streak);
      streak = 1;
    }
  }
  longest = Math.max(longest, streak);

  return { current: currentStreak, longest };
}

// ─── Check for incomplete session today ───────────────
export async function getActiveSession(
  userId: string,
): Promise<Session | null> {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("date", today)
    .is("completed_at", null)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ─── Get set logs for current session ─────────────────
export async function getSetLogsForSession(
  sessionId: string,
): Promise<SetLog[]> {
  const { data, error } = await supabase
    .from("set_logs")
    .select("*")
    .eq("session_id", sessionId)
    .order("set_number");
  if (error) throw error;
  return data || [];
}
