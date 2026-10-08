"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
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
  const dragControls = useDragControls();
  const scrollYRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    // iOS: body overflow:hidden alone still rubber-bands; pin the page.
    scrollYRef.current = window.scrollY;
    const { body, documentElement } = document;
    const prev = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      htmlOverflow: documentElement.style.overflow,
    };
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollYRef.current}px`;
    body.style.width = "100%";
    documentElement.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      body.style.overflow = prev.overflow;
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      documentElement.style.overflow = prev.htmlOverflow;
      window.scrollTo(0, scrollYRef.current);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center overflow-x-clip overscroll-none">
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
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.35 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose();
            }}
            initial={{ y: "100%", x: 0 }}
            animate={{ y: 0, x: 0 }}
            exit={{ y: "100%", x: 0 }}
            transition={spring.sheet}
            style={{ maxHeight, x: 0 }}
            className={cn(
              "relative flex w-full max-w-lg min-w-0 flex-col overflow-x-clip overflow-y-hidden rounded-t-[28px] bg-surface shadow-lift outline-none",
              className,
            )}
          >
            {/* Drag only from the grabber — full-panel drag sets touch-action:none and breaks list scroll on iOS. */}
            <div
              className="flex shrink-0 cursor-grab touch-none justify-center pt-3 pb-1 active:cursor-grabbing"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="h-1.5 w-10 rounded-full bg-surface-3" />
            </div>
            {title && (
              <div className="flex shrink-0 items-start justify-between gap-3 px-5 pt-1 pb-3">
                <div className="min-w-0 flex-1">
                  <h2 id={titleId} className="font-display text-xl font-bold">
                    {title}
                  </h2>
                  {subtitle && <p className="mt-0.5 text-sm text-fg-muted">{subtitle}</p>}
                </div>
                <IconButton icon="x" label="Close" variant="ghost" onClick={onClose} />
              </div>
            )}
            <div className="min-h-0 min-w-0 flex-1 overflow-x-clip overflow-y-auto overscroll-y-contain px-5 [-webkit-overflow-scrolling:touch]">
              {children}
            </div>
            <div className="shrink-0 px-5 pt-3 pb-safe">{footer}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
