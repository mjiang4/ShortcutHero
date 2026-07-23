"use client";

import { useEffect, useState } from "react";

import {
  fetchLeaderboardClient,
  type LeaderboardEntry,
} from "../../persistence/round-client";

type HomeLeaderboardProps = {
  readonly trackId?: string;
};

type BoardState =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly entries: readonly LeaderboardEntry[] };

export function HomeLeaderboard({ trackId }: HomeLeaderboardProps) {
  const [board, setBoard] = useState<BoardState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    void fetchLeaderboardClient({ track: trackId, limit: 8 }).then((rows) => {
      if (!cancelled) {
        setBoard({ status: "ready", entries: rows });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [trackId]);

  const loading = board.status === "loading";
  const entries = board.status === "ready" ? board.entries : [];

  return (
    <section className="home-board" aria-label="World leaderboard">
      <header className="home-board__header">
        <h2>World board</h2>
        <span>Live · D1</span>
      </header>
      {loading ? <p className="home-board__empty">Loading scores…</p> : null}
      {!loading && entries.length === 0 ? (
        <p className="home-board__empty">No scores yet — be first.</p>
      ) : null}
      <ol className="home-board__list">
        {entries.map((entry) => (
          <li key={`${entry.rank}-${entry.displayName}-${entry.completedAt}`}>
            <span className="home-board__rank">#{entry.rank}</span>
            <span className="home-board__name">{entry.displayName}</span>
            <strong className="home-board__score">
              {entry.score.toLocaleString()}
            </strong>
          </li>
        ))}
      </ol>
    </section>
  );
}
