"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { onOutboxChange, pendingCount, syncOutbox } from "@/lib/offline";
import { Icon } from "./ui/Icon";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    const refresh = () => {
      void pendingCount().then(setPending);
    };
    refresh();
    const off = onOutboxChange(refresh);
    const timer = setInterval(refresh, 5000);
    return () => {
      off();
      clearInterval(timer);
    };
  }, []);

  const visible = offline || pending > 0;
  const message = offline
    ? pending > 0
      ? `Offline · ${pending} saved on device`
      : "Offline · we'll save everything here"
    : `Syncing ${pending}…`;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className="sticky top-0 z-30 w-full bg-surface-2 px-4 py-2 pt-safe"
        >
          <button
            type="button"
            onClick={() => void syncOutbox()}
            className="mx-auto flex w-full max-w-lg items-center justify-center gap-2 text-[13px] font-medium text-fg-muted"
          >
            <Icon name={offline ? "cloudOff" : "clock"} size={16} />
            {message}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
