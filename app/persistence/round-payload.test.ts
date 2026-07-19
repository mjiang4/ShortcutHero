import assert from "node:assert/strict";
import test from "node:test";

import {
  parseDeletionRequest,
  parseRoundWritePayload,
} from "./round-payload";
import { buildMasteryDeltas } from "./round-client";
import type { PromptAttempt, ShortcutDefinition } from "../game";

const VALID_PAYLOAD = {
  roundId: `r_${"a".repeat(32)}`,
  visitorId: `v_${"b".repeat(32)}`,
  deletionToken: `d_${"c".repeat(64)}`,
  trackId: "linear",
  difficulty: "easy",
  guidance: "novice",
  pace: "standard",
  sessionSeconds: 45,
  soundEnabled: true,
  effectsMode: "system",
  score: 2_300,
  accuracyPct: 66.7,
  longestCombo: 4,
  attempts: 3,
  correctAnswers: 2,
  misses: 1,
  uniqueShortcutsCorrect: 1,
  durationMs: 45_000,
  mastery: [
    {
      shortcutId: "assign-user",
      attempts: 3,
      correct: 2,
      cleanHits: 1,
      perfectHits: 1,
      misses: 1,
    },
  ],
};

test("accepts a bounded anonymous round summary", () => {
  assert.deepEqual(parseRoundWritePayload(VALID_PAYLOAD), VALID_PAYLOAD);
});

test("drops undeclared personal and shortcut-content fields", () => {
  const parsed = parseRoundWritePayload({
    ...VALID_PAYLOAD,
    name: "Ada",
    email: "ada@example.com",
    pressedKeys: ["A"],
    mastery: [
      {
        ...VALID_PAYLOAD.mastery[0],
        action: "Assign user",
        shortcut: "A",
      },
    ],
  });

  assert.ok(parsed);
  assert.equal("name" in parsed, false);
  assert.equal("pressedKeys" in parsed, false);
  assert.equal("action" in parsed.mastery[0], false);
  assert.equal("shortcut" in parsed.mastery[0], false);
});

test("rejects inconsistent mastery totals", () => {
  assert.equal(
    parseRoundWritePayload({
      ...VALID_PAYLOAD,
      misses: 2,
    }),
    null,
  );
});

test("rejects an invalid deletion secret", () => {
  assert.equal(
    parseDeletionRequest({
      visitorId: VALID_PAYLOAD.visitorId,
      deletionToken: "not-a-secret",
    }),
    null,
  );
});

test("counts recovered hits as correct and only failed prompts as misses", () => {
  const shortcut: ShortcutDefinition = {
    id: "assign-user",
    action: "Assign user",
    difficulty: "easy",
    input: { kind: "single", code: "KeyA", display: "A" },
  };
  const attempt = (
    outcome: PromptAttempt["outcome"],
    judgement: PromptAttempt["judgement"],
  ): PromptAttempt => ({
    promptId: `${outcome}-${judgement}`,
    shortcut,
    outcome,
    judgement,
    responseMs: 100,
    timingOffsetMs: 0,
    wrongInputs: outcome === "recovered" ? 1 : 0,
    points: outcome === "miss" ? 0 : 100,
    requeued: outcome === "miss",
  });
  const session = {
    attempts: [
      attempt("clean", "perfect"),
      attempt("recovered", "good"),
      attempt("miss", "miss"),
    ],
  };

  assert.deepEqual(buildMasteryDeltas(session), [
    {
      shortcutId: "assign-user",
      attempts: 3,
      correct: 2,
      cleanHits: 1,
      perfectHits: 1,
      misses: 1,
    },
  ]);
});
