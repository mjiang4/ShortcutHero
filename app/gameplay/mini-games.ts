export type MiniGameResult = {
  readonly score: number;
  readonly accuracyPct: number;
  readonly longestCombo: number;
  readonly attempts: number;
  readonly correctAnswers: number;
  readonly misses: number;
  readonly durationMs: number;
};

export const INTERLUDE_EVERY_HITS = 8;
export const INTERLUDE_PROMPT_COUNT = 4;
export const SPEED_ROUND_WINDOW_MS = 4_000;

export function shouldTriggerInterlude(
  cleanHitsSinceInterlude: number,
): boolean {
  return cleanHitsSinceInterlude >= INTERLUDE_EVERY_HITS;
}

export function scoreSpeedRoundHit(remainingMs: number): number {
  const ratio = Math.max(0, Math.min(1, remainingMs / SPEED_ROUND_WINDOW_MS));
  return Math.round(80 + ratio * 220);
}
