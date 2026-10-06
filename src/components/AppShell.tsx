"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "./AuthProvider";
import { LoadingScreen } from "./LoadingScreen";
import { TabBar } from "./TabBar";
import { StartWorkoutProvider, useStartWorkoutSheet } from "./StartWorkoutContext";
import { InstallPrompt } from "./InstallPrompt";
import { OfflineBanner } from "./OfflineBanner";

/** Signed-in chrome: tab bar, start sheet, offline banner, install nudge. */
export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) return <LoadingScreen />;

  return (
    <StartWorkoutProvider userId={user.id}>
      <OfflineBanner />
      <main className="mx-auto min-h-dvh w-full max-w-lg pb-tabbar">{children}</main>
      <AppTabBar />
      <InstallPrompt />
    </StartWorkoutProvider>
  );
}

function AppTabBar() {
  const { openStart } = useStartWorkoutSheet();
  return <TabBar onStart={() => openStart()} />;
}
