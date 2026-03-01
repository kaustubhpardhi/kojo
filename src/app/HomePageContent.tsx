"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Calendar } from "@/components/Calendar";
import { DayPicker } from "@/components/DayPicker";
import { LoadingScreen } from "@/components/LoadingScreen";
import { SessionSummary } from "@/components/SessionSummary";
import { signOut } from "@/lib/auth";
import {
  getSessionsForMonth,
  getStreaks,
  getLastDayDates,
  createSession,
  getSessionByDate,
  getSessionDetail,
  getActiveSession,
  getMostRecentCompletedSession,
} from "@/lib/queries";
import type {
  Session,
  DayType,
  SessionWithLogs,
} from "@/lib/database.types";

const DAY_FOCUS: Record<DayType, string> = {
  A: "Chest + Back + Arms",
  B: "Legs + Posterior Chain",
  C: "Back + Shoulders + Arms",
};

export function HomePageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [lastDayDates, setLastDayDates] = useState<Record<DayType, string | null>>({
    A: null,
    B: null,
    C: null,
  });
  const [lastSession, setLastSession] = useState<SessionWithLogs | null>(null);
  const [streaks, setStreaks] = useState({ current: 0, longest: 0 });
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const [summarySession, setSummarySession] = useState<SessionWithLogs | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [showProfile, setShowProfile] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoadingData(true);
    try {
      const [sessionsData, dayDates, recentSession, streakData] = await Promise.all([
        getSessionsForMonth(user.id, year, month),
        getLastDayDates(user.id),
        getMostRecentCompletedSession(user.id),
        getStreaks(user.id),
      ]);
      setSessions(sessionsData);
      setLastDayDates(dayDates);
      setLastSession(recentSession);
      setStreaks(streakData);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoadingData(false);
    }
  }, [user, year, month]);

  useEffect(() => {
    if (!loading && user) loadData();
  }, [user, loading, loadData]);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    const summaryId = searchParams.get("summary");
    if (!summaryId || !user) return;
    let cancelled = false;
    getSessionDetail(summaryId).then((detail) => {
      if (cancelled || !detail) return;
      setSummarySession(detail);
      setShowSummary(true);
    });
    return () => { cancelled = true; };
  }, [searchParams, user]);

  const handlePrevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); } else setMonth((m) => m - 1);
  };
  const handleNextMonth = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); } else setMonth((m) => m + 1);
  };

  const handleDayClick = async (date: string, session?: Session) => {
    if (session) {
      if (session.completed_at) {
        try {
          const detail = await getSessionDetail(session.id);
          setSummarySession(detail);
          setShowSummary(true);
        } catch (err) {
          console.error("Failed to load session detail:", err);
        }
      } else {
        router.push(`/log/${session.id}`);
      }
      return;
    }
    if (user) {
      const existing = await getSessionByDate(user.id, date);
      if (existing) {
        const detail = await getSessionDetail(existing.id);
        setSummarySession(detail);
        setShowSummary(true);
        return;
      }
    }
    const dateObj = new Date(date + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dateObj >= today) {
      const isToday =
        dateObj.getFullYear() === today.getFullYear() &&
        dateObj.getMonth() === today.getMonth() &&
        dateObj.getDate() === today.getDate();
      if (isToday && user) {
        const active = await getActiveSession(user.id);
        if (active) {
          router.push(`/log/${active.id}`);
          return;
        }
      }
      setSelectedDate(date);
      setShowDayPicker(true);
    }
  };

  const handleDaySelect = async (day: DayType) => {
    if (!user) return;
    setShowDayPicker(false);
    try {
      const session = await createSession(user.id, day, selectedDate);
      router.push(`/log/${session.id}`);
    } catch (err) {
      console.error("Failed to create session:", err);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  if (loading || loadingData) {
    return <LoadingScreen />;
  }

  if (!user) return null;

  const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const todaySession = sessions.find((s) => s.date === todayDateStr);
  const dateLabel = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const startWorkoutToday = async (day: DayType) => {
    if (!user) return;
    try {
      const session = await createSession(user.id, day, todayDateStr);
      router.push(`/log/${session.id}`);
    } catch (err) {
      console.error("Failed to create session:", err);
    }
  };

  function formatLastDone(dateStr: string | null): string {
    if (!dateStr) return "Never done";
    const date = new Date(dateStr + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    if (diff < 7) return `${diff} days ago`;
    if (diff < 30) return `${Math.floor(diff / 7)} weeks ago`;
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <div className="min-h-dvh bg-[#0A0A0A] text-[#F2F2F0]">
      <header className="border-b border-[#3A3A3A] px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="font-display text-xl font-bold text-[#C8FF00] tracking-tight">
            KOJO
          </span>
          <Link
            href="/progress"
            className="tap-flash text-[10px] font-bold uppercase tracking-[0.2em] text-[#3A3A3A] hover:text-[#F2F2F0]"
          >
            Progress
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowProfile(!showProfile)}
            className={`tap-flash w-11 h-11 flex items-center justify-center border-2 bg-[#0A0A0A] font-bold text-sm ${showProfile ? "border-[#C8FF00] text-[#C8FF00]" : "border-[#C8FF00] text-[#C8FF00]"}`}
            aria-label="Account"
          >
            {user.user_metadata?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.user_metadata.avatar_url}
                alt=""
                className="w-7 h-7 object-cover block"
              />
            ) : (
              (user.email?.[0] ?? "A").toUpperCase()
            )}
          </button>
          {showProfile && (
            <div className="absolute right-4 top-14 z-50 border border-[#3A3A3A] bg-[#0A0A0A] p-4 min-w-[200px]">
              <p className="text-[10px] text-[#3A3A3A] tracking-widest uppercase mb-2 truncate">
                {user.email}
              </p>
              <button
                type="button"
                onClick={handleSignOut}
                className="tap-flash w-full py-2 text-left text-xs font-bold text-[#F2F2F0] border-t border-[#3A3A3A]"
              >
                SIGN OUT
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="px-4 pt-6 pb-8">
        {/* Poster block: date + workout name or pick-workout CTA */}
        <div className="mb-6">
          <p
            className="text-[10px] font-normal uppercase tracking-[0.25em] text-[#3A3A3A] mb-2"
          >
            {dateLabel.toUpperCase()}
          </p>
          {todaySession ? (
            <h1 className="font-display text-[64px] leading-none font-bold text-[#F2F2F0] tracking-tight">
              {DAY_FOCUS[todaySession.day].toUpperCase()}
            </h1>
          ) : (
            <div className="border border-[#3A3A3A]">
              <p className="text-[10px] font-normal uppercase tracking-[0.2em] text-[#3A3A3A] px-4 pt-3 pb-2">
                Start workout
              </p>
              {(["A", "B", "C"] as DayType[]).map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => startWorkoutToday(day)}
                  className="tap-flash w-full text-left py-3 px-4 border-t border-[#3A3A3A] flex items-baseline justify-between gap-3"
                >
                  <span className="font-bold text-[#F2F2F0]">
                    {DAY_FOCUS[day]}
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-[#3A3A3A] shrink-0">
                    Last: {formatLastDone(lastDayDates[day])}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <hr className="border-0 h-px bg-[#3A3A3A] w-full my-6" />

        {/* Last session stats — only when a workout is selected for today */}
        {todaySession && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div>
                <p className={`text-3xl font-bold tabular-nums ${streaks.current > 0 ? "text-[#C8FF00]" : "text-[#F2F2F0]"}`}>
                  {lastSession ? new Set(lastSession.set_logs.map((l) => l.exercise_id)).size : "—"}
                </p>
                <p className="text-[10px] font-normal uppercase tracking-[0.2em] text-[#3A3A3A] mt-1">
                  Exercises
                </p>
              </div>
              <div>
                <p className="text-3xl font-bold tabular-nums text-[#F2F2F0]">
                  {lastSession ? lastSession.set_logs.length : "—"}
                </p>
                <p className="text-[10px] font-normal uppercase tracking-[0.2em] text-[#3A3A3A] mt-1">
                  Sets
                </p>
              </div>
              <div>
                <p className={`text-3xl font-bold tabular-nums ${streaks.current > 0 ? "text-[#C8FF00]" : "text-[#F2F2F0]"}`}>
                  {streaks.current}
                </p>
                <p className="text-[10px] font-normal uppercase tracking-[0.2em] text-[#3A3A3A] mt-1">
                  Streak
                </p>
              </div>
            </div>
            <hr className="border-0 h-px bg-[#3A3A3A] w-full my-6" />
          </>
        )}

        {/* Calendar */}
        <Calendar
          year={year}
          month={month}
          sessions={sessions}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onDayClick={handleDayClick}
        />
      </div>

      <DayPicker
        isOpen={showDayPicker}
        onClose={() => setShowDayPicker(false)}
        onSelect={handleDaySelect}
        lastDayDates={lastDayDates}
        selectedDate={selectedDate}
      />

      <SessionSummary
        session={summarySession}
        isOpen={showSummary}
        onClose={() => {
          setShowSummary(false);
          setSummarySession(null);
          if (searchParams.get("summary")) router.replace("/");
        }}
      />
    </div>
  );
}
