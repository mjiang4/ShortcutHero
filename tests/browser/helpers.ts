import type { Page } from "@playwright/test";

const ONBOARDING_STORAGE_KEY = "shortcut-hero:onboarding";

export async function openAsReturningPlayer(page: Page, url = "/"): Promise<void> {
  await page.addInitScript(
    ({ key }) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({ name: "Ada", complete: true }),
      );
    },
    { key: ONBOARDING_STORAGE_KEY },
  );
  await page.goto(url);
}

export const FAST_TEST_RUN =
  "/?tool=linear&difficulty=easy&hints=always&pace=turbo&session=30&sound=off&effects=system&play=1";
