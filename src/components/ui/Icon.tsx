import type { SVGProps } from "react";

const PATHS = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  dumbbell: "M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  play: "M7 4.5v15l12.5-7.5z",
  check: "M4.5 12.5l5 5L19.5 7",
  chevronLeft: "M15 18l-6-6 6-6",
  chevronRight: "M9 18l6-6-6-6",
  chevronDown: "M6 9l6 6 6-6",
  x: "M6 6l12 12M18 6 6 18",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
  star: "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z",
  flame: "M12 22c4 0 7-2.7 7-6.8 0-3.6-2.4-6.2-4.3-8.2-.4 2-1.4 3.3-2.7 3.8.3-3-1-6.1-3.7-7.8.2 3.2-1.6 5.3-3 7.2A8 8 0 0 0 5 15.2C5 19.3 8 22 12 22z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  grip: "M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01",
  swap: "M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7",
  skip: "M5 5l9 7-9 7zM19 5v14",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  copy: "M9 9h11v11H9zM5 15H4V4h11v1",
  archive: "M3 4h18v4H3zM5 8v12h14V8M10 12h4",
  edit: "M4 20h4L19 9l-4-4L4 16zM14 6l4 4",
  share: "M12 3v12M7 8l5-5 5 5M5 13v7h14v-7",
  trophy: "M8 4h8v5a4 4 0 0 1-8 0zM8 6H4a3 3 0 0 0 4 4M16 6h4a3 3 0 0 1-4 4M12 13v4M8 21h8M9 17h6v4H9z",
  list: "M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01",
  sun: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
  moon: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z",
  note: "M5 4h10l4 4v12H5zM15 4v4h4M8 12h8M8 16h5",
  cloudOff: "M3 3l18 18M8 7a5 5 0 0 1 9 2 4 4 0 0 1 2.8 6.5M16 18H7a4 4 0 0 1-1.3-7.8",
  calendar: "M4 6h16v14H4zM4 10h16M9 3v4M15 3v4",
  download: "M12 3v12M7 10l5 5 5-5M5 21h14",
  logout: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7z",
  undo: "M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3",
  arrowUp: "M12 19V5M5 12l7-7 7 7",
  arrowDown: "M12 5v14M19 12l-7 7-7-7",
} as const;

export type IconName = keyof typeof PATHS;

const FILLED: Partial<Record<IconName, true>> = { play: true };

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: number;
  filled?: boolean;
}

export function Icon({ name, size = 22, filled, strokeWidth = 2, ...rest }: IconProps) {
  const fill = filled || FILLED[name] ? "currentColor" : "none";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable={false}
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
