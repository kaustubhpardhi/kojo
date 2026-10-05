"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { spring } from "@/lib/motion";
import { Icon, type IconName } from "./Icon";

interface Toast {
  id: number;
  message: string;
  icon?: IconName;
  tone?: "default" | "success" | "danger";
}

const ToastContext = createContext<{ toast: (t: Omit<Toast, "id">) => void }>({
  toast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

const TONES = {
  default: "text-fg",
  success: "text-success",
  danger: "text-danger",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev.slice(-2), { ...t, id }]);
    setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), 2600);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-4"
        style={{ bottom: "calc(var(--tabbar-h) + var(--safe-bottom) + 16px)" }}
        aria-live="polite"
        role="status"
      >
        <AnimatePresence>
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={spring.snappy}
              className="flex max-w-sm items-center gap-2.5 rounded-full bg-surface px-4 py-3 shadow-lift"
            >
              {item.icon && (
                <span className={TONES[item.tone ?? "default"]}>
                  <Icon name={item.icon} size={18} />
                </span>
              )}
              <span className="text-sm font-medium">{item.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
