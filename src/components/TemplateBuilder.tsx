"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { useAuth } from "./AuthProvider";
import { ExercisePicker } from "./ExercisePicker";
import { PageHeader } from "./PageHeader";
import { Button, IconButton } from "./ui/Button";
import { EmptyState } from "./ui/EmptyState";
import { Field, TextArea } from "./ui/Field";
import { Icon } from "./ui/Icon";
import { Sheet } from "./ui/Sheet";
import { SkeletonList } from "./ui/Skeleton";
import { Stepper } from "./ui/Stepper";
import { useToast } from "./ui/Toast";
import { useAsync } from "@/hooks/useAsync";
import { createTemplate, getTemplate, updateTemplate } from "@/lib/queries";
import type { Exercise, ExercisePlan } from "@/lib/database.types";

const EMOJIS = ["💪", "🦵", "🔱", "🏋️", "🔥", "⚡", "🧱", "🫀", "🥊", "🧘"];

interface DraftExercise extends Omit<ExercisePlan, "position"> {
  /** Stable key for reorder; not persisted. */
  key: string;
  exercise: Exercise;
}

export function TemplateBuilder({ templateId }: { templateId?: string }) {
  const { user } = useAuth();
  const userId = user!.id;
  const router = useRouter();
  const { toast } = useToast();

  const { data: existing, loading } = useAsync(
    () => getTemplate(templateId!),
    [templateId],
    Boolean(templateId),
  );

  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState<string>("💪");
  const [exercises, setExercises] = useState<DraftExercise[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editing, setEditing] = useState<DraftExercise | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setEmoji(existing.emoji ?? "💪");
    setExercises(
      existing.exercises.map((e) => ({
        key: e.id,
        exercise: e.exercise,
        exercise_id: e.exercise_id,
        target_sets: e.target_sets,
        rep_range_low: e.rep_range_low,
        rep_range_high: e.rep_range_high,
        target_weight: e.target_weight,
        rest_seconds: e.rest_seconds,
        amrap_last_set: e.amrap_last_set,
        notes: e.notes,
      })),
    );
  }, [existing]);

  const addExercise = (exercise: Exercise) => {
    setDirty(true);
    setExercises((prev) => [
      ...prev,
      {
        key: `${exercise.id}-${Date.now()}`,
        exercise,
        exercise_id: exercise.id,
        target_sets: 3,
        rep_range_low: 8,
        rep_range_high: 12,
        target_weight: null,
        rest_seconds: 90,
        amrap_last_set: false,
        notes: null,
      },
    ]);
  };

  const patchExercise = (key: string, patch: Partial<DraftExercise>) => {
    setDirty(true);
    setExercises((prev) => prev.map((e) => (e.key === key ? { ...e, ...patch } : e)));
    setEditing((prev) => (prev && prev.key === key ? { ...prev, ...patch } : prev));
  };

  const removeExercise = (key: string) => {
    setDirty(true);
    setExercises((prev) => prev.filter((e) => e.key !== key));
  };

  const save = async () => {
    if (!name.trim()) {
      toast({ message: "Give your workout a name", icon: "note" });
      return;
    }
    if (exercises.length === 0) {
      toast({ message: "Add at least one exercise", icon: "dumbbell" });
      return;
    }
    setSaving(true);
    try {
      const draft = {
        name,
        emoji,
        color: null,
        exercises: exercises.map((e) => ({
          exercise_id: e.exercise_id,
          target_sets: e.target_sets,
          rep_range_low: e.rep_range_low,
          rep_range_high: e.rep_range_high,
          target_weight: e.target_weight,
          rest_seconds: e.rest_seconds,
          amrap_last_set: e.amrap_last_set,
          notes: e.notes,
        })),
      };
      if (templateId) {
        await updateTemplate(templateId, draft);
      } else {
        await createTemplate(userId, draft);
      }
      setDirty(false);
      toast({ message: templateId ? "Saved" : `${name} created`, icon: "check", tone: "success" });
      router.push("/workouts");
    } catch (err) {
      console.error(err);
      toast({ message: "Couldn't save that", icon: "x", tone: "danger" });
    } finally {
      setSaving(false);
    }
  };

  const totalSets = exercises.reduce((sum, e) => sum + e.target_sets, 0);

  if (templateId && loading) {
    return (
      <div className="px-4 pt-safe">
        <PageHeader title="Edit workout" />
        <SkeletonList rows={5} />
      </div>
    );
  }

  return (
    <div className="px-4 pt-safe">
      <PageHeader
        title={templateId ? "Edit workout" : "New workout"}
        subtitle={
          exercises.length > 0 ? `${exercises.length} exercises · ${totalSets} sets` : undefined
        }
        back={
          <IconButton
            icon="chevronLeft"
            label="Back"
            variant="ghost"
            onClick={() => router.back()}
            className="-ml-3"
          />
        }
      />

      <div className="space-y-4">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Field
              label="Name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setDirty(true);
              }}
              placeholder="Push Day"
              maxLength={40}
            />
          </div>
          <EmojiPicker
            value={emoji}
            onChange={(next) => {
              setEmoji(next);
              setDirty(true);
            }}
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-fg-subtle">
              Exercises
            </h2>
            {exercises.length > 0 && (
              <span className="flex items-center gap-1 text-[12px] text-fg-subtle">
                <Icon name="grip" size={13} /> drag to reorder
              </span>
            )}
          </div>

          {exercises.length === 0 ? (
            <EmptyState
              icon="search"
              title="No exercises yet"
              body="Search your library, the wger database, or add your own."
              action={
                <Button size="lg" icon="plus" onClick={() => setPickerOpen(true)}>
                  Add exercises
                </Button>
              }
            />
          ) : (
            <Reorder.Group
              axis="y"
              values={exercises}
              onReorder={(next) => {
                setExercises(next);
                setDirty(true);
              }}
              className="space-y-2"
            >
              {exercises.map((item, index) => (
                <BuilderRow
                  key={item.key}
                  item={item}
                  index={index}
                  onEdit={() => setEditing(item)}
                  onRemove={() => removeExercise(item.key)}
                />
              ))}
            </Reorder.Group>
          )}
        </div>

        {exercises.length > 0 && (
          <Button block variant="secondary" size="lg" icon="plus" onClick={() => setPickerOpen(true)}>
            Add more
          </Button>
        )}
      </div>

      <div className="sticky bottom-0 -mx-4 mt-6 bg-gradient-to-t from-bg via-bg to-transparent px-4 pb-4 pt-6">
        <Button block size="xl" loading={saving} disabled={!dirty && Boolean(templateId)} onClick={() => void save()}>
          {templateId ? "Save changes" : "Create workout"}
        </Button>
      </div>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        userId={userId}
        onPick={addExercise}
      />

      <ExerciseSettingsSheet
        item={editing}
        onClose={() => setEditing(null)}
        onPatch={patchExercise}
        onRemove={(key) => {
          removeExercise(key);
          setEditing(null);
        }}
      />
    </div>
  );
}

function BuilderRow({
  item,
  index,
  onEdit,
  onRemove,
}: {
  item: DraftExercise;
  index: number;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const controls = useDragControls();
  const reps =
    item.rep_range_low === item.rep_range_high
      ? `${item.rep_range_low}`
      : `${item.rep_range_low}–${item.rep_range_high}`;

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-surface px-1.5 py-2 shadow-soft"
    >
      <button
        type="button"
        aria-label={`Reorder ${item.exercise.name}`}
        onPointerDown={(e) => controls.start(e)}
        className="flex h-12 w-9 shrink-0 cursor-grab items-center justify-center text-fg-subtle active:cursor-grabbing"
      >
        <Icon name="grip" size={18} />
      </button>

      <button type="button" onClick={onEdit} className="min-w-0 flex-1 py-1 text-left">
        <span className="block truncate text-[15px] font-semibold">
          {index + 1}. {item.exercise.name}
        </span>
        <span className="mt-0.5 block truncate text-[12.5px] text-fg-muted">
          {item.target_sets} × {reps} · {item.rest_seconds}s rest
          {item.amrap_last_set && " · AMRAP"}
        </span>
      </button>

      <IconButton icon="edit" label={`Edit ${item.exercise.name}`} variant="ghost" onClick={onEdit} iconSize={18} />
      <IconButton
        icon="x"
        label={`Remove ${item.exercise.name}`}
        variant="ghost"
        onClick={onRemove}
        iconSize={18}
      />
    </Reorder.Item>
  );
}

function EmojiPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Choose an icon"
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-surface-2 text-2xl"
      >
        {value}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Pick an icon">
        <div className="grid grid-cols-5 gap-2 pb-4">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => {
                onChange(e);
                setOpen(false);
              }}
              className={`flex h-16 items-center justify-center rounded-[var(--radius-md)] text-2xl ${
                e === value ? "bg-accent-soft" : "bg-surface-2"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </Sheet>
    </>
  );
}

function ExerciseSettingsSheet({
  item,
  onClose,
  onPatch,
  onRemove,
}: {
  item: DraftExercise | null;
  onClose: () => void;
  onPatch: (key: string, patch: Partial<DraftExercise>) => void;
  onRemove: (key: string) => void;
}) {
  return (
    <Sheet
      open={item !== null}
      onClose={onClose}
      title={item?.exercise.name}
      subtitle={[item?.exercise.primary_muscle, item?.exercise.equipment]
        .filter(Boolean)
        .join(" · ")}
      footer={
        <Button block size="lg" onClick={onClose}>
          Done
        </Button>
      }
    >
      {item && (
        <div className="space-y-5 pb-4">
          <div className="flex gap-3">
            <Stepper
              label="Sets"
              value={item.target_sets}
              min={1}
              max={20}
              onChange={(v) => onPatch(item.key, { target_sets: v === "" ? 1 : v })}
            />
            <Stepper
              label="Rest"
              unit="sec"
              value={item.rest_seconds}
              step={15}
              min={0}
              max={600}
              onChange={(v) => onPatch(item.key, { rest_seconds: v === "" ? 0 : v })}
            />
          </div>

          <div className="flex gap-3">
            <Stepper
              label="Reps from"
              value={item.rep_range_low ?? 8}
              min={1}
              max={100}
              onChange={(v) => onPatch(item.key, { rep_range_low: v === "" ? 1 : v })}
            />
            <Stepper
              label="Reps to"
              value={item.rep_range_high ?? 12}
              min={1}
              max={100}
              onChange={(v) => onPatch(item.key, { rep_range_high: v === "" ? 1 : v })}
            />
          </div>

          <Stepper
            label="Target weight"
            unit="kg"
            value={item.target_weight ?? ""}
            step={2.5}
            decimals
            placeholder="—"
            onChange={(v) => onPatch(item.key, { target_weight: v === "" ? null : v })}
          />

          <label className="flex min-h-14 items-center justify-between gap-3 rounded-[var(--radius-md)] bg-surface-2 px-4">
            <span>
              <span className="block text-[15px] font-semibold">AMRAP last set</span>
              <span className="block text-[12.5px] text-fg-muted">
                Go to failure on the final set
              </span>
            </span>
            <input
              type="checkbox"
              checked={item.amrap_last_set}
              onChange={(e) => onPatch(item.key, { amrap_last_set: e.target.checked })}
              className="h-6 w-6 shrink-0 accent-[var(--accent)]"
            />
          </label>

          <TextArea
            label="Notes"
            value={item.notes ?? ""}
            placeholder="Cues, setup, anything you want to remember."
            onChange={(e) => onPatch(item.key, { notes: e.target.value || null })}
          />

          <Button
            block
            variant="danger"
            size="lg"
            icon="trash"
            onClick={() => onRemove(item.key)}
          >
            Remove from workout
          </Button>
        </div>
      )}
    </Sheet>
  );
}
