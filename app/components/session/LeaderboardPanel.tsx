"use client";

import { useEffect, useState } from "react";

import {
  fetchLeaderboardClient,
  type LeaderboardEntry,
} from "../../persistence/round-client";

type LeaderboardPanelProps = {
  readonly trackId?: string;
  readonly onClose: () => void;
};

export function LeaderboardPanel({ trackId, onClose }: LeaderboardPanelProps) {
  const [entries, setEntries] = useState<readonly LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetchLeaderboardClient({ track: trackId, limit: 25 }).then((rows) => {
      if (!cancelled) {
        setEntries(rows);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [trackId]);

  return (
    <div className="leaderboard-panel" role="dialog" aria-label="Leaderboard">
      <header>
        <h2>World board</h2>
        <button type="button" onClick={onClose}>
          back
        </button>
      </header>
      {loading ? <p className="leaderboard-empty">Loading…</p> : null}
      {!loading && entries.length === 0 ? (
        <p className="leaderboard-empty">No scores yet. Be the first.</p>
      ) : null}
      <ol>
        {entries.map((entry) => (
          <li key={`${entry.rank}-${entry.displayName}-${entry.completedAt}`}>
            <span className="leaderboard-rank">#{entry.rank}</span>
            <span className="leaderboard-name">{entry.displayName}</span>
            <span className="leaderboard-score">
              {entry.score.toLocaleString()}
            </span>
            <span className="leaderboard-meta">
              {entry.trackId} · ×{entry.longestCombo}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
