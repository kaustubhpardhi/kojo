"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { formatDate } from "@/lib/dates";
import { haptic } from "@/lib/haptics";
import { spring } from "@/lib/motion";
import { getStreaks } from "@/lib/queries";
import { useAsync } from "@/hooks/useAsync";
import { Burst } from "../ui/Burst";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { Mascot } from "../ui/Mark";
import { useToast } from "../ui/Toast";
import { buildShareCard } from "@/lib/share-card";

interface SessionCompleteProps {
  title: string;
  date: string;
  exerciseCount: number;
  setCount: number;
  volume: number;
  prCount: number;
  userId: string;
  onDone: () => void;
}

export function SessionComplete({
  title,
  date,
  exerciseCount,
  setCount,
  volume,
  prCount,
  userId,
  onDone,
}: SessionCompleteProps) {
  const { toast } = useToast();
  const [sharing, setSharing] = useState(false);
  const { data: streaks } = useAsync(() => getStreaks(userId), [userId]);

  useEffect(() => {
    haptic("pr");
  }, []);

  const share = async () => {
    setSharing(true);
    try {
      const blob = await buildShareCard({
        title,
        date: formatDate(date, { weekday: "long", day: "numeric", month: "long" }),
        stats: [
          { label: "Exercises", value: String(exerciseCount) },
          { label: "Sets", value: String(setCount) },
          { label: "Volume", value: `${Math.round(volume).toLocaleString()} kg` },
        ],
        streak: streaks?.current ?? 0,
        prCount,
      });

      const file = new File([blob], "kojo-workout.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${title} — kōjō` });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "kojo-workout.png";
        a.click();
        URL.revokeObjectURL(url);
        toast({ message: "Saved the card to your downloads", icon: "download" });
      }
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        console.error(err);
        toast({ message: "Couldn't create the image", icon: "x", tone: "danger" });
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 pb-safe pt-safe">
      <Burst count={22} />

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={spring.bouncy}
        className="relative z-10 flex flex-col items-center text-center"
      >
        <Mascot size={88} mood={prCount > 0 ? "proud" : "happy"} />
        <h1 className="mt-5 font-display text-[40px] font-extrabold leading-none tracking-[-0.03em]">
          {prCount > 0 ? "New PR day!" : "Session done"}
        </h1>
        <p className="mt-2 text-[15px] text-fg-muted">
          {title} · {formatDate(date, { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...spring.gentle, delay: 0.12 }}
        className="relative z-10 mt-8 grid grid-cols-3 gap-2.5"
      >
        <Stat value={String(exerciseCount)} label="Exercises" />
        <Stat value={String(setCount)} label="Sets" />
        <Stat value={`${Math.round(volume).toLocaleString()}`} label="kg lifted" />
      </motion.div>

      {(streaks?.current ?? 0) > 0 && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ...spring.gentle, delay: 0.2 }}
          className="relative z-10 mt-2.5 flex items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-accent-soft p-4 text-accent-fg"
        >
          <Icon name="flame" size={20} filled />
          <span className="font-display text-[17px] font-bold">
            {streaks!.current} week streak
          </span>
        </motion.div>
      )}

      {prCount > 0 && (
        <p className="relative z-10 mt-3 text-center text-[14px] font-semibold text-success">
          {prCount === 1 ? "1 personal best" : `${prCount} personal bests`} today. Big.
        </p>
      )}

      <div className="relative z-10 mt-8 space-y-2.5">
        <Button block size="xl" onClick={onDone}>
          Done
        </Button>
        <Button block size="lg" variant="secondary" icon="share" loading={sharing} onClick={() => void share()}>
          Share this session
        </Button>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] bg-surface p-4 text-center shadow-soft">
      <p className="font-display text-[26px] font-extrabold leading-none tabular">{value}</p>
      <p className="mt-1 text-[12px] font-medium text-fg-muted">{label}</p>
    </div>
  );
}
