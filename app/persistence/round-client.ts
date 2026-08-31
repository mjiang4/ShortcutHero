"use client";

import type { EffectsMode } from "../components/settings/settings";
import {
  getSessionDurationSeconds,
  type GameResults,
  type GameSession,
} from "../game";
import {
  createRoundId,
  getOrCreateAnonymousIdentity,
} from "../identity/anonymous-identity";
import {
  clearStoredReferralCode,
  readStoredReferralCode,
} from "../referrals/client";
import type { RoundMasteryDelta, RoundWritePayload } from "./round-payload";

export type RoundPersistenceResult = {
  readonly saved: boolean;
  readonly referralConverted: boolean;
};

export async function persistRoundSummary(
  results: GameResults,
  session: GameSession,
  effectsMode: EffectsMode,
  soundEnabled: boolean,
): Promise<RoundPersistenceResult> {
  const identity = getOrCreateAnonymousIdentity();
  const referralCode = readStoredReferralCode();
  const payload: RoundWritePayload = {
    roundId: createRoundId(),
    visitorId: identity.visitorId,
    deletionToken: identity.deletionToken,
    ...(referralCode ? { referralCode } : {}),
    trackId: session.settings.trackId ?? "linear",
    difficulty: session.settings.mode === "showcase" ? "easy" : session.settings.mode,
    guidance: session.settings.assistance,
    pace: session.settings.speed,
    sessionSeconds: getSessionDurationSeconds(session.settings) as 30 | 45 | 60,
    soundEnabled,
    effectsMode,
    score: results.score,
    accuracyPct: results.accuracyPct,
    longestCombo: results.longestCombo,
    attempts: results.attempts,
    correctAnswers: results.correctAnswers,
    misses: results.misses,
    uniqueShortcutsCorrect: results.uniqueShortcutsCorrect,
    durationMs: results.durationMs,
    mastery: buildMasteryDeltas(session),
  };

  try {
    const response = await fetch("/api/rounds", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
    if (!response.ok) return { saved: false, referralConverted: false };
    const responseBody = (await response.json()) as {
      readonly referralConverted?: unknown;
    };
    if (referralCode) clearStoredReferralCode();
    return {
      saved: true,
      referralConverted: responseBody.referralConverted === true,
    };
  } catch {
    return { saved: false, referralConverted: false };
  }
}

export function buildMasteryDeltas(
  session: Pick<GameSession, "attempts">,
): readonly RoundMasteryDelta[] {
  const deltas = new Map<string, RoundMasteryDelta>();
  for (const attempt of session.attempts) {
    const current = deltas.get(attempt.shortcut.id) ?? {
      shortcutId: attempt.shortcut.id,
      attempts: 0,
      correct: 0,
      cleanHits: 0,
      perfectHits: 0,
      misses: 0,
    };
    const clean = attempt.outcome === "clean";
    deltas.set(attempt.shortcut.id, {
      ...current,
      attempts: current.attempts + 1,
      correct: current.correct + (clean ? 1 : 0),
      cleanHits: current.cleanHits + (clean ? 1 : 0),
      perfectHits:
        current.perfectHits + (clean && attempt.judgement === "perfect" ? 1 : 0),
      misses: current.misses + (clean ? 0 : 1),
    });
  }
  return [...deltas.values()];
}
