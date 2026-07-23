import assert from "node:assert/strict";
import test from "node:test";

import { parseRoundWritePayload } from "./round-payload";

const base = {
  roundId: `r_${"a".repeat(32)}`,
  visitorId: `v_${"b".repeat(32)}`,
  deletionToken: `d_${"c".repeat(64)}`,
  displayName: "Pilot-Test",
  trackId: "linear",
  runMode: "highway",
  difficulty: "easy",
  guidance: "novice",
  pace: "standard",
  sessionSeconds: 45,
  soundEnabled: true,
  effectsMode: "system",
  score: 1200,
  accuracyPct: 80,
  longestCombo: 4,
  attempts: 1,
  correctAnswers: 1,
  misses: 0,
  uniqueShortcutsCorrect: 1,
  durationMs: 12_000,
  mastery: [
    {
      shortcutId: "new-issue",
      attempts: 1,
      correct: 1,
      cleanHits: 1,
      perfectHits: 1,
      misses: 0,
    },
  ],
};

test("accepts a valid round payload", () => {
  const parsed = parseRoundWritePayload(base);
  assert.ok(parsed);
  assert.equal(parsed?.score, 1200);
  assert.equal(parsed?.runMode, "highway");
});

test("rejects mastery totals that do not match summary", () => {
  const parsed = parseRoundWritePayload({
    ...base,
    correctAnswers: 2,
  });
  assert.equal(parsed, null);
});
