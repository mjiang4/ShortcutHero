import { SHORTCUT_CATALOG } from "../../tools";
import {
  DEFAULT_LAUNCH_SETTINGS,
  parseLaunchSettings,
  type GameDifficulty,
  type LaunchSettings,
  type TempoPreset,
} from "./settings";
import type { HintMode } from "../../game/types";
import { LABELS } from "./title-config";
import type { ScoreEntry } from "./title-types";
import { readStoredHighScore } from "../../gameplay/result-storage";

export const SETTINGS_STORAGE_KEY = "shortcut-hero:launch-settings";
export const ONBOARDING_STORAGE_KEY = "shortcut-hero:onboarding";
const SCORE_PREFIX = "shortcut-hero:high-score:";

export function restoreOnboarding(): { name: string; complete: boolean } {
  try {
    const raw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) return { name: "", complete: false };
    const saved = JSON.parse(raw) as Record<string, unknown>;
    return {
      name: typeof saved.name === "string" ? saved.name.slice(0, 32) : "",
      complete: saved.complete === true,
    };
  } catch {
    return { name: "", complete: false };
  }
}

export function persistOnboarding(name: string): void {
  try {
    window.localStorage.setItem(
      ONBOARDING_STORAGE_KEY,
      JSON.stringify({ name: name.trim(), complete: true }),
    );
  } catch {
    // The game remains usable when browser persistence is blocked.
  }
}

export function persistPlayerName(name: string): boolean {
  try {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({
      ...restoreOnboarding(),
      name: name.trim().slice(0, 32),
    }));
    return true;
  } catch {
    return false;
  }
}

export function restoreSettings(): LaunchSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_LAUNCH_SETTINGS;
    const saved = JSON.parse(raw) as Record<string, unknown>;
    const params = new URLSearchParams();
    for (const key of [
      "tool",
      "difficulty",
      "guidance",
      "hints",
      "pace",
      "session",
      "sound",
      "effects",
    ]) {
      const value = saved[key];
      if (typeof value === "string" || typeof value === "number") {
        params.set(key, String(value));
      }
    }
    return parseLaunchSettings(params);
  } catch {
    return DEFAULT_LAUNCH_SETTINGS;
  }
}

export function persistSettings(settings: LaunchSettings): void {
  try {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify(settings),
    );
  } catch {
    // The home screen remains usable when browser persistence is blocked.
  }
}

export function readHighScores(): readonly ScoreEntry[] {
  try {
    const entries: ScoreEntry[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith(SCORE_PREFIX)) continue;
      const saved = readStoredHighScore(window.localStorage.getItem(key));
      if (!saved) continue;
      const { score, name } = saved;
      const parts = key.slice(SCORE_PREFIX.length).split(":");
      if (parts[0] === "v2") {
        const [, track, platform, mode, hints, pace, duration] = parts;
        const appName = SHORTCUT_CATALOG.apps[track]?.name ?? track;
        entries.push({
          score,
          name,
          label: `${appName} · ${platform === "windows" ? "Windows" : "Mac"} · ${
            LABELS.difficulty[mode as GameDifficulty] ?? mode
          } · hints ${LABELS.hints[hints as HintMode] ?? hints} · ${LABELS.pace[pace as TempoPreset] ?? pace} · ${duration}`,
        });
        continue;
      }
      const hasTrack = parts.length >= 5;
      const [
        track = "linear",
        mode = "run",
        assistance = "learn",
        pace = "fast",
        duration = "45s",
      ] = hasTrack ? parts : ["linear", ...parts];
      const appName = SHORTCUT_CATALOG.apps[track]?.name ?? track;
      entries.push({
        score,
        name,
        label: `${appName} · ${
          LABELS.difficulty[mode as GameDifficulty] ?? mode
        } · ${
          assistance === "pro" ? "hints off" : "hints on"
        } · ${LABELS.pace[pace as TempoPreset] ?? pace} · ${duration} · previous version`,
      });
    }
    return entries.sort((a, b) => b.score - a.score).slice(0, 5);
  } catch {
    return [];
  }
}
