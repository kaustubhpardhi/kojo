"use client";

import { forwardRef, type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/haptics";
import { Icon, type IconName } from "./Icon";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "soft";
type Size = "sm" | "md" | "lg" | "xl";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-on-accent shadow-soft",
  secondary: "bg-surface-2 text-fg",
  soft: "bg-accent-soft text-accent-fg",
  ghost: "bg-transparent text-fg-muted hover:text-fg",
  danger: "bg-danger/15 text-danger",
};

const SIZES: Record<Size, string> = {
  sm: "h-10 px-4 text-sm rounded-full gap-1.5",
  md: "h-12 px-5 text-[15px] rounded-full gap-2",
  lg: "h-14 px-6 text-base rounded-full gap-2",
  xl: "h-16 px-7 text-lg rounded-[22px] gap-2.5",
};

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    block,
    icon,
    iconRight,
    loading,
    disabled,
    className,
    children,
    onClick,
    type = "button",
    ...rest
  },
  ref,
) {
  const iconSize = size === "xl" ? 24 : size === "sm" ? 18 : 20;
  return (
    <motion.button
      ref={ref}
      type={type}
      whileTap={disabled || loading ? undefined : { scale: 0.96 }}
      transition={{ type: "spring", stiffness: 600, damping: 30 }}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={(e) => {
        haptic("tap");
        onClick?.(e);
      }}
      className={cn(
        "inline-flex select-none items-center justify-center font-semibold tracking-[-0.01em] transition-colors disabled:opacity-45",
        VARIANTS[variant],
        SIZES[size],
        block && "w-full",
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent" />
      ) : (
        <>
          {icon && <Icon name={icon} size={iconSize} />}
          {children}
          {iconRight && <Icon name={iconRight} size={iconSize} />}
        </>
      )}
    </motion.button>
  );
});

interface IconButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  icon: IconName;
  label: string;
  variant?: "secondary" | "ghost" | "primary" | "soft";
  size?: "md" | "lg";
  iconSize?: number;
}

export function IconButton({
  icon,
  label,
  variant = "secondary",
  size = "md",
  iconSize,
  className,
  onClick,
  type = "button",
  ...rest
}: IconButtonProps) {
  return (
    <motion.button
      type={type}
      aria-label={label}
      title={label}
      whileTap={{ scale: 0.9 }}
      onClick={(e) => {
        haptic("tap");
        onClick?.(e);
      }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40",
        size === "lg" ? "h-14 w-14" : "h-12 w-12",
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      <Icon name={icon} size={iconSize ?? (size === "lg" ? 24 : 22)} />
    </motion.button>
  );
}
