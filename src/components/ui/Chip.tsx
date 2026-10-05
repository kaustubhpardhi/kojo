"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/haptics";

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  size?: "sm" | "md";
  leading?: ReactNode;
}

export function Chip({
  selected,
  size = "md",
  leading,
  className,
  children,
  onClick,
  type = "button",
  ...rest
}: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      onClick={(e) => {
        haptic("tap");
        onClick?.(e);
      }}
      className={cn(
        "inline-flex shrink-0 select-none items-center gap-1.5 whitespace-nowrap rounded-full font-medium transition-colors duration-150 active:scale-[0.97]",
        size === "sm" ? "h-9 px-3.5 text-[13px]" : "h-11 px-4 text-sm",
        selected
          ? "bg-fg text-bg"
          : "bg-surface-2 text-fg-muted hover:text-fg",
        className,
      )}
      {...rest}
    >
      {leading}
      {children}
    </button>
  );
}
