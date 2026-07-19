import { resolve } from "node:path";

import { chromium } from "@playwright/test";

const baseUrl = process.env.SOCIAL_CARD_BASE_URL ?? "http://localhost:3108";
const outputPath = resolve("public/og.png");
const macChromeUserAgent =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";
const playUrl = new URL("/play", baseUrl);

playUrl.search = new URLSearchParams({
  tool: "linear",
  difficulty: "easy",
  guidance: "novice",
  pace: "relaxed",
  session: "60",
  sound: "off",
  effects: "full",
}).toString();

const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({
    colorScheme: "dark",
    deviceScaleFactor: 1,
    userAgent: macChromeUserAgent,
    viewport: { width: 1200, height: 630 },
  });

  await page.goto(playUrl.href, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await page.locator('[data-view-phase="game"]').waitFor({ timeout: 30_000 });
  await page.waitForTimeout(1_400);
  await page.addStyleTag({
    content: `
      .ui-layer { display: none !important; }
      .social-card-overlay {
        position: fixed;
        z-index: 1000;
        inset: 0;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        box-sizing: border-box;
        padding: 54px 60px 48px;
        color: #f4f1ea;
        background:
          linear-gradient(90deg, rgba(5, 5, 13, 0.96) 0%, rgba(5, 5, 13, 0.78) 31%, rgba(5, 5, 13, 0.08) 62%, transparent 76%),
          linear-gradient(0deg, rgba(5, 5, 13, 0.68), transparent 38%);
        font-family: var(--font-geist-sans), Inter, sans-serif;
        pointer-events: none;
      }
      .social-card-copy { width: 490px; }
      .social-card-kicker {
        margin: 0 0 25px;
        color: #ffd6a3;
        font-size: 14px;
        font-weight: 620;
        letter-spacing: 0.19em;
        text-transform: uppercase;
      }
      .social-card-title {
        margin: 0;
        font-size: 106px;
        font-weight: 430;
        letter-spacing: -0.085em;
        line-height: 0.78;
        text-transform: lowercase;
      }
      .social-card-tagline {
        width: 390px;
        margin: 36px 0 0;
        color: rgba(244, 241, 234, 0.82);
        font-size: 24px;
        line-height: 1.25;
      }
      .social-card-mode {
        align-self: flex-end;
        margin: 0;
        color: rgba(244, 241, 234, 0.67);
        font-size: 12px;
        font-weight: 580;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }
    `,
  });
  await page.evaluate(() => {
    const overlay = document.createElement("section");
    overlay.className = "social-card-overlay";

    const copy = document.createElement("div");
    copy.className = "social-card-copy";

    const kicker = document.createElement("p");
    kicker.className = "social-card-kicker";
    kicker.textContent = "Shortcut training, reimagined";

    const title = document.createElement("h1");
    title.className = "social-card-title";
    title.append("shortcut", document.createElement("br"), "hero");

    const tagline = document.createElement("p");
    tagline.className = "social-card-tagline";
    tagline.textContent = "Learn Linear shortcuts through play.";

    const mode = document.createElement("p");
    mode.className = "social-card-mode";
    mode.textContent = "3D · browser · Mac";

    copy.append(kicker, title, tagline);
    overlay.append(copy, mode);
    document.body.append(overlay);
  });

  await page.screenshot({ path: outputPath, type: "png" });
  console.log(`Wrote ${outputPath}`);
} finally {
  await browser.close();
}
