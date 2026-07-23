import {
  isAvailableToolId,
  type AvailableToolId,
} from "../../tools";

export type GameDifficulty = "easy" | "medium" | "hard";
export type GuidanceMode = "novice" | "pro";
export type TempoPreset = "relaxed" | "standard" | "turbo";
export type SessionLength = 30 | 45 | 60;
export type SoundMode = "on" | "off";
export type EffectsMode = "full" | "system" | "reduced";

export interface LaunchSettings {
  readonly tool: AvailableToolId;
  readonly difficulty: GameDifficulty;
  readonly guidance: GuidanceMode;
  readonly pace: TempoPreset;
  readonly session: SessionLength;
  readonly sound: SoundMode;
  readonly effects: EffectsMode;
}

export const DEFAULT_LAUNCH_SETTINGS: LaunchSettings = {
  tool: "linear",
  difficulty: "easy",
  guidance: "novice",
  pace: "standard",
  session: 45,
  sound: "on",
  effects: "system",
};

const DIFFICULTIES = ["easy", "medium", "hard"] as const;
const GUIDANCE_MODES = ["novice", "pro"] as const;
const TEMPO_PRESETS = ["relaxed", "standard", "turbo"] as const;
const SESSION_LENGTHS = [30, 45, 60] as const;
const SOUND_MODES = ["on", "off"] as const;
const EFFECTS_MODES = ["full", "system", "reduced"] as const;

function includes<T extends string | number>(
  values: readonly T[],
  candidate: string | null,
): candidate is `${T}` {
  return candidate !== null && values.some((value) => String(value) === candidate);
}

/**
 * Reads launch options at the route boundary and falls back field-by-field.
 * Invalid or missing values can therefore never reach the game runtime.
 */
export function parseLaunchSettings(params: Pick<URLSearchParams, "get">): LaunchSettings {
  const tool = params.get("tool");
  const difficulty = params.get("difficulty");
  const guidance = params.get("guidance");
  const pace = params.get("pace");
  const session = params.get("session");
  const sound = params.get("sound");
  const effects = params.get("effects");

  return {
    tool: isAvailableToolId(tool) ? tool : DEFAULT_LAUNCH_SETTINGS.tool,
    difficulty: includes(DIFFICULTIES, difficulty)
      ? difficulty
      : DEFAULT_LAUNCH_SETTINGS.difficulty,
    guidance: includes(GUIDANCE_MODES, guidance)
      ? guidance
      : DEFAULT_LAUNCH_SETTINGS.guidance,
    pace: includes(TEMPO_PRESETS, pace)
      ? pace
      : DEFAULT_LAUNCH_SETTINGS.pace,
    session: includes(SESSION_LENGTHS, session)
      ? Number(session) as SessionLength
      : DEFAULT_LAUNCH_SETTINGS.session,
    sound: includes(SOUND_MODES, sound)
      ? sound
      : DEFAULT_LAUNCH_SETTINGS.sound,
    effects: includes(EFFECTS_MODES, effects)
      ? effects
      : DEFAULT_LAUNCH_SETTINGS.effects,
  };
}

export function createPlayHref(
  settings: LaunchSettings,
  extras?: { readonly mode?: "highway" | "speed_round" | "demo" },
): string {
  const params = new URLSearchParams({
    tool: settings.tool,
    difficulty: settings.difficulty,
    guidance: settings.guidance,
    pace: settings.pace,
    session: String(settings.session),
    sound: settings.sound,
    effects: settings.effects,
  });
  if (extras?.mode) params.set("mode", extras.mode);
  return `/play?${params.toString()}`;
}
