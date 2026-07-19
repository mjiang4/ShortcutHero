import type { KeyboardFeedbackTone, SceneFeedback } from "../components/game";
import type { ActivePrompt, GameSession, HitJudgement } from "../game";

export type ViewPhase = "countdown" | "game" | "results";

export type JudgementTone = HitJudgement | "miss" | "wait" | "sequence";

export type Judgement = {
  readonly id: number;
  readonly label: string;
  readonly tone: JudgementTone;
};

export type DepartingCue = {
  readonly prompt: ActivePrompt;
  readonly state: "cleared" | "missed";
  readonly resolvedAtMs: number;
  readonly startProgress: number;
};

export type KeyboardSignal = {
  readonly id: number;
  readonly keys: readonly string[];
  readonly tone: KeyboardFeedbackTone;
  readonly status: string;
};

export type ProcessGameEffects = (
  effects: readonly import("../game").GameEffect[],
  sourceSession: GameSession,
  resolvedPrompt: ActivePrompt | null,
  nowMs: number,
) => void;

export type GameplayFeedbackState = {
  readonly feedback: SceneFeedback | null;
  readonly judgement: Judgement | null;
  readonly departingCues: readonly DepartingCue[];
  readonly keyboardSignal: KeyboardSignal | null;
};
