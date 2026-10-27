"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Calendar } from "@/components/Calendar";
import { useStartWorkoutSheet } from "@/components/StartWorkoutContext";
import { TemplateCard } from "@/components/TemplateCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { Mark } from "@/components/ui/Mark";
import { Ring } from "@/components/ui/Ring";
import { Skeleton, SkeletonList } from "@/components/ui/Skeleton";
import { useAsync } from "@/hooks/useAsync";
import { useStartWorkout } from "@/hooks/useStartWorkout";
import { usePrefs } from "@/components/PreferencesProvider";
import { APP_NAME } from "@/lib/brand";
import { friendlyDate, relativeDays, todayStr } from "@/lib/dates";
import { displayName, firstName } from "@/lib/profile";
import { getActiveSession, getHomeStats, getRecentSessions, getTemplates } from "@/lib/queries";
import { readGoal } from "@/lib/goal";

export function HomeContent() {
  const { user } = useAuth();
  const userId = user!.id;
  const router = useRouter();
  const { prefs } = usePrefs();
  const { openStart } = useStartWorkoutSheet();
  const { start, starting } = useStartWorkout(userId);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });

  const goal = readGoal();
  const { data: stats } = useAsync(() => getHomeStats(userId, goal), [userId, goal]);
  const { data: active, loading: activeLoading } = useAsync(
    () => getActiveSession(userId),
    [userId],
  );
  const { data: templates, loading: templatesLoading } = useAsync(
    () => getTemplates(userId),
    [userId],
  );
  const { data: recent } = useAsync(() => getRecentSessions(userId, 3), [userId]);

  const name = displayName(user);
  const weekRatio = stats ? Math.min(1, stats.week.completed / Math.max(1, stats.week.goal)) : 0;

  /** Recently used templates first; unused ones fill the rest by list order. */
  const quickStart = useMemo(() => {
    if (!templates?.length) return [];
    return [...templates]
      .sort((a, b) => {
        if (a.lastPerformed && b.lastPerformed) {
          return b.lastPerformed.localeCompare(a.lastPerformed);
        }
        if (a.lastPerformed) return -1;
        if (b.lastPerformed) return 1;
        return a.position - b.position;
      })
      .slice(0, 4);
  }, [templates]);

  return (
    <div className="px-4 pt-safe">
      <header className="flex items-center justify-between gap-3 pt-3 pb-5">
        <div className="flex items-center gap-2.5">
          <Mark size={34} />
          <span className="font-display text-[22px] font-extrabold tracking-[-0.02em]">
            {APP_NAME}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-[13px] text-fg-muted">{friendlyDate(todayStr())}</p>
          <button
            type="button"
            onClick={() => router.push("/profile")}
            aria-label="Your profile"
            className="rounded-full active:opacity-70"
          >
            <Avatar name={name} size={36} />
          </button>
        </div>
      </header>

      <div>
        <h1 className="font-display text-[30px] font-extrabold leading-tight tracking-[-0.02em]">
          {greeting()}, {firstName(user)}.
        </h1>
        <p className="mt-1 text-[15px] text-fg-muted">
          {stats
            ? stats.week.completed >= stats.week.goal
              ? "Weekly goal hit. Anything extra is a bonus."
              : `${stats.week.goal - stats.week.completed} to go this week.`
            : "Let's see what today looks like."}
        </p>
      </div>

      {/* Weekly ring + streak */}
      <Card className="mt-5 flex items-center gap-5">
        <Ring
          value={weekRatio}
          size={92}
          label={`${stats?.week.completed ?? 0} of ${stats?.week.goal ?? goal} workouts this week`}
        >
          <span className="font-display text-[22px] font-extrabold leading-none tabular">
            {stats?.week.completed ?? 0}
          </span>
          <span className="text-[11px] font-medium text-fg-muted">of {stats?.week.goal ?? goal}</span>
        </Ring>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-fg-subtle">
            This week
          </p>
          <p className="mt-1 font-display text-[19px] font-bold">
            {stats?.week.completed ?? 0} of {stats?.week.goal ?? goal} done
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-[13.5px] text-fg-muted">
            <span className={stats?.streaks.current ? "text-heat" : "text-fg-subtle"}>
              <Icon name="flame" size={16} filled={Boolean(stats?.streaks.current)} />
            </span>
            {stats?.streaks.current
              ? `${stats.streaks.current} week streak`
              : "Train this week to start a streak"}
          </div>
        </div>
      </Card>

      {/* Resume / start */}
      {activeLoading ? (
        <Skeleton className="mt-3 h-[88px] w-full" />
      ) : active ? (
        <Card tone="accent" className="mt-3">
          <p className="text-[13px] font-semibold uppercase tracking-wide opacity-70">
            In progress
          </p>
          <p className="mt-1 font-display text-[22px] font-extrabold">
            {active.title ?? "Freestyle session"}
          </p>
          <p className="mt-0.5 text-[13.5px] opacity-80">
            Started {relativeDays(active.date)}
          </p>
          <Button
            block
            size="lg"
            variant="secondary"
            className="mt-3 !bg-[var(--on-accent)] !text-[var(--accent)]"
            icon="play"
            onClick={() => router.push(`/log/${active.id}`)}
          >
            Pick up where you left off
          </Button>
        </Card>
      ) : null}

      {/* Quick start */}
      <section className="mt-7">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="font-display text-[19px] font-bold">Quick start</h2>
          <button
            type="button"
            onClick={() => router.push("/workouts")}
            className="flex h-9 items-center gap-1 rounded-full px-2 text-[13.5px] font-semibold text-accent-fg"
          >
            All workouts <Icon name="chevronRight" size={15} />
          </button>
        </div>

        {templatesLoading && <SkeletonList rows={2} />}

        {!templatesLoading && templates && templates.length === 0 && (
          <Card className="text-center">
            <p className="font-display text-[17px] font-bold">No workouts yet</p>
            <p className="mt-1 text-[14px] text-fg-muted">
              Build your first one, or import the starter split.
            </p>
            <Button block size="lg" icon="plus" className="mt-4" onClick={() => router.push("/workouts/new")}>
              Create a workout
            </Button>
          </Card>
        )}

        <div className="space-y-2.5">
          {quickStart.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              compact
              onPress={() => void start(template.id)}
            />
          ))}
        </div>

        {templates && templates.length > 0 && (
          <Button
            block
            variant="ghost"
            size="md"
            icon="bolt"
            className="mt-2"
            loading={starting}
            onClick={() => void start(null)}
          >
            Freestyle session
          </Button>
        )}
      </section>

      {/* Calendar */}
      <section className="mt-7">
        <h2 className="mb-2.5 font-display text-[19px] font-bold">Your month</h2>
        <Calendar
          userId={userId}
          year={month.year}
          month={month.month}
          onMonthChange={(year, m) => setMonth({ year, month: m })}
          onSelectSession={(session) =>
            router.push(session.completed_at ? `/history/${session.id}` : `/log/${session.id}`)
          }
          onSelectEmptyDate={(date) => openStart(date)}
        />
      </section>

      {/* Recent */}
      {recent && recent.length > 0 && (
        <section className="mt-7">
          <h2 className="mb-2.5 font-display text-[19px] font-bold">Recent sessions</h2>
          <div className="space-y-2">
            {recent.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => router.push(`/history/${session.id}`)}
                className="flex min-h-16 w-full items-center gap-3 rounded-[var(--radius-md)] bg-surface px-4 py-3 text-left shadow-soft active:scale-[0.99]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                  <Icon name="check" size={18} strokeWidth={2.6} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">
                    {session.title ?? "Freestyle session"}
                  </span>
                  <span className="block text-[12.5px] text-fg-muted">
                    {relativeDays(session.date)}
                  </span>
                </span>
                <Icon name="chevronRight" size={18} className="shrink-0 text-fg-subtle" />
              </button>
            ))}
          </div>
        </section>
      )}

      <p className="mt-8 text-center text-[12.5px] text-fg-subtle">
        {prefs.palette} · {prefs.theme === "system" ? "auto theme" : `${prefs.theme} theme`}
      </p>
    </div>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
}
