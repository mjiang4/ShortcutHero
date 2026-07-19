import { expect, test } from "@playwright/test";

import { openAsReturningPlayer } from "./helpers";

test("settings changes require confirmation and Escape cancels the draft", async ({
  page,
}) => {
  await openAsReturningPlayer(page);
  await expect(page.getByRole("navigation")).toBeVisible();

  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "options" })).toBeVisible();

  await page.keyboard.press("ArrowRight");
  await expect(page.getByText("key sequences", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("navigation")).toBeVisible();
  await expect(page.locator("footer")).toContainText("single keys");

  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("navigation")).toBeVisible();
  await expect(page.locator("footer")).toContainText("key sequences");

  await page.reload();
  await expect(page.getByRole("navigation")).toBeVisible();
  await expect(page.locator("footer")).toContainText("key sequences");
});
