"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "./AuthProvider";
import { LoadingScreen } from "./LoadingScreen";
import { TabBar } from "./TabBar";
import { StartWorkoutSheet } from "./StartWorkoutSheet";
import { InstallPrompt } from "./InstallPrompt";
import { OfflineBanner } from "./OfflineBanner";

/** Signed-in chrome: tab bar, start sheet, offline banner, install nudge. */
export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [startOpen, setStartOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) return <LoadingScreen />;

  return (
    <>
      <OfflineBanner />
      <main className="mx-auto min-h-dvh w-full max-w-lg pb-tabbar">{children}</main>
      <TabBar onStart={() => setStartOpen(true)} />
      <StartWorkoutSheet
        open={startOpen}
        onClose={() => setStartOpen(false)}
        userId={user.id}
      />
      <InstallPrompt />
    </>
  );
}
