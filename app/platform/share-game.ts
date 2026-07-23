"use client";

export type ShareResult = "shared" | "copied" | "unavailable";

export const SHARE_SITE_URL = "https://shortcuthero.app";

export type ScoreCardData = {
  readonly score: number;
  readonly accuracyPct: number;
  readonly longestCombo: number;
  readonly trackName: string;
  readonly accent?: string;
  readonly interludeBonus?: number;
  readonly speedRoundScore?: number;
};

function shareText(options: ScoreCardData): string {
  const bonus =
    options.interludeBonus && options.interludeBonus > 0
      ? ` · +${options.interludeBonus.toLocaleString()} speed-round`
      : "";
  return `I scored ${options.score.toLocaleString()} on Shortcut Hero (${options.trackName}) — ${Math.round(options.accuracyPct)}% accuracy, ×${options.longestCombo} best streak${bonus}. Can you beat it?\n${SHARE_SITE_URL}`;
}

export async function shareScoreCard(
  options: ScoreCardData & { readonly url?: string },
): Promise<ShareResult> {
  const url = options.url ?? SHARE_SITE_URL;
  const text = shareText(options);

  if (typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: "Shortcut Hero",
        text,
        url,
      });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "unavailable";
      }
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "unavailable";
  }
}

/** Draw the branded score card into a canvas (also used for on-screen preview). */
export function paintScoreCard(
  canvas: HTMLCanvasElement,
  options: ScoreCardData,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const accent = options.accent ?? "#7c6cff";

  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#070912");
  bg.addColorStop(0.45, "#12102a");
  bg.addColorStop(1, "#1a1430");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Horizon glow
  const glow = ctx.createRadialGradient(w * 0.72, h * 0.18, 20, w * 0.72, h * 0.18, w * 0.45);
  glow.addColorStop(0, accent);
  glow.addColorStop(1, "transparent");
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;

  // Highway vanishing lines
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(w * 0.18, h);
  ctx.lineTo(w * 0.48, h * 0.42);
  ctx.moveTo(w * 0.82, h);
  ctx.lineTo(w * 0.52, h * 0.42);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Brand
  ctx.fillStyle = "#f4f1ea";
  ctx.font = "600 40px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("Shortcut Hero", 64, 88);
  ctx.fillStyle = accent;
  ctx.font = "600 26px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(options.trackName.toUpperCase(), 64, 130);

  // Score
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 132px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(options.score.toLocaleString(), 64, 310);

  ctx.fillStyle = "#c8c4d8";
  ctx.font = "500 34px ui-sans-serif, system-ui, sans-serif";
  const line = `${Math.round(options.accuracyPct)}% accuracy   ·   ×${options.longestCombo} streak`;
  ctx.fillText(line, 64, 372);

  if (options.interludeBonus && options.interludeBonus > 0) {
    ctx.fillStyle = accent;
    ctx.font = "600 28px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(
      `Speed-round bonus +${options.interludeBonus.toLocaleString()}`,
      64,
      420,
    );
  }

  // Footer URL chip
  const chipY = h - 92;
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  roundRect(ctx, 64, chipY, 360, 52, 26);
  ctx.fill();
  ctx.fillStyle = "#f4f1ea";
  ctx.font = "600 26px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("shortcuthero.app", 88, chipY + 34);

  ctx.fillStyle = "#aaa6b4";
  ctx.font = "500 22px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("Beat this run →", w - 280, chipY + 34);
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
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function downloadScoreCardImage(
  options: ScoreCardData,
): Promise<boolean> {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 630;
    paintScoreCard(canvas, options);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob) return false;
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `shortcut-hero-${options.score}.png`;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
    return true;
  } catch {
    return false;
  }
}
