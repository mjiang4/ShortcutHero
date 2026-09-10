import type { KeyboardPlatform } from "../game/types";
import catalogData from "./catalog-data.json";
import { loadCatalogTrack, validateCatalog } from "./catalog";
import type {
  AvailableToolId,
  ShortcutTrack,
  ToolCatalogEntry,
} from "./types";

export const SHORTCUT_CATALOG = validateCatalog(catalogData);
/** The game launches on Mac and Windows, so a released pack must cover both. */
export const AVAILABLE_TOOL_IDS = (Object.keys(catalogData.apps) as AvailableToolId[])
  .filter((id) => {
    const platforms = SHORTCUT_CATALOG.apps[id].releasedPlatforms;
    return platforms.includes("macos") && platforms.includes("windows");
  });

/** Cmd/Ctrl-heavy apps the browser engine cannot capture yet; shown so players can vote. */
const COMING_SOON_DESCRIPTION = "Uses Cmd/Ctrl shortcuts — needs a desktop trainer. Vote below.";
const PLANNED_TOOLS: readonly ToolCatalogEntry[] = [
  { id: "cursor", name: "Cursor", status: "coming-soon", description: COMING_SOON_DESCRIPTION },
  { id: "chatgpt", name: "ChatGPT", status: "coming-soon", description: COMING_SOON_DESCRIPTION },
  { id: "claude", name: "Claude", status: "coming-soon", description: COMING_SOON_DESCRIPTION },
  { id: "superhuman", name: "Superhuman", status: "coming-soon", description: "Pack in review. Vote below." },
];

export const TOOL_CATALOG: readonly ToolCatalogEntry[] = [
  ...AVAILABLE_TOOL_IDS.map((id): ToolCatalogEntry => ({
    id,
    name: SHORTCUT_CATALOG.apps[id].name,
    status: "available",
    description: SHORTCUT_CATALOG.apps[id].description,
  })),
  ...PLANNED_TOOLS,
];

export const APP_REQUEST_URL = "https://github.com/mjiang4/ShortcutHero/issues/new?labels=app-request&title=App+request%3A+";

export function appRequestHref(appName?: string): string {
  return `${APP_REQUEST_URL}${appName ? encodeURIComponent(appName) : ""}`;
}

const tracks = new Map<string, ShortcutTrack>(AVAILABLE_TOOL_IDS.flatMap((id) =>
  (["macos", "windows"] as const).map((platform) =>
    [`${id}:${platform}`, loadCatalogTrack(SHORTCUT_CATALOG, id, platform)] as const,
  ),
));

export function getToolTrack(id: AvailableToolId, platform: KeyboardPlatform = "macos"): ShortcutTrack {
  return tracks.get(`${id}:${platform}`)!;
}

export function isAvailableToolId(value: string | null): value is AvailableToolId {
  return value !== null && AVAILABLE_TOOL_IDS.some((id) => id === value);
}
