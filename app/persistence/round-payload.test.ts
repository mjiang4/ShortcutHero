import assert from "node:assert/strict";
import test from "node:test";

import {
  parseDeletionRequest,
  parseRoundWritePayload,
} from "./round-payload";
import { buildMasteryDeltas } from "./round-client";
import type { PromptAttempt, ShortcutDefinition } from "../game";
import { POST as saveRound } from "../api/rounds/route";

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

test("accepts a normalized referral code and rejects an invalid one", () => {
  assert.equal(
    parseRoundWritePayload({
      ...VALID_PAYLOAD,
      referralCode: "abcd2345",
    })?.referralCode,
    "ABCD2345",
  );
  assert.equal(
    parseRoundWritePayload({
      ...VALID_PAYLOAD,
      referralCode: "not-valid",
    }),
    null,
  );
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

test("the Vercel round endpoint validates and strips personal fields before forwarding", async (t) => {
  const previousOrigin = process.env.SHORTCUT_HERO_BACKEND_ORIGIN;
  process.env.SHORTCUT_HERO_BACKEND_ORIGIN = "https://storage.example.test";
  t.after(() => {
    if (previousOrigin === undefined) delete process.env.SHORTCUT_HERO_BACKEND_ORIGIN;
    else process.env.SHORTCUT_HERO_BACKEND_ORIGIN = previousOrigin;
  });
  const fetchMock = t.mock.method(globalThis, "fetch", async (_url: RequestInfo | URL, options?: RequestInit) => {
    assert.deepEqual(JSON.parse(String(options?.body)), VALID_PAYLOAD);
    return Response.json({ status: "created", referralConverted: false }, { status: 201 });
  });
  const response = await saveRound(new Request("https://game.example.test/api/rounds", {
    method: "POST",
    body: JSON.stringify({ ...VALID_PAYLOAD, name: "Ada", pressedKeys: ["A"] }),
  }));
  assert.equal(response.status, 201);
  const rejected = await saveRound(new Request("https://game.example.test/api/rounds", {
    method: "POST",
    body: JSON.stringify({ ...VALID_PAYLOAD, correctAnswers: 100 }),
  }));
  assert.equal(rejected.status, 400);
  assert.equal(fetchMock.mock.callCount(), 1);
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

test("persists recovered actions as misses, matching the round summary", () => {
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

  const mastery = buildMasteryDeltas(session);
  assert.deepEqual(mastery, [
    {
      shortcutId: "assign-user",
      attempts: 3,
      correct: 1,
      cleanHits: 1,
      perfectHits: 1,
      misses: 2,
    },
  ]);
  assert.ok(parseRoundWritePayload({ ...VALID_PAYLOAD, correctAnswers: 1, misses: 2, mastery }));
});
