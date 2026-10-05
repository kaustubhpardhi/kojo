import { EmptyState } from "@/components/ui/EmptyState";
import { Mark } from "@/components/ui/Mark";

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-5">
      <Mark size={48} />
      <EmptyState
        icon="cloudOff"
        title="You're offline"
        body="This screen isn't cached yet. Anything you logged is saved on your device and will sync as soon as you're back."
      />
    </main>
  );
}
