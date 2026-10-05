"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion";
import { IconButton } from "./Button";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  /** Sheet grows with content up to this fraction of the viewport. */
  maxHeight?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  maxHeight = "88dvh",
  children,
  footer,
  className,
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <motion.button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute inset-0 bg-scrim backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          />
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose();
            }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={spring.sheet}
            style={{ maxHeight }}
            className={cn(
              "relative flex w-full max-w-lg flex-col rounded-t-[28px] bg-surface shadow-lift outline-none",
              className,
            )}
          >
            <div className="flex shrink-0 cursor-grab justify-center pt-3 pb-1 active:cursor-grabbing">
              <div className="h-1.5 w-10 rounded-full bg-surface-3" />
            </div>
            {title && (
              <div className="flex shrink-0 items-start justify-between gap-3 px-5 pt-1 pb-3">
                <div className="min-w-0">
                  <h2 id={titleId} className="font-display text-xl font-bold">
                    {title}
                  </h2>
                  {subtitle && <p className="mt-0.5 text-sm text-fg-muted">{subtitle}</p>}
                </div>
                <IconButton icon="x" label="Close" variant="ghost" onClick={onClose} />
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5">{children}</div>
            <div className={cn("shrink-0 px-5 pt-3", footer ? "pb-safe" : "pb-safe")}>{footer}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
