import { ShortcutHeroGame } from "../ShortcutHeroGame";
import {
  parseLaunchSettings,
  type SessionLength,
} from "../components/settings/settings";
import type { GameMode } from "../game";

type SearchParams = Record<string, string | string[] | undefined>;

function toUrlSearchParams(input: SearchParams): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else if (value !== undefined) {
      params.set(key, value);
    }
  }
  return params;
}

/**
 * Embeddable play surface for iframes / Codex panels.
 * Defaults: 30s highway (or speed_round via ?mode=speed_round), system effects.
 */
export default async function EmbedPage({
  searchParams,
}: {
  readonly searchParams: Promise<SearchParams>;
}) {
  const params = toUrlSearchParams(await searchParams);
  const parsed = parseLaunchSettings(params);
  const hasSession = params.has("session");
  const hasEffects = params.has("effects");
  const launchSettings = {
    ...parsed,
    session: hasSession ? parsed.session : (30 as SessionLength),
    effects: hasEffects ? parsed.effects : ("system" as const),
  };
  const modeParam = params.get("mode");
  const runMode = modeParam === "speed_round" ? "speed_round" : "highway";
  const gameMode: GameMode = launchSettings.difficulty;

  return (
    <ShortcutHeroGame
      settings={{
        trackId: launchSettings.tool,
        mode: gameMode,
        assistance: launchSettings.guidance,
        speed: launchSettings.pace,
        durationSeconds: launchSettings.session,
      }}
      launchSettings={launchSettings}
      effectsMode={launchSettings.effects}
      soundEnabled={launchSettings.sound === "on"}
      runMode={runMode}
      embedded
    />
  );
}
