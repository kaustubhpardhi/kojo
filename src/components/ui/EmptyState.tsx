import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  body?: string;
  action?: ReactNode;
}

export function EmptyState({ icon = "sparkle", title, body, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] bg-accent-soft text-accent-fg">
        <Icon name={icon} size={28} />
      </div>
      <h3 className="font-display text-xl font-bold">{title}</h3>
      {body && <p className="mt-1.5 max-w-xs text-sm text-fg-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
