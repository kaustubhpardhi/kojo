import { Suspense } from "react";
import { ProgressPage } from "@/components/progress/ProgressPage";
import { LoadingScreen } from "@/components/LoadingScreen";

export default function ProgressRoute() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <ProgressPage />
    </Suspense>
  );
}
