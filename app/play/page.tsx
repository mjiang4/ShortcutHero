import { ShortcutHeroGame } from "../ShortcutHeroGame";
import { parseLaunchSettings } from "../components/settings/settings";

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
  const launchSettings = parseLaunchSettings(
    toUrlSearchParams(await searchParams),
  );

  return (
    <ShortcutHeroGame
      settings={{
        mode: launchSettings.difficulty,
        assistance: launchSettings.guidance,
        speed: launchSettings.pace,
        durationSeconds: launchSettings.session,
      }}
      effectsMode={launchSettings.effects}
      soundEnabled={launchSettings.sound === "on"}
    />
  );
}
