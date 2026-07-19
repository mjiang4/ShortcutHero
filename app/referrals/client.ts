"use client";

import { analytics } from "../analytics";
import { getOrCreateAnonymousIdentity } from "../identity/anonymous-identity";
import { shareGameLink, type ShareResult } from "../platform/share-game";
import {
  normalizeReferralCode,
  type SharePromptTrigger,
} from "./contract";

const ATTRIBUTION_STORAGE_KEY = "shortcut-hero:referral-attribution:v1";
const PROMPT_PROGRESS_STORAGE_KEY = "shortcut-hero:referral-prompts:v1";
const MIN_ROUNDS_BETWEEN_PROMPTS = 3;
const HIGH_ACCURACY_THRESHOLD = 85;
const HIGH_ACCURACY_MIN_ATTEMPTS = 5;

type PromptProgress = {
  readonly completedRounds: number;
  readonly lastPromptedRound: number;
};

type PromptInput = {
  readonly personalBest: boolean;
  readonly accuracyPct: number;
  readonly attempts: number;
};

type PromptDecision = {
  readonly progress: PromptProgress;
  readonly trigger: SharePromptTrigger | null;
};

let memoryAttribution: string | null = null;
let memoryProgress: PromptProgress = {
  completedRounds: 0,
  lastPromptedRound: 0,
};

export function captureReferralLanding(): boolean {
  const url = new URL(window.location.href);
  const code = normalizeReferralCode(url.searchParams.get("ref"));
  if (!code) return false;

  const existing = readStoredReferralCode();
  if (!existing) writeStoredReferralCode(code);
  url.searchParams.delete("ref");
  window.history.replaceState(
    window.history.state,
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
  return existing === null;
}

export function readStoredReferralCode(): string | null {
  try {
    return normalizeReferralCode(
      window.localStorage.getItem(ATTRIBUTION_STORAGE_KEY),
    );
  } catch {
    return memoryAttribution;
  }
}

export function clearStoredReferralCode(): void {
  memoryAttribution = null;
  try {
    window.localStorage.removeItem(ATTRIBUTION_STORAGE_KEY);
  } catch {
    // In-memory attribution is already cleared.
  }
}

export function recordCompletedRoundForSharing(
  input: PromptInput,
): SharePromptTrigger | null {
  const decision = chooseSharePrompt(readPromptProgress(), input);
  memoryProgress = decision.progress;
  try {
    window.localStorage.setItem(
      PROMPT_PROGRESS_STORAGE_KEY,
      JSON.stringify(decision.progress),
    );
  } catch {
    // The in-memory frequency cap still applies for the current page session.
  }
  if (decision.trigger) {
    analytics.capture("share_prompt_shown", {
      surface: "results",
      trigger: decision.trigger,
    });
  }
  return decision.trigger;
}

export function chooseSharePrompt(
  progress: PromptProgress,
  input: PromptInput,
): PromptDecision {
  const completedRounds = progress.completedRounds + 1;
  const canPrompt =
    progress.lastPromptedRound === 0 ||
    completedRounds - progress.lastPromptedRound >= MIN_ROUNDS_BETWEEN_PROMPTS;
  let trigger: SharePromptTrigger | null = null;
  if (canPrompt) {
    if (input.personalBest) trigger = "personal_best";
    else if (completedRounds === 3) trigger = "third_round";
    else if (
      input.accuracyPct >= HIGH_ACCURACY_THRESHOLD &&
      input.attempts >= HIGH_ACCURACY_MIN_ATTEMPTS
    ) {
      trigger = "high_accuracy";
    }
  }
  return {
    progress: {
      completedRounds,
      lastPromptedRound: trigger
        ? completedRounds
        : progress.lastPromptedRound,
    },
    trigger,
  };
}

export async function shareReferralChallenge(): Promise<ShareResult> {
  const identity = getOrCreateAnonymousIdentity();
  let url = new URL("/", window.location.origin);
  try {
    const response = await fetch("/api/referrals/code", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(identity),
    });
    const body = (await response.json()) as { readonly code?: unknown };
    const code = response.ok ? normalizeReferralCode(body.code) : null;
    if (code) url.searchParams.set("ref", code);
  } catch {
    url = new URL("/", window.location.origin);
  }

  return shareGameLink("results", {
    url: url.toString(),
    text: "Think you know your Linear shortcuts? Beat my Shortcut Hero run.",
  });
}

function readPromptProgress(): PromptProgress {
  try {
    const raw = window.localStorage.getItem(PROMPT_PROGRESS_STORAGE_KEY);
    if (!raw) return memoryProgress;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (
      Number.isInteger(parsed.completedRounds) &&
      Number(parsed.completedRounds) >= 0 &&
      Number.isInteger(parsed.lastPromptedRound) &&
      Number(parsed.lastPromptedRound) >= 0
    ) {
      return {
        completedRounds: Number(parsed.completedRounds),
        lastPromptedRound: Number(parsed.lastPromptedRound),
      };
    }
  } catch {
    // Fall through to page-session memory.
  }
  return memoryProgress;
}

function writeStoredReferralCode(code: string): void {
  memoryAttribution = code;
  try {
    window.localStorage.setItem(ATTRIBUTION_STORAGE_KEY, code);
  } catch {
    // Page-session memory keeps the attribution until the round is saved.
  }
}
