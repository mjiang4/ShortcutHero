import type { Page } from "@playwright/test";

const ONBOARDING_STORAGE_KEY = "shortcut-hero:onboarding";

export async function openAsReturningPlayer(page: Page): Promise<void> {
  await page.addInitScript(
    ({ key }) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({ name: "Ada", complete: true }),
      );
    },
    { key: ONBOARDING_STORAGE_KEY },
  );
  await page.goto("/");
}

export const FAST_TEST_RUN =
  "/play?tool=linear&difficulty=easy&guidance=novice&pace=turbo&session=30&sound=off&effects=system";
