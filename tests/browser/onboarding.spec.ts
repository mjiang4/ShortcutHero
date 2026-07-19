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

test("a first-time player can complete onboarding with the keyboard", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "your name" })).toBeVisible();
  await page.getByRole("textbox", { name: "name" }).fill("Ada");
  await page.keyboard.press("Enter");

  await expect(page.getByRole("heading", { name: "your system" })).toBeVisible();
  await expect(page.getByText("macOS", { exact: true })).toBeVisible();
  await expect(page.getByText("Google Chrome", { exact: true })).toBeVisible();
  await page.keyboard.press("Enter");

  await expect(page.getByRole("heading", { name: "how it works" })).toBeVisible();
  await expect(page.getByText("Read the action on the highway.")).toBeVisible();
  await page.keyboard.press("Enter");

  await expect(page.getByRole("navigation")).toBeVisible();
  await expect(page.getByText("learn Linear through play")).toBeVisible();
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

  test("the detected system is shown before the menu", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("textbox", { name: "name" }).fill("Grace");
    await page.keyboard.press("Enter");

    await expect(page.getByText("Windows", { exact: true })).toBeVisible();
    await expect(
      page.getByText(
        "This version shows Mac shortcuts. You can still preview the game.",
      ),
    ).toBeVisible();
  });
});
