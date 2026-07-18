import type { CSSProperties } from "react";

/** Visual lifecycle for a prompt. Timing and scoring remain owned by the game. */
export type SceneCueState = "upcoming" | "active" | "hit" | "miss";

export interface SceneCue {
  id: string;
  /** Human-readable Linear action, e.g. "Go to Inbox". */
  action: string;
  /** Display-ready shortcut, e.g. "G  →  I". */
  shortcut?: string;
  /** Normalized KeyboardEvent codes or labels used by the keyboard deck. */
  keys?: readonly string[];
  /** 0 at the horizon, 1 at the strike line. Values just over 1 are supported. */
  progress: number;
  state?: SceneCueState;
  /** Small optional context label, e.g. "Issue selected". */
  context?: string;
  /** Optional horizontal offset for future prompts. Keep the active cue near 0. */
  laneOffset?: number;
}

export type SceneFeedbackType = "hit" | "recovered" | "miss" | "combo";

/**
 * Give each feedback event a new id. The scene uses it to replay one-shot
 * particles, light, and camera feedback without owning game state.
 */
export interface SceneFeedback {
  id: string | number;
  type: SceneFeedbackType;
  /** 0..1; defaults to an appropriate strength for the event type. */
  strength?: number;
}

export interface GameSceneProps {
  cues: readonly SceneCue[];
  /** Keys physically held or just pressed by the player. */
  pressedKeys?: readonly string[];
  /** Keys to softly illuminate in Novice mode. */
  hintKeys?: readonly string[];
  /** Shows cue shortcut labels. Set false for Pro mode. */
  showShortcuts?: boolean;
  combo?: number;
  feedback?: SceneFeedback | null;
  paused?: boolean;
  reducedMotion?: boolean;
  /** Disable post-processing on constrained devices or in tests. */
  bloom?: boolean;
  className?: string;
  style?: CSSProperties;
}
