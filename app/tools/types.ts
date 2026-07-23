import type {
  Difficulty,
  GameMode,
  ShortcutDefinition,
} from "../game/types";

export type AvailableToolId = "linear" | "slack" | "spotify";
export type PlannedToolId = "notion" | "jira" | "superhuman" | "excel";
export type ToolId = AvailableToolId | PlannedToolId;

export interface ToolCatalogEntry {
  readonly id: ToolId;
  readonly name: string;
  readonly status: "available" | "coming-soon";
  readonly description: string;
}

export interface ShortcutTrack {
  readonly id: AvailableToolId;
  readonly name: string;
  readonly editionLabel: string;
  readonly platform: "macOS";
  readonly description: string;
  readonly decks: Readonly<Record<Difficulty, readonly ShortcutDefinition[]>>;
  readonly showcase: readonly ShortcutDefinition[];
}

export function deckForMode(
  track: ShortcutTrack,
  mode: GameMode,
): readonly ShortcutDefinition[] {
  return mode === "showcase" ? track.showcase : track.decks[mode];
}
