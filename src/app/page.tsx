import { Suspense } from "react";
import { HomePageContent } from "./HomePageContent";
import { LoadingScreen } from "@/components/LoadingScreen";

function HomePageFallback() {
  return <LoadingScreen />;
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomePageFallback />}>
      <HomePageContent />
    </Suspense>
  );
}
