"use client";

import { useCallback, useState } from "react";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Icon } from "./ui/Icon";
import { useToast } from "./ui/Toast";
import { useAsync } from "@/hooks/useAsync";
import { useStartWorkout } from "@/hooks/useStartWorkout";
import {
  getActiveProgramRun,
  getProgramBySlug,
  skipToNextWeek,
  startProgramRun,
} from "@/lib/queries";
import { HYPERTROPHY_BLOCK1 } from "@/lib/programs/block1";

const DAY_NAMES: Record<number, string> = {
  1: "Lower A",
  2: "Upper A",
  3: "Lower B",
  4: "Upper B",
};

export function ProgramHomeCard({ userId }: { userId: string }) {
  const { toast } = useToast();
  const { startProgramDay, starting } = useStartWorkout(userId);
  const [busy, setBusy] = useState(false);
  const { data, loading, reload } = useAsync(() => getActiveProgramRun(userId), [userId]);

  const beginBlock = useCallback(async () => {
    setBusy(true);
    try {
      const program = await getProgramBySlug(HYPERTROPHY_BLOCK1.slug);
      if (!program) {
        toast({
          message: "Run the Block 1 seed first (npm run seed:block1)",
          icon: "note",
        });
        return;
      }
      const nextBlock = data ? data.run.block_number + 1 : 1;
      const incline =
        data?.run.incline_variant === "barbell" ? "dumbbell" : "barbell";
      await startProgramRun(userId, program.id, {
        blockNumber: nextBlock,
        inclineVariant: data ? incline : "barbell",
        sourceRunId: data?.run.id ?? null,
      });
      await reload();
      toast({
        message: `Block ${nextBlock} started — Week 1`,
        icon: "check",
        tone: "success",
      });
    } catch (err) {
      console.error(err);
      toast({ message: "Couldn't start the program", icon: "x", tone: "danger" });
    } finally {
      setBusy(false);
    }
  }, [data, reload, toast, userId]);

  const onSkipWeek = useCallback(async () => {
    if (!data?.run) return;
    setBusy(true);
    try {
      await skipToNextWeek(data.run.id);
      await reload();
      toast({ message: "Skipped to the next week", icon: "check" });
    } catch (err) {
      console.error(err);
      toast({ message: "Couldn't skip the week", icon: "x", tone: "danger" });
    } finally {
      setBusy(false);
    }
  }, [data?.run, reload, toast]);

  if (loading) return null;

  if (!data) {
    return (
      <Card className="mt-3">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-fg-subtle">
          Program
        </p>
        <p className="mt-1 font-display text-[20px] font-bold">{HYPERTROPHY_BLOCK1.name}</p>
        <p className="mt-1 text-[14px] text-fg-muted">
          4 weeks · days under 60 min · double progression on the mains.
        </p>
        <Button
          block
          size="lg"
          className="mt-3"
          icon="play"
          loading={busy}
          onClick={() => void beginBlock()}
        >
          Start Block 1
        </Button>
      </Card>
    );
  }

  const { run, program, nextDay, completedDaysThisWeek } = data;
  const weekDone = completedDaysThisWeek.length;
  const behind =
    // Rough: more than ~9 days into the block relative to expected 4 days/week pace.
    (Date.now() - new Date(run.start_date).getTime()) / 86_400_000 >
    run.current_week * 7 + 2;

  if (run.status === "completed" || nextDay == null) {
    return (
      <Card className="mt-3">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-fg-subtle">
          Block {run.block_number} complete
        </p>
        <p className="mt-1 font-display text-[20px] font-bold">{program.name}</p>
        <p className="mt-1 text-[14px] text-fg-muted">
          Ready for the next block? Incline swaps barbell ↔ dumbbell.
        </p>
        <Button
          block
          size="lg"
          className="mt-3"
          icon="play"
          loading={busy}
          onClick={() => void beginBlock()}
        >
          Start Block {run.block_number + 1}
        </Button>
      </Card>
    );
  }

  const dayName = DAY_NAMES[nextDay] ?? `Day ${nextDay}`;

  return (
    <Card className="mt-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-fg-subtle">
            Block {run.block_number} · Week {run.current_week}
            {run.current_week === 4 ? " · Deload" : ""}
          </p>
          <p className="mt-1 font-display text-[20px] font-bold">
            Day {nextDay} {dayName}
          </p>
          <p className="mt-1 text-[13.5px] text-fg-muted">
            {weekDone}/4 days this week
            {behind ? " · behind schedule" : ""}
          </p>
        </div>
        {run.current_week === 4 && (
          <span className="shrink-0 rounded-full bg-pop/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-pop">
            Deload
          </span>
        )}
      </div>
      <Button
        block
        size="lg"
        className="mt-3"
        icon="play"
        loading={starting || busy}
        onClick={() => void startProgramDay(run.id, nextDay)}
      >
        Start Day {nextDay}
      </Button>
      <button
        type="button"
        onClick={() => void onSkipWeek()}
        className="mt-2 flex h-10 w-full items-center justify-center gap-1.5 text-[13px] font-semibold text-fg-muted"
      >
        Skip to next week <Icon name="chevronRight" size={14} />
      </button>
    </Card>
  );
}
