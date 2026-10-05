import type { Metadata } from "next";
import { DesignSystem } from "@/components/DesignSystem";

/** Internal reference page; kept out of search engines. */
export const metadata: Metadata = {
  title: "kōjō — design system",
  robots: { index: false, follow: false },
};

export default function DesignPage() {
  return <DesignSystem />;
}
