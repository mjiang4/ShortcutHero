import { expect, test } from "@playwright/test";

import { FAST_TEST_RUN } from "./helpers";

test("a browser without WebGL gets a recoverable graphics fallback", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function getContextWithoutWebGL(
      this: HTMLCanvasElement,
      contextId: string,
      ...options: unknown[]
    ) {
      if (contextId.startsWith("webgl") || contextId === "experimental-webgl") {
        return null;
      }
      return getContext.call(this, contextId, ...options);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });

  await page.goto(FAST_TEST_RUN.replace("sound=off", "sound=on"));

  await expect(page.getByRole("heading", { name: "WebGL is off" })).toBeVisible();
  await expect(page.getByRole("link", { name: "return to title" })).toHaveAttribute(
    "href",
    "/",
  );
});

test("constrained devices lower visual cost and continue without audio", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "hardwareConcurrency", {
      configurable: true,
      value: 2,
    });
    Object.defineProperty(window, "AudioContext", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(window, "webkitAudioContext", {
      configurable: true,
      value: undefined,
    });
  });

  await page.goto(FAST_TEST_RUN.replace("sound=off", "sound=on"));

  const game = page.locator("main.shortcut-hero");
  await expect(game).toHaveAttribute("data-render-quality", "reduced");
  await expect(page.getByText("Sound is unavailable.")).toBeVisible();
  await expect(page.locator(".countdown-number")).toHaveText("3", {
    timeout: 15_000,
  });

  await page.locator("canvas").evaluate((canvas) => {
    canvas.dispatchEvent(
      new Event("webglcontextlost", { bubbles: false, cancelable: true }),
    );
  });
  await expect(
    page.getByRole("heading", { name: "the stage went dark" }),
  ).toBeVisible();
});

test("the full-effects WebGL scene initializes", async ({ page }) => {
  await page.goto(FAST_TEST_RUN.replace("effects=system", "effects=full"));

  const game = page.locator("main.shortcut-hero");
  await expect(game).toHaveAttribute("data-reduced-motion", "false");
  await expect(page.locator("canvas")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".countdown-number")).toHaveText("3", {
    timeout: 15_000,
  });
});

test("a reduced-motion round supports pause, results, and retry", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(FAST_TEST_RUN);

  const game = page.locator("main.shortcut-hero");
  await expect(game).toHaveAttribute("data-reduced-motion", "true");
  await expect(page.locator(".countdown-number")).toHaveText("3", {
    timeout: 15_000,
  });
  await expect(page.locator(".countdown-number")).toHaveText("2");
  await expect(page.locator(".countdown-number")).toHaveText("1");
  await expect(page.getByRole("region", { name: "Current game status" })).toBeVisible();

  const reservedKeyResults = await page.evaluate(() =>
    (["metaKey", "ctrlKey", "altKey"] as const).map((modifier) => {
      const event = new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        code: "KeyC",
        key: "c",
        [modifier]: true,
      });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    }),
  );
  expect(reservedKeyResults).toEqual([false, false, false]);

  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Paused" })).toBeHidden();

  await expect(page.getByRole("heading", { name: "Run complete" })).toBeVisible({
    timeout: 40_000,
  });
  await expect(page.getByText(/\d+ correct · \d+ missed/)).toBeVisible();
  await expect(page.getByText("Final score", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Play again" }).click();
  await expect(page.locator(".countdown-number")).toHaveText("3");
});
