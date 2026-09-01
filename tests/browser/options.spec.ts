import { expect, test } from "@playwright/test";

import catalogData from "../../app/tools/catalog-data.json" with { type: "json" };
import { openAsReturningPlayer } from "./helpers";

const appNames = Object.values(catalogData.apps)
  .filter(app => app.releasedPlatforms.some(platform => platform === "macos"))
  .map(app => app.name);

test("Home opens compact game setup and keeps changed launch settings", async ({ page }) => {
  await openAsReturningPlayer(page);
  await expect(page.getByText("learn keyboard shortcuts", { exact: true })).toBeVisible();
  await expect(page.locator(".title-brand")).toContainText("learn keyboard shortcuts");
  await expect(page.locator(".title-menu")).not.toContainText("learn keyboard shortcuts");
  const brand = await page.locator(".title-brand__name").boundingBox();
  const description = await page.locator(".title-brand__description").boundingBox();
  expect(description!.x).toBeGreaterThan(brand!.x + brand!.width);
  expect(description!.height).toBeLessThan(brand!.height);
  const supportedApps = page.locator(".title-apps");
  await expect(supportedApps).toHaveRole("heading");
  await expect(supportedApps).toHaveAccessibleName(`Learn keyboard shortcuts for ${appNames.join(", ")}.`);
  await expect(supportedApps).toContainText("shortcuts");
  const [promise, menu] = await Promise.all([
    supportedApps.boundingBox(),
    page.locator(".title-menu").boundingBox(),
  ]);
  expect(promise).not.toBeNull();
  expect(menu).not.toBeNull();
  const promiseToMenuGap = menu!.y - (promise!.y + promise!.height);
  expect(promiseToMenuGap).toBeGreaterThanOrEqual(15);
  expect(promiseToMenuGap).toBeLessThanOrEqual(25);
  await expect(page.getByText("like guitar hero, but for keyboard shortcuts instead of guitars", { exact: true })).toHaveCount(0);
  const currentApp = supportedApps.locator(".title-apps__current");
  const initialApp = await currentApp.textContent();
  await expect(currentApp).not.toHaveText(initialApp!, { timeout: 5_000 });
  // The real CSS animation advances only the app name; the surrounding line stays fixed.
  await supportedApps.hover();
  await expect(supportedApps.locator(".title-apps__motion")).toContainText("Learn");
  await expect(supportedApps.locator(".title-apps__motion")).toContainText("shortcuts");
  let appIndex = appNames.indexOf((await currentApp.textContent())!);
  expect(appIndex).toBeGreaterThanOrEqual(0);
  for (let index = 0; index < appNames.length; index += 1) {
    await currentApp.dispatchEvent("animationiteration");
    appIndex = (appIndex + 1) % appNames.length;
    await expect(currentApp).toHaveText(appNames[appIndex]);
  }
  const play = page.getByRole("button", { name: "play now", exact: true });
  await expect(page.getByRole("region", { name: "Select app" })).toHaveCount(0);
  await expect(page.locator(".app-picker, .app-card")).toHaveCount(0);
  await expect(play).toBeEnabled();
  await expect(page.locator(".title-menu__summary")).toHaveText("30 seconds · medium · Reveal hints");
  const playFontSize = Number.parseFloat(await play.evaluate(button => getComputedStyle(button).fontSize));
  const scoresFontSize = Number.parseFloat(await page.getByRole("button", { name: "high scores", exact: true })
    .evaluate(button => getComputedStyle(button).fontSize));
  expect(playFontSize).toBeGreaterThan(scoresFontSize);
  const menuItems = await page.locator(".title-menu__item").all();
  for (let index = 1; index < menuItems.length; index += 1) {
    const previous = await menuItems[index - 1].boundingBox();
    const current = await menuItems[index].boundingBox();
    expect(previous).not.toBeNull();
    expect(current).not.toBeNull();
    expect(current!.y).toBeGreaterThanOrEqual(previous!.y + previous!.height);
    expect(Math.abs(current!.x - previous!.x)).toBeLessThan(8);
  }
  await play.focus();
  await expect(play).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "game setup" })).toBeVisible();
  await expect(page.getByText("make it yours", { exact: true })).toHaveCount(0);
  await expect(page.locator(".setup-description")).toHaveCount(0);
  const start = page.getByRole("button", { name: "play now", exact: true });
  const back = page.getByRole("button", { name: "back", exact: true });
  expect(await start.evaluate(button => getComputedStyle(button).backgroundColor)).toBe("rgb(255, 214, 163)");
  expect((await start.boundingBox())!.height).toBeGreaterThan((await back.boundingBox())!.height);
  await expect(page.getByRole("combobox")).toHaveCount(0);
  await expect(page.getByText("Linear", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Next app" })).toBeFocused();
  // Clicking non-interactive text must not leave the setup's arrow keys inert.
  await page.getByRole("heading", { name: "game setup" }).click();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("button", { name: "Next speed" })).toBeFocused();
  for (const name of ["Previous speed", "Next speed"]) {
    const style = await page.getByRole("button", { name }).evaluate(button => ({
      outline: getComputedStyle(button).outlineStyle,
      color: getComputedStyle(button).color,
    }));
    expect(style).toEqual({ outline: "none", color: "rgba(244, 241, 234, 0.54)" });
  }
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByText("Slack", { exact: true })).toBeVisible();
  await expect(page.getByText("Coming soon", { exact: true })).toHaveCount(0);
  await expect(start).toBeEnabled();
  await expect(page.locator("main.shortcut-hero")).toHaveCount(0);
  await page.keyboard.press("ArrowRight");
  await expect(page.getByText("Notion", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Previous app" }).click();
  await page.getByRole("button", { name: "Previous app" }).click();
  await expect(page.getByText("Linear", { exact: true })).toBeVisible();
  await page.getByRole("heading", { name: "game setup" }).click();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByText("Notion", { exact: true })).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(start).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("button", { name: "back", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByText("Linear", { exact: true })).toBeVisible();
  await expect(page.getByText("Medium", { exact: true })).toBeVisible();
  await expect(page.getByText("Reveal", { exact: true })).toBeVisible();
  await expect(page.locator("main.shortcut-hero")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Next difficulty" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Next session" })).toHaveCount(0);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowLeft");
  await page.getByRole("heading", { name: "game setup" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("navigation")).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Slow", { exact: true })).toBeVisible();
  await expect(page.getByText("Always", { exact: true })).toBeVisible();
  await page.keyboard.press("ArrowUp");
  await expect(page.getByRole("button", { name: "back", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(start).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(page.getByRole("button", { name: "Next hints" })).toBeFocused();
  // Enter launches from a setting, without cycling that setting first.
  await page.keyboard.press("Enter");
  await expect(page.locator("main.shortcut-hero")).toBeVisible();
  await expect(page).toHaveURL(/tool=linear&difficulty=medium&hints=always&pace=relaxed&session=30.*play=1/);
});

test("switching apps in setup replaces the playable shortcut deck", async ({ page }) => {
  await openAsReturningPlayer(page);
  for (const [app, action, key, direction, steps] of [
    ["Notion", "Insert text block", "Enter", "ArrowRight", 2],
    ["Slack", "Edit your message", "e", "ArrowLeft", 1],
    ["Notion", "Insert text block", "Enter", "ArrowRight", 1],
  ] as const) {
    await page.getByRole("button", { name: "play now", exact: true }).click();
    await expect(page.getByRole("button", { name: "Next app" })).toBeFocused();
    for (let index = 0; index < steps; index += 1) await page.keyboard.press(direction);
    await expect(page.getByText(app, { exact: true })).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`tool=${app.toLowerCase()}&`));
    await expect(page.locator("main.shortcut-hero")).toHaveAttribute("data-view-phase", "game", { timeout: 15_000 });
    const cue = page.locator(".dom-action-ribbon.is-active").first();
    await expect(cue.locator("strong")).toHaveText(action);
    await expect(cue.locator("kbd")).toHaveText(key.length === 1 ? key.toUpperCase() : key);
    await page.keyboard.press(key);
    await expect(page.getByLabel("Streak: 1", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Home", exact: true }).click();
    await expect(page.getByRole("navigation")).toBeVisible();
  }
});

test("Home and Options keep their content between the header and footer in small windows", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const viewport of [{ width: 900, height: 650 }, { width: 540, height: 600 }]) {
    await page.setViewportSize(viewport);
    await openAsReturningPlayer(page);
    await expect(page.getByRole("navigation")).toBeVisible();
    await expect(page.locator(".title-apps__motion")).toBeHidden();
    await expect(page.locator(".title-apps__static")).toHaveText(`Learn shortcuts for ${appNames.join(" · ")}`);
    await expect(page.locator(".title-apps__static")).toBeVisible();
    await expect(page.locator(".title-apps__current")).toHaveCSS("animation-name", "none");
    await expect(page.locator(".title-world__sun")).toBeVisible();
    await expect(page.locator(".title-menu")).toBeInViewport({ ratio: 1 });
    await expectSeparatedLayout(".title-menu");

    await page.getByRole("button", { name: "options", exact: true }).click();
    await expect(page.getByRole("heading", { name: "options", exact: true })).toBeVisible();
    await expect(page.locator(".title-world__sun")).toBeHidden();
    await expect(page.locator(".option-list > .option-row")).toHaveCount(5);
    await expectSeparatedLayout(".title-panel--options");
    await expect(page.getByRole("button", { name: /confirm/ })).toHaveCount(0);
    await page.getByRole("button", { name: "back", exact: true }).click();
    await expect(page.getByRole("navigation")).toBeVisible();
    await page.getByRole("button", { name: "play now", exact: true }).click();
    await expect(page.getByRole("heading", { name: "game setup" })).toBeVisible();
    await expectSeparatedLayout(".title-panel");
    await expect(page.getByRole("button", { name: "play now", exact: true })).toBeInViewport();
  }

  async function expectSeparatedLayout(contentSelector: string) {
    const [header, content, footer] = await Promise.all([
      page.locator(".title-brand").boundingBox(),
      page.locator(contentSelector).boundingBox(),
      page.locator(".title-footer").boundingBox(),
    ]);
    expect(header).not.toBeNull();
    expect(content).not.toBeNull();
    expect(footer).not.toBeNull();
    expect(header!.y + header!.height).toBeLessThanOrEqual(content!.y);
    expect(content!.y + content!.height).toBeLessThanOrEqual(footer!.y);
    expect(content!.x).toBeGreaterThanOrEqual(0);
    expect(content!.x + content!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.locator(".title-footer").scrollIntoViewIfNeeded();
    await expect(page.locator(".title-footer")).toBeInViewport();
  }
});

test("Options restore old timers as 30 seconds and keep other keyboard and pointer changes", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("shortcut-hero:launch-settings")) {
      localStorage.setItem("shortcut-hero:launch-settings", JSON.stringify({ session: 60, sound: "off" }));
    }
  });
  await openAsReturningPlayer(page);
  await expect(page.getByRole("navigation")).toBeVisible();
  await expect(page.locator(".title-menu__summary")).toContainText("30 seconds");

  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "options" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Next session" })).toHaveCount(0);

  await expect(page.getByText("medium", { exact: true })).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByText("easy", { exact: true })).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByText("medium", { exact: true })).toBeVisible();
  await expect(
    page.getByText("single keys + two-key sequences", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Reveal", { exact: true })).toBeVisible();
  await expect(page.getByText("Keys appear near the line.", { exact: true })).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByText("Off", { exact: true })).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByText("Always", { exact: true })).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByText("Reveal", { exact: true })).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByText("Always", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("navigation")).toBeVisible();
  await expect(page.locator(".title-menu__summary")).toContainText("medium");
  await expect(page.locator(".title-menu__summary")).toContainText("Always hints");

  await page.reload();
  await page.getByRole("button", { name: "options", exact: true }).click();
  await expect(page.getByText("Always", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next hints", exact: true }).click();
  await expect(page.getByText("Reveal", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Previous hints", exact: true }).click();
  await expect(page.getByText("Always", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next hints", exact: true }).click();
  await page.getByRole("button", { name: "Next hints", exact: true }).click();
  await expect(page.getByRole("button", { name: /confirm/ })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("shortcut-hero:launch-settings") ?? "null")))
    .toMatchObject({ difficulty: "medium", hints: "off", session: 30, sound: "off" });
  await page.getByRole("button", { name: "back", exact: true }).click();
  await expect(page.getByRole("navigation")).toBeVisible();
  await expect(page.locator(".title-menu__summary")).toContainText("medium");
  await expect(page.locator(".title-menu__summary")).toContainText("Off hints");
  await expect(page.locator(".title-menu__summary")).toContainText("30 seconds");

  await page.reload();
  await expect(page.getByRole("navigation")).toBeVisible();
  await expect(page.locator(".title-menu__summary")).toContainText("medium");
  await expect(page.locator(".title-menu__summary")).toContainText("Off hints");
  await expect(page.locator(".title-menu__summary")).toContainText("30 seconds");
  await page.getByRole("button", { name: "options", exact: true }).click();
  await expect(page.getByRole("button", { name: "Next session" })).toHaveCount(0);
});
