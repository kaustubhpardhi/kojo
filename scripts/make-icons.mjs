/**
 * Renders the PWA PNG icons from the SVG sources using headless Chrome, so the
 * repo needs no image dependency. Run after editing public/icons/*.svg:
 *
 *   node scripts/make-icons.mjs
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, copyFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const iconsDir = join(root, "public", "icons");

const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const TARGETS = [
  { svg: "icon.svg", out: "icon-192.png", size: 192 },
  { svg: "icon.svg", out: "icon-512.png", size: 512 },
  { svg: "icon.svg", out: "apple-touch-icon.png", size: 180, bg: "#ff7a59" },
  { svg: "maskable.svg", out: "maskable-512.png", size: 512 },
];

const work = mkdtempSync(join(tmpdir(), "kojo-icons-"));

try {
  for (const target of TARGETS) {
    const svg = readFileSync(join(iconsDir, target.svg), "utf8");
    const html = `<!doctype html><meta charset="utf-8"><style>
      html,body{margin:0;padding:0;background:${target.bg ?? "transparent"};}
      svg{display:block;width:${target.size}px;height:${target.size}px;}
    </style>${svg}`;

    const htmlPath = join(work, `${target.out}.html`);
    writeFileSync(htmlPath, html);

    execFileSync(CHROME, [
      "--headless",
      "--disable-gpu",
      "--hide-scrollbars",
      ...(target.bg ? [] : ["--default-background-color=00000000"]),
      `--screenshot=${join(work, target.out)}`,
      `--window-size=${target.size},${target.size}`,
      `--force-device-scale-factor=1`,
      htmlPath,
    ], { stdio: "ignore" });

    copyFileSync(join(work, target.out), join(iconsDir, target.out));
    console.log(`wrote public/icons/${target.out} (${target.size}px)`);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
