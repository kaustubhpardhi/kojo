import type { Transition } from "framer-motion";

export const spring = {
  snappy: { type: "spring", stiffness: 520, damping: 34 } satisfies Transition,
  gentle: { type: "spring", stiffness: 260, damping: 28 } satisfies Transition,
  bouncy: { type: "spring", stiffness: 420, damping: 18 } satisfies Transition,
  sheet: { type: "spring", stiffness: 380, damping: 38 } satisfies Transition,
};

export const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};
