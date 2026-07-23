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
  GameMode,
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

/** Travel time from the horizon to the strike line — kept deliberately slow to read. */
export const APPROACH_DURATION_MS: Readonly<Record<SpeedPreset, number>> = {
  relaxed: 4_400,
  standard: 3_600,
  turbo: 2_800,
};

/**
 * Backwards-compatible showcase cadence. New scheduling should use
 * getPromptCadenceMs so prompt density can vary independently by difficulty.
 */
export const PROMPT_CADENCE_MS: Readonly<Record<SpeedPreset, number>> = {
  relaxed: 3_800,
  standard: 3_200,
  turbo: 2_600,
};

/** Musical spacing between prompts. Prompts can overlap on the highway. */
export const PROMPT_CADENCE_BY_MODE_MS: Readonly<
  Record<GameMode, Readonly<Record<SpeedPreset, number>>>
> = {
  easy: { relaxed: 4_600, standard: 3_900, turbo: 3_200 },
  medium: { relaxed: 5_000, standard: 4_200, turbo: 3_500 },
  hard: { relaxed: 4_600, standard: 3_900, turbo: 3_200 },
  showcase: PROMPT_CADENCE_MS,
};

export function getPromptCadenceMs(
  mode: GameMode,
  speed: SpeedPreset,
): number {
  return PROMPT_CADENCE_BY_MODE_MS[mode][speed];
}

/**
 * Progressive tempo: starts at 1.0 (base pace) and gently ramps toward 1.18.
 * Higher factor = shorter approach / tighter cadence (cards arrive faster).
 */
export function getTempoFactor(
  settings: GameSettings,
  startedAtMs: number | null,
  nowMs: number,
): number {
  if (startedAtMs === null) return 1;
  const durationMs = getSessionDurationSeconds(settings) * 1_000;
  const elapsed = Math.max(0, Math.min(durationMs, nowMs - startedAtMs));
  const t = durationMs <= 0 ? 0 : elapsed / durationMs;
  // Ease-in ramp so early notes stay readable.
  const eased = t * t;
  return 1 + eased * 0.18;
}

/**
 * Progressive recall: shortcut labels fade from fully shown → ghosted → hidden
 * as the run progresses (unless pro mode already hides them).
 */
export function getShortcutReveal(
  settings: GameSettings,
  startedAtMs: number | null,
  nowMs: number,
): "full" | "ghost" | "hidden" {
  if (settings.assistance === "pro") return "hidden";
  if (startedAtMs === null) return "full";
  const durationMs = getSessionDurationSeconds(settings) * 1_000;
  const t = durationMs <= 0 ? 0 : (nowMs - startedAtMs) / durationMs;
  if (t < 0.35) return "full";
  if (t < 0.7) return "ghost";
  return "hidden";
}

function approachMsFor(
  settings: GameSettings,
  startedAtMs: number | null,
  nowMs: number,
): number {
  return Math.round(
    APPROACH_DURATION_MS[settings.speed] /
      getTempoFactor(settings, startedAtMs, nowMs),
  );
}

function cadenceMsFor(
  settings: GameSettings,
  startedAtMs: number | null,
  nowMs: number,
): number {
  return Math.round(
    getPromptCadenceMs(settings.mode, settings.speed) /
      getTempoFactor(settings, startedAtMs, nowMs),
  );
}

export const TIMING_WINDOWS_MS: Readonly<
  Record<SpeedPreset, TimingWindow>
> = {
  relaxed: { earlyMs: 340, perfectMs: 110, goodMs: 220, lateMs: 320 },
  standard: { earlyMs: 260, perfectMs: 90, goodMs: 170, lateMs: 240 },
  turbo: { earlyMs: 190, perfectMs: 70, goodMs: 125, lateMs: 180 },
};

/** Extra forgiveness for the single-key learning deck. */
export const EASY_TIMING_WINDOWS_MS: Readonly<
  Record<SpeedPreset, TimingWindow>
> = {
  relaxed: { earlyMs: 400, perfectMs: 140, goodMs: 260, lateMs: 400 },
  standard: { earlyMs: 340, perfectMs: 120, goodMs: 220, lateMs: 340 },
  turbo: { earlyMs: 280, perfectMs: 100, goodMs: 190, lateMs: 280 },
};

export const DEFAULT_SESSION_DURATION_SECONDS = 45;
const QUEUE_LOOKAHEAD_PROMPTS = 8;

type TimingContext = SpeedPreset | Pick<GameSettings, "mode" | "speed">;

function timingWindowFor(context: TimingContext): TimingWindow {
  if (typeof context === "string") return TIMING_WINDOWS_MS[context];
  return context.mode === "easy"
    ? EASY_TIMING_WINDOWS_MS[context.speed]
    : TIMING_WINDOWS_MS[context.speed];
}

export function getSessionDurationSeconds(settings: GameSettings): number {
  return settings.durationSeconds ?? DEFAULT_SESSION_DURATION_SECONDS;
}

export interface CreateSessionOptions {
  readonly deck?: readonly ShortcutDefinition[];
  readonly maxRequeues?: number;
}

interface QueuedDeck {
  readonly queue: readonly QueuedPrompt[];
  readonly nextDeckIndex: number;
  readonly nextPromptSerial: number;
}

function queueDeck(
  deck: readonly ShortcutDefinition[],
  settings: GameSettings,
): QueuedDeck {
  if (deck.length === 0) {
    return { queue: [], nextDeckIndex: 0, nextPromptSerial: 0 };
  }

  // Queue at base tempo; live replenish applies progressive ramp after start.
  const approachDurationMs = APPROACH_DURATION_MS[settings.speed];
  const cadenceMs = getPromptCadenceMs(settings.mode, settings.speed);
  const lateMs = timingWindowFor(settings).lateMs;
  const durationMs = getSessionDurationSeconds(settings) * 1_000;
  const queue: QueuedPrompt[] = [];

  // These are relative positions until startSession shifts the full timeline.
  for (let index = 0; index < QUEUE_LOOKAHEAD_PROMPTS; index += 1) {
    const shortcut = deck[index % deck.length];
    const approachedAtMs = index * cadenceMs;
    const strikeAtMs = approachedAtMs + approachDurationMs;
    const deadlineAtMs = strikeAtMs + lateMs;
    if (deadlineAtMs > durationMs) break;
    queue.push({
      promptId: `${shortcut.id}:${index}`,
      shortcut,
      requeueCount: 0,
      approachedAtMs,
      strikeAtMs,
      deadlineAtMs,
    });
  }

  return {
    queue,
    nextDeckIndex: queue.length % deck.length,
    nextPromptSerial: queue.length,
  };
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
  const deck = options.deck ?? getShortcutDeck(settings.mode, settings.trackId);
  const queuedDeck = queueDeck(deck, settings);

  return {
    phase: "ready",
    settings,
    deck,
    nextDeckIndex: queuedDeck.nextDeckIndex,
    active: null,
    queue: queuedDeck.queue,
    attempts: [],
    input: EMPTY_INPUT_STATE,
    capturedCodes: getCapturedCodes(deck),
    score: 0,
    combo: 0,
    longestCombo: 0,
    maxRequeues: Math.max(0, Math.floor(options.maxRequeues ?? 1)),
    nextPromptSerial: queuedDeck.nextPromptSerial,
    startedAtMs: null,
    pausedAtMs: null,
    finishedAtMs: null,
  };
}

function getSessionEndsAtMs(session: GameSession): number | null {
  if (session.startedAtMs === null) return null;
  return (
    session.startedAtMs + getSessionDurationSeconds(session.settings) * 1_000
  );
}

function replenishQueue(session: GameSession, nowMs: number): GameSession {
  if (session.deck.length === 0 || session.queue.length >= QUEUE_LOOKAHEAD_PROMPTS) {
    return session;
  }

  const endAtMs = getSessionEndsAtMs(session);
  const timelineEndMs =
    endAtMs ?? getSessionDurationSeconds(session.settings) * 1_000;
  const cadenceMs = cadenceMsFor(
    session.settings,
    session.startedAtMs,
    nowMs,
  );
  const approachMs = approachMsFor(
    session.settings,
    session.startedAtMs,
    nowMs,
  );
  const lateMs = timingWindowFor(session.settings).lateMs;
  const queue = [...session.queue];
  let nextDeckIndex = session.nextDeckIndex;
  let nextPromptSerial = session.nextPromptSerial;

  while (queue.length < QUEUE_LOOKAHEAD_PROMPTS) {
    const tail = queue[queue.length - 1] ?? session.active;
    const approachedAtMs = tail
      ? tail.approachedAtMs + cadenceMs
      : session.startedAtMs ?? 0;
    const strikeAtMs = approachedAtMs + approachMs;
    const deadlineAtMs = strikeAtMs + lateMs;
    if (deadlineAtMs > timelineEndMs) break;

    const shortcut = session.deck[nextDeckIndex];
    queue.push({
      promptId: `${shortcut.id}:${nextPromptSerial}`,
      shortcut,
      requeueCount: 0,
      approachedAtMs,
      strikeAtMs,
      deadlineAtMs,
    });
    nextDeckIndex = (nextDeckIndex + 1) % session.deck.length;
    nextPromptSerial += 1;
  }

  if (queue.length === session.queue.length) return session;
  return { ...session, queue, nextDeckIndex, nextPromptSerial };
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
    const advanced = replenishQueue({
      ...session,
      active: activatePrompt(next),
      queue: rest,
      input: EMPTY_INPUT_STATE,
    }, nowMs);
    return {
      session: advanced,
      effects: [],
    };
  }

  // The last fully hittable prompt can resolve just before the session clock.
  // Keep the session alive until that clock expires rather than shortening it.
  const waiting: GameSession = {
    ...session,
    active: null,
    input: EMPTY_INPUT_STATE,
  };

  const endsAtMs = getSessionEndsAtMs(waiting);
  if (endsAtMs !== null && nowMs < endsAtMs) {
    return { session: waiting, effects: [] };
  }

  return finishSession(waiting, endsAtMs ?? nowMs);
}

function finishSession(session: GameSession, finishedAtMs: number): SessionUpdate {
  const finished: GameSession = {
    ...session,
    phase: "finished",
    active: null,
    input: EMPTY_INPUT_STATE,
    finishedAtMs,
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
  context: TimingContext,
): PromptTiming {
  const timingOffsetMs = nowMs - prompt.strikeAtMs;
  const hitWindowOpensAtMs = prompt.strikeAtMs - timingWindowFor(context).earlyMs;
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
  context: TimingContext,
): HitJudgement {
  const window = timingWindowFor(context);
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
  if (session.phase !== "playing") {
    return { session, effects: [], preventDefault: false };
  }

  const endsAtMs = getSessionEndsAtMs(session);
  if (endsAtMs !== null && nowMs >= endsAtMs) {
    const finished = finishSession(session, endsAtMs);
    return { ...finished, preventDefault: false };
  }

  if (!session.active) {
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
  const timing = getPromptTiming(active, nowMs, session.settings);

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

    const brokeStreak = session.combo > 0;
    const effects: GameEffect[] = [
      {
        type: "timing-input",
        shortcut: active.shortcut,
        timing: "too-early",
        timingOffsetMs: timing.timingOffsetMs,
        code: event.code,
      },
    ];
    if (brokeStreak) {
      effects.push({ type: "streak-break", previousCombo: session.combo });
    }
    return {
      session: {
        ...session,
        active: { ...active, wrongInputs: active.wrongInputs + 1 },
        input: EMPTY_INPUT_STATE,
        combo: 0,
      },
      effects,
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
    const brokeStreak = session.combo > 0;
    const effects: GameEffect[] = [
      { type: "wrong-input", shortcut: active.shortcut, code: event.code },
    ];
    if (brokeStreak) {
      effects.push({ type: "streak-break", previousCombo: session.combo });
    }
    return {
      session: {
        ...session,
        active: { ...active, wrongInputs: active.wrongInputs + 1 },
        input: match.state,
        combo: 0,
      },
      effects,
      preventDefault,
    };
  }

  const recovered = active.wrongInputs > 0;
  const nextCombo = recovered ? 0 : session.combo + 1;
  const responseMs = Math.max(0, nowMs - active.approachedAtMs);
  const judgement = getHitJudgement(
    timing.timingOffsetMs,
    session.settings,
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
): QueuedPrompt | null {
  const tail = session.queue[session.queue.length - 1] ?? active;
  const cadenceMs = cadenceMsFor(
    session.settings,
    session.startedAtMs,
    active.deadlineAtMs,
  );
  const approachMs = approachMsFor(
    session.settings,
    session.startedAtMs,
    active.deadlineAtMs,
  );
  const lateMs = timingWindowFor(session.settings).lateMs;
  const approachedAtMs = Math.max(
    tail.approachedAtMs + cadenceMs,
    active.deadlineAtMs,
  );
  const strikeAtMs = approachedAtMs + approachMs;
  const deadlineAtMs = strikeAtMs + lateMs;
  const endsAtMs = getSessionEndsAtMs(session);
  if (endsAtMs !== null && deadlineAtMs > endsAtMs) return null;
  return {
    promptId: `${active.shortcut.id}:${session.nextPromptSerial}`,
    shortcut: active.shortcut,
    requeueCount: active.requeueCount + 1,
    approachedAtMs,
    strikeAtMs,
    deadlineAtMs,
  };
}

export function tickSession(session: GameSession, nowMs: number): SessionUpdate {
  if (session.phase !== "playing") {
    return { session, effects: [] };
  }

  const endsAtMs = getSessionEndsAtMs(session);
  if (endsAtMs !== null && nowMs >= endsAtMs) {
    return finishSession(session, endsAtMs);
  }

  if (
    !session.active ||
    nowMs <= session.active.deadlineAtMs
  ) {
    return { session, effects: [] };
  }

  const active = session.active;
  const requeued =
    active.requeueCount < session.maxRequeues
      ? requeuePrompt(session, active)
      : null;
  const shouldRequeue = requeued !== null;
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
  const brokeStreak = session.combo > 0;
  const previousCombo = session.combo;
  const updated: GameSession = {
    ...session,
    attempts: [...session.attempts, attempt],
    queue: requeued ? [...session.queue, requeued] : session.queue,
    combo: 0,
    input: EMPTY_INPUT_STATE,
    nextPromptSerial: session.nextPromptSerial + (shouldRequeue ? 1 : 0),
  };
  const advanced = advanceToNextPrompt(updated, nowMs);
  const effects: GameEffect[] = [
    {
      type: "miss",
      shortcut: active.shortcut,
      requeued: shouldRequeue,
      brokeStreak,
      previousCombo,
    },
  ];
  if (brokeStreak) {
    effects.push({ type: "streak-break", previousCombo });
  }
  effects.push(...advanced.effects);

  return {
    session: advanced.session,
    effects,
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
  futureCount = 4,
): readonly VisiblePromptTiming[] {
  const prompts: readonly QueuedPrompt[] = session.active
    ? [session.active, ...session.queue.slice(0, Math.max(0, futureCount))]
    : session.queue.slice(0, Math.max(0, futureCount));

  return prompts.map((prompt, index) => ({
    promptId: prompt.promptId,
    shortcut: prompt.shortcut,
    state: index === 0 && session.active ? "active" : "upcoming",
    ...getPromptTiming(prompt, nowMs, session.settings),
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
  return `shortcut-hero:high-score:${settings.trackId ?? "linear"}:${settings.mode}:${settings.assistance}:${settings.speed}:${getSessionDurationSeconds(settings)}s`;
}
