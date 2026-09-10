"use client";

import { getOrCreateAnonymousIdentity } from "../identity/anonymous-identity";
import {
  boardSearchParams,
  type LeaderboardBoard,
  type LeaderboardEntry,
} from "./contract";

export type LeaderboardRead =
  | { readonly status: "ready"; readonly entries: readonly LeaderboardEntry[] }
  | { readonly status: "unavailable" };

export type LeaderboardPost =
  | { readonly status: "posted"; readonly rank: number | null }
  | { readonly status: "rate-limited" }
  | { readonly status: "unavailable" };

export async function fetchLeaderboard(board: LeaderboardBoard): Promise<LeaderboardRead> {
  try {
    const response = await fetch(`/api/leaderboard?${boardSearchParams(board)}`, { cache: "no-store" });
    if (!response.ok) return { status: "unavailable" };
    const body = (await response.json()) as { entries?: unknown };
    if (!Array.isArray(body.entries)) return { status: "unavailable" };
    return { status: "ready", entries: body.entries as LeaderboardEntry[] };
  } catch {
    return { status: "unavailable" };
  }
}

/** Only called after the player explicitly chooses to publish a named score. */
export async function postLeaderboardScore(
  board: LeaderboardBoard,
  name: string,
  score: number,
): Promise<LeaderboardPost> {
  try {
    const response = await fetch("/api/leaderboard", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...board, ...getOrCreateAnonymousIdentity(), name, score }),
    });
    if (response.status === 429) return { status: "rate-limited" };
    if (!response.ok) return { status: "unavailable" };
    const body = (await response.json()) as { rank?: unknown };
    return { status: "posted", rank: typeof body.rank === "number" ? body.rank : null };
  } catch {
    return { status: "unavailable" };
  }
}
