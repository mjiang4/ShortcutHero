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
}, testInfo) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "your name" })).toBeVisible();
  await page.getByRole("textbox", { name: "name" }).fill("Ada");
  await page.keyboard.press("Enter");

  await expect(page.getByRole("heading", { name: "your system" })).toBeVisible();
  await expect(page.getByText("macOS", { exact: true })).toBeVisible();
  const expectedBrowser =
    testInfo.project.name === "webkit" ? "Safari" : "Google Chrome";
  await expect(page.getByText(expectedBrowser, { exact: true })).toBeVisible();
  await page.keyboard.press("Enter");

  await expect(page.getByRole("heading", { name: "try the keys" })).toBeVisible();
  await expect(
    page.getByText("Press C when the card reaches the line."),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.locator(".onboarding-demo__card").getAttribute("data-hittable"),
    )
    .toBe("true");
  await page.keyboard.press("c");
  await expect(page.getByText("Nice hit!", { exact: true })).toBeVisible();
  await expect(page.getByText("Press G first. Press I at the line.")).toBeVisible();
  await expect.poll(() => page.locator(".onboarding-demo__card").getAttribute("data-hittable")).toBe("true");
  await page.keyboard.press("g");
  await expect(page.getByText("G pressed. Now press I at the line.")).toBeVisible();
  await page.keyboard.press("i");
  await expect(page.getByText("Hold Shift. Press E at the line.")).toBeVisible();
  await expect.poll(() => page.locator(".onboarding-demo__card").getAttribute("data-hittable")).toBe("true");
  await page.keyboard.press("Shift+E");
  await expect(page.getByRole("heading", { name: "choose your hints" })).toBeVisible();
  await expect(page.getByRole("radio", { name: /^Always/ })).toBeChecked();
  await expect(page.getByRole("radio", { name: /^Always/ })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: /^Near the line/ })).toBeChecked();
  await page.keyboard.press("Enter");
  await expect(page.locator("main.shortcut-hero")).toBeVisible();
  await expect(page).toHaveURL(/hints=near-line/);

  await page.goto("/");
  await expect(page.getByRole("navigation")).toBeVisible();
  await expect(page.getByText("learn Linear through play")).toBeVisible();
  await expect(page.locator("footer")).toContainText("hints Near the line");
  await page.reload();
  await expect(page.getByRole("navigation")).toBeVisible();
  await expect(page.getByRole("heading", { name: "your name" })).toHaveCount(0);
  await page.getByRole("button", { name: "how to play", exact: true }).click();
  await page.getByRole("button", { name: "try the demo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "try the keys" })).toBeVisible();
  await page.getByRole("button", { name: "skip demo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "how to play" })).toBeVisible();
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
