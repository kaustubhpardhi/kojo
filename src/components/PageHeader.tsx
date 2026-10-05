import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  back?: ReactNode;
}

export function PageHeader({ title, subtitle, action, back }: PageHeaderProps) {
  return (
    <header className="flex items-start gap-3 pt-3 pb-5">
      {back}
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-[28px] font-extrabold leading-tight tracking-[-0.02em]">
          {title}
        </h1>
        {subtitle && <p className="mt-0.5 text-[14px] text-fg-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
