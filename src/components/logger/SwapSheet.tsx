"use client";

import { useState } from "react";
import { ExercisePicker } from "../ExercisePicker";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { Sheet } from "../ui/Sheet";
import type { Exercise } from "@/lib/database.types";

interface SwapSheetProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  from: Exercise;
  /** True when the session came from a template that could also be updated. */
  canUpdateTemplate: boolean;
  onSwap: (to: Exercise, updateTemplate: boolean) => void;
}

/**
 * Two-step swap: pick the replacement, then choose whether it applies to this
 * session only or also rewrites the template.
 */
export function SwapSheet({
  open,
  onClose,
  userId,
  from,
  canUpdateTemplate,
  onSwap,
}: SwapSheetProps) {
  const [picked, setPicked] = useState<Exercise | null>(null);

  const close = () => {
    setPicked(null);
    onClose();
  };

  const confirm = (updateTemplate: boolean) => {
    if (!picked) return;
    onSwap(picked, updateTemplate);
    close();
  };

  if (picked && canUpdateTemplate) {
    return (
      <Sheet
        open
        onClose={close}
        title="Apply the swap where?"
        subtitle={`${from.name} → ${picked.name}`}
      >
        <div className="space-y-2.5 pb-4">
          <ScopeOption
            icon="bolt"
            title="Just this session"
            body="Your template stays exactly as it is."
            onClick={() => confirm(false)}
          />
          <ScopeOption
            icon="edit"
            title="Update the template too"
            body="Future sessions will use the new exercise."
            onClick={() => confirm(true)}
          />
          <p className="px-1 pt-1 text-[12.5px] text-fg-subtle">
            Sets you already logged stay recorded under {from.name}, so your history
            and PRs don&apos;t change.
          </p>
          <Button block variant="ghost" size="md" onClick={() => setPicked(null)}>
            Pick a different exercise
          </Button>
        </div>
      </Sheet>
    );
  }

  return (
    <ExercisePicker
      open={open}
      onClose={close}
      userId={userId}
      multi={false}
      title={`Swap ${from.name}`}
      excludeIds={[from.id]}
      onPick={(exercise) => {
        if (canUpdateTemplate) setPicked(exercise);
        else onSwap(exercise, false);
      }}
    />
  );
}

function ScopeOption({
  icon,
  title,
  body,
  onClick,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[var(--radius-md)] bg-surface-2 p-4 text-left active:scale-[0.99]"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-fg">
        <Icon name={icon} size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">{title}</span>
        <span className="block text-[13px] text-fg-muted">{body}</span>
      </span>
      <Icon name="chevronRight" size={18} className="shrink-0 text-fg-subtle" />
    </button>
  );
}
