export type ThemeMode = "system" | "light" | "dark";
export type Palette = "sunrise" | "matcha" | "grape";

export interface Prefs {
  theme: ThemeMode;
  palette: Palette;
  haptics: boolean;
}

export const PALETTES: {
  id: Palette;
  name: string;
  blurb: string;
  swatch: [string, string];
}[] = [
  { id: "sunrise", name: "Sunrise", blurb: "Warm coral + honey", swatch: ["#ff7a59", "#ffc94d"] },
  { id: "matcha", name: "Matcha", blurb: "Fresh mint + lilac", swatch: ["#34d399", "#a78bfa"] },
  { id: "grape", name: "Grape", blurb: "Violet + bubblegum", swatch: ["#a78bfa", "#ff8fc4"] },
];

export const DEFAULT_PREFS: Prefs = { theme: "system", palette: "sunrise", haptics: true };

const KEY = "kojo-prefs";

export const THEME_BG = { light: "#f6f4f0", dark: "#0e1014" } as const;

export function readPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Prefs>) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function writePrefs(prefs: Prefs): void {
  localStorage.setItem(KEY, JSON.stringify(prefs));
}

export function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode !== "system") return mode;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function applyPrefs(prefs: Prefs): void {
  const root = document.documentElement;
  const theme = resolveTheme(prefs.theme);
  root.dataset.theme = theme;
  root.dataset.palette = prefs.palette;
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((m) => m.setAttribute("content", THEME_BG[theme]));
}

/**
 * Inlined in <head> so the first paint already has the right theme.
 * ?__theme= and ?__palette= override the stored values, for previewing a
 * combination without changing your settings.
 */
export const PREFS_INIT_SCRIPT = `(function(){try{var q=new URLSearchParams(location.search);var p=JSON.parse(localStorage.getItem("${KEY}")||"{}");var t=q.get("__theme")||p.theme||"system";if(t==="system"){t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}var r=document.documentElement;r.dataset.theme=t;r.dataset.palette=q.get("__palette")||p.palette||"sunrise"}catch(e){}})();`;
