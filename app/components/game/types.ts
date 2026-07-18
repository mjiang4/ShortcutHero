import type { CSSProperties } from "react";

/**
 * Visual lifecycle for a prompt. Timing and scoring remain owned by the game.
 * `hit` / `miss` are retained as aliases for older callers; new callers should
 * prefer `cleared` / `missed` and keep the cue mounted while it exits.
 */
export type SceneCueState =
  | "upcoming"
  | "active"
  | "cleared"
  | "missed"
  | "exiting"
  | "hit"
  | "miss";

export interface SceneCue {
  id: string;
  /** Human-readable Linear action, e.g. "Go to Inbox". */
  action: string;
  /** Display-ready shortcut, e.g. "G  →  I". */
  shortcut?: string;
  /** Normalized KeyboardEvent codes or labels used by the keyboard deck. */
  keys?: readonly string[];
  /**
   * 0 at the horizon and 1 at the strike line. Keep resolved cues mounted and
   * advance them beyond 1 (roughly 1.25-1.4) for a continuous through-the-gate
   * exit instead of replacing them at the strike line.
   */
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
  /** Optional cue association for callers retaining several resolved cues. */
  cueId?: SceneCue["id"];
  /** 0..1; defaults to an appropriate strength for the event type. */
  strength?: number;
}

export interface GameSceneProps {
  cues: readonly SceneCue[];
  /** Shows cue shortcut labels. Set false for Pro mode. */
  showShortcuts?: boolean;
  combo?: number;
  /** 0..1 progression through the current run; drives the environmental act. */
  runProgress?: number;
  feedback?: SceneFeedback | null;
  paused?: boolean;
  reducedMotion?: boolean;
  /** Disable post-processing on constrained devices or in tests. */
  bloom?: boolean;
  /** Fires when the WebGL canvas has been created and can begin the count-in. */
  onReady?: () => void;
  className?: string;
  style?: CSSProperties;
}
