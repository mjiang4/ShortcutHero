import type { KeyboardPlatform } from "../game/types";
import catalogData from "./catalog-data.json";
import { loadCatalogTrack, validateCatalog } from "./catalog";
import type {
  AvailableToolId,
  ShortcutTrack,
  ToolCatalogEntry,
} from "./types";

export const SHORTCUT_CATALOG = validateCatalog(catalogData);
export const AVAILABLE_TOOL_IDS = (Object.keys(catalogData.apps) as AvailableToolId[])
  .filter((id) => SHORTCUT_CATALOG.apps[id].releasedPlatforms.includes("macos"));

export const TOOL_CATALOG: readonly ToolCatalogEntry[] = AVAILABLE_TOOL_IDS.map((id) => ({
  id,
  name: SHORTCUT_CATALOG.apps[id].name,
  status: "available",
  description: SHORTCUT_CATALOG.apps[id].description,
}));

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
