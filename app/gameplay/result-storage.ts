"use client";

import {
  getHighScoreKey,
  type GameResults,
  type GameSession,
} from "../game";

export function persistHighScore(
  results: GameResults,
  session: GameSession,
): boolean {
  if (typeof window === "undefined") return false;
  try {
    const key = getHighScoreKey(session.settings);
    const previous = Number(window.localStorage.getItem(key) ?? "0");
    if (results.score > previous) {
      window.localStorage.setItem(key, String(results.score));
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

export function readHighScore(session: GameSession): number {
  if (typeof window === "undefined") return 0;
  try {
    return Number(
      window.localStorage.getItem(getHighScoreKey(session.settings)) ?? "0",
    );
  } catch {
    return 0;
  }
}

export const ONBOARDING_STORAGE_KEY = "shortcut-hero:onboarding";

export type OnboardingState = {
  readonly demoCompleted: boolean;
  readonly demoSkipped: boolean;
};

export function restoreOnboarding(): OnboardingState {
  if (typeof window === "undefined") {
    return { demoCompleted: false, demoSkipped: false };
  }
  try {
    const raw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) return { demoCompleted: false, demoSkipped: false };
    const parsed = JSON.parse(raw) as Partial<OnboardingState>;
    return {
      demoCompleted: Boolean(parsed.demoCompleted),
      demoSkipped: Boolean(parsed.demoSkipped),
    };
  } catch {
    return { demoCompleted: false, demoSkipped: false };
  }
}

export function persistOnboarding(state: OnboardingState): void {
  try {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}
