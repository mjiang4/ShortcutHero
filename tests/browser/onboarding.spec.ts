import { expect, test } from "@playwright/test";

test("a referral link keeps first-touch attribution and cleans the URL", async ({
  page,
}) => {
  await page.goto("/?ref=abcd2345");

  await expect(page).toHaveURL(/\/$/);
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.localStorage.getItem(
          "shortcut-hero:referral-attribution:v1",
        ),
      ),
    )
    .toBe("ABCD2345");

  await page.goto("/?ref=WXYZ6789");
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.localStorage.getItem(
          "shortcut-hero:referral-attribution:v1",
        ),
      ),
    )
    .toBe("ABCD2345");
});

test("onboarding teaches all input types and returns Home before the player starts a game", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("region", { name: "Main menu" })).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Preview first visit" })).toHaveCount(0);
  await page.getByRole("button", { name: "play now", exact: true }).click();
  await expect(page.getByRole("heading", { name: "game setup" })).toBeVisible();
  await expect(page.getByText("Medium", { exact: true })).toBeVisible();
  await expect(page.getByText("Reveal", { exact: true })).toBeVisible();
  await expect(page.locator(".tutorial-screen")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Next app" })).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(page.getByRole("button", { name: "back", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(page.getByRole("button", { name: "play tutorial", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(page.getByRole("button", { name: "play now", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "play tutorial", exact: true })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "tutorial", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "next", exact: true })).toHaveCount(0);
  await expect(
    page.getByText("Press C when the card reaches the line."),
  ).toBeVisible();
  const waitingCard = await page.locator(".dom-action-ribbon").getAttribute("style");
  await page.waitForTimeout(600);
  await expect(page.locator(".dom-action-ribbon")).toHaveAttribute("style", waitingCard!);
  await expect(page.locator(".tutorial-arena")).toHaveAttribute("data-hittable", "false");
  await expect(page.getByRole("region", { name: "Shortcut keyboard" })).toBeVisible();
  await page.keyboard.press("c");
  await expect(page.getByText("Nice hit!", { exact: true })).toHaveCount(0);
  await page.keyboard.press("Space");
  await expect
    .poll(
      () => page.locator(".tutorial-arena").getAttribute("data-hittable"),
      { intervals: [16, 32, 50] },
    )
    .toBe("true");
  await page.keyboard.down("c");
  await expect(page.getByText("Nice hit!", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Press any key to continue" })).toBeVisible();
  // Holding the successful key or pressing another before release cannot skip a step.
  await page.keyboard.down("c");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(900);
  await expect(page.getByText("Press C when the card reaches the line.")).toBeVisible();
  await page.keyboard.up("c");
  await page.keyboard.press("Control+a");
  await expect(page.getByText("Press C when the card reaches the line.")).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Press G first. Press I at the line.")).toBeVisible();
  await expect(page.getByText("Up to 1.2s between keys. Finish at the line.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Press Space to start" })).toBeVisible();
  await page.keyboard.press("Space");
  await expect.poll(() => page.locator(".tutorial-arena").getAttribute("data-hittable"), { intervals: [16, 32, 50] }).toBe("true");
  await page.keyboard.press("g");
  await expect(page.getByText("G pressed. Now press I at the line.")).toBeVisible();
  await page.keyboard.press("i");
  await expect(page.getByText("Nice hit!", { exact: true })).toBeVisible();
  await page.keyboard.press("Space");
  await expect(page.getByText("Hold Shift. Press E at the line.")).toBeVisible();
  await page.keyboard.press("Space");
  await expect.poll(() => page.locator(".tutorial-arena").getAttribute("data-hittable"), { intervals: [16, 32, 50] }).toBe("true");
  await page.keyboard.press("Shift+E");
  await expect(page.getByRole("button", { name: "Press any key to continue" })).toBeVisible();
  await page.keyboard.press("Shift");
  await page.waitForTimeout(900);
  await expect(page.getByText("Hold Shift. Press E at the line.")).toBeVisible();
  await expect(page.locator("main.shortcut-hero")).toHaveCount(0);
  await page.keyboard.down("Enter");
  await page.keyboard.down("Enter");
  await expect(page.getByRole("heading", { name: "tutorial", exact: true })).toBeVisible();
  await page.keyboard.up("Enter");
  await expect(page.getByRole("region", { name: "Main menu" })).toBeVisible();
  await expect(page.locator("main.shortcut-hero")).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(window.localStorage.getItem("shortcut-hero:onboarding") ?? "null")))
    .toEqual({ name: "", complete: true });
  expect(await page.evaluate(() => Object.keys(localStorage).filter(key =>
    key.startsWith("shortcut-hero:high-score:") || key.startsWith("shortcut-hero:curriculum:")))).toEqual([]);

  await page.goto("/");
  await expect(page.getByRole("navigation")).toBeVisible();
  await expect(page.getByText("learn keyboard shortcuts", { exact: true })).toBeVisible();
  await expect(page.locator(".title-menu__summary")).toContainText("Reveal hints");
  await page.getByRole("button", { name: "options", exact: true }).click();
  await expect(page.getByText("Reveal", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "back", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("navigation")).toBeVisible();
  await page.getByRole("button", { name: "play now", exact: true }).click();
  await page.getByRole("button", { name: "play now", exact: true }).click();
  await expect(page.locator("main.shortcut-hero")).toBeVisible();
  await expect(page.getByRole("heading", { name: "tutorial", exact: true })).toHaveCount(0);
  await expect(page).toHaveURL(/difficulty=medium&hints=near-line.*session=30/);

  await page.goto("/");
  await page.getByRole("button", { name: "how to play", exact: true }).click();
  await page.getByRole("button", { name: "play tutorial", exact: true }).click();
  await expect(page.getByRole("heading", { name: "tutorial", exact: true })).toBeVisible();
  await expect(page.getByText("1 / 3 · Single key", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "skip tutorial", exact: true }).click();
  await expect(page.getByRole("heading", { name: "how to play" })).toBeVisible();
});

test("first-time players can press Enter to play a 30-second round without the tutorial", async ({ page }) => {
  await page.goto("/?play=1&hints=off&session=60");
  await page.getByRole("button", { name: "play now", exact: true }).click();
  await expect(page.getByRole("button", { name: "Next app" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("button", { name: "Next speed" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main.shortcut-hero")).toBeVisible();
  await expect(page).toHaveURL(/hints=off&pace=standard&session=30.*play=1/);
  await expect(page.locator(".hud-stat").filter({ hasText: "Time remaining" }).locator(".hud-stat-value"))
    .toHaveText("30s");
  await expect(page.getByRole("heading", { name: "tutorial", exact: true })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("shortcut-hero:onboarding") ?? "null")))
    .toMatchObject({ complete: true });
  await page.goto("/");
  await page.reload();
  await expect(page.getByRole("region", { name: "Main menu" })).toBeVisible();
  await expect(page.locator(".title-menu__summary")).toContainText("Off hints");
  await page.getByRole("button", { name: "play now", exact: true }).click();
  await page.getByRole("heading", { name: "game setup" }).click();
  await page.keyboard.press("Enter");
  await expect(page.locator("main.shortcut-hero")).toBeVisible();
  await expect(page.getByRole("heading", { name: "tutorial", exact: true })).toHaveCount(0);
});

test("the tutorial fills the window without overlapping its instructions or controls", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "play now", exact: true }).click();
  await page.getByRole("button", { name: "play tutorial", exact: true }).click();
  for (const viewport of [{ width: 1280, height: 720 }, { width: 900, height: 420 }, { width: 540, height: 600 }]) {
    await page.setViewportSize(viewport);
    await expect(page.locator(".tutorial-screen")).toBeInViewport({ ratio: 1 });
    const screen = await page.locator(".tutorial-screen").boundingBox();
    expect(screen!.x).toBe(0);
    expect(screen!.y).toBe(0);
    expect(Math.abs(screen!.width - viewport.width)).toBeLessThan(1);
    expect(Math.abs(screen!.height - viewport.height)).toBeLessThan(1);
    const sections = await Promise.all([
      ".tutorial-header", ".tutorial-instruction", ".tutorial-arena", ".keyboard-instrument", ".tutorial-feedback",
    ].map(selector => page.locator(selector).boundingBox()));
    for (let index = 1; index < sections.length; index += 1) {
      expect(sections[index]!.y).toBeGreaterThanOrEqual(sections[index - 1]!.y + sections[index - 1]!.height - 1);
    }
    await expect(page.getByRole("button", { name: "skip tutorial" })).toBeInViewport({ ratio: 1 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test("the sandbox keeps cards moving after misses and preserves their position when paused", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("button", { name: "play now", exact: true }).click();
  await page.getByRole("button", { name: "play tutorial", exact: true }).click();
  await page.keyboard.press("Space");
  await expect(page.locator(".tutorial-screen")).toHaveAttribute("data-phase", "playing");
  await page.keyboard.press("Escape");
  await expect(page.locator(".tutorial-screen")).toHaveAttribute("data-phase", "paused");
  const card = page.locator(".dom-action-ribbon").first();
  const originalCard = await card.elementHandle();
  const pausedStyle = await card.getAttribute("style");
  await page.waitForTimeout(1_400);
  await expect(card).toHaveAttribute("style", pausedStyle!);
  await page.keyboard.press("Space");
  await expect(page.locator(".tutorial-screen")).toHaveAttribute("data-phase", "playing");
  await expect(page.getByText("Missed. Try the next card.", { exact: true })).toBeVisible();
  // Every card has a fresh identity; a miss never wraps the old card to the top.
  await expect.poll(() => originalCard!.evaluate(element => element.isConnected)).toBe(false);
  // Unlike scored rounds, practice carries on past the 30-second boundary.
  await page.clock.fastForward(30_050);
  await expect(page.locator(".tutorial-screen")).toHaveAttribute("data-phase", "playing");
  // Wait for a fresh hit window, rather than catching the last frame of one.
  await expect.poll(() => page.locator(".tutorial-arena").getAttribute("data-hittable"),
    { intervals: [16, 32, 50] }).toBe("false");
  await expect.poll(() => page.locator(".tutorial-arena").getAttribute("data-hittable"),
    { intervals: [16, 32, 50] }).toBe("true");
  await page.keyboard.press("c");
  await expect(page.getByText("Nice hit!", { exact: true })).toBeVisible();
  await expect(page.locator(".dom-action-ribbon.is-cleared")).toHaveCount(0, { timeout: 2_000 });
  await expect(page.getByRole("button", { name: "Press any key to continue" })).toBeVisible();
});

test("legal pages expose direct policies and launch security headers", async ({
  page,
}) => {
  const response = await page.goto("/privacy");
  expect(response).not.toBeNull();
  expect(response?.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
  await expect(page.getByRole("heading", { name: "privacy" })).toBeVisible();
  await page.getByRole("button", { name: "delete my saved progress" }).click();
  await expect(
    page.getByRole("button", { name: "confirm: delete my progress" }),
  ).toBeVisible();

  await page.goto("/terms");
  await expect(page.getByRole("heading", { name: "terms" })).toBeVisible();
  await expect(page.getByText("No account or purchase")).toBeVisible();
});

test.describe("unsupported operating systems", () => {
  test.use({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
  });

  test("desktop players can preview without setup and see the Mac-layout notice", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "play now", exact: true }).click();
    await page.getByRole("button", { name: "play now", exact: true }).click();
    await expect(
      page.getByText(
        "Preview mode: shortcuts use the Mac keyboard layout.",
      ),
    ).toBeVisible();
  });
});
