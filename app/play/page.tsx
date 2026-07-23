import { ShortcutHeroGame } from "../ShortcutHeroGame";
import { parseLaunchSettings } from "../components/settings/settings";
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

export default async function PlayPage({
  searchParams,
}: {
  readonly searchParams: Promise<SearchParams>;
}) {
  const params = toUrlSearchParams(await searchParams);
  const launchSettings = parseLaunchSettings(params);
  const modeParam = params.get("mode");
  const runMode =
    modeParam === "speed_round" || modeParam === "demo"
      ? modeParam
      : "highway";
  const gameMode: GameMode =
    runMode === "demo" ? "showcase" : launchSettings.difficulty;

  return (
    <ShortcutHeroGame
      settings={{
        trackId: launchSettings.tool,
        mode: gameMode,
        assistance: launchSettings.guidance,
        speed: launchSettings.pace,
        durationSeconds: runMode === "demo" ? 30 : launchSettings.session,
      }}
      launchSettings={launchSettings}
      effectsMode={launchSettings.effects}
      soundEnabled={launchSettings.sound === "on"}
      runMode={runMode}
    />
  );
}
