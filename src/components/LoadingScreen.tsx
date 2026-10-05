import { Mark } from "./ui/Mark";
import { APP_NAME } from "@/lib/brand";

export function LoadingScreen() {
  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg"
      role="status"
      aria-label="Loading"
    >
      <Mark size={56} animated />
      <span className="font-display text-sm font-semibold tracking-wide text-fg-subtle">
        {APP_NAME}
      </span>
    </div>
  );
}
