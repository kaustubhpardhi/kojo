"use client";

import { Reorder, useDragControls } from "framer-motion";
import { cn } from "@/lib/cn";
import type { LiveExercise } from "@/lib/database.types";
import { Button, IconButton } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { Sheet } from "../ui/Sheet";

interface SessionOverviewProps {
  open: boolean;
  onClose: () => void;
  exercises: LiveExercise[];
  currentIndex: number;
  onJump: (index: number) => void;
  onReorder: (next: LiveExercise[]) => void;
  onAdd: () => void;
  onSkip: (exercise: LiveExercise) => void;
  onUnskip: (exercise: LiveExercise) => void;
  onRemove: (exercise: LiveExercise) => void;
}

export function SessionOverview({
  open,
  onClose,
  exercises,
  currentIndex,
  onJump,
  onReorder,
  onAdd,
  onSkip,
  onUnskip,
  onRemove,
}: SessionOverviewProps) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="This session"
      subtitle="Jump, reorder, skip, or add on the fly."
      footer={
        <Button block size="lg" variant="secondary" icon="plus" onClick={onAdd}>
          Add an exercise
        </Button>
      }
    >
      <Reorder.Group axis="y" values={exercises} onReorder={onReorder} className="space-y-2 pb-2">
        {exercises.map((exercise, index) => (
          <OverviewRow
            key={exercise.id}
            exercise={exercise}
            index={index}
            isCurrent={index === currentIndex}
            onJump={() => {
              onJump(index);
              onClose();
            }}
            onSkip={() => onSkip(exercise)}
            onUnskip={() => onUnskip(exercise)}
            onRemove={() => onRemove(exercise)}
          />
        ))}
      </Reorder.Group>
    </Sheet>
  );
}

function OverviewRow({
  exercise,
  index,
  isCurrent,
  onJump,
  onSkip,
  onUnskip,
  onRemove,
}: {
  exercise: LiveExercise;
  index: number;
  isCurrent: boolean;
  onJump: () => void;
  onSkip: () => void;
  onUnskip: () => void;
  onRemove: () => void;
}) {
  const controls = useDragControls();
  const logged = exercise.logged.size;
  const skipped = exercise.status === "skipped";
  const complete = logged >= exercise.target_sets;
  const hasLogs = logged > 0;

  return (
    <Reorder.Item
      value={exercise}
      dragListener={false}
      dragControls={controls}
      className={cn(
        "flex items-center gap-1 rounded-[var(--radius-md)] px-1.5 py-2",
        isCurrent ? "bg-accent-soft" : "bg-surface-2",
        skipped && "opacity-50",
      )}
    >
      <button
        type="button"
        aria-label={`Reorder ${exercise.exercise.name}`}
        onPointerDown={(e) => controls.start(e)}
        className="flex h-11 w-8 shrink-0 cursor-grab items-center justify-center text-fg-subtle"
      >
        <Icon name="grip" size={17} />
      </button>

      <button type="button" onClick={onJump} className="min-w-0 flex-1 py-1 text-left">
        <span
          className={cn(
            "block truncate text-[15px] font-semibold",
            isCurrent && "text-accent-fg",
            skipped && "line-through",
          )}
        >
          {index + 1}. {exercise.exercise.name}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-fg-muted">
          {complete && <Icon name="check" size={13} />}
          {logged}/{exercise.target_sets} sets
          {skipped && " · skipped"}
        </span>
      </button>

      {skipped ? (
        <IconButton
          icon="undo"
          label={`Unskip ${exercise.exercise.name}`}
          variant="ghost"
          onClick={onUnskip}
          iconSize={17}
        />
      ) : (
        <IconButton
          icon="skip"
          label={`Skip ${exercise.exercise.name}`}
          variant="ghost"
          onClick={onSkip}
          iconSize={17}
        />
      )}
      {!hasLogs && (
        <IconButton
          icon="trash"
          label={`Remove ${exercise.exercise.name}`}
          variant="ghost"
          onClick={onRemove}
          iconSize={17}
        />
      )}
    </Reorder.Item>
  );
}
