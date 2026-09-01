import { expect, test } from "@playwright/test";

import { FAST_TEST_RUN, openAsReturningPlayer } from "./helpers";

for (const [tool, action, key] of [
  ["slack", "Edit your message", "e"],
  ["notion", "Insert text block", "Enter"],
  ["jira", "New issue", "c"],
  ["superhuman", "New issue", "c"],
  ["excel", "New issue", "c"],
]) {
  const supported = tool === "slack" || tool === "notion";
  test(`${tool} ${supported ? "launches its own shortcuts" : "legacy link falls back to Linear"} and accepts the displayed key`, async ({ page }) => {
    await openAsReturningPlayer(page, FAST_TEST_RUN.replace("tool=linear", `tool=${tool}`));
    const game = page.locator("main.shortcut-hero");
    await expect(game).toHaveAttribute("data-view-phase", "game", { timeout: 15_000 });
    const cue = page.locator(".dom-action-ribbon.is-active").first();
    await expect(cue).toBeVisible();
    await expect(cue.locator("strong")).toHaveText(action);
    await expect(cue.locator("kbd")).toHaveText(key.length === 1 ? key.toUpperCase() : key);
    if (key === "Enter") {
      await expect(page.locator(".keyboard-instrument")).toHaveClass(/is-extended/);
    }
    await page.keyboard.press(key);
    await expect(page.getByLabel("Streak: 1", { exact: true })).toBeVisible();
    let streak = 1;
    if (tool === "notion") {
      // Tab must hit the next card, not move focus to a page control.
      await expect(cue.locator("kbd")).toHaveText("Tab");
      await page.keyboard.press("Tab");
      streak = 2;
      await expect(page.getByLabel(`Streak: ${streak}`, { exact: true })).toBeVisible();
    }
    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
    // Navigation keys stop being game input while the pause menu is open.
    await page.keyboard.press("Tab");
    await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
    await expect(page.getByLabel(`Streak: ${streak}`, { exact: true })).toBeVisible();
  });
}

test("a browser without WebGL still gets the action highway", async ({
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

  await openAsReturningPlayer(page, FAST_TEST_RUN.replace("sound=off", "sound=on"));

  await expect(page.locator(".dom-game-stage")).toBeVisible();
  await expect(page.locator(".countdown-number")).toHaveText(/^[123]$/, {
    timeout: 15_000,
  });
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

  await openAsReturningPlayer(page, FAST_TEST_RUN.replace("sound=off", "sound=on"));

  const game = page.locator("main.shortcut-hero");
  await expect(game).toHaveAttribute("data-render-quality", "reduced");
  await expect(page.getByText("Sound is unavailable.")).toBeVisible();
  await expect(page.locator(".countdown-number")).toHaveText(/^[123]$/, {
    timeout: 15_000,
  });

  await expect(page.locator(".dom-game-stage")).toBeVisible();
});

test("the full-effects stage initializes", async ({ page }) => {
  await openAsReturningPlayer(page, FAST_TEST_RUN.replace("effects=system", "effects=full"));

  const game = page.locator("main.shortcut-hero");
  await expect(game).toHaveAttribute("data-reduced-motion", "false");
  await expect(page.locator(".dom-game-stage")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".countdown-number")).toHaveText(/^[123]$/, {
    timeout: 15_000,
  });
  await expect(game).toHaveAttribute("data-view-phase", "game");
  await expect(page.locator(".combo-pop")).toHaveCount(0);

  for (let combo = 1; combo <= 3; combo += 1) {
    const cue = page.locator(".dom-action-ribbon.is-active").first();
    await expect(cue).toBeVisible();
    const shortcut = await cue.locator("kbd").innerText();
    await page.keyboard.press(shortcut.toLowerCase());
    await expect(page.getByLabel(`Streak: ${combo}`, { exact: true })).toBeVisible();
    await expect(page.locator(".streak-count")).toHaveClass(/is-hit/);
    if (combo === 3) await expect(page.locator(".streak-count")).toHaveClass(/is-milestone/);
    await expect(page.locator(".combo-pop")).toHaveCount(0);
  }

  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
  await expect(page.locator(".streak-count")).toHaveText("3");
  await page.keyboard.press("Escape");
  await expect(page.locator(".combo-pop")).toHaveCount(0, { timeout: 5_000 });
});

test("a reduced-motion round supports pause, results, and retry", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "shortcut-hero:referral-prompts:v1",
      JSON.stringify({ completedRounds: 2, lastPromptedRound: 0 }),
    );
  });
  await openAsReturningPlayer(page, FAST_TEST_RUN);

  const game = page.locator("main.shortcut-hero");
  await expect(game).toHaveAttribute("data-reduced-motion", "true");
  await expect(page.locator(".countdown-number")).toHaveText(/^[123]$/, {
    timeout: 15_000,
  });
  await expect(page.getByRole("region", { name: "Current game status" })).toBeVisible();
  await page.setViewportSize({ width: 720, height: 900 });
  await expect(page.getByLabel("Streak: 0", { exact: true })).toBeVisible();
  await expect(page.getByText("Accuracy", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Time remaining", { exact: true })).toBeVisible();
  await expect(game).toHaveAttribute("data-view-phase", "game", {
    timeout: 15_000,
  });

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

  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Home" })).toBeVisible();
  await expect(page.getByRole("radio")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Paused" })).toBeHidden();

  // Keep one command clean throughout the round so both result groups exist.
  await page.evaluate(() => {
    let lastCue: Element | null = null;
    const timer = window.setInterval(() => {
      if (document.querySelector("main.shortcut-hero")?.getAttribute("data-view-phase") === "results") {
        window.clearInterval(timer);
        return;
      }
      const cue = document.querySelector(".dom-action-ribbon.is-active");
      if (!cue || cue === lastCue || cue.querySelector("strong")?.textContent !== "New issue") return;
      lastCue = cue;
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyC", key: "c", bubbles: true, cancelable: true }));
      window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyC", key: "c", bubbles: true }));
    }, 16);
  });

  await expect(page.getByRole("heading", { name: "Run complete" })).toBeVisible({
    timeout: 40_000,
  });
  await expect(page.getByText(/\d+ correct · \d+ missed/)).toBeVisible();
  await expect(page.getByText("Final score", { exact: true })).toBeVisible();
  await expect(page.getByText("Needs review", { exact: true })).toBeVisible();
  const review = page.locator("details.results-breakdown").filter({ hasText: "Needs review" });
  const mastered = page.locator("details.results-breakdown").filter({ hasText: "Mastered" });
  await expect(review).toHaveAttribute("open", "");
  await expect(mastered).toHaveAttribute("open", "");
  await expect(page.locator(".results-breakdown").first()).toContainText("Needs review");
  await expect(mastered).toContainText("New issue");
  await review.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(review).not.toHaveAttribute("open", "");
  await expect(page.getByRole("heading", { name: "Run complete" })).toBeVisible();
  await page.keyboard.press("Space");
  await expect(review).toHaveAttribute("open", "");
  await mastered.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(mastered).not.toHaveAttribute("open", "");
  await expect(review).toHaveAttribute("open", "");
  await expect(review).not.toContainText("perfect");
  await expect(mastered).not.toContainText("perfect");
  await expect(
    page.getByText("Know someone who should learn keyboard shortcuts?"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "challenge a friend" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Home" })).toBeVisible();

  const progress = await page.evaluate(() => JSON.parse(window.localStorage.getItem("shortcut-hero:curriculum:v1:linear:macOS") ?? "null"));
  expect(progress.completedLessons).toBe(1);
  expect(progress.shortcuts["new-issue"].needsReview).toBe(false);
  expect(progress.shortcuts["assign-user"].needsReview).toBe(true);

  await expect(page.locator(".results-player")).toContainText("Playing as Guest");
  await page.getByRole("button", { name: "Add your name", exact: true }).click();
  const nameInput = page.getByRole("textbox", { name: "Your name", exact: true });
  await expect(nameInput).toBeFocused();
  // Typing menu-navigation keys and spaces must edit the name, not restart a run.
  await nameInput.pressSequentially("Ada Swift");
  await expect(nameInput).toHaveValue("Ada Swift");
  await nameInput.press("Enter");
  await expect(page.getByRole("heading", { name: "Run complete" })).toBeVisible();
  await expect(page.locator(".results-player")).toContainText("Playing as Ada Swift");
  const savedScores = await page.evaluate(() => Object.keys(window.localStorage)
    .filter((key) => key.startsWith("shortcut-hero:high-score:"))
    .map((key) => JSON.parse(window.localStorage.getItem(key)!)));
  expect(savedScores).toHaveLength(1);
  expect(savedScores[0].name).toBe("Ada Swift");
  expect(savedScores[0].score).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Play again" }).click();
  await expect(page.locator(".countdown-number")).toHaveText(/^[123]$/);
  await expect(game).toHaveAttribute("data-view-phase", "game");
  await expect(page.locator(".dom-action-ribbon").first()).toContainText("Assign user");
  await page.reload();
  await expect(page.locator(".countdown-number")).toHaveText(/^[123]$/);
  await expect(game).toHaveAttribute("data-view-phase", "game");
  await expect(page.locator(".dom-action-ribbon").first()).toContainText("Assign user");

  await page.goto("/");
  await page.getByRole("button", { name: "high scores", exact: true }).click();
  await expect(page.locator(".score-list__name")).toHaveText("Ada Swift");
  expect(await page.evaluate(() => JSON.parse(window.localStorage.getItem("shortcut-hero:onboarding") ?? "null")))
    .toEqual({ name: "Ada Swift", complete: true });
});
