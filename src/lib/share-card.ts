interface ShareCardInput {
  title: string;
  date: string;
  stats: { label: string; value: string }[];
  streak: number;
  prCount: number;
}

/**
 * Renders the session summary to a PNG with the canvas API — no html2canvas,
 * no extra dependency. Colours are read from the live theme so the card matches
 * whatever palette the user picked.
 */
export async function buildShareCard(input: ShareCardInput): Promise<Blob> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  const css = getComputedStyle(document.documentElement);
  const token = (name: string, fallback: string) =>
    css.getPropertyValue(name).trim() || fallback;

  const bg = token("--bg", "#0e1014");
  const surface = token("--surface", "#181b22");
  const fg = token("--fg", "#f4f5f7");
  const muted = token("--fg-muted", "#b0b6c2");
  const accent = token("--accent", "#ff7a59");
  const onAccent = token("--on-accent", "#2b0d03");

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Accent glow behind the mark.
  const glow = ctx.createRadialGradient(W / 2, 300, 0, W / 2, 300, 620);
  glow.addColorStop(0, hexWithAlpha(accent, 0.22));
  glow.addColorStop(1, hexWithAlpha(accent, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, 900);

  // Mark.
  const markX = W / 2 - 54;
  roundRect(ctx, markX, 150, 108, 108, 30);
  ctx.fillStyle = accent;
  ctx.fill();
  ctx.fillStyle = onAccent;
  roundRect(ctx, markX + 24, 176, 60, 13, 6);
  ctx.fill();
  roundRect(ctx, markX + 24, 219, 60, 13, 6);
  ctx.fill();
  roundRect(ctx, markX + 47.5, 185, 13, 38, 6);
  ctx.fill();

  ctx.textAlign = "center";

  ctx.fillStyle = muted;
  ctx.font = "600 30px Inter, system-ui, sans-serif";
  ctx.fillText(input.date.toUpperCase(), W / 2, 330);

  ctx.fillStyle = fg;
  ctx.font = "800 84px Inter, system-ui, sans-serif";
  wrapText(ctx, input.title, W / 2, 440, W - 160, 92);

  // Stats row.
  const cardW = 280;
  const gap = 30;
  const totalW = cardW * 3 + gap * 2;
  let x = (W - totalW) / 2;
  const y = 620;

  for (const stat of input.stats) {
    roundRect(ctx, x, y, cardW, 220, 36);
    ctx.fillStyle = surface;
    ctx.fill();

    ctx.fillStyle = fg;
    ctx.font = "800 62px Inter, system-ui, sans-serif";
    ctx.fillText(stat.value, x + cardW / 2, y + 112);

    ctx.fillStyle = muted;
    ctx.font = "600 26px Inter, system-ui, sans-serif";
    ctx.fillText(stat.label.toUpperCase(), x + cardW / 2, y + 162);

    x += cardW + gap;
  }

  let badgeY = 920;
  if (input.streak > 0) {
    drawBadge(
      ctx,
      `${input.streak} WEEK STREAK`,
      W / 2,
      badgeY,
      accent,
      onAccent,
    );
    badgeY += 112;
  }
  if (input.prCount > 0) {
    drawBadge(
      ctx,
      input.prCount === 1 ? "1 NEW PR" : `${input.prCount} NEW PRS`,
      W / 2,
      badgeY,
      token("--success", "#34d399"),
      bg,
    );
  }

  ctx.fillStyle = muted;
  ctx.font = "700 34px Inter, system-ui, sans-serif";
  ctx.fillText("kōjō", W / 2, H - 90);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to encode image"));
    }, "image/png");
  });
}

function drawBadge(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  bg: string,
  fg: string,
) {
  ctx.font = "800 34px Inter, system-ui, sans-serif";
  const width = ctx.measureText(text).width + 96;
  roundRect(ctx, centerX - width / 2, y, width, 84, 42);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.fillText(text, centerX, y + 55);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(" ");
  let line = "";
  let currentY = y;

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = candidate;
    }
  }
  ctx.fillText(line, x, currentY);
}

/** Supports #rgb / #rrggbb tokens; falls back to the colour itself. */
function hexWithAlpha(color: string, alpha: number): string {
  const hex = color.replace("#", "");
  if (hex.length !== 3 && hex.length !== 6) return color;
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
