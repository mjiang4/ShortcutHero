import {
  LINEAR_EASY_SHORTCUTS,
  LINEAR_HARD_SHORTCUTS,
  LINEAR_MEDIUM_SHORTCUTS,
  LINEAR_SHORTCUTS,
  LINEAR_SHOWCASE,
  deckForMode,
  getLinearShortcutById,
  getToolTrack,
  isAvailableToolId,
} from "../tools";
import type { GameMode, ShortcutDefinition } from "./types";

// Compatibility exports keep the engine tests and external consumers stable.
// Tool-specific source material lives in app/tools, not in the game runtime.
export const EASY_SHORTCUTS = LINEAR_EASY_SHORTCUTS;
export const MEDIUM_SHORTCUTS = LINEAR_MEDIUM_SHORTCUTS;
export const HARD_SHORTCUTS = LINEAR_HARD_SHORTCUTS;
export const ALL_SHORTCUTS = LINEAR_SHORTCUTS;
export const SHOWCASE_ORDER = LINEAR_SHOWCASE;
export const getShortcutById = getLinearShortcutById;

export function getShortcutDeck(
  mode: GameMode,
  trackId = "linear",
): readonly ShortcutDefinition[] {
  const resolvedTrackId = isAvailableToolId(trackId) ? trackId : "linear";
  return deckForMode(getToolTrack(resolvedTrackId), mode);
}
