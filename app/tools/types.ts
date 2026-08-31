import type {
  Difficulty,
  GameMode,
  ShortcutDefinition,
} from "../game/types";
import type catalogData from "./catalog-data.json";

export type AvailableToolId = keyof typeof catalogData.apps;
export type PlannedToolId = "notion" | "jira" | "superhuman" | "excel";
export type ToolId = AvailableToolId | PlannedToolId;

export interface ToolCatalogEntry {
  readonly id: ToolId;
  readonly name: string;
  readonly status: "available" | "coming-soon";
  readonly description: string;
}

export interface ShortcutTrack {
  readonly id: string;
  readonly name: string;
  readonly editionLabel: string;
  readonly platform: "macOS" | "Windows";
  readonly description: string;
  readonly decks: Readonly<Record<Difficulty, readonly ShortcutDefinition[]>>;
  readonly showcase: readonly ShortcutDefinition[];
}

export function deckForMode(
  track: ShortcutTrack,
  mode: GameMode,
): readonly ShortcutDefinition[] {
  if (mode === "showcase") return track.showcase;
  const groups = mode === "easy" ? [track.decks.easy]
    : mode === "medium" ? [track.decks.easy, track.decks.medium]
    : [track.decks.easy, track.decks.medium, track.decks.hard];
  return Array.from({ length: Math.max(...groups.map((group) => group.length)) })
    .flatMap((_, index) => groups.flatMap((group) => group[index] ? [group[index]] : []));
}
