"use client";

import { useRouter } from "next/navigation";
import { addDays, friendlyDate, todayStr } from "@/lib/dates";
import { getTemplates } from "@/lib/queries";
import { useAsync } from "@/hooks/useAsync";
import { useStartWorkout } from "@/hooks/useStartWorkout";
import { Button } from "./ui/Button";
import { EmptyState } from "./ui/EmptyState";
import { Field } from "./ui/Field";
import { Sheet } from "./ui/Sheet";
import { SkeletonList } from "./ui/Skeleton";
import { TemplateCard } from "./TemplateCard";

interface StartWorkoutSheetProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  /** Session date (YYYY-MM-DD). Defaults to today. */
  date: string;
  onDateChange: (date: string) => void;
}

export function StartWorkoutSheet({
  open,
  onClose,
  userId,
  date,
  onDateChange,
}: StartWorkoutSheetProps) {
  const router = useRouter();
  const { start, starting } = useStartWorkout(userId);
  const { data: templates, loading } = useAsync(
    () => getTemplates(userId),
    [userId, open],
    open,
  );

  const today = todayStr();
  const earliest = addDays(today, -365);
  const isPast = date < today;
  const isFuture = date > today;

  const begin = async (templateId: string | null) => {
    if (isFuture) return;
    onClose();
    await start(templateId, date);
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isPast ? "Log a past workout" : "Start a workout"}
      subtitle={
        isPast
          ? `Logging for ${friendlyDate(date)}. Sets count toward that day's history and streaks.`
          : "Pick a template, or go freestyle and add as you lift."
      }
      footer={
        <Button
          block
          size="lg"
          variant="secondary"
          icon="bolt"
          loading={starting}
          disabled={isFuture}
          onClick={() => void begin(null)}
        >
          Freestyle session
        </Button>
      }
    >
      <div className="min-w-0 space-y-3 pb-2">
        <Field
          type="date"
          label="Session date"
          value={date}
          min={earliest}
          max={today}
          onChange={(e) => onDateChange(e.target.value || today)}
          hint={
            isPast
              ? "Backfill — this won't change today's in-progress workout."
              : "Change this to log a session you already finished."
          }
        />

        {loading && <SkeletonList rows={3} />}

        {!loading && templates && templates.length === 0 && (
          <EmptyState
            icon="dumbbell"
            title="No templates yet"
            body="Build one in a minute, or import the starter split."
            action={
              <Button
                icon="plus"
                onClick={() => {
                  onClose();
                  router.push("/workouts/new");
                }}
              >
                Create a workout
              </Button>
            }
          />
        )}

        {templates?.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            compact
            onPress={() => void begin(template.id)}
          />
        ))}
      </div>
    </Sheet>
  );
}
