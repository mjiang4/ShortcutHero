"use client";

import {
  createRoundId,
  getDisplayName,
  getOrCreateAnonymousIdentity,
} from "../identity/anonymous-identity";
import type { GameSession, GameResults } from "../game";
import type { LaunchSettings } from "../components/settings/settings";
import type { RoundMasteryDelta, RunMode } from "./round-payload";

export type PersistRoundResult = {
  readonly saved: boolean;
};

export async function persistRoundSummary(options: {
  readonly session: GameSession;
  readonly results: GameResults;
  readonly launch: LaunchSettings;
  readonly runMode?: RunMode;
}): Promise<PersistRoundResult> {
  const { session, results, launch } = options;
  const identity = getOrCreateAnonymousIdentity();
  const mastery = buildMasteryDeltas(session);
  const payload = {
    roundId: createRoundId(),
    visitorId: identity.visitorId,
    deletionToken: identity.deletionToken,
    displayName: getDisplayName(),
    trackId: launch.tool,
    runMode: options.runMode ?? "highway",
    difficulty: launch.difficulty,
    guidance: launch.guidance,
    pace: launch.pace,
    sessionSeconds: launch.session,
    soundEnabled: launch.sound === "on",
    effectsMode: launch.effects,
    score: results.score,
    accuracyPct: results.accuracyPct,
    longestCombo: results.longestCombo,
    attempts: results.attempts,
    correctAnswers: results.correctAnswers,
    misses: results.misses,
    uniqueShortcutsCorrect: results.uniqueShortcutsCorrect,
    durationMs: results.durationMs,
    mastery,
  };

  try {
    const response = await fetch("/api/rounds", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
    return { saved: response.ok };
  } catch {
    return { saved: false };
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
    const correct = attempt.outcome !== "miss";
    const clean = attempt.outcome === "clean";
    deltas.set(attempt.shortcut.id, {
      ...current,
      attempts: current.attempts + 1,
      correct: current.correct + (correct ? 1 : 0),
      cleanHits: current.cleanHits + (clean ? 1 : 0),
      perfectHits:
        current.perfectHits + (clean && attempt.judgement === "perfect" ? 1 : 0),
      misses: current.misses + (correct ? 0 : 1),
    });
  }
  return [...deltas.values()];
}

export type LeaderboardEntry = {
  readonly rank: number;
  readonly displayName: string;
  readonly score: number;
  readonly accuracyPct: number;
  readonly longestCombo: number;
  readonly trackId: string;
  readonly difficulty: string;
  readonly runMode: string;
  readonly completedAt: number;
};

export async function fetchLeaderboardClient(options?: {
  readonly track?: string;
  readonly mode?: string;
  readonly limit?: number;
}): Promise<readonly LeaderboardEntry[]> {
  const params = new URLSearchParams();
  if (options?.track) params.set("track", options.track);
  if (options?.mode) params.set("mode", options.mode);
  if (options?.limit) params.set("limit", String(options.limit));
  try {
    const response = await fetch(`/api/leaderboard?${params.toString()}`, {
      cache: "no-store",
    });
    if (!response.ok) return [];
    const body = (await response.json()) as {
      readonly entries?: readonly LeaderboardEntry[];
    };
    return body.entries ?? [];
  } catch {
    return [];
  }
}
