import type { SceneCue } from "../components/game";
import {
  APPROACH_DURATION_MS,
  getSessionDurationSeconds,
  getVisiblePromptTimings,
  type GameSession,
  type GameSettings,
  type ShortcutDefinition,
} from "../game";
import { DEPARTURE_DURATION_MS } from "./constants";
import type { DepartingCue } from "./types";

export function shortcutKeys(
  shortcut: ShortcutDefinition,
): readonly string[] {
  const { input } = shortcut;
  if (input.kind === "single") return [input.code];
  if (input.kind === "sequence") return input.codes;
  return ["SHIFT", input.code];
}

export function hintKeysFor(session: GameSession | null): readonly string[] {
  if (!session?.active || session.settings.assistance !== "novice") return [];
  const { input } = session.active.shortcut;
  if (input.kind === "sequence") {
    return [input.codes[Math.min(session.input.sequenceIndex, 1)]];
  }
  return shortcutKeys(session.active.shortcut);
}

export function buildSceneCues(
  session: GameSession | null,
  frameNow: number,
  departingCues: readonly DepartingCue[],
  speed: GameSettings["speed"],
): readonly SceneCue[] {
  const visiblePromptTimings = session
    ? getVisiblePromptTimings(session, frameNow, 5)
    : [];
  const live = visiblePromptTimings
    .filter((timing) => timing.progress > -0.1)
    .map<SceneCue>((timing) => ({
      id: timing.promptId,
      action: timing.shortcut.action,
      shortcut: timing.shortcut.input.display,
      keys: shortcutKeys(timing.shortcut),
      progress: timing.progress,
      state:
        timing.state === "active" && timing.canHit ? "active" : "upcoming",
      context: timing.shortcut.context,
      laneOffset: 0,
    }));
  const resolved = departingCues
    .filter((cue) => frameNow - cue.resolvedAtMs < DEPARTURE_DURATION_MS)
    .map<SceneCue>((cue) => {
      const elapsed = Math.max(0, frameNow - cue.resolvedAtMs);
      const travel = APPROACH_DURATION_MS[speed];
      return {
        id: cue.prompt.promptId,
        action: cue.prompt.shortcut.action,
        shortcut: cue.prompt.shortcut.input.display,
        keys: shortcutKeys(cue.prompt.shortcut),
        progress: Math.min(1.4, cue.startProgress + (elapsed / travel) * 0.9),
        state: cue.state,
        context: cue.prompt.shortcut.context,
      };
    });
  return [...resolved, ...live];
}

export type RuntimeMetrics = {
  readonly accuracy: number;
  readonly actLabel: "Ignition" | "Acceleration" | "Flow" | "Overload";
  readonly remainingSeconds: number;
  readonly runProgress: number;
};

export function calculateRuntimeMetrics(
  session: GameSession | null,
  frameNow: number,
  settings: GameSettings,
): RuntimeMetrics {
  const completed = session?.attempts.length ?? 0;
  const durationMs = getSessionDurationSeconds(settings) * 1_000;
  const elapsedMs = session?.startedAtMs
    ? Math.max(0, frameNow - session.startedAtMs)
    : 0;
  const runProgress = Math.min(1, elapsedMs / durationMs);
  const remainingSeconds = Math.max(
    0,
    Math.ceil((durationMs - elapsedMs) / 1_000),
  );
  const accuracy =
    completed === 0
      ? 100
      : Math.round(
          (session!.attempts.filter((attempt) => attempt.outcome === "clean")
            .length /
            completed) *
            100,
        );
  const actLabel =
    runProgress < 0.18
      ? "Ignition"
      : runProgress < 0.56
        ? "Acceleration"
        : runProgress < 0.84
          ? "Flow"
          : "Overload";

  return { accuracy, actLabel, remainingSeconds, runProgress };
}
