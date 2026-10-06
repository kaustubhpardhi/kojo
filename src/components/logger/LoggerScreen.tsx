"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../AuthProvider";
import { ExercisePicker } from "../ExercisePicker";
import { LoadingScreen } from "../LoadingScreen";
import { Button, IconButton } from "../ui/Button";
import { Burst } from "../ui/Burst";
import { EmptyState } from "../ui/EmptyState";
import { Icon } from "../ui/Icon";
import { Sheet } from "../ui/Sheet";
import { useToast } from "../ui/Toast";
import { RestTimer } from "./RestTimer";
import { SessionComplete } from "./SessionComplete";
import { SessionOverview } from "./SessionOverview";
import { SetEntry } from "./SetEntry";
import { SetRow } from "./SetRow";
import { SwapSheet } from "./SwapSheet";
import { useLiveSession } from "@/hooks/useLiveSession";
import { friendlyDate } from "@/lib/dates";
import { deleteSession, getTemplate, updateTemplate, toPlan } from "@/lib/queries";
import { spring } from "@/lib/motion";
import type { Exercise, LoggedSet } from "@/lib/database.types";

const ENCOURAGEMENT = [
  "Nice. Set {n} down.",
  "That's {n}. Keep it tidy.",
  "Logged. Set {n} in the bank.",
  "Clean rep work. {n} done.",
  "Set {n}. You're rolling.",
];

export function LoggerScreen({ sessionId }: { sessionId: string }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  if (authLoading || !user) return <LoadingScreen />;
  return <Logger sessionId={sessionId} userId={user.id} router={router} toast={toast} />;
}

type Router = ReturnType<typeof useRouter>;
type Toast = ReturnType<typeof useToast>["toast"];

function Logger({
  sessionId,
  userId,
  router,
  toast,
}: {
  sessionId: string;
  userId: string;
  router: Router;
  toast: Toast;
}) {
  const live = useLiveSession(userId, sessionId);
  const {
    session,
    exercises,
    current,
    index,
    setIndex,
    loading,
    notFound,
    totals,
    recordSet,
    removeSet,
    setStatus,
    setTargetSets,
    addExercise,
    swapExercise,
    removeExercise,
    reorder,
    finish,
    completing,
  } = live;

  const [overviewOpen, setOverviewOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [restFor, setRestFor] = useState<number | null>(null);
  const [editingSet, setEditingSet] = useState<LoggedSet | undefined>();
  const [celebrating, setCelebrating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [prSets, setPrSets] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (session?.completed_at) router.replace(`/history/${sessionId}`);
  }, [session?.completed_at, router, sessionId]);

  if (loading) return <LoadingScreen />;

  if (notFound || !session) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-safe">
        <EmptyState
          icon="cloudOff"
          title="We couldn't find that session"
          body="It may have been deleted on another device."
          action={<Button onClick={() => router.replace("/")}>Back home</Button>}
        />
      </div>
    );
  }

  if (isComplete) {
    return (
      <SessionComplete
        title={session.title ?? "Workout"}
        date={session.date}
        exerciseCount={exercises.filter((e) => e.logged.size > 0).length}
        setCount={totals.logged}
        volume={totals.volume}
        prCount={prSets.size}
        userId={userId}
        onDone={() => router.replace("/")}
      />
    );
  }

  const activeExercises = exercises.filter((e) => e.status !== "skipped");
  const progress = totals.target > 0 ? totals.logged / totals.target : 0;

  const handleLog = async (set: LoggedSet) => {
    if (!current) return;
    const wasEditing = Boolean(editingSet);
    setEditingSet(undefined);

    const { isPR } = await recordSet(set);
    if (isPR) {
      setPrSets((prev) => new Set(prev).add(`${current.exercise_id}-${set.setNumber}`));
      setCelebrating(true);
      setTimeout(() => setCelebrating(false), 1100);
      toast({ message: `New PR — ${set.weight} kg!`, icon: "trophy", tone: "success" });
    } else if (!wasEditing) {
      const line = ENCOURAGEMENT[set.setNumber % ENCOURAGEMENT.length];
      toast({ message: line.replace("{n}", String(set.setNumber)), icon: "check" });
    }

    const setsDone = current.logged.size + (current.logged.has(set.setNumber) ? 0 : 1);
    if (!wasEditing && setsDone < current.target_sets && current.rest_seconds > 0) {
      setRestFor(current.rest_seconds);
    }
  };

  const handleSwap = async (to: Exercise, updateTemplateToo: boolean) => {
    if (!current) return;
    const fromName = current.exercise.name;
    const fromId = current.exercise_id;
    try {
      await swapExercise(current.id, to);
    } catch (err) {
      console.error("Failed to swap exercise", err);
      toast({ message: "Couldn't swap that exercise", icon: "x", tone: "danger" });
      return;
    }

    if (updateTemplateToo && session.template_id) {
      try {
        const template = await getTemplate(session.template_id);
        if (template) {
          await updateTemplate(session.template_id, {
            name: template.name,
            emoji: template.emoji,
            color: template.color,
            exercises: template.exercises.map((row) =>
              row.exercise_id === fromId
                ? { ...toPlan(row), exercise_id: to.id }
                : toPlan(row),
            ),
          });
        }
      } catch (err) {
        console.error("Failed to update template", err);
        toast({ message: "Swapped here, but the template didn't save", icon: "x", tone: "danger" });
        return;
      }
    }

    toast({
      message: updateTemplateToo
        ? `${to.name} swapped in everywhere`
        : `${fromName} → ${to.name} for today`,
      icon: "swap",
    });
  };

  const goNext = async () => {
    const nextIndex = exercises.findIndex(
      (e, i) => i > index && e.status === "pending" && e.logged.size < e.target_sets,
    );
    if (current && current.logged.size >= current.target_sets) {
      await setStatus(current.id, "done");
    }
    if (nextIndex !== -1) {
      setIndex(nextIndex);
      setRestFor(null);
      return;
    }
    const done = await finish();
    if (done) setIsComplete(true);
  };

  const nextSetNumber = (() => {
    if (!current) return 1;
    for (let i = 1; i <= current.target_sets; i++) {
      if (!current.logged.has(i)) return i;
    }
    return current.target_sets + 1;
  })();

  const exerciseDone = current ? current.logged.size >= current.target_sets : false;
  const isLastExercise =
    exercises.findIndex(
      (e, i) => i > index && e.status === "pending" && e.logged.size < e.target_sets,
    ) === -1;

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <header className="sticky top-0 z-20 bg-bg/95 px-4 pb-3 pt-safe backdrop-blur-xl">
        <div className="flex items-center gap-2 pt-2">
          <IconButton
            icon="chevronLeft"
            label="Leave workout"
            variant="ghost"
            onClick={() => setExitOpen(true)}
            className="-ml-3"
          />
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate font-display text-[17px] font-bold">
              {session.title ?? "Freestyle session"}
            </p>
            <p className="text-[12.5px] text-fg-muted">
              {friendlyDate(session.date)} · {totals.logged}/{totals.target} sets
            </p>
          </div>
          <IconButton
            icon="list"
            label="Session overview"
            variant="ghost"
            onClick={() => setOverviewOpen(true)}
            className="-mr-3"
          />
        </div>

        <div
          className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Session progress"
        >
          <motion.div
            className="h-full rounded-full bg-accent"
            animate={{ width: `${progress * 100}%` }}
            transition={spring.gentle}
          />
        </div>
      </header>

      {!current ? (
        <div className="flex-1 px-4">
          <EmptyState
            icon="bolt"
            title="Freestyle — your call"
            body="Add the first exercise and start logging."
            action={
              <Button size="lg" icon="plus" onClick={() => setPickerOpen(true)}>
                Add an exercise
              </Button>
            }
          />
        </div>
      ) : (
        <div className="flex-1 px-4 pb-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={spring.gentle}
            >
              <div className="relative pb-4 pt-5">
                {celebrating && <Burst origin="top" />}
                <p className="text-[12.5px] font-semibold uppercase tracking-wide text-fg-subtle">
                  Exercise {index + 1} of {activeExercises.length}
                </p>
                <h1 className="mt-1 font-display text-[30px] font-extrabold leading-[1.1] tracking-[-0.02em]">
                  {current.exercise.name}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {current.swapped_from_exercise_id && (
                    <span className="flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-[12px] font-medium text-fg-muted">
                      <Icon name="swap" size={12} /> swapped in
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setSwapOpen(true)}
                    className="flex h-9 items-center gap-1.5 rounded-full bg-surface-2 px-3 text-[13px] font-semibold text-fg-muted active:scale-95"
                  >
                    <Icon name="swap" size={14} /> Swap
                  </button>
                  <button
                    type="button"
                    onClick={() => void setTargetSets(current.id, current.target_sets + 1)}
                    className="flex h-9 items-center gap-1.5 rounded-full bg-surface-2 px-3 text-[13px] font-semibold text-fg-muted active:scale-95"
                  >
                    <Icon name="plus" size={14} /> Add set
                  </button>
                </div>
                {current.notes && (
                  <p className="mt-3 flex gap-2 rounded-[var(--radius-md)] bg-surface-2 p-3 text-[13.5px] leading-relaxed text-fg-muted">
                    <Icon name="note" size={16} className="mt-0.5 shrink-0" />
                    {current.notes}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                {Array.from({ length: current.target_sets }, (_, i) => i + 1).map((n) => (
                  <SetRow
                    key={n}
                    setNumber={n}
                    set={current.logged.get(n)}
                    ghost={current.previousSets.find((s) => s.setNumber === n)}
                    isAmrapTarget={current.amrap_last_set && n === current.target_sets}
                    isPR={prSets.has(`${current.exercise_id}-${n}`)}
                    onEdit={
                      current.logged.has(n) ? () => setEditingSet(current.logged.get(n)) : undefined
                    }
                  />
                ))}
              </div>

              <AnimatePresence>
                {restFor !== null && (
                  <div className="mt-3">
                    <RestTimer
                      duration={restFor}
                      onDismiss={() => setRestFor(null)}
                      onExtend={(extra) => setRestFor((r) => (r ?? 0) + extra)}
                    />
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {current && (
        <div className="sticky bottom-0 z-20 bg-gradient-to-t from-bg via-bg to-transparent px-4 pb-safe pt-4">
          {editingSet || !exerciseDone ? (
            <SetEntry
              exercise={current}
              setNumber={editingSet?.setNumber ?? nextSetNumber}
              isAmrap={
                current.amrap_last_set &&
                (editingSet?.setNumber ?? nextSetNumber) === current.target_sets
              }
              editing={editingSet}
              onLog={(set) => void handleLog(set)}
              onCancelEdit={() => setEditingSet(undefined)}
            />
          ) : (
            <div className="rounded-[var(--radius-lg)] bg-surface p-4 shadow-soft">
              <p className="mb-3 flex items-center gap-2 font-display text-[17px] font-bold">
                <span className="text-success">
                  <Icon name="check" size={20} strokeWidth={2.6} />
                </span>
                {current.exercise.name} done
              </p>
              <Button block size="xl" loading={completing} onClick={() => void goNext()}>
                {isLastExercise ? "Finish workout" : "Next exercise"}
                {!isLastExercise && <Icon name="chevronRight" size={20} />}
              </Button>
            </div>
          )}
        </div>
      )}

      <SessionOverview
        open={overviewOpen}
        onClose={() => setOverviewOpen(false)}
        exercises={exercises}
        currentIndex={index}
        onJump={setIndex}
        onReorder={(next) => void reorder(next)}
        onAdd={() => {
          setOverviewOpen(false);
          setPickerOpen(true);
        }}
        onSkip={(e) => void setStatus(e.id, "skipped")}
        onUnskip={(e) => void setStatus(e.id, "pending")}
        onRemove={(e) => void removeExercise(e.id)}
      />

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        userId={userId}
        onPick={(exercise) => void addExercise(exercise)}
        excludeIds={exercises.map((e) => e.exercise_id)}
        title="Add to this session"
      />

      {current && (
        <SwapSheet
          open={swapOpen}
          onClose={() => setSwapOpen(false)}
          userId={userId}
          from={current.exercise}
          canUpdateTemplate={Boolean(session.template_id)}
          onSwap={(to, updateTemplateToo) => void handleSwap(to, updateTemplateToo)}
        />
      )}

      <Sheet
        open={exitOpen}
        onClose={() => setExitOpen(false)}
        title="Leave this workout?"
        subtitle={
          totals.logged > 0
            ? "Everything you've logged is already saved. You can pick up where you left off."
            : "Nothing logged yet — discarding won't lose any sets."
        }
      >
        <div className="space-y-2.5 pb-4">
          {totals.logged > 0 ? (
            <Button block size="lg" variant="secondary" onClick={() => router.push("/")}>
              Leave for now
            </Button>
          ) : (
            <Button
              block
              size="lg"
              variant="secondary"
              onClick={async () => {
                try {
                  await deleteSession(sessionId);
                } catch (err) {
                  console.error(err);
                }
                router.replace("/");
              }}
            >
              Discard workout
            </Button>
          )}
          {totals.logged > 0 && (
            <Button
              block
              size="lg"
              loading={completing}
              onClick={async () => {
                setExitOpen(false);
                const done = await finish();
                if (done) setIsComplete(true);
              }}
            >
              Finish here
            </Button>
          )}
          <Button block size="lg" variant="ghost" onClick={() => setExitOpen(false)}>
            Keep lifting
          </Button>
        </div>
      </Sheet>

      {/* Deleting a set is rare; keep it out of the main flow. */}
      {editingSet && (
        <div className="px-4 pb-3">
          <Button
            block
            variant="danger"
            size="md"
            icon="trash"
            onClick={() => {
              void removeSet(editingSet.setNumber);
              setEditingSet(undefined);
            }}
          >
            Delete set {editingSet.setNumber}
          </Button>
        </div>
      )}
    </div>
  );
}
