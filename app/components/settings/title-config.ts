import type {
  EffectsMode,
  GameDifficulty,
  GuidanceMode,
  SessionLength,
  SoundMode,
  TempoPreset,
} from "./settings";
import type { MenuAction } from "./title-types";

export const MENU_ITEMS: readonly { label: string; action: MenuAction }[] = [
  { label: "start", action: "start" },
  { label: "high scores", action: "scores" },
  { label: "how to play", action: "help" },
  { label: "options", action: "options" },
  { label: "credits", action: "credits" },
];

export const DIFFICULTIES: readonly GameDifficulty[] = [
  "easy",
  "medium",
  "hard",
];
export const GUIDANCE: readonly GuidanceMode[] = ["novice", "pro"];
export const PACES: readonly TempoPreset[] = ["relaxed", "standard", "turbo"];
export const SESSIONS: readonly SessionLength[] = [30, 45, 60];
export const SOUND: readonly SoundMode[] = ["on", "off"];
export const EFFECTS: readonly EffectsMode[] = ["full", "system", "reduced"];
export const OPTION_COUNT = 7;

export const LABELS = {
  difficulty: {
    easy: "single keys",
    medium: "key sequences",
    hard: "shift chords",
  },
  guidance: {
    novice: "show shortcuts",
    pro: "hide shortcuts",
  },
  pace: {
    relaxed: "112 bpm · focus",
    standard: "144 bpm · fast",
    turbo: "176 bpm · turbo",
  },
  effects: {
    full: "full motion + bloom",
    system: "match system motion",
    reduced: "reduced motion",
  },
} as const;

export function cycleValue<T extends string | number>(
  values: readonly T[],
  current: T,
  direction: -1 | 1,
): T {
  const index = Math.max(0, values.indexOf(current));
  return values[(index + direction + values.length) % values.length];
}
