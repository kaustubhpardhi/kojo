"use client";

import { useRouter } from "next/navigation";
import { getTemplates } from "@/lib/queries";
import { useAsync } from "@/hooks/useAsync";
import { useStartWorkout } from "@/hooks/useStartWorkout";
import { Button } from "./ui/Button";
import { EmptyState } from "./ui/EmptyState";
import { Sheet } from "./ui/Sheet";
import { SkeletonList } from "./ui/Skeleton";
import { TemplateCard } from "./TemplateCard";

interface StartWorkoutSheetProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

export function StartWorkoutSheet({ open, onClose, userId }: StartWorkoutSheetProps) {
  const router = useRouter();
  const { start, starting } = useStartWorkout(userId);
  const { data: templates, loading } = useAsync(
    () => getTemplates(userId),
    [userId, open],
    open,
  );

  const begin = async (templateId: string | null) => {
    onClose();
    await start(templateId);
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Start a workout"
      subtitle="Pick a template, or go freestyle and add as you lift."
      footer={
        <Button
          block
          size="lg"
          variant="secondary"
          icon="bolt"
          loading={starting}
          onClick={() => void begin(null)}
        >
          Freestyle session
        </Button>
      }
    >
      <div className="space-y-2.5 pb-2">
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
