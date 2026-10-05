/**
 * Dev-only screenshots of real screens at phone size.
 *
 * Drives headless Chrome over the DevTools protocol rather than the
 * --screenshot flag, because the flag ignores the emulated mobile viewport and
 * silently captures a wider layout.
 *
 * Usage: node scripts/shots.mjs [baseUrl]
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.argv[2] ?? "http://localhost:3000";
const PORT = 9333;
const OUT = join(tmpdir(), "kojo-shots");

const SHOTS = [
  { name: "login-dark", path: "/login", theme: "dark", palette: "sunrise" },
  { name: "login-light", path: "/login", theme: "light", palette: "sunrise" },
  { name: "design-matcha", path: "/design", theme: "dark", palette: "matcha" },
  { name: "design-grape-light", path: "/design", theme: "light", palette: "grape" },
  { name: "design-buttons", path: "/design", theme: "dark", palette: "sunrise", scroll: 1180 },
  { name: "design-controls", path: "/design", theme: "dark", palette: "sunrise", scroll: 1900 },
  { name: "design-mascot", path: "/design", theme: "dark", palette: "sunrise", scroll: 2620 },
  { name: "design-states", path: "/design", theme: "dark", palette: "sunrise", scroll: 3340 },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function openTarget() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const targets = await res.json();
      const page = targets.find((t) => t.type === "page");
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      // Chrome is still starting.
    }
    await sleep(250);
  }
  throw new Error("Chrome debugger never came up");
}

function connect(url) {
  const ws = new WebSocket(url);
  const pending = new Map();
  let id = 0;
  const ready = new Promise((resolve, reject) => {
    ws.onopen = () => resolve();
    ws.onerror = (e) => reject(e);
  });
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    const slot = pending.get(msg.id);
    if (!slot) return;
    pending.delete(msg.id);
    msg.error ? slot.reject(new Error(msg.error.message)) : slot.resolve(msg.result);
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const msgId = ++id;
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  return { ready, send, close: () => ws.close() };
}

const chrome = spawn(CHROME, [
  "--headless=new",
  "--disable-gpu",
  "--hide-scrollbars",
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${join(OUT, "profile")}`,
  "about:blank",
]);
chrome.stderr.on("data", () => {});

mkdirSync(OUT, { recursive: true });

try {
  const cdp = connect(await openTarget());
  await cdp.ready;
  await cdp.send("Page.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });

  for (const shot of SHOTS) {
    const url = `${BASE}${shot.path}?__theme=${shot.theme}&__palette=${shot.palette}`;
    await cdp.send("Page.navigate", { url });
    await sleep(2500);
    if (shot.scroll) {
      await cdp.send("Runtime.evaluate", { expression: `scrollTo(0, ${shot.scroll})` });
      await sleep(600);
    }

    const { result } = await cdp.send("Runtime.evaluate", {
      expression:
        "JSON.stringify({w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight, vw: innerWidth})",
      returnByValue: true,
    });
    const size = JSON.parse(result.value);
    if (size.w > size.vw) {
      console.warn(`  ! ${shot.name} overflows: content ${size.w}px in ${size.vw}px viewport`);
    }

    const { data } = await cdp.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: Boolean(shot.full),
      clip: shot.full
        ? { x: 0, y: 0, width: size.vw, height: size.h, scale: 2 }
        : undefined,
    });
    const file = join(OUT, `${shot.name}.png`);
    writeFileSync(file, Buffer.from(data, "base64"));
    console.log(`${file}  (${size.vw}x${shot.full ? size.h : 844})`);
  }

  cdp.close();
} finally {
  chrome.kill();
}
