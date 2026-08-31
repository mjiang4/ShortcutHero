import { expect, test } from "@playwright/test";

import { openAsReturningPlayer } from "./helpers";

test("settings changes require confirmation and Escape cancels the draft", async ({
  page,
}) => {
  await openAsReturningPlayer(page);
  await expect(page.getByRole("navigation")).toBeVisible();
  await expect(page.locator("footer")).toContainText("30s");

  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "options" })).toBeVisible();

  await page.keyboard.press("ArrowRight");
  await expect(page.getByText("medium", { exact: true })).toBeVisible();
  await expect(
    page.getByText("single keys + two-key sequences", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("radio", { name: /^Always/ })).toBeChecked();
  await page.getByRole("radio", { name: /^Off/ }).check();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("navigation")).toBeVisible();
  await expect(page.locator("footer")).toContainText("easy");
  await expect(page.locator("footer")).toContainText("hints Always");

  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowRight");
  await page.getByRole("radio", { name: /^Near the line/ }).check();
  await page.getByRole("button", { name: "confirm changes" }).click();
  await expect(page.getByRole("navigation")).toBeVisible();
  await expect(page.locator("footer")).toContainText("medium");
  await expect(page.locator("footer")).toContainText("hints Near the line");

  await page.reload();
  await expect(page.getByRole("navigation")).toBeVisible();
  await expect(page.locator("footer")).toContainText("medium");
  await expect(page.locator("footer")).toContainText("hints Near the line");
});
