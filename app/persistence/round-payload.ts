import type { EffectsMode } from "../components/settings/settings";
import type {
  AssistanceMode,
  Difficulty,
  SpeedPreset,
} from "../game";
import { normalizeReferralCode } from "../referrals/contract";

export type RoundMasteryDelta = {
  readonly shortcutId: string;
  readonly attempts: number;
  readonly correct: number;
  readonly cleanHits: number;
  readonly perfectHits: number;
  readonly misses: number;
};

export type RoundWritePayload = {
  readonly roundId: string;
  readonly visitorId: string;
  readonly deletionToken: string;
  readonly referralCode?: string;
  readonly trackId: string;
  readonly difficulty: Difficulty;
  readonly guidance: AssistanceMode;
  readonly pace: SpeedPreset;
  readonly sessionSeconds: 30 | 45 | 60;
  readonly soundEnabled: boolean;
  readonly effectsMode: EffectsMode;
  readonly score: number;
  readonly accuracyPct: number;
  readonly longestCombo: number;
  readonly attempts: number;
  readonly correctAnswers: number;
  readonly misses: number;
  readonly uniqueShortcutsCorrect: number;
  readonly durationMs: number;
  readonly mastery: readonly RoundMasteryDelta[];
};

const ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const ROUND_ID_PATTERN = /^r_[a-f0-9]{32}$/;
const VISITOR_ID_PATTERN = /^v_[a-f0-9]{32}$/;
const DELETION_TOKEN_PATTERN = /^d_[a-f0-9]{64}$/;
const DIFFICULTIES = new Set(["easy", "medium", "hard"]);
const GUIDANCE = new Set(["novice", "pro"]);
const PACES = new Set(["relaxed", "standard", "turbo"]);
const EFFECTS = new Set(["full", "system", "reduced"]);
const SESSIONS = new Set([30, 45, 60]);

export function parseRoundWritePayload(value: unknown): RoundWritePayload | null {
  if (!isRecord(value) || !Array.isArray(value.mastery)) return null;
  if (value.mastery.length > 100) return null;

  const mastery = value.mastery.map(parseMasteryDelta);
  if (mastery.some((item) => item === null)) return null;
  if (
    !isPatternString(value.roundId, ROUND_ID_PATTERN) ||
    !isPatternString(value.visitorId, VISITOR_ID_PATTERN) ||
    !isPatternString(value.deletionToken, DELETION_TOKEN_PATTERN) ||
    !isPatternString(value.trackId, ID_PATTERN) ||
    typeof value.difficulty !== "string" ||
    !DIFFICULTIES.has(value.difficulty) ||
    typeof value.guidance !== "string" ||
    !GUIDANCE.has(value.guidance) ||
    typeof value.pace !== "string" ||
    !PACES.has(value.pace) ||
    !isBoundedInteger(value.sessionSeconds, 30, 60) ||
    !SESSIONS.has(value.sessionSeconds) ||
    typeof value.soundEnabled !== "boolean" ||
    typeof value.effectsMode !== "string" ||
    !EFFECTS.has(value.effectsMode) ||
    !isBoundedInteger(value.score, 0, 100_000_000) ||
    !isBoundedNumber(value.accuracyPct, 0, 100) ||
    !isBoundedInteger(value.longestCombo, 0, 10_000) ||
    !isBoundedInteger(value.attempts, 0, 10_000) ||
    !isBoundedInteger(value.correctAnswers, 0, value.attempts) ||
    !isBoundedInteger(value.misses, 0, value.attempts) ||
    !isBoundedInteger(value.uniqueShortcutsCorrect, 0, 1_000) ||
    !isBoundedInteger(value.durationMs, 0, 120_000)
  ) {
    return null;
  }

  const parsedMastery = mastery as RoundMasteryDelta[];
  const referralCode =
    value.referralCode === undefined
      ? null
      : normalizeReferralCode(value.referralCode);
  if (value.referralCode !== undefined && !referralCode) return null;
  const masteryTotals = parsedMastery.reduce(
    (totals, item) => ({
      attempts: totals.attempts + item.attempts,
      correct: totals.correct + item.correct,
      misses: totals.misses + item.misses,
      uniqueCorrect: totals.uniqueCorrect + (item.correct > 0 ? 1 : 0),
    }),
    { attempts: 0, correct: 0, misses: 0, uniqueCorrect: 0 },
  );
  if (
    masteryTotals.attempts !== value.attempts ||
    masteryTotals.correct !== value.correctAnswers ||
    masteryTotals.misses !== value.misses ||
    masteryTotals.uniqueCorrect !== value.uniqueShortcutsCorrect
  ) {
    return null;
  }

  return {
    roundId: value.roundId,
    visitorId: value.visitorId,
    deletionToken: value.deletionToken,
    ...(referralCode ? { referralCode } : {}),
    trackId: value.trackId,
    difficulty: value.difficulty as Difficulty,
    guidance: value.guidance as AssistanceMode,
    pace: value.pace as SpeedPreset,
    sessionSeconds: value.sessionSeconds as 30 | 45 | 60,
    soundEnabled: value.soundEnabled,
    effectsMode: value.effectsMode as EffectsMode,
    score: value.score,
    accuracyPct: value.accuracyPct,
    longestCombo: value.longestCombo,
    attempts: value.attempts,
    correctAnswers: value.correctAnswers,
    misses: value.misses,
    uniqueShortcutsCorrect: value.uniqueShortcutsCorrect,
    durationMs: value.durationMs,
    mastery: parsedMastery,
  };
}

export function parseDeletionRequest(
  value: unknown,
): Pick<RoundWritePayload, "visitorId" | "deletionToken"> | null {
  if (
    !isRecord(value) ||
    !isPatternString(value.visitorId, VISITOR_ID_PATTERN) ||
    !isPatternString(value.deletionToken, DELETION_TOKEN_PATTERN)
  ) {
    return null;
  }
  return {
    visitorId: value.visitorId,
    deletionToken: value.deletionToken,
  };
}

function parseMasteryDelta(value: unknown): RoundMasteryDelta | null {
  if (
    !isRecord(value) ||
    !isPatternString(value.shortcutId, ID_PATTERN) ||
    !isBoundedInteger(value.attempts, 1, 10_000) ||
    !isBoundedInteger(value.correct, 0, value.attempts) ||
    !isBoundedInteger(value.cleanHits, 0, value.correct) ||
    !isBoundedInteger(value.perfectHits, 0, value.cleanHits) ||
    !isBoundedInteger(value.misses, 0, value.attempts) ||
    value.correct + value.misses !== value.attempts
  ) {
    return null;
  }
  return {
    shortcutId: value.shortcutId,
    attempts: value.attempts,
    correct: value.correct,
    cleanHits: value.cleanHits,
    perfectHits: value.perfectHits,
    misses: value.misses,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPatternString(value: unknown, pattern: RegExp): value is string {
  return typeof value === "string" && pattern.test(value);
}

function isBoundedInteger(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return (
    Number.isInteger(value) &&
    Number(value) >= minimum &&
    Number(value) <= maximum
  );
}

function isBoundedNumber(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= minimum &&
    value <= maximum
  );
}
