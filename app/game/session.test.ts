import assert from "node:assert/strict";
import test from "node:test";

import { EASY_SHORTCUTS, HARD_SHORTCUTS, MEDIUM_SHORTCUTS, getShortcutDeck } from "./content";
import { EMPTY_CURRICULUM, recordLesson, selectLesson } from "./curriculum";
import { hintKeysFor } from "../gameplay/runtime-view";
import { parseLaunchSettings, createPlayHref } from "../components/settings/settings";
import { calculateResults } from "./scoring";
import {
  APPROACH_DURATION_MS,
  createGameSession,
  getPromptCadenceMs,
  getPromptTiming,
  getSessionDurationSeconds,
  getShortcutHintOpacity,
  getHighScoreKey,
  handleSessionKey,
  startSession,
  tickSession,
} from "./session";
import type { GameKeyEvent, GameSettings, PromptAttempt } from "./types";

const BASE_SETTINGS: GameSettings = {
  mode: "easy",
  assistance: "novice",
  speed: "standard",
};

test("uses fast travel independently from difficulty-specific cue cadence", () => {
  assert.deepEqual(APPROACH_DURATION_MS, {
    relaxed: 2_000,
    standard: 1_250,
    turbo: 1_000,
  });
  assert.equal(getPromptCadenceMs("easy", "standard"), 1_000);
  assert.equal(getPromptCadenceMs("medium", "standard"), 1_500);
  assert.equal(getPromptCadenceMs("hard", "standard"), 1_000);
  assert.equal(getPromptCadenceMs("showcase", "standard"), 750);
});

test("defaults sessions to 30 seconds and honours supported durations", () => {
  assert.equal(getSessionDurationSeconds(BASE_SETTINGS), 30);
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
    getPromptTiming(prompt, 650, BASE_SETTINGS).phase,
    "hittable",
  );
  assert.equal(
    getPromptTiming(prompt, 650, {
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
  const finalEffect = atEnd.effects.at(-1);
  assert.equal(atEnd.session.phase, "finished");
  assert.equal(atEnd.session.finishedAtMs, 35_000);
  assert.equal(finalEffect?.type, "finished");
  if (finalEffect?.type === "finished") {
    assert.equal(finalEffect.results.durationMs, 30_000);
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

test("separates shortcuts needing review from shortcuts mastered every time", () => {
  const knownShortcut = EASY_SHORTCUTS[0];
  const missedShortcut = EASY_SHORTCUTS[1];
  const masteredShortcut = EASY_SHORTCUTS[2];
  const attempts: PromptAttempt[] = [
    {
      promptId: `${knownShortcut.id}:0`,
      shortcut: knownShortcut,
      outcome: "clean",
      responseMs: 900,
      timingOffsetMs: 0,
      judgement: "perfect",
      wrongInputs: 0,
      points: 200,
      requeued: false,
    },
    {
      promptId: `${knownShortcut.id}:1`,
      shortcut: knownShortcut,
      outcome: "recovered",
      responseMs: 950,
      timingOffsetMs: 0,
      judgement: "perfect",
      wrongInputs: 1,
      points: 100,
      requeued: false,
    },
    {
      promptId: `${missedShortcut.id}:2`,
      shortcut: missedShortcut,
      outcome: "miss",
      responseMs: 1_300,
      timingOffsetMs: 300,
      judgement: "miss",
      wrongInputs: 0,
      points: 0,
      requeued: false,
    },
    {
      promptId: `${masteredShortcut.id}:3`,
      shortcut: masteredShortcut,
      outcome: "clean",
      responseMs: 900,
      timingOffsetMs: 0,
      judgement: "perfect",
      wrongInputs: 0,
      points: 200,
      requeued: false,
    },
  ];

  const results = calculateResults(attempts, 500, 1, 0, 30_000);

  assert.equal(results.correctAnswers, 2);
  assert.equal(results.misses, 2);
  assert.equal(results.recoveredHits, 1);
  assert.equal(results.accuracyPct, 50);
  assert.equal(results.correctShortcuts.length, 1);
  assert.equal(results.correctShortcuts[0].shortcut.id, masteredShortcut.id);
  assert.equal(results.correctShortcuts[0].correct, 1);
  assert.equal(results.correctShortcuts[0].attempts, 1);
  assert.equal(results.correctShortcuts[0].perfectHits, 1);
  assert.equal(results.correctShortcuts[0].accuracyPct, 100);
  assert.equal(results.practice.length, 2);
  assert.equal(
    results.practice.find((item) => item.shortcut.id === knownShortcut.id)?.misses,
    1,
  );
  const progress = recordLesson(EMPTY_CURRICULUM, [...attempts, { ...attempts[0], promptId: "later-clean" }]);
  assert.equal(progress.shortcuts[knownShortcut.id].needsReview, true);
  assert.equal(progress.shortcuts[masteredShortcut.id].needsReview, false);
  const lesson = selectLesson(getShortcutDeck("hard"), progress);
  assert.equal(lesson.length, 10);
  assert.deepEqual(new Set(lesson.slice(0, 2).map((item) => item.id)), new Set([knownShortcut.id, missedShortcut.id]));
  assert.ok(lesson.slice(2).every((item) => !progress.shortcuts[item.id]));
  const reviewed = recordLesson(progress, [attempts[0]]);
  assert.equal(reviewed.shortcuts[knownShortcut.id].needsReview, false);
});

test("supports every difficulty/hint pairing without changing input pools or leaking hidden keys", () => {
  const scoreKeys = new Set<string>();
  for (const mode of ["easy", "medium", "hard"] as const) {
    for (const hints of ["always", "near-line", "off"] as const) {
      const launch = parseLaunchSettings(new URLSearchParams({ difficulty: mode, hints }));
      assert.equal(launch.difficulty, mode);
      assert.equal(launch.hints, hints);
      assert.equal(parseLaunchSettings(new URL(createPlayHref(launch), "https://example.test").searchParams).hints, hints);
      const settings = { ...BASE_SETTINGS, mode, hints };
      const session = startSession(createGameSession(settings), 0);
      assert.ok(session.active);
      assert.deepEqual(session.deck, getShortcutDeck(mode));
      scoreKeys.add(getHighScoreKey(settings));
      const opacity = [900, 700, 600, 500, 0].map((time) => getShortcutHintOpacity(settings, time));
      assert.deepEqual(opacity, hints === "always" ? [1, 1, 1, 1, 1] : hints === "off" ? [0, 0, 0, 0, 0] : [0, 0, 0.5, 1, 1]);
      assert.equal(hintKeysFor(session, session.active.strikeAtMs - 900).length > 0, hints === "always");
      assert.equal(hintKeysFor(session, session.active.strikeAtMs - 500).length > 0, hints !== "off");
    }
  }
  assert.equal(scoreKeys.size, 9);
  assert.notEqual(getHighScoreKey(BASE_SETTINGS), getHighScoreKey({ ...BASE_SETTINGS, platform: "windows" }));
  assert.notEqual(getHighScoreKey(BASE_SETTINGS), getHighScoreKey({ ...BASE_SETTINGS, speed: "turbo" }));
  assert.notEqual(getHighScoreKey(BASE_SETTINGS), getHighScoreKey({ ...BASE_SETTINGS, durationSeconds: 60 }));
  assert.equal(parseLaunchSettings(new URLSearchParams("guidance=pro")).hints, "off");
});

function key(code: string, shiftKey = false): GameKeyEvent {
  return { code, shiftKey, metaKey: false, ctrlKey: false, altKey: false };
}

test("lets a sequence start early but scores only its final key at the line", () => {
  const sequence = MEDIUM_SHORTCUTS[0];
  assert.equal(sequence.input.kind, "sequence");
  if (sequence.input.kind !== "sequence") return;
  for (const speed of ["relaxed", "standard", "turbo"] as const) {
    const settings = { ...BASE_SETTINGS, mode: "medium" as const, speed };
    const started = startSession(createGameSession(settings, { deck: [sequence], maxRequeues: 0 }), 0);
    const strike = started.active!.strikeAtMs;
    const first = handleSessionKey(started, key(sequence.input.codes[0]), strike - 650);
    assert.equal(first.session.input.sequenceIndex, 1);
    assert.equal(first.session.attempts.length, 0);
    assert.equal(first.session.active!.wrongInputs, 0);
    const finish = handleSessionKey(first.session, key(sequence.input.codes[1]), strike);
    assert.equal(finish.session.attempts[0].outcome, "clean");
    assert.equal(finish.session.attempts[0].judgement, "perfect");
    const tooEarly = handleSessionKey(first.session, key(sequence.input.codes[1]), strike - 600);
    assert.equal(tooEarly.session.attempts.length, 0);
    assert.equal(tooEarly.effects[0].type, "timing-input");

    const missed = tickSession(started, started.active!.deadlineAtMs + 1);
    const nextStrike = missed.session.active!.strikeAtMs;
    assert.ok(nextStrike - 650 > started.active!.deadlineAtMs);
    const retryFirst = handleSessionKey(missed.session, key(sequence.input.codes[0]), nextStrike - 650);
    const retryFinish = handleSessionKey(retryFirst.session, key(sequence.input.codes[1]), nextStrike);
    assert.equal(retryFinish.session.attempts[1].outcome, "clean");
  }
});

test("mixing hard inputs requires releasing Shift for single keys", () => {
  const started = startSession(createGameSession({ ...BASE_SETTINGS, mode: "hard" }, { deck: [EASY_SHORTCUTS[0], HARD_SHORTCUTS[0]] }), 0);
  const result = handleSessionKey(started, key("KeyC", true), started.active!.strikeAtMs);
  assert.equal(result.effects[0].type, "wrong-input");
  assert.equal(result.session.attempts.length, 0);
});

test("rotates completed lesson commands behind unseen commands and then least-recently practised ones", () => {
  const catalog = getShortcutDeck("easy");
  const firstLesson = selectLesson(catalog, EMPTY_CURRICULUM);
  const progress = {
    completedLessons: 1,
    shortcuts: Object.fromEntries(firstLesson.map((item) => [item.id, { lastPractised: 1, needsReview: false }])),
  };
  const next = selectLesson(catalog, progress);
  const unseen = catalog.filter((item) => !progress.shortcuts[item.id]);
  assert.deepEqual(next.slice(0, unseen.length), unseen);
  const allSeen = {
    completedLessons: 3,
    shortcuts: Object.fromEntries(catalog.map((item, index) => [item.id, { lastPractised: index === 0 ? 1 : 3, needsReview: false }])),
  };
  assert.equal(selectLesson(catalog, allSeen)[0].id, catalog[0].id);
});
