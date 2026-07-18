import { LINEAR_TRACK } from "./linear";
import type {
  AvailableToolId,
  ShortcutTrack,
  ToolCatalogEntry,
} from "./types";

export const AVAILABLE_TOOL_IDS: readonly AvailableToolId[] = ["linear"];

export const TOOL_CATALOG: readonly ToolCatalogEntry[] = [
  {
    id: "linear",
    name: "Linear",
    status: "available",
    description: "Issues, projects, cycles, and navigation.",
  },
  {
    id: "notion",
    name: "Notion",
    status: "coming-soon",
    description: "Pages, blocks, databases, and navigation.",
  },
  {
    id: "jira",
    name: "Jira",
    status: "coming-soon",
    description: "Issues, boards, search, and workflows.",
  },
  {
    id: "superhuman",
    name: "Superhuman",
    status: "coming-soon",
    description: "Inbox navigation and email actions.",
  },
  {
    id: "excel",
    name: "Excel",
    status: "coming-soon",
    description: "Sheets, ranges, formulas, and formatting.",
  },
];

const tracks: Readonly<Record<AvailableToolId, ShortcutTrack>> = {
  linear: LINEAR_TRACK,
};

export function getToolTrack(id: AvailableToolId): ShortcutTrack {
  return tracks[id];
}

export function isAvailableToolId(value: string | null): value is AvailableToolId {
  return value !== null && AVAILABLE_TOOL_IDS.some((id) => id === value);
}
