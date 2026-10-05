"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { usePrefs } from "./PreferencesProvider";
import { PageHeader } from "./PageHeader";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Icon } from "./ui/Icon";
import { SegmentedControl } from "./ui/SegmentedControl";
import { Sheet } from "./ui/Sheet";
import { Stepper } from "./ui/Stepper";
import { useToast } from "./ui/Toast";
import { TemplateCard } from "./TemplateCard";
import { useAsync } from "@/hooks/useAsync";
import { signOut } from "@/lib/auth";
import { DEFAULT_GOAL, readGoal, writeGoal } from "@/lib/goal";
import { PALETTES, type ThemeMode } from "@/lib/prefs";
import { buildExportData } from "@/lib/progress-queries";
import { getArchivedTemplates, setTemplateArchived } from "@/lib/queries";
import { pendingCount, syncOutbox } from "@/lib/offline";
import { cn } from "@/lib/cn";

export function ProfileContent() {
  const { user } = useAuth();
  const userId = user!.id;
  const router = useRouter();
  const { prefs, setPrefs } = usePrefs();
  const { toast } = useToast();

  const [goal, setGoal] = useState(readGoal);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { data: pending, reload: reloadPending } = useAsync(pendingCount, []);

  const updateGoal = (next: number | "") => {
    const value = next === "" ? DEFAULT_GOAL : Math.max(1, Math.min(14, next));
    setGoal(value);
    writeGoal(value);
  };

  const exportData = async () => {
    setExporting(true);
    try {
      const data = await buildExportData(userId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kojo-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ message: "Export downloaded", icon: "download", tone: "success" });
    } catch {
      toast({ message: "Couldn't build the export", icon: "x", tone: "danger" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="px-4 pt-safe">
      <PageHeader title="Profile" subtitle={user!.email ?? undefined} />

      {/* Appearance */}
      <section>
        <SectionTitle icon="sun">Appearance</SectionTitle>
        <Card className="space-y-4">
          <div>
            <p className="mb-2 text-[13px] font-medium text-fg-muted">Theme</p>
            <SegmentedControl<ThemeMode>
              label="Theme"
              value={prefs.theme}
              onChange={(theme) => setPrefs({ theme })}
              options={[
                { value: "system", label: "Auto" },
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
              ]}
            />
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-fg-muted">Palette</p>
            <div className="space-y-2">
              {PALETTES.map((palette) => (
                <PaletteRow
                  key={palette.id}
                  palette={palette}
                  selected={prefs.palette === palette.id}
                  onSelect={() => setPrefs({ palette: palette.id })}
                />
              ))}
            </div>
          </div>
        </Card>
      </section>

      {/* Training */}
      <section className="mt-6">
        <SectionTitle icon="dumbbell">Training</SectionTitle>
        <Card className="space-y-4">
          <Stepper
            label="Weekly goal"
            unit="workouts"
            value={goal}
            min={1}
            max={14}
            onChange={updateGoal}
          />
          <Row
            icon="archive"
            label="Archived workouts"
            onClick={() => setArchiveOpen(true)}
          />
        </Card>
      </section>

      {/* Data */}
      <section className="mt-6">
        <SectionTitle icon="download">Your data</SectionTitle>
        <Card className="space-y-2">
          <Row
            icon="download"
            label="Export everything as JSON"
            hint="Sessions, sets, PRs"
            loading={exporting}
            onClick={() => void exportData()}
          />
          <Row
            icon={pending && pending > 0 ? "cloudOff" : "check"}
            label={
              pending && pending > 0
                ? `${pending} change${pending === 1 ? "" : "s"} waiting to sync`
                : "Everything is synced"
            }
            hint={pending && pending > 0 ? "Tap to retry now" : undefined}
            onClick={async () => {
              const synced = await syncOutbox();
              reloadPending();
              toast({
                message: synced > 0 ? `Synced ${synced}` : "Nothing pending",
                icon: "check",
              });
            }}
          />
        </Card>
      </section>

      {/* Account */}
      <section className="mt-6">
        <SectionTitle icon="user">Account</SectionTitle>
        <Card className="space-y-2">
          <Row
            icon="logout"
            label="Sign out"
            danger
            onClick={async () => {
              await signOut();
              router.replace("/login");
            }}
          />
        </Card>
      </section>

      <div className="mt-8 flex items-center justify-center gap-2 pb-2 text-[12.5px] text-fg-subtle">
        <span>kōjō · 工場</span>
        <span aria-hidden>·</span>
        <button type="button" onClick={() => router.push("/design")} className="underline">
          design system
        </button>
      </div>

      <ArchiveSheet
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        userId={userId}
      />
    </div>
  );
}

function SectionTitle({
  icon,
  children,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  children: string;
}) {
  return (
    <h2 className="mb-2 flex items-center gap-1.5 px-1 text-[13px] font-semibold uppercase tracking-wide text-fg-subtle">
      <Icon name={icon} size={14} /> {children}
    </h2>
  );
}

function Row({
  icon,
  label,
  hint,
  danger,
  loading,
  onClick,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  label: string;
  hint?: string;
  danger?: boolean;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex min-h-14 w-full items-center gap-3 rounded-[var(--radius-md)] px-1 text-left active:opacity-70 disabled:opacity-50"
    >
      <span className={danger ? "text-danger" : "text-fg-muted"}>
        <Icon name={icon} size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block text-[15px] font-semibold", danger && "text-danger")}>
          {label}
        </span>
        {hint && <span className="block text-[12.5px] text-fg-subtle">{hint}</span>}
      </span>
      <Icon name="chevronRight" size={18} className="shrink-0 text-fg-subtle" />
    </button>
  );
}

function PaletteRow({
  palette,
  selected,
  onSelect,
}: {
  palette: (typeof PALETTES)[number];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex min-h-14 w-full items-center gap-3 rounded-[var(--radius-md)] px-3.5 text-left transition-colors",
        selected ? "bg-accent-soft" : "bg-surface-2",
      )}
    >
      <span className="flex shrink-0 gap-1">
        {palette.swatch.map((color) => (
          <span
            key={color}
            className="h-6 w-6 rounded-full"
            style={{ background: color }}
            aria-hidden
          />
        ))}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">{palette.name}</span>
        <span className="block text-[12.5px] text-fg-muted">{palette.blurb}</span>
      </span>
      {selected && (
        <span className="shrink-0 text-accent-fg">
          <Icon name="check" size={20} strokeWidth={2.6} />
        </span>
      )}
    </button>
  );
}

function ArchiveSheet({
  open,
  onClose,
  userId,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
}) {
  const { toast } = useToast();
  const { data: archived, loading, reload } = useAsync(
    () => getArchivedTemplates(userId),
    [userId],
    open,
  );

  const restore = async (id: string, name: string) => {
    try {
      await setTemplateArchived(id, false);
      reload();
      toast({ message: `${name} restored`, icon: "undo", tone: "success" });
    } catch {
      toast({ message: "Couldn't restore that", icon: "x", tone: "danger" });
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Archived workouts">
      <div className="space-y-2.5 pb-4">
        {loading && <p className="py-6 text-center text-[14px] text-fg-muted">Loading…</p>}
        {!loading && archived?.length === 0 && (
          <p className="py-8 text-center text-[14px] text-fg-muted">
            Nothing archived. Archiving hides a workout without touching its history.
          </p>
        )}
        {archived?.map((template) => (
          <div key={template.id} className="flex items-center gap-2">
            <div className="min-w-0 flex-1 opacity-70">
              <TemplateCard
                template={template}
                compact
                onPress={() => void restore(template.id, template.name)}
              />
            </div>
            <Button
              size="sm"
              variant="soft"
              onClick={() => void restore(template.id, template.name)}
            >
              Restore
            </Button>
          </div>
        ))}
      </div>
    </Sheet>
  );
}
