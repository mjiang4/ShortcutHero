import assert from "node:assert/strict";
import test from "node:test";

import { EASY_SHORTCUTS, HARD_SHORTCUTS, MEDIUM_SHORTCUTS } from "./content";
import {
  APPROACH_DURATION_MS,
  createGameSession,
  getPromptCadenceMs,
  getPromptTiming,
  getSessionDurationSeconds,
  handleSessionKey,
  startSession,
  tickSession,
} from "./session";
import type { GameSettings } from "./types";

const BASE_SETTINGS: GameSettings = {
  mode: "easy",
  assistance: "novice",
  speed: "standard",
};

test("uses fast travel independently from difficulty-specific cue cadence", () => {
  assert.deepEqual(APPROACH_DURATION_MS, {
    relaxed: 1_600,
    standard: 1_000,
    turbo: 800,
  });
  assert.equal(getPromptCadenceMs("easy", "standard"), 1_600);
  assert.equal(getPromptCadenceMs("medium", "standard"), 2_000);
  assert.equal(getPromptCadenceMs("hard", "standard"), 1_600);
  assert.equal(getPromptCadenceMs("showcase", "standard"), 1_200);
});

test("defaults sessions to 45 seconds and honours supported durations", () => {
  assert.equal(getSessionDurationSeconds(BASE_SETTINGS), 45);
  assert.equal(
    getSessionDurationSeconds({ ...BASE_SETTINGS, durationSeconds: 30 }),
    30,
  );
  assert.equal(
    getSessionDurationSeconds({ ...BASE_SETTINGS, durationSeconds: 60 }),
    60,
  );
});

test("cycles a short deck with unique, continuously increasing cue ids", () => {
  const session = createGameSession(BASE_SETTINGS, {
    deck: EASY_SHORTCUTS.slice(0, 2),
  });

  assert.deepEqual(
    session.queue.slice(0, 6).map((prompt) => prompt.shortcut.id),
    [
      EASY_SHORTCUTS[0].id,
      EASY_SHORTCUTS[1].id,
      EASY_SHORTCUTS[0].id,
      EASY_SHORTCUTS[1].id,
      EASY_SHORTCUTS[0].id,
      EASY_SHORTCUTS[1].id,
    ],
  );
  assert.deepEqual(
    session.queue.slice(0, 6).map((prompt) => prompt.promptId),
    [
      `${EASY_SHORTCUTS[0].id}:0`,
      `${EASY_SHORTCUTS[1].id}:1`,
      `${EASY_SHORTCUTS[0].id}:2`,
      `${EASY_SHORTCUTS[1].id}:3`,
      `${EASY_SHORTCUTS[0].id}:4`,
      `${EASY_SHORTCUTS[1].id}:5`,
    ],
  );
});

test("gives the novice single-key deck a wider standard hit window", () => {
  const prompt = {
    approachedAtMs: 0,
    strikeAtMs: 1_000,
    deadlineAtMs: 1_340,
  };

  assert.equal(
    getPromptTiming(prompt, 700, BASE_SETTINGS).phase,
    "hittable",
  );
  assert.equal(
    getPromptTiming(prompt, 700, {
      ...BASE_SETTINGS,
      mode: "hard",
    }).phase,
    "approaching",
  );
});

test("scores the matching key as a perfect temporal collision at the gate", () => {
  const started = startSession(
    createGameSession(BASE_SETTINGS, {
      deck: EASY_SHORTCUTS.slice(0, 1),
      maxRequeues: 0,
    }),
    0,
  );
  assert.ok(started.active);

  const update = handleSessionKey(
    started,
    {
      code: "KeyC",
      shiftKey: false,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
    },
    started.active.strikeAtMs,
  );

  assert.equal(update.preventDefault, true);
  assert.equal(update.effects[0]?.type, "hit");
  if (update.effects[0]?.type === "hit") {
    assert.equal(update.effects[0].judgement, "perfect");
    assert.equal(update.effects[0].timingOffsetMs, 0);
  }
  assert.equal(update.session.combo, 1);
  assert.ok(update.session.score > 0);
});

test("does not capture a matching letter when it belongs to a browser shortcut", () => {
  const started = startSession(
    createGameSession(BASE_SETTINGS, {
      deck: EASY_SHORTCUTS.slice(0, 1),
    }),
    0,
  );
  assert.ok(started.active);

  const update = handleSessionKey(
    started,
    {
      code: "KeyC",
      shiftKey: false,
      altKey: false,
      ctrlKey: false,
      metaKey: true,
    },
    started.active.strikeAtMs,
  );

  assert.equal(update.preventDefault, false);
  assert.equal(update.effects.length, 0);
  assert.equal(update.session, started);
});

test("keeps each difficulty deck aligned with its intended input type", () => {
  assert.ok(EASY_SHORTCUTS.every((shortcut) => shortcut.input.kind === "single"));
  assert.ok(
    MEDIUM_SHORTCUTS.every((shortcut) => shortcut.input.kind === "sequence"),
  );
  assert.ok(HARD_SHORTCUTS.every((shortcut) => shortcut.input.kind === "chord"));
});

test("finishes on the configured session clock instead of deck exhaustion", () => {
  const started = startSession(
    createGameSession(
      { ...BASE_SETTINGS, durationSeconds: 30 },
      { deck: EASY_SHORTCUTS.slice(0, 1), maxRequeues: 0 },
    ),
    5_000,
  );

  const beforeEnd = tickSession(started, 34_999);
  assert.equal(beforeEnd.session.phase, "playing");

  const atEnd = tickSession(beforeEnd.session, 35_000);
  assert.equal(atEnd.session.phase, "finished");
  assert.equal(atEnd.session.finishedAtMs, 35_000);
  assert.equal(atEnd.effects.at(-1)?.type, "finished");
  if (atEnd.effects.at(-1)?.type === "finished") {
    assert.equal(atEnd.effects.at(-1)?.results.durationMs, 30_000);
  }
});

test("requeues misses within the remaining session using a fresh cue id", () => {
  const started = startSession(
    createGameSession(BASE_SETTINGS, {
      deck: EASY_SHORTCUTS.slice(0, 1),
      maxRequeues: 1,
    }),
    0,
  );
  assert.ok(started.active);

  const missed = tickSession(started, started.active.deadlineAtMs + 1);
  assert.equal(missed.effects[0]?.type, "miss");
  if (missed.effects[0]?.type === "miss") {
    assert.equal(missed.effects[0].requeued, true);
  }
  assert.ok(missed.session.queue.some((prompt) => prompt.requeueCount === 1));
  assert.equal(new Set(missed.session.queue.map((prompt) => prompt.promptId)).size, missed.session.queue.length);
});
