import { Suspense } from "react";
import { HomePageContent } from "./HomePageContent";

function HomePageFallback() {
  return (
    <div
      className="min-h-dvh flex items-center justify-center"
      style={{ background: "var(--bg-primary)" }}
    >
      <div className="text-center">
        <span
          className="text-5xl font-black animate-pulse neon-text"
          style={{
            fontFamily: "var(--font-jp)",
            color: "var(--accent-primary)",
          }}
        >
          工
        </span>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomePageFallback />}>
      <HomePageContent />
    </Suspense>
  );
}
