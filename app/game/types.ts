export type Difficulty = "easy" | "medium" | "hard";

export type GameMode = Difficulty | "showcase";

export type AssistanceMode = "novice" | "pro";

export type SpeedPreset = "relaxed" | "standard" | "turbo";

export type SessionDurationSeconds = 30 | 45 | 60;

export type LetterCode = `Key${string}`;

export interface SingleShortcutInput {
  readonly kind: "single";
  readonly code: LetterCode;
  readonly display: string;
}

export interface SequenceShortcutInput {
  readonly kind: "sequence";
  readonly codes: readonly [LetterCode, LetterCode];
  readonly display: string;
  readonly maxGapMs: number;
}

export interface ChordShortcutInput {
  readonly kind: "chord";
  readonly code: LetterCode;
  readonly shift: true;
  readonly display: string;
}

export type ShortcutInput =
  | SingleShortcutInput
  | SequenceShortcutInput
  | ChordShortcutInput;

export interface ShortcutDefinition {
  readonly id: string;
  readonly action: string;
  readonly difficulty: Difficulty;
  readonly input: ShortcutInput;
  readonly context?: string;
}

export interface GameSettings {
  readonly mode: GameMode;
  readonly assistance: AssistanceMode;
  readonly speed: SpeedPreset;
  /** Defaults to 45 seconds when omitted for backwards compatibility. */
  readonly durationSeconds?: SessionDurationSeconds;
}

export interface GameKeyEvent {
  readonly code: string;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly repeat?: boolean;
  readonly isComposing?: boolean;
}

export interface InputMatcherState {
  readonly sequenceIndex: number;
  readonly lastInputAtMs: number | null;
}

export interface QueuedPrompt {
  readonly promptId: string;
  readonly shortcut: ShortcutDefinition;
  readonly requeueCount: number;
  /** Absolute timeline positions once a session has started. */
  readonly approachedAtMs: number;
  readonly strikeAtMs: number;
  readonly deadlineAtMs: number;
}

export interface ActivePrompt extends QueuedPrompt {
  readonly wrongInputs: number;
}

export type SessionPhase = "ready" | "playing" | "paused" | "finished";

export type AttemptOutcome = "clean" | "recovered" | "miss";

/** A successful collision's relationship to the prompt strike time. */
export type HitJudgement = "perfect" | "good" | "early" | "late";

export interface PromptAttempt {
  readonly promptId: string;
  readonly shortcut: ShortcutDefinition;
  readonly outcome: AttemptOutcome;
  readonly responseMs: number;
  readonly timingOffsetMs: number;
  readonly judgement: HitJudgement | "miss";
  readonly wrongInputs: number;
  readonly points: number;
  readonly requeued: boolean;
}

export type ComboTier = "base" | "trail" | "surge" | "flow";

export interface PracticeShortcut {
  readonly shortcut: ShortcutDefinition;
  readonly mistakes: number;
  readonly misses: number;
  readonly wrongInputs: number;
}

export interface GameResults {
  readonly score: number;
  readonly accuracyPct: number;
  readonly longestCombo: number;
  readonly attempts: number;
  readonly cleanHits: number;
  readonly recoveredHits: number;
  readonly misses: number;
  readonly correctAnswers: number;
  readonly uniqueShortcutsCorrect: number;
  readonly durationMs: number;
  readonly practice: readonly PracticeShortcut[];
}

export interface GameSession {
  readonly phase: SessionPhase;
  readonly settings: GameSettings;
  /** Source material used to continuously replenish the scheduled highway. */
  readonly deck: readonly ShortcutDefinition[];
  readonly nextDeckIndex: number;
  readonly active: ActivePrompt | null;
  readonly queue: readonly QueuedPrompt[];
  readonly attempts: readonly PromptAttempt[];
  readonly input: InputMatcherState;
  readonly capturedCodes: readonly string[];
  readonly score: number;
  readonly combo: number;
  readonly longestCombo: number;
  readonly maxRequeues: number;
  readonly nextPromptSerial: number;
  readonly startedAtMs: number | null;
  readonly pausedAtMs: number | null;
  readonly finishedAtMs: number | null;
}

export type GameEffect =
  | {
      readonly type: "input-progress";
      readonly shortcut: ShortcutDefinition;
      readonly step: number;
      readonly total: number;
    }
  | {
      readonly type: "wrong-input";
      readonly shortcut: ShortcutDefinition;
      readonly code: string;
    }
  | {
      readonly type: "hit";
      readonly shortcut: ShortcutDefinition;
      readonly outcome: "clean" | "recovered";
      readonly points: number;
      readonly combo: number;
      readonly tier: ComboTier;
      readonly judgement: HitJudgement;
      /** Negative is early; positive is late. */
      readonly timingOffsetMs: number;
    }
  | {
      readonly type: "timing-input";
      readonly shortcut: ShortcutDefinition;
      readonly timing: "too-early" | "too-late";
      /** Negative is early; positive is late. */
      readonly timingOffsetMs: number;
      readonly code: string;
    }
  | {
      readonly type: "combo-tier";
      readonly combo: number;
      readonly tier: Exclude<ComboTier, "base">;
    }
  | {
      readonly type: "miss";
      readonly shortcut: ShortcutDefinition;
      readonly requeued: boolean;
    }
  | {
      readonly type: "finished";
      readonly results: GameResults;
    };

export interface SessionUpdate {
  readonly session: GameSession;
  readonly effects: readonly GameEffect[];
}

export interface KeySessionUpdate extends SessionUpdate {
  readonly preventDefault: boolean;
}

export interface TimingWindow {
  readonly earlyMs: number;
  readonly perfectMs: number;
  readonly goodMs: number;
  readonly lateMs: number;
}

export type PromptTimingPhase = "approaching" | "hittable" | "expired";

export interface PromptTiming {
  readonly phase: PromptTimingPhase;
  /** Negative is early; positive is late. */
  readonly timingOffsetMs: number;
  readonly timeToStrikeMs: number;
  readonly hitWindowOpensAtMs: number;
  readonly strikeAtMs: number;
  readonly deadlineAtMs: number;
  readonly progress: number;
  readonly canHit: boolean;
}

export interface VisiblePromptTiming extends PromptTiming {
  readonly promptId: string;
  readonly shortcut: ShortcutDefinition;
  readonly state: "active" | "upcoming";
}
