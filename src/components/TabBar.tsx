"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/haptics";
import { spring } from "@/lib/motion";
import { Icon, type IconName } from "./ui/Icon";

const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/workouts", label: "Workouts", icon: "dumbbell" },
  { href: "/progress", label: "Progress", icon: "chart" },
  { href: "/profile", label: "Profile", icon: "user" },
];

export function TabBar({ onStart }: { onStart: () => void }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-xl"
      style={{ height: "calc(var(--tabbar-h) + var(--safe-bottom))" }}
    >
      <div
        className="mx-auto grid h-[var(--tabbar-h)] max-w-lg grid-cols-5 items-center px-1"
      >
        {TABS.slice(0, 2).map((tab) => (
          <TabLink key={tab.href} {...tab} active={isActive(pathname, tab.href)} />
        ))}

        <div className="flex justify-center">
          <motion.button
            type="button"
            onClick={() => {
              haptic("tap");
              onStart();
            }}
            whileTap={{ scale: 0.9 }}
            transition={spring.snappy}
            aria-label="Start a workout"
            className="-mt-7 flex h-16 w-16 items-center justify-center rounded-full bg-accent text-on-accent shadow-lift"
          >
            <Icon name="play" size={26} />
          </motion.button>
        </div>

        {TABS.slice(2).map((tab) => (
          <TabLink key={tab.href} {...tab} active={isActive(pathname, tab.href)} />
        ))}
      </div>
    </nav>
  );
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

function TabLink({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: IconName;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      onClick={() => haptic("tap")}
      className={cn(
        "flex h-full flex-col items-center justify-center gap-1 transition-colors",
        active ? "text-accent-fg" : "text-fg-subtle",
      )}
    >
      <Icon name={icon} size={23} filled={active && icon !== "chart"} strokeWidth={active ? 2.2 : 1.9} />
      <span className="text-[11px] font-semibold tracking-[-0.01em]">{label}</span>
    </Link>
  );
}
