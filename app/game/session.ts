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
  HitJudgement,
  KeySessionUpdate,
  PromptAttempt,
  PromptTiming,
  QueuedPrompt,
  SessionUpdate,
  ShortcutDefinition,
  SpeedPreset,
  TimingWindow,
  VisiblePromptTiming,
} from "./types";

/** Travel time from the horizon to the strike line. */
export const APPROACH_DURATION_MS: Readonly<Record<SpeedPreset, number>> = {
  relaxed: 3_000,
  standard: 1_600,
  turbo: 1_200,
};

/** Musical spacing between prompts. Prompts overlap on the highway. */
export const PROMPT_CADENCE_MS: Readonly<Record<SpeedPreset, number>> = {
  relaxed: 1_500,
  standard: 800,
  turbo: 600,
};

export const TIMING_WINDOWS_MS: Readonly<
  Record<SpeedPreset, TimingWindow>
> = {
  relaxed: { earlyMs: 340, perfectMs: 110, goodMs: 220, lateMs: 320 },
  standard: { earlyMs: 260, perfectMs: 90, goodMs: 170, lateMs: 240 },
  turbo: { earlyMs: 190, perfectMs: 70, goodMs: 125, lateMs: 180 },
};

export interface CreateSessionOptions {
  readonly deck?: readonly ShortcutDefinition[];
  readonly maxRequeues?: number;
}

function queueDeck(
  deck: readonly ShortcutDefinition[],
  speed: SpeedPreset,
): readonly QueuedPrompt[] {
  const approachDurationMs = APPROACH_DURATION_MS[speed];
  const cadenceMs = PROMPT_CADENCE_MS[speed];
  const lateMs = TIMING_WINDOWS_MS[speed].lateMs;

  // These are relative positions until startSession shifts the full timeline.
  return deck.map((shortcut, index) => {
    const approachedAtMs = index * cadenceMs;
    const strikeAtMs = approachedAtMs + approachDurationMs;
    return {
      promptId: `${shortcut.id}:${index}`,
      shortcut,
      requeueCount: 0,
      approachedAtMs,
      strikeAtMs,
      deadlineAtMs: strikeAtMs + lateMs,
    };
  });
}

function shiftPromptTiming<T extends QueuedPrompt>(prompt: T, byMs: number): T {
  return {
    ...prompt,
    approachedAtMs: prompt.approachedAtMs + byMs,
    strikeAtMs: prompt.strikeAtMs + byMs,
    deadlineAtMs: prompt.deadlineAtMs + byMs,
  };
}

function activatePrompt(prompt: QueuedPrompt): ActivePrompt {
  return { ...prompt, wrongInputs: 0 };
}

export function createGameSession(
  settings: GameSettings,
  options: CreateSessionOptions = {},
): GameSession {
  const deck = options.deck ?? getShortcutDeck(settings.mode);
  const queue = queueDeck(deck, settings.speed);

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

  const scheduled = session.queue.map((prompt) =>
    shiftPromptTiming(prompt, nowMs),
  );
  const [first, ...rest] = scheduled;
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
    active: activatePrompt(first),
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
  return {
    ...session,
    phase: "playing",
    active: session.active
      ? shiftPromptTiming(session.active, pausedForMs)
      : null,
    queue: session.queue.map((prompt) =>
      shiftPromptTiming(prompt, pausedForMs),
    ),
    startedAtMs:
      session.startedAtMs === null
        ? null
        : session.startedAtMs + pausedForMs,
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
        active: activatePrompt(next),
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

export function getPromptProgress(
  prompt: Pick<QueuedPrompt, "approachedAtMs" | "strikeAtMs" | "deadlineAtMs">,
  nowMs: number,
): number {
  const travelMs = Math.max(1, prompt.strikeAtMs - prompt.approachedAtMs);
  const rawProgress = (nowMs - prompt.approachedAtMs) / travelMs;
  const lateLimit = 1 + (prompt.deadlineAtMs - prompt.strikeAtMs) / travelMs;
  return Math.min(lateLimit, Math.max(-0.15, rawProgress));
}

export function getPromptTiming(
  prompt: Pick<QueuedPrompt, "approachedAtMs" | "strikeAtMs" | "deadlineAtMs">,
  nowMs: number,
  speed: SpeedPreset,
): PromptTiming {
  const timingOffsetMs = nowMs - prompt.strikeAtMs;
  const hitWindowOpensAtMs =
    prompt.strikeAtMs - TIMING_WINDOWS_MS[speed].earlyMs;
  const phase =
    nowMs < hitWindowOpensAtMs
      ? "approaching"
      : nowMs <= prompt.deadlineAtMs
        ? "hittable"
        : "expired";

  return {
    phase,
    timingOffsetMs,
    timeToStrikeMs: -timingOffsetMs,
    hitWindowOpensAtMs,
    strikeAtMs: prompt.strikeAtMs,
    deadlineAtMs: prompt.deadlineAtMs,
    progress: getPromptProgress(prompt, nowMs),
    canHit: phase === "hittable",
  };
}

export function getHitJudgement(
  timingOffsetMs: number,
  speed: SpeedPreset,
): HitJudgement {
  const window = TIMING_WINDOWS_MS[speed];
  const distanceMs = Math.abs(timingOffsetMs);
  if (distanceMs <= window.perfectMs) return "perfect";
  if (distanceMs <= window.goodMs) return "good";
  return timingOffsetMs < 0 ? "early" : "late";
}

export function handleSessionKey(
  session: GameSession,
  event: GameKeyEvent,
  nowMs: number,
): KeySessionUpdate {
  if (session.phase !== "playing" || !session.active) {
    return { session, effects: [], preventDefault: false };
  }

  const active = session.active;
  const preventDefault = shouldCaptureGameKey(event, session.capturedCodes);
  const match = matchShortcutInput(
    active.shortcut.input,
    session.input,
    event,
    nowMs,
  );
  const timing = getPromptTiming(active, nowMs, session.settings.speed);

  if (timing.phase === "expired") {
    const timedOut = tickSession(session, nowMs);
    const effects: GameEffect[] = [];
    if (match.status !== "ignored") {
      effects.push({
        type: "timing-input",
        shortcut: active.shortcut,
        timing: "too-late",
        timingOffsetMs: timing.timingOffsetMs,
        code: event.code,
      });
    }
    effects.push(...timedOut.effects);
    return { session: timedOut.session, effects, preventDefault };
  }

  if (match.status === "ignored") {
    return { session, effects: [], preventDefault };
  }

  if (timing.phase === "approaching") {
    const canStageSequence =
      active.shortcut.input.kind === "sequence" &&
      match.status === "progress" &&
      timing.timeToStrikeMs <= active.shortcut.input.maxGapMs;
    if (canStageSequence) {
      return {
        session: { ...session, input: match.state },
        effects: [
          {
            type: "input-progress",
            shortcut: active.shortcut,
            step: match.step,
            total: match.total,
          },
        ],
        preventDefault,
      };
    }

    return {
      session: {
        ...session,
        active: { ...active, wrongInputs: active.wrongInputs + 1 },
        input: EMPTY_INPUT_STATE,
        combo: 0,
      },
      effects: [
        {
          type: "timing-input",
          shortcut: active.shortcut,
          timing: "too-early",
          timingOffsetMs: timing.timingOffsetMs,
          code: event.code,
        },
      ],
      preventDefault,
    };
  }

  if (match.status === "progress") {
    return {
      session: { ...session, input: match.state },
      effects: [
        {
          type: "input-progress",
          shortcut: active.shortcut,
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
        active: { ...active, wrongInputs: active.wrongInputs + 1 },
        input: match.state,
        combo: 0,
      },
      effects: [
        { type: "wrong-input", shortcut: active.shortcut, code: event.code },
      ],
      preventDefault,
    };
  }

  const recovered = active.wrongInputs > 0;
  const nextCombo = recovered ? 0 : session.combo + 1;
  const responseMs = Math.max(0, nowMs - active.approachedAtMs);
  const judgement = getHitJudgement(
    timing.timingOffsetMs,
    session.settings.speed,
  );
  const points = scoreHit({ judgement, combo: nextCombo, recovered });
  const attempt: PromptAttempt = {
    promptId: active.promptId,
    shortcut: active.shortcut,
    outcome: recovered ? "recovered" : "clean",
    responseMs,
    timingOffsetMs: timing.timingOffsetMs,
    judgement,
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
      judgement,
      timingOffsetMs: timing.timingOffsetMs,
    },
  ];
  const unlocked = tierUnlocked(session.combo, nextCombo);
  if (unlocked) {
    effects.push({ type: "combo-tier", combo: nextCombo, tier: unlocked });
  }
  effects.push(...advanced.effects);

  return { session: advanced.session, effects, preventDefault };
}

function requeuePrompt(
  session: GameSession,
  active: ActivePrompt,
): QueuedPrompt {
  const tail = session.queue[session.queue.length - 1] ?? active;
  const cadenceMs = PROMPT_CADENCE_MS[session.settings.speed];
  const approachMs = APPROACH_DURATION_MS[session.settings.speed];
  const lateMs = TIMING_WINDOWS_MS[session.settings.speed].lateMs;
  const approachedAtMs = Math.max(
    tail.approachedAtMs + cadenceMs,
    active.deadlineAtMs,
  );
  const strikeAtMs = approachedAtMs + approachMs;
  return {
    promptId: `${active.shortcut.id}:${session.nextPromptSerial}`,
    shortcut: active.shortcut,
    requeueCount: active.requeueCount + 1,
    approachedAtMs,
    strikeAtMs,
    deadlineAtMs: strikeAtMs + lateMs,
  };
}

export function tickSession(session: GameSession, nowMs: number): SessionUpdate {
  if (
    session.phase !== "playing" ||
    !session.active ||
    nowMs <= session.active.deadlineAtMs
  ) {
    return { session, effects: [] };
  }

  const active = session.active;
  const shouldRequeue = active.requeueCount < session.maxRequeues;
  const requeued = shouldRequeue ? requeuePrompt(session, active) : null;
  const attempt: PromptAttempt = {
    promptId: active.promptId,
    shortcut: active.shortcut,
    outcome: "miss",
    responseMs: active.deadlineAtMs - active.approachedAtMs,
    timingOffsetMs: active.deadlineAtMs - active.strikeAtMs,
    judgement: "miss",
    wrongInputs: active.wrongInputs,
    points: 0,
    requeued: shouldRequeue,
  };
  const updated: GameSession = {
    ...session,
    attempts: [...session.attempts, attempt],
    queue: requeued ? [...session.queue, requeued] : session.queue,
    combo: 0,
    input: EMPTY_INPUT_STATE,
    nextPromptSerial: session.nextPromptSerial + (requeued ? 1 : 0),
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

/** 0 is the horizon; 1 is the strike line; the late window extends past 1. */
export function getApproachProgress(
  active: ActivePrompt | null,
  nowMs: number,
): number {
  return active ? getPromptProgress(active, nowMs) : 0;
}

export function getVisiblePromptTimings(
  session: GameSession,
  nowMs: number,
  futureCount = 2,
): readonly VisiblePromptTiming[] {
  const prompts: readonly QueuedPrompt[] = session.active
    ? [session.active, ...session.queue.slice(0, Math.max(0, futureCount))]
    : session.queue.slice(0, Math.max(0, futureCount));

  return prompts.map((prompt, index) => ({
    promptId: prompt.promptId,
    shortcut: prompt.shortcut,
    state: index === 0 && session.active ? "active" : "upcoming",
    ...getPromptTiming(prompt, nowMs, session.settings.speed),
  }));
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
