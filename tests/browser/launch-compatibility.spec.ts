import { expect, test } from "@playwright/test";

import { FAST_TEST_RUN } from "./helpers";

test.use({
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) " +
    "AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
  viewport: { width: 390, height: 844 },
  hasTouch: true,
});

test("a mobile visitor lands directly on the Mac handoff", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "play on a Mac" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "send link to a Mac" }),
  ).toBeVisible();
  await expect(
    page.getByText("Learn Linear shortcuts in a fast 3D game."),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "name" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "privacy" })).toBeVisible();
});

test("a direct mobile game link never initializes the 3D stage", async ({
  page,
}) => {
  await page.goto(FAST_TEST_RUN);

  await expect(
    page.getByRole("heading", { name: "continue on desktop" }),
  ).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
});
