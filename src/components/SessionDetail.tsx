"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDate, friendlyDate } from "@/lib/dates";
import { deleteSession, getSessionDetail } from "@/lib/queries";
import { useAsync } from "@/hooks/useAsync";
import { PageHeader } from "./PageHeader";
import { Button, IconButton } from "./ui/Button";
import { Card } from "./ui/Card";
import { EmptyState } from "./ui/EmptyState";
import { Icon } from "./ui/Icon";
import { Sheet } from "./ui/Sheet";
import { SkeletonList } from "./ui/Skeleton";
import { useToast } from "./ui/Toast";

export function SessionDetail({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const { data: session, loading } = useAsync(() => getSessionDetail(sessionId), [sessionId]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const remove = async () => {
    setDeleting(true);
    try {
      await deleteSession(sessionId);
      toast({ message: "Session deleted", icon: "trash" });
      router.replace("/");
    } catch {
      toast({ message: "Couldn't delete that", icon: "x", tone: "danger" });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="px-4 pt-safe">
        <PageHeader title="Session" />
        <SkeletonList rows={4} />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="px-4 pt-safe">
        <EmptyState
          icon="cloudOff"
          title="Session not found"
          action={<Button onClick={() => router.replace("/")}>Back home</Button>}
        />
      </div>
    );
  }

  const logged = session.exercises.filter((e) => e.sets.length > 0);

  return (
    <div className="px-4 pt-safe">
      <PageHeader
        title={session.title ?? "Freestyle session"}
        subtitle={`${friendlyDate(session.date)} · ${formatDate(session.date, {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}`}
        back={
          <IconButton
            icon="chevronLeft"
            label="Back"
            variant="ghost"
            onClick={() => router.back()}
            className="-ml-3"
          />
        }
        action={
          <IconButton
            icon="trash"
            label="Delete session"
            variant="ghost"
            onClick={() => setConfirmOpen(true)}
          />
        }
      />

      <div className="grid grid-cols-3 gap-2.5">
        <Stat value={String(logged.length)} label="Exercises" />
        <Stat value={String(session.totalSets)} label="Sets" />
        <Stat value={Math.round(session.totalVolume).toLocaleString()} label="kg lifted" />
      </div>

      {!session.completed_at && (
        <Card className="mt-3 flex items-center gap-3">
          <span className="text-accent-fg">
            <Icon name="clock" size={20} />
          </span>
          <span className="min-w-0 flex-1 text-[14px] text-fg-muted">
            This session was never finished.
          </span>
          <Button size="sm" onClick={() => router.push(`/log/${session.id}`)}>
            Resume
          </Button>
        </Card>
      )}

      <div className="mt-5 space-y-3">
        {logged.map((entry) => (
          <Card key={entry.id} padded={false} className="overflow-hidden">
            <div className="flex items-baseline justify-between gap-3 px-4 pt-3.5 pb-2">
              <h3 className="min-w-0 truncate font-display text-[17px] font-bold">
                {entry.exercise.name}
              </h3>
              <span className="shrink-0 text-[12.5px] text-fg-muted">
                {entry.sets.length} {entry.sets.length === 1 ? "set" : "sets"}
              </span>
            </div>
            <div className="divide-y divide-line">
              {entry.sets.map((set) => (
                <div
                  key={set.setNumber}
                  className="flex items-center gap-3 px-4 py-2.5 text-[14.5px]"
                >
                  <span className="w-6 shrink-0 text-fg-subtle tabular">{set.setNumber}</span>
                  <span className="flex-1 font-semibold tabular">
                    {set.weight} kg × {set.reps}
                  </span>
                  {set.isAmrap && (
                    <span className="rounded-full bg-pop/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-pop">
                      AMRAP
                    </span>
                  )}
                  <span className="shrink-0 text-[13px] text-fg-subtle tabular">
                    {Math.round(set.weight * set.reps).toLocaleString()} kg
                  </span>
                </div>
              ))}
            </div>
          </Card>
        ))}

        {logged.length === 0 && (
          <EmptyState icon="note" title="No sets were logged in this session" />
        )}
      </div>

      <Sheet
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete this session?"
        subtitle="Every set logged in it is removed too. This can't be undone."
      >
        <div className="space-y-2.5 pb-4">
          <Button block size="lg" variant="danger" loading={deleting} onClick={() => void remove()}>
            Delete session
          </Button>
          <Button block size="lg" variant="ghost" onClick={() => setConfirmOpen(false)}>
            Keep it
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] bg-surface p-3.5 text-center shadow-soft">
      <p className="font-display text-[22px] font-extrabold leading-none tabular">{value}</p>
      <p className="mt-1 text-[11.5px] font-medium text-fg-muted">{label}</p>
    </div>
  );
}
