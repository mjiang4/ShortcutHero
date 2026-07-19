import { expect, test } from "@playwright/test";

import { FAST_TEST_RUN, openAsReturningPlayer } from "./helpers";

test.use({
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) " +
    "AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
  viewport: { width: 390, height: 844 },
  hasTouch: true,
});

test("a mobile visitor gets a send-to-desktop flow from the title", async ({
  page,
}) => {
  await openAsReturningPlayer(page);
  await page.getByRole("button", { name: "start", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "desktop required" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "send to desktop" }),
  ).toBeVisible();
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
