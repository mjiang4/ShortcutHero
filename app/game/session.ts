import { getShortcutDeck } from "./content";
import {
  EMPTY_INPUT_STATE,
  getCapturedCodes,
  matchShortcutInput,
  shouldCaptureGameKey,
} from "./input";
import { calculateResults, getComboTier, scoreHit } from "./scoring";
import type {
  ActivePrompt,
  ComboTier,
  GameEffect,
  GameKeyEvent,
  GameResults,
  GameSession,
  GameSettings,
  KeySessionUpdate,
  PromptAttempt,
  QueuedPrompt,
  SessionUpdate,
  ShortcutDefinition,
  SpeedPreset,
} from "./types";

export const APPROACH_DURATION_MS: Readonly<Record<SpeedPreset, number>> = {
  relaxed: 4_500,
  standard: 3_200,
  turbo: 2_200,
};

export interface CreateSessionOptions {
  readonly deck?: readonly ShortcutDefinition[];
  readonly maxRequeues?: number;
}

function queueDeck(
  deck: readonly ShortcutDefinition[],
  startingSerial = 0,
): readonly QueuedPrompt[] {
  return deck.map((shortcut, index) => ({
    promptId: `${shortcut.id}:${startingSerial + index}`,
    shortcut,
    requeueCount: 0,
  }));
}

function activatePrompt(
  prompt: QueuedPrompt,
  nowMs: number,
  durationMs: number,
): ActivePrompt {
  return {
    ...prompt,
    approachedAtMs: nowMs,
    deadlineAtMs: nowMs + durationMs,
    wrongInputs: 0,
  };
}

export function createGameSession(
  settings: GameSettings,
  options: CreateSessionOptions = {},
): GameSession {
  const deck = options.deck ?? getShortcutDeck(settings.mode);
  const queue = queueDeck(deck);

  return {
    phase: "ready",
    settings,
    active: null,
    queue,
    attempts: [],
    input: EMPTY_INPUT_STATE,
    capturedCodes: getCapturedCodes(deck),
    score: 0,
    combo: 0,
    longestCombo: 0,
    maxRequeues: Math.max(0, Math.floor(options.maxRequeues ?? 1)),
    nextPromptSerial: queue.length,
    startedAtMs: null,
    pausedAtMs: null,
    finishedAtMs: null,
  };
}

export function startSession(session: GameSession, nowMs: number): GameSession {
  if (session.phase !== "ready") return session;

  const [first, ...rest] = session.queue;
  if (!first) {
    return {
      ...session,
      phase: "finished",
      startedAtMs: nowMs,
      finishedAtMs: nowMs,
    };
  }

  return {
    ...session,
    phase: "playing",
    active: activatePrompt(
      first,
      nowMs,
      APPROACH_DURATION_MS[session.settings.speed],
    ),
    queue: rest,
    startedAtMs: nowMs,
  };
}

export function pauseSession(session: GameSession, nowMs: number): GameSession {
  if (session.phase !== "playing") return session;
  return {
    ...session,
    phase: "paused",
    pausedAtMs: nowMs,
    input: EMPTY_INPUT_STATE,
  };
}

export function resumeSession(session: GameSession, nowMs: number): GameSession {
  if (session.phase !== "paused" || session.pausedAtMs === null) return session;

  const pausedForMs = Math.max(0, nowMs - session.pausedAtMs);
  const active = session.active
    ? {
        ...session.active,
        approachedAtMs: session.active.approachedAtMs + pausedForMs,
        deadlineAtMs: session.active.deadlineAtMs + pausedForMs,
      }
    : null;

  return {
    ...session,
    phase: "playing",
    active,
    pausedAtMs: null,
  };
}

function resultsFor(session: GameSession): GameResults {
  return calculateResults(
    session.attempts,
    session.score,
    session.longestCombo,
    session.startedAtMs,
    session.finishedAtMs,
  );
}

function advanceToNextPrompt(
  session: GameSession,
  nowMs: number,
): SessionUpdate {
  const [next, ...rest] = session.queue;
  if (next) {
    return {
      session: {
        ...session,
        active: activatePrompt(
          next,
          nowMs,
          APPROACH_DURATION_MS[session.settings.speed],
        ),
        queue: rest,
        input: EMPTY_INPUT_STATE,
      },
      effects: [],
    };
  }

  const finished: GameSession = {
    ...session,
    phase: "finished",
    active: null,
    input: EMPTY_INPUT_STATE,
    finishedAtMs: nowMs,
  };

  return {
    session: finished,
    effects: [{ type: "finished", results: resultsFor(finished) }],
  };
}

function tierUnlocked(
  previousCombo: number,
  nextCombo: number,
): Exclude<ComboTier, "base"> | null {
  const previousTier = getComboTier(previousCombo);
  const nextTier = getComboTier(nextCombo);
  return nextTier !== "base" && nextTier !== previousTier ? nextTier : null;
}

export function handleSessionKey(
  session: GameSession,
  event: GameKeyEvent,
  nowMs: number,
): KeySessionUpdate {
  if (session.phase !== "playing" || !session.active) {
    return { session, effects: [], preventDefault: false };
  }

  const preventDefault = shouldCaptureGameKey(event, session.capturedCodes);
  if (nowMs >= session.active.deadlineAtMs) {
    const timedOut = tickSession(session, nowMs);
    return { ...timedOut, preventDefault };
  }

  const match = matchShortcutInput(
    session.active.shortcut.input,
    session.input,
    event,
    nowMs,
  );

  if (match.status === "ignored") {
    return { session, effects: [], preventDefault };
  }

  if (match.status === "progress") {
    return {
      session: { ...session, input: match.state },
      effects: [
        {
          type: "input-progress",
          shortcut: session.active.shortcut,
          step: match.step,
          total: match.total,
        },
      ],
      preventDefault,
    };
  }

  if (match.status === "wrong") {
    return {
      session: {
        ...session,
        active: {
          ...session.active,
          wrongInputs: session.active.wrongInputs + 1,
        },
        input: match.state,
        combo: 0,
      },
      effects: [
        {
          type: "wrong-input",
          shortcut: session.active.shortcut,
          code: event.code,
        },
      ],
      preventDefault,
    };
  }

  const active = session.active;
  const recovered = active.wrongInputs > 0;
  const nextCombo = recovered ? 0 : session.combo + 1;
  const responseMs = Math.min(
    active.deadlineAtMs - active.approachedAtMs,
    Math.max(0, nowMs - active.approachedAtMs),
  );
  const points = scoreHit({
    responseMs,
    windowMs: active.deadlineAtMs - active.approachedAtMs,
    combo: nextCombo,
    recovered,
  });
  const attempt: PromptAttempt = {
    promptId: active.promptId,
    shortcut: active.shortcut,
    outcome: recovered ? "recovered" : "clean",
    responseMs,
    wrongInputs: active.wrongInputs,
    points,
    requeued: false,
  };
  const updated: GameSession = {
    ...session,
    attempts: [...session.attempts, attempt],
    score: session.score + points,
    combo: nextCombo,
    longestCombo: Math.max(session.longestCombo, nextCombo),
    input: EMPTY_INPUT_STATE,
  };
  const advanced = advanceToNextPrompt(updated, nowMs);
  const effects: GameEffect[] = [
    {
      type: "hit",
      shortcut: active.shortcut,
      outcome: recovered ? "recovered" : "clean",
      points,
      combo: nextCombo,
      tier: getComboTier(nextCombo),
    },
  ];
  const unlocked = tierUnlocked(session.combo, nextCombo);
  if (unlocked) {
    effects.push({ type: "combo-tier", combo: nextCombo, tier: unlocked });
  }
  effects.push(...advanced.effects);

  return { session: advanced.session, effects, preventDefault };
}

export function tickSession(session: GameSession, nowMs: number): SessionUpdate {
  if (
    session.phase !== "playing" ||
    !session.active ||
    nowMs < session.active.deadlineAtMs
  ) {
    return { session, effects: [] };
  }

  const active = session.active;
  const shouldRequeue = active.requeueCount < session.maxRequeues;
  const requeuedPrompt: QueuedPrompt | null = shouldRequeue
    ? {
        promptId: `${active.shortcut.id}:${session.nextPromptSerial}`,
        shortcut: active.shortcut,
        requeueCount: active.requeueCount + 1,
      }
    : null;
  const attempt: PromptAttempt = {
    promptId: active.promptId,
    shortcut: active.shortcut,
    outcome: "miss",
    responseMs: active.deadlineAtMs - active.approachedAtMs,
    wrongInputs: active.wrongInputs,
    points: 0,
    requeued: shouldRequeue,
  };
  const updated: GameSession = {
    ...session,
    attempts: [...session.attempts, attempt],
    queue: requeuedPrompt ? [...session.queue, requeuedPrompt] : session.queue,
    combo: 0,
    input: EMPTY_INPUT_STATE,
    nextPromptSerial: session.nextPromptSerial + (requeuedPrompt ? 1 : 0),
  };
  const advanced = advanceToNextPrompt(updated, nowMs);

  return {
    session: advanced.session,
    effects: [
      { type: "miss", shortcut: active.shortcut, requeued: shouldRequeue },
      ...advanced.effects,
    ],
  };
}

/** 0 is the horizon; 1 is the strike line. */
export function getApproachProgress(
  active: ActivePrompt | null,
  nowMs: number,
): number {
  if (!active) return 0;
  const duration = Math.max(1, active.deadlineAtMs - active.approachedAtMs);
  return Math.min(1, Math.max(0, (nowMs - active.approachedAtMs) / duration));
}

export function getVisibleShortcuts(
  session: GameSession,
  futureCount = 2,
): readonly ShortcutDefinition[] {
  const future = session.queue
    .slice(0, Math.max(0, futureCount))
    .map((prompt) => prompt.shortcut);
  return session.active ? [session.active.shortcut, ...future] : future;
}

export function getSessionResults(session: GameSession): GameResults {
  return resultsFor(session);
}

export function getHighScoreKey(settings: GameSettings): string {
  return `shortcut-hero:high-score:${settings.mode}:${settings.assistance}:${settings.speed}`;
}
