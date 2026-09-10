import type { LaunchSettings } from "../components/settings/settings";
import { getHintMode, getSessionDurationSeconds } from "../game/session";
import type { Difficulty, GameSettings, HintMode, SpeedPreset } from "../game/types";

/** One public board per launch configuration; playable keys match on Mac and Windows. */
export type LeaderboardBoard = {
  readonly trackId: string;
  readonly difficulty: Difficulty;
  readonly hints: HintMode;
  readonly pace: SpeedPreset;
  readonly sessionSeconds: number;
};

export type LeaderboardEntry = {
  readonly name: string;
  readonly score: number;
  readonly completedAt: string;
};

export type LeaderboardPostPayload = LeaderboardBoard & {
  readonly visitorId: string;
  readonly deletionToken: string;
  readonly name: string;
  readonly score: number;
};

export const LEADERBOARD_SIZE = 20;
export const LEADERBOARD_NAME_MAX_LENGTH = 32;

const ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const VISITOR_ID_PATTERN = /^v_[a-f0-9]{32}$/;
const DELETION_TOKEN_PATTERN = /^d_[a-f0-9]{64}$/;
const DIFFICULTIES = new Set<string>(["easy", "medium", "hard"]);
const HINTS = new Set<string>(["always", "near-line", "off"]);
const PACES = new Set<string>(["relaxed", "standard", "turbo"]);
const SESSIONS = new Set<number>([30, 45, 60]);

export function boardFromGameSettings(settings: GameSettings): LeaderboardBoard {
  return {
    trackId: settings.trackId ?? "linear",
    difficulty: settings.mode as Difficulty,
    hints: getHintMode(settings),
    pace: settings.speed,
    sessionSeconds: getSessionDurationSeconds(settings),
  };
}

export function boardFromLaunchSettings(settings: LaunchSettings): LeaderboardBoard {
  return {
    trackId: settings.tool,
    difficulty: settings.difficulty,
    hints: settings.hints,
    pace: settings.pace,
    sessionSeconds: settings.session,
  };
}

export function boardKey(board: LeaderboardBoard): string {
  return `${board.trackId}:${board.difficulty}:${board.hints}:${board.pace}:${board.sessionSeconds}s`;
}

export function boardSearchParams(board: LeaderboardBoard): URLSearchParams {
  return new URLSearchParams({
    trackId: board.trackId,
    difficulty: board.difficulty,
    hints: board.hints,
    pace: board.pace,
    sessionSeconds: String(board.sessionSeconds),
  });
}

export function parseLeaderboardBoard(source: Pick<URLSearchParams, "get"> | Record<string, unknown>): LeaderboardBoard | null {
  const read = (key: string): unknown =>
    typeof (source as URLSearchParams).get === "function" ? (source as URLSearchParams).get(key) : (source as Record<string, unknown>)[key];
  const trackId = read("trackId");
  const difficulty = read("difficulty");
  const hints = read("hints");
  const pace = read("pace");
  const sessionSeconds = Number(read("sessionSeconds"));
  if (
    typeof trackId !== "string" || !ID_PATTERN.test(trackId) ||
    typeof difficulty !== "string" || !DIFFICULTIES.has(difficulty) ||
    typeof hints !== "string" || !HINTS.has(hints) ||
    typeof pace !== "string" || !PACES.has(pace) ||
    !SESSIONS.has(sessionSeconds)
  ) {
    return null;
  }
  return {
    trackId,
    difficulty: difficulty as Difficulty,
    hints: hints as HintMode,
    pace: pace as SpeedPreset,
    sessionSeconds,
  };
}

/** Names are public once posted, so the same trimmed 1–32 character rule applies server-side. */
export function normalizeLeaderboardName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.replace(/\s+/g, " ").trim().slice(0, LEADERBOARD_NAME_MAX_LENGTH);
  if (!name || name.toLowerCase() === "guest") return null;
  return name;
}

export function parseLeaderboardPost(value: unknown): LeaderboardPostPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const board = parseLeaderboardBoard(record);
  const name = normalizeLeaderboardName(record.name);
  if (
    !board || !name ||
    typeof record.visitorId !== "string" || !VISITOR_ID_PATTERN.test(record.visitorId) ||
    typeof record.deletionToken !== "string" || !DELETION_TOKEN_PATTERN.test(record.deletionToken) ||
    !Number.isInteger(record.score) || Number(record.score) < 1 || Number(record.score) > 100_000_000
  ) {
    return null;
  }
  return {
    ...board,
    visitorId: record.visitorId,
    deletionToken: record.deletionToken,
    name,
    score: record.score as number,
  };
}
