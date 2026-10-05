"use client";

import { useEffect, useState } from "react";
import type { LiveExercise, LoggedSet } from "@/lib/database.types";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { Stepper } from "../ui/Stepper";

interface SetEntryProps {
  exercise: LiveExercise;
  setNumber: number;
  isAmrap: boolean;
  editing?: LoggedSet;
  onLog: (set: LoggedSet) => void;
  onCancelEdit?: () => void;
}

/**
 * Weight/reps entry for the set in progress. Defaults come from, in order:
 * the set being edited, the same set last time, the previous set this session,
 * then the exercise's target weight.
 */
export function SetEntry({
  exercise,
  setNumber,
  isAmrap,
  editing,
  onLog,
  onCancelEdit,
}: SetEntryProps) {
  const ghost = exercise.previousSets.find((s) => s.setNumber === setNumber);
  const lastThisSession = exercise.logged.get(setNumber - 1);

  const [weight, setWeight] = useState<number | "">("");
  const [reps, setReps] = useState<number | "">("");

  useEffect(() => {
    const seed =
      editing ??
      lastThisSession ??
      ghost ??
      (exercise.target_weight != null
        ? { weight: exercise.target_weight, reps: exercise.rep_range_low ?? 8, setNumber, isAmrap: false }
        : null);

    setWeight(seed?.weight ?? "");
    setReps(editing?.reps ?? ghost?.reps ?? exercise.rep_range_low ?? "");
    // Re-seed whenever we move to a different set or exercise.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.id, setNumber, editing?.setNumber]);

  const canLog = weight !== "" && reps !== "" && Number(reps) > 0;
  const repTarget =
    exercise.rep_range_low && exercise.rep_range_high
      ? exercise.rep_range_low === exercise.rep_range_high
        ? `${exercise.rep_range_low} reps`
        : `${exercise.rep_range_low}–${exercise.rep_range_high} reps`
      : null;

  const fillFromLast = () => {
    const source = lastThisSession ?? ghost;
    if (!source) return;
    setWeight(source.weight);
    setReps(source.reps);
  };

  return (
    <div className="rounded-[var(--radius-lg)] bg-surface p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-display text-[17px] font-bold">
          {editing ? `Edit set ${setNumber}` : `Set ${setNumber}`}
        </h3>
        <div className="flex items-center gap-2">
          {isAmrap && (
            <span className="rounded-full bg-pop/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-pop">
              AMRAP — go to failure
            </span>
          )}
          {!isAmrap && repTarget && (
            <span className="text-[13px] text-fg-muted">target {repTarget}</span>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <Stepper
          label="Weight"
          unit="kg"
          value={weight}
          onChange={setWeight}
          step={2.5}
          quickSteps={[2.5, 5]}
          decimals
          ghost={ghost ? `${ghost.weight} kg` : undefined}
          onGhostFill={ghost ? () => setWeight(ghost.weight) : undefined}
        />
        <Stepper
          label="Reps"
          value={reps}
          onChange={setReps}
          step={1}
          quickSteps={[1, 2]}
          max={100}
          ghost={ghost ? `${ghost.reps}` : undefined}
          onGhostFill={ghost ? () => setReps(ghost.reps) : undefined}
        />
      </div>

      {(lastThisSession || ghost) && (
        <Button
          block
          variant="ghost"
          size="sm"
          icon="undo"
          className="mt-2.5"
          onClick={fillFromLast}
        >
          Same as {lastThisSession ? "last set" : "last time"}
        </Button>
      )}

      <div className="mt-3 flex gap-2.5">
        {editing && onCancelEdit && (
          <Button variant="secondary" size="xl" onClick={onCancelEdit}>
            Cancel
          </Button>
        )}
        <Button
          size="xl"
          block
          disabled={!canLog}
          onClick={() =>
            onLog({ setNumber, weight: Number(weight), reps: Number(reps), isAmrap })
          }
        >
          <Icon name="check" size={22} strokeWidth={2.6} />
          {editing ? "Update set" : "Log set"}
        </Button>
      </div>
    </div>
  );
}
