import type { AvailableToolId } from "./types";

/**
 * Per-tool visual accents layered on the Golden Signal base palette.
 */
export type ToolTheme = {
  readonly accent: string;
  readonly accentSoft: string;
  readonly highway: string;
  readonly bloom: string;
  readonly label: string;
  readonly glow: string;
};

export const TOOL_THEMES: Readonly<Record<AvailableToolId, ToolTheme>> = {
  linear: {
    accent: "#7C6CFF",
    accentSoft: "#A897FF",
    highway: "#F4A261",
    bloom: "#A897FF",
    label: "Linear",
    glow: "rgba(124, 108, 255, 0.45)",
  },
  slack: {
    accent: "#36C5F0",
    accentSoft: "#E01E5A",
    highway: "#4A154B",
    bloom: "#36C5F0",
    label: "Slack",
    glow: "rgba(54, 197, 240, 0.45)",
  },
  spotify: {
    accent: "#1DB954",
    accentSoft: "#1ED760",
    highway: "#1DB954",
    bloom: "#1ED760",
    label: "Spotify",
    glow: "rgba(29, 185, 84, 0.45)",
  },
};

export function getToolTheme(id: string): ToolTheme {
  if (id in TOOL_THEMES) {
    return TOOL_THEMES[id as AvailableToolId];
  }
  return TOOL_THEMES.linear;
}
