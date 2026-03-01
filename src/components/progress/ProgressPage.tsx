"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import type { ProgressChipId } from "@/lib/types/progress";
import { SelectorRail } from "./SelectorRail";
import { VisualisationCanvas } from "./VisualisationCanvas";

const DEFAULT_CHIP: ProgressChipId = "strength";

export function ProgressPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeChip, setActiveChip] = useState<ProgressChipId>(DEFAULT_CHIP);

  if (!authLoading && !user) {
    router.push("/login");
    return null;
  }

  if (authLoading) {
    return (
      <div className="min-h-dvh w-full bg-[#0A0A0A] flex items-center justify-center">
        <span className="font-display text-2xl font-bold text-[#3A3A3A]">
          KOJO
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-dvh w-full bg-[#0A0A0A] text-[#F2F2F0]">
      <header className="border-b border-[#3A3A3A] px-4 py-3 flex items-center justify-between">
        <Link
          href="/"
          className="tap-flash text-sm font-bold text-[#F2F2F0]"
          aria-label="Back to home"
        >
          ←
        </Link>
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#3A3A3A]">
          Progress
        </span>
        <span className="w-6" aria-hidden />
      </header>
      <SelectorRail activeChip={activeChip} onSelect={setActiveChip} />
      <VisualisationCanvas activeChip={activeChip} userId={user?.id ?? null} />
    </div>
  );
}
