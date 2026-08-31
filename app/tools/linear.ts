import type { ShortcutDefinition } from "../game/types";
import { getToolTrack } from "./registry";

// Existing engine/tutorial callers keep their names; the JSON is the only data source.
export const LINEAR_TRACK = getToolTrack("linear");
export const LINEAR_EASY_SHORTCUTS = LINEAR_TRACK.decks.easy;
export const LINEAR_MEDIUM_SHORTCUTS = LINEAR_TRACK.decks.medium;
export const LINEAR_HARD_SHORTCUTS = LINEAR_TRACK.decks.hard;
export const LINEAR_SHOWCASE = LINEAR_TRACK.showcase;
export const LINEAR_SHORTCUTS = [
  ...LINEAR_EASY_SHORTCUTS,
  ...LINEAR_MEDIUM_SHORTCUTS,
  ...LINEAR_HARD_SHORTCUTS,
];

const shortcutsById = new Map(LINEAR_SHORTCUTS.map((shortcut) => [shortcut.id, shortcut]));

export function getLinearShortcutById(id: string): ShortcutDefinition {
  const shortcut = shortcutsById.get(id);
  if (!shortcut) throw new Error(`Unknown Linear shortcut: ${id}`);
  return shortcut;
}
