import type { Metadata } from "next";
import { DesignSystem } from "@/components/DesignSystem";
import { APP_NAME } from "@/lib/brand";

/** Internal reference page; kept out of search engines. */
export const metadata: Metadata = {
  title: `${APP_NAME} — design system`,
  robots: { index: false, follow: false },
};

export default function DesignPage() {
  return <DesignSystem />;
}
