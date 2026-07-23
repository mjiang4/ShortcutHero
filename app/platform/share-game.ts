"use client";

export type ShareResult = "shared" | "copied" | "unavailable";

export async function shareScoreCard(options: {
  readonly score: number;
  readonly accuracyPct: number;
  readonly longestCombo: number;
  readonly trackName: string;
  readonly url?: string;
}): Promise<ShareResult> {
  const url = options.url ?? new URL("/", window.location.origin).toString();
  const text = `I scored ${options.score.toLocaleString()} on Shortcut Hero (${options.trackName}) — ${Math.round(options.accuracyPct)}% accuracy, ×${options.longestCombo} best streak. Can you beat it?`;

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
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return "copied";
  } catch {
    return "unavailable";
  }
}

/** Renders a simple score card PNG onto a canvas for download. */
export async function downloadScoreCardImage(options: {
  readonly score: number;
  readonly accuracyPct: number;
  readonly longestCombo: number;
  readonly trackName: string;
  readonly accent?: string;
}): Promise<boolean> {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;

    const accent = options.accent ?? "#7c6cff";
    const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
    gradient.addColorStop(0, "#080a14");
    gradient.addColorStop(1, "#121528");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1200, 630);

    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(980, 120, 220, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#f4f1ea";
    ctx.font = "600 42px system-ui, sans-serif";
    ctx.fillText("Shortcut Hero", 72, 100);
    ctx.font = "500 28px system-ui, sans-serif";
    ctx.fillStyle = accent;
    ctx.fillText(options.trackName, 72, 150);

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 120px system-ui, sans-serif";
    ctx.fillText(options.score.toLocaleString(), 72, 340);

    ctx.font = "500 36px system-ui, sans-serif";
    ctx.fillStyle = "#c8c4d8";
    ctx.fillText(
      `${Math.round(options.accuracyPct)}% accuracy  ·  ×${options.longestCombo} streak`,
      72,
      420,
    );
    ctx.fillText("Beat my score → shortcut hero", 72, 540);

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
