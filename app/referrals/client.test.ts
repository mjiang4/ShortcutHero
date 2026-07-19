import assert from "node:assert/strict";
import test from "node:test";

import { chooseSharePrompt } from "./client";
import { normalizeReferralCode } from "./contract";

test("normalizes valid referral codes and rejects ambiguous characters", () => {
  assert.equal(normalizeReferralCode(" abcd2345 "), "ABCD2345");
  assert.equal(normalizeReferralCode("ABCDI345"), null);
  assert.equal(normalizeReferralCode("short"), null);
});

test("shows the first eligible prompt and frequency-caps later prompts", () => {
  const first = chooseSharePrompt(
    { completedRounds: 0, lastPromptedRound: 0 },
    { personalBest: true, accuracyPct: 50, attempts: 4 },
  );
  assert.equal(first.trigger, "personal_best");

  const second = chooseSharePrompt(first.progress, {
    personalBest: true,
    accuracyPct: 100,
    attempts: 10,
  });
  const third = chooseSharePrompt(second.progress, {
    personalBest: false,
    accuracyPct: 100,
    attempts: 10,
  });
  const fourth = chooseSharePrompt(third.progress, {
    personalBest: false,
    accuracyPct: 100,
    attempts: 10,
  });

  assert.equal(second.trigger, null);
  assert.equal(third.trigger, null);
  assert.equal(fourth.trigger, "high_accuracy");
});

test("uses the third completed round as a referral prompt trigger", () => {
  const decision = chooseSharePrompt(
    { completedRounds: 2, lastPromptedRound: 0 },
    { personalBest: false, accuracyPct: 20, attempts: 3 },
  );
  assert.equal(decision.trigger, "third_round");
  assert.equal(decision.progress.completedRounds, 3);
  assert.equal(decision.progress.lastPromptedRound, 3);
});
