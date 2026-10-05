"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { spring } from "@/lib/motion";
import { Button, IconButton } from "./ui/Button";
import { Mark } from "./ui/Mark";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const KEY = "kojo-install-dismissed";
/** Only ask after the app has clearly been useful, and at most once a month. */
const SNOOZE_DAYS = 30;
const MIN_VISITS = 3;

export function InstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissedAt = Number(localStorage.getItem(KEY) ?? 0);
    if (Date.now() - dismissedAt < SNOOZE_DAYS * 86_400_000) return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const visits = Number(localStorage.getItem("kojo-visits") ?? 0) + 1;
    localStorage.setItem("kojo-visits", String(visits));

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
      if (visits >= MIN_VISITS) setTimeout(() => setVisible(true), 4000);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const dismiss = () => {
    localStorage.setItem(KEY, String(Date.now()));
    setVisible(false);
  };

  const install = async () => {
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    localStorage.setItem(KEY, String(Date.now()));
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && event && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={spring.sheet}
          className="fixed inset-x-3 z-50 mx-auto max-w-lg rounded-[22px] bg-surface p-4 shadow-lift"
          style={{ bottom: "calc(var(--tabbar-h) + var(--safe-bottom) + 12px)" }}
        >
          <div className="flex items-center gap-3">
            <Mark size={44} />
            <div className="min-w-0 flex-1">
              <p className="font-display text-base font-bold">Keep kōjō on your home screen</p>
              <p className="text-[13px] text-fg-muted">Opens instantly, works offline.</p>
            </div>
            <IconButton icon="x" label="Not now" variant="ghost" onClick={dismiss} />
          </div>
          <Button block size="md" className="mt-3" icon="download" onClick={install}>
            Add to home screen
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
