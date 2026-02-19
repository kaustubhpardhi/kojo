"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/components/AuthProvider";
import { useTheme } from "@/components/ThemeProvider";
import { Particles } from "@/components/Particles";
import { Calendar } from "@/components/Calendar";
import { StreakDisplay } from "@/components/StreakDisplay";
import { DayPicker } from "@/components/DayPicker";
import { SessionSummary } from "@/components/SessionSummary";
import { signOut } from "@/lib/auth";
import {
  getSessionsByMonth,
  getStreaks,
  getLastDayDates,
  createSession,
  getSessionByDate,
  getSessionDetail,
  getActiveSession,
} from "@/lib/queries";
import {
  Session,
  DayType,
  StreakData,
  SessionWithLogs,
} from "@/lib/database.types";
import { getDailyQuote } from "@/lib/quotes";

export default function HomePage() {
  const { user, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [streaks, setStreaks] = useState<StreakData>({
    current: 0,
    longest: 0,
  });
  const [lastDayDates, setLastDayDates] = useState<
    Record<DayType, string | null>
  >({
    A: null,
    B: null,
    C: null,
  });
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const [summarySession, setSummarySession] = useState<SessionWithLogs | null>(
    null,
  );
  const [loadingData, setLoadingData] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [quote, setQuote] = useState(() => getDailyQuote());

  useEffect(() => {
    setQuote(getDailyQuote());
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoadingData(true);
    try {
      const [sessionsData, streakData, dayDates] = await Promise.all([
        getSessionsByMonth(user.id, year, month),
        getStreaks(user.id),
        getLastDayDates(user.id),
      ]);
      setSessions(sessionsData);
      setStreaks(streakData);
      setLastDayDates(dayDates);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoadingData(false);
    }
  }, [user, year, month]);

  useEffect(() => {
    if (!loading && user) {
      loadData();
    }
  }, [user, loading, loadData]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);


  // Open summary when navigating from log page with completed session (?summary=sessionId)
  useEffect(() => {
    const summaryId = searchParams.get("summary");
    if (!summaryId || !user) return;
    let cancelled = false;
    getSessionDetail(summaryId).then((detail) => {
      if (cancelled || !detail) return;
      setSummarySession(detail);
      setShowSummary(true);
    });
    return () => {
      cancelled = true;
    };
  }, [searchParams, user]);

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const handleDayClick = async (date: string, session?: Session) => {
    if (session) {
      // Past completed session — show summary
      try {
        const detail = await getSessionDetail(session.id);
        setSummarySession(detail);
        setShowSummary(true);
      } catch (err) {
        console.error("Failed to load session detail:", err);
      }
      return;
    }

    // Check if there's already a completed session on this date
    if (user) {
      const existing = await getSessionByDate(user.id, date);
      if (existing) {
        const detail = await getSessionDetail(existing.id);
        setSummarySession(detail);
        setShowSummary(true);
        return;
      }
    }

    // Today or future — if today and has in-progress session, go to it; else day picker
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
    return (
      <div
        className="min-h-dvh flex items-center justify-center"
        style={{ background: "var(--bg-primary)" }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <span
            className="text-5xl font-black animate-pulse neon-text"
            style={{
              fontFamily: "var(--font-jp)",
              color: "var(--accent-primary)",
            }}
          >
            工
          </span>
        </motion.div>
      </div>
    );
  }

  if (!loading && !user) return null;
  if (!user) return null;
  const currentUser = user;

  return (
    <div
      className="min-h-dvh relative"
      style={{ background: "var(--bg-primary)" }}
    >
      <Particles />

      {/* Header - Fixed floating style */}
      <header className="fixed top-0 left-0 right-0 z-50 px-5 pt-6 pb-4 pointer-events-none">
        <div className="flex items-center justify-between pointer-events-auto">
          <div>
            <h1
              className="text-2xl font-black tracking-tight neon-text"
              style={{
                fontFamily: "var(--font-jp)",
                color: "var(--accent-primary)",
              }}
            >
              kōjō
            </h1>
            <p
              className="text-[10px] tracking-[0.3em] uppercase"
              style={{ color: "var(--text-tertiary)" }}
            >
              工場 · workout log
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="w-9 h-9 flex items-center justify-center transition-all active:opacity-60"
            >
              <span className="text-xl opacity-80">
                {theme === "dark" ? "☼" : "☾"}
              </span>
            </button>

            <div className="relative">
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="w-9 h-9 flex items-center justify-center transition-all active:opacity-60 overflow-hidden"
              >
                {currentUser.user_metadata?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentUser.user_metadata.avatar_url}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover border border-transparent hover:border-[var(--border-color)] transition-colors"
                  />
                ) : (
                  <span className="text-xl opacity-80">👤</span>
                )}
              </button>
              {showProfile && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="absolute right-0 top-12 z-50 rounded-xl p-3 min-w-[160px]"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    boxShadow: "var(--shadow-lg)",
                  }}
                >
                  <p
                    className="text-xs truncate mb-2 px-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {currentUser.email}
                  </p>
                  <button
                    onClick={handleSignOut}
                    className="w-full py-2 px-3 rounded-lg text-sm text-left transition-all hover:opacity-80"
                    style={{ color: "var(--amrap-color)" }}
                  >
                    Sign Out
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area - Centered vertically */}
      <div className="relative z-10 flex flex-col justify-center min-h-dvh px-4 pt-20 pb-12">
        <div className="space-y-12">
          {/* Streaks */}
          <StreakDisplay streaks={streaks} />

          {/* Calendar */}
          <div
            className="rounded-2xl p-4"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              boxShadow: "var(--shadow-md)",
            }}
          >
            <Calendar
              year={year}
              month={month}
              sessions={sessions}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
              onDayClick={handleDayClick}
            />
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-8 opacity-25">
            {[
              { kanji: "胸", label: "Chest" },
              { kanji: "脚", label: "Legs" },
              { kanji: "肩", label: "Back" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-1.5 grayscale"
              >
                <span
                  className="text-sm font-bold"
                  style={{
                    fontFamily: "var(--font-jp)",
                    color: "var(--stamp-color)",
                  }}
                >
                  {item.kanji}
                </span>
                <span
                  className="text-[9px] tracking-[0.2em] uppercase"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Quote - Deep Philosophical Insight */}
        <div className="mt-24 text-center max-w-[340px] mx-auto opacity-80 select-none">
          <p
            className="text-2xl font-bold tracking-[0.5em] mb-4 neon-text"
            style={{
              fontFamily: "var(--font-jp)",
              color: "var(--text-primary)",
            }}
          >
            {quote.jp}
          </p>
          <p
            className="text-sm leading-relaxed tracking-[0.1em] lowercase italic font-light px-4"
            style={{ color: "var(--text-secondary)" }}
          >
            {quote.text}
          </p>
        </div>
      </div>

      {/* Day Picker */}
      <DayPicker
        isOpen={showDayPicker}
        onClose={() => setShowDayPicker(false)}
        onSelect={handleDaySelect}
        lastDayDates={lastDayDates}
        selectedDate={selectedDate}
      />

      {/* Session Summary */}
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
