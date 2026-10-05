"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Reorder } from "framer-motion";
import { useAuth } from "@/components/AuthProvider";
import { PageHeader } from "@/components/PageHeader";
import { TemplateCard } from "@/components/TemplateCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Sheet } from "@/components/ui/Sheet";
import { SkeletonList } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useAsync } from "@/hooks/useAsync";
import { useStartWorkout } from "@/hooks/useStartWorkout";
import {
  deleteTemplate,
  duplicateTemplate,
  getStarterTemplates,
  getTemplates,
  reorderTemplates,
  setTemplateArchived,
} from "@/lib/queries";
import type { TemplateSummary } from "@/lib/database.types";
import { Icon } from "@/components/ui/Icon";

export function WorkoutsContent() {
  const { user } = useAuth();
  const userId = user!.id;
  const router = useRouter();
  const { toast } = useToast();
  const { start } = useStartWorkout(userId);

  const { data: templates, loading, reload } = useAsync(
    () => getTemplates(userId),
    [userId],
  );
  const [order, setOrder] = useState<TemplateSummary[] | null>(null);
  const [menuFor, setMenuFor] = useState<TemplateSummary | null>(null);
  const [starterOpen, setStarterOpen] = useState(false);

  const list = order ?? templates ?? [];

  const commitOrder = async (next: TemplateSummary[]) => {
    setOrder(next);
    try {
      await reorderTemplates(next.map((t) => t.id));
    } catch {
      toast({ message: "Couldn't save the new order", icon: "x", tone: "danger" });
      reload();
    }
  };

  const handleDuplicate = async (template: TemplateSummary) => {
    setMenuFor(null);
    try {
      await duplicateTemplate(userId, template.id);
      setOrder(null);
      reload();
      toast({ message: `Duplicated ${template.name}`, icon: "copy", tone: "success" });
    } catch {
      toast({ message: "Couldn't duplicate that", icon: "x", tone: "danger" });
    }
  };

  const handleArchive = async (template: TemplateSummary) => {
    setMenuFor(null);
    try {
      await setTemplateArchived(template.id, true);
      setOrder(null);
      reload();
      toast({ message: `${template.name} archived`, icon: "archive" });
    } catch {
      toast({ message: "Couldn't archive that", icon: "x", tone: "danger" });
    }
  };

  const handleDelete = async (template: TemplateSummary) => {
    setMenuFor(null);
    try {
      await deleteTemplate(template.id);
      setOrder(null);
      reload();
      toast({ message: `${template.name} deleted · history kept`, icon: "trash" });
    } catch {
      toast({ message: "Couldn't delete that", icon: "x", tone: "danger" });
    }
  };

  return (
    <div className="px-4 pt-safe">
      <PageHeader
        title="Workouts"
        subtitle="Your templates. Drag to reorder."
        action={
          <Button size="sm" icon="plus" onClick={() => router.push("/workouts/new")}>
            New
          </Button>
        }
      />

      {loading && <SkeletonList rows={4} />}

      {!loading && list.length === 0 && (
        <EmptyState
          icon="dumbbell"
          title="Let's build your first workout"
          body="Name it, add exercises, set your targets. Or start from the classic kōjō split."
          action={
            <div className="flex flex-col gap-2.5">
              <Button size="lg" icon="plus" onClick={() => router.push("/workouts/new")}>
                Create a workout
              </Button>
              <Button size="lg" variant="secondary" icon="sparkle" onClick={() => setStarterOpen(true)}>
                Import starter split
              </Button>
            </div>
          }
        />
      )}

      {list.length > 0 && (
        <Reorder.Group axis="y" values={list} onReorder={commitOrder} className="space-y-2.5">
          {list.map((template) => (
            <Reorder.Item key={template.id} value={template} className="touch-pan-y">
              <TemplateCard
                template={template}
                onPress={() => router.push(`/workouts/${template.id}`)}
                onMore={() => setMenuFor(template)}
              />
            </Reorder.Item>
          ))}
        </Reorder.Group>
      )}

      {list.length > 0 && (
        <Button
          block
          variant="ghost"
          size="md"
          icon="sparkle"
          className="mt-4"
          onClick={() => setStarterOpen(true)}
        >
          Browse starter templates
        </Button>
      )}

      <Sheet
        open={menuFor !== null}
        onClose={() => setMenuFor(null)}
        title={menuFor?.name}
        subtitle={`${menuFor?.exerciseCount ?? 0} exercises`}
      >
        <div className="space-y-2 pb-4">
          <MenuRow
            icon="play"
            label="Start now"
            onClick={() => {
              const id = menuFor!.id;
              setMenuFor(null);
              void start(id);
            }}
          />
          <MenuRow
            icon="edit"
            label="Edit"
            onClick={() => {
              router.push(`/workouts/${menuFor!.id}`);
              setMenuFor(null);
            }}
          />
          <MenuRow icon="copy" label="Duplicate" onClick={() => void handleDuplicate(menuFor!)} />
          <MenuRow icon="archive" label="Archive" onClick={() => void handleArchive(menuFor!)} />
          <MenuRow
            icon="trash"
            label="Delete"
            hint="Past sessions are kept"
            danger
            onClick={() => void handleDelete(menuFor!)}
          />
        </div>
      </Sheet>

      <StarterSheet
        open={starterOpen}
        onClose={() => setStarterOpen(false)}
        userId={userId}
        onImported={() => {
          setOrder(null);
          reload();
        }}
      />
    </div>
  );
}

function MenuRow({
  icon,
  label,
  hint,
  danger,
  onClick,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  label: string;
  hint?: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-14 w-full items-center gap-3 rounded-[var(--radius-md)] bg-surface-2 px-4 text-left active:scale-[0.99]"
    >
      <span className={danger ? "text-danger" : "text-fg-muted"}>
        <Icon name={icon} size={20} />
      </span>
      <span className="flex-1">
        <span className={`block text-[15px] font-semibold ${danger ? "text-danger" : ""}`}>
          {label}
        </span>
        {hint && <span className="block text-[12.5px] text-fg-subtle">{hint}</span>}
      </span>
    </button>
  );
}

function StarterSheet({
  open,
  onClose,
  userId,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  onImported: () => void;
}) {
  const { toast } = useToast();
  const { data: starters, loading } = useAsync(getStarterTemplates, [], open);
  const [importing, setImporting] = useState<string | null>(null);

  const importOne = async (template: TemplateSummary) => {
    setImporting(template.id);
    try {
      await duplicateTemplate(userId, template.id);
      onImported();
      toast({ message: `${template.name} added`, icon: "check", tone: "success" });
    } catch {
      toast({ message: "Couldn't import that", icon: "x", tone: "danger" });
    } finally {
      setImporting(null);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Starter templates"
      subtitle="The original kōjō split. Import and edit freely."
    >
      <div className="space-y-2.5 pb-4">
        {loading && <SkeletonList rows={3} />}
        {starters?.map((template) => (
          <div key={template.id} className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <TemplateCard template={template} compact onPress={() => void importOne(template)} />
            </div>
            <Button
              size="sm"
              variant="soft"
              loading={importing === template.id}
              onClick={() => void importOne(template)}
            >
              Import
            </Button>
          </div>
        ))}
        {!loading && starters?.length === 0 && (
          <EmptyState
            icon="sparkle"
            title="No starters available"
            body="Run the custom-sessions migration to seed the starter split."
          />
        )}
      </div>
    </Sheet>
  );
}
