import type {
  ComboTier,
  CorrectShortcutSummary,
  GameResults,
  HitJudgement,
  PracticeShortcut,
  PromptAttempt,
  ShortcutDefinition,
} from "./types";

const RECOVERY_FACTOR = 0.5;

const JUDGEMENT_POINTS: Readonly<Record<HitJudgement, number>> = {
  perfect: 200,
  good: 150,
  early: 100,
  late: 100,
};

export function getComboTier(combo: number): ComboTier {
  if (combo >= 9) return "flow";
  if (combo >= 6) return "surge";
  if (combo >= 3) return "trail";
  return "base";
}

export function getScoreMultiplier(combo: number): number {
  switch (getComboTier(combo)) {
    case "flow":
      return 4;
    case "surge":
      return 3;
    case "trail":
      return 2;
    case "base":
      return 1;
  }
}

export interface ScoreHitOptions {
  readonly judgement: HitJudgement;
  readonly combo: number;
  readonly recovered: boolean;
}

export function scoreHit(options: ScoreHitOptions): number {
  const rawPoints = JUDGEMENT_POINTS[options.judgement];

  if (options.recovered) {
    return Math.round(rawPoints * RECOVERY_FACTOR);
  }

  return rawPoints * getScoreMultiplier(options.combo);
}

interface PracticeAccumulator {
  shortcut: ShortcutDefinition;
  misses: number;
  wrongInputs: number;
}

function getPracticeShortcuts(
  attempts: readonly PromptAttempt[],
): readonly PracticeShortcut[] {
  const byShortcut = new Map<string, PracticeAccumulator>();

  for (const attempt of attempts) {
    const current = byShortcut.get(attempt.shortcut.id) ?? {
      shortcut: attempt.shortcut,
      misses: 0,
      wrongInputs: 0,
    };
    current.misses += attempt.outcome === "clean" ? 0 : 1;
    current.wrongInputs += attempt.wrongInputs;
    byShortcut.set(attempt.shortcut.id, current);
  }

  return [...byShortcut.values()]
    .map((item) => ({
      ...item,
      mistakes: Math.max(item.misses, item.wrongInputs),
    }))
    .filter((item) => item.mistakes > 0)
    .sort(
      (a, b) =>
        b.mistakes - a.mistakes || a.shortcut.action.localeCompare(b.shortcut.action),
    );
}

interface CorrectAccumulator {
  shortcut: ShortcutDefinition;
  attempts: number;
  correct: number;
  cleanHits: number;
  perfectHits: number;
}

function getCorrectShortcuts(
  attempts: readonly PromptAttempt[],
): readonly CorrectShortcutSummary[] {
  const byShortcut = new Map<string, CorrectAccumulator>();

  for (const attempt of attempts) {
    const current = byShortcut.get(attempt.shortcut.id) ?? {
      shortcut: attempt.shortcut,
      attempts: 0,
      correct: 0,
      cleanHits: 0,
      perfectHits: 0,
    };
    current.attempts += 1;
    if (attempt.outcome === "clean") current.correct += 1;
    if (attempt.outcome === "clean") current.cleanHits += 1;
    if (attempt.outcome === "clean" && attempt.judgement === "perfect") {
      current.perfectHits += 1;
    }
    byShortcut.set(attempt.shortcut.id, current);
  }

  return [...byShortcut.values()]
    .filter((item) => item.attempts > 0 && item.correct === item.attempts)
    .map((item) => ({
      ...item,
      accuracyPct: Math.round((item.correct / item.attempts) * 100),
    }))
    .sort(
      (a, b) =>
        b.accuracyPct - a.accuracyPct ||
        b.cleanHits - a.cleanHits ||
        b.perfectHits - a.perfectHits ||
        b.correct - a.correct ||
        a.shortcut.action.localeCompare(b.shortcut.action),
    );
}

export function calculateResults(
  attempts: readonly PromptAttempt[],
  score: number,
  longestCombo: number,
  startedAtMs: number | null,
  finishedAtMs: number | null,
): GameResults {
  const cleanHits = attempts.filter((attempt) => attempt.outcome === "clean").length;
  const recoveredHits = attempts.filter(
    (attempt) => attempt.outcome === "recovered",
  ).length;
  const misses = attempts.filter((attempt) => attempt.outcome !== "clean").length;
  const correctAnswers = cleanHits;
  const accuracyPct =
    attempts.length === 0
      ? 0
      : Math.round((correctAnswers / attempts.length) * 1_000) / 10;
  const uniqueShortcutsCorrect = new Set(
    attempts
      .filter((attempt) => attempt.outcome === "clean")
      .map((attempt) => attempt.shortcut.id),
  ).size;

  return {
    score,
    accuracyPct,
    longestCombo,
    attempts: attempts.length,
    cleanHits,
    recoveredHits,
    misses,
    correctAnswers,
    uniqueShortcutsCorrect,
    durationMs:
      startedAtMs === null || finishedAtMs === null
        ? 0
        : Math.max(0, finishedAtMs - startedAtMs),
    correctShortcuts: getCorrectShortcuts(attempts),
    practice: getPracticeShortcuts(attempts),
  };
}
