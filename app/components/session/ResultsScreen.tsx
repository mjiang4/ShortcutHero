"use client";

import { useEffect, useRef } from "react";

import type { GameResults } from "../../game";
import {
  paintScoreCard,
  SHARE_SITE_URL,
  type ShareResult,
} from "../../platform/share-game";

type ResultsScreenProps = {
  readonly results: GameResults;
  readonly trackName: string;
  readonly highScore: number;
  readonly isPersonalBest: boolean;
  readonly leaderboardRank: number | null;
  readonly shareResult: ShareResult | null;
  readonly accent: string;
  readonly interludeBonus: number;
  readonly menuIndex: number;
  readonly onShare: () => void;
  readonly onDownloadCard: () => void;
  readonly onPlayAgain: () => void;
  readonly onTitle: () => void;
};

const SCORE_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

export function ResultsScreen({
  results,
  trackName,
  highScore,
  isPersonalBest,
  leaderboardRank,
  shareResult,
  accent,
  interludeBonus,
  menuIndex,
  onShare,
  onDownloadCard,
  onPlayAgain,
  onTitle,
}: ResultsScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const actions = [
    { label: "Share", onClick: onShare },
    { label: "Save card", onClick: onDownloadCard },
    { label: "Play again", onClick: onPlayAgain },
    { label: "Home", onClick: onTitle },
  ] as const;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 1200;
    canvas.height = 630;
    paintScoreCard(canvas, {
      score: results.score,
      accuracyPct: results.accuracyPct,
      longestCombo: results.longestCombo,
      trackName,
      accent,
      interludeBonus,
    });
  }, [
    accent,
    interludeBonus,
    results.accuracyPct,
    results.longestCombo,
    results.score,
    trackName,
  ]);

  return (
    <div className="results-overlay" role="dialog" aria-label="Run results">
      <div className="results-shell">
        <div className="results-shell__main">
          <p className="results-kicker">{trackName}</p>
          <h2 className="results-title">Run complete</h2>
          <p className="results-score">{SCORE_FORMATTER.format(results.score)}</p>
          {isPersonalBest ? <p className="results-pb">Personal best</p> : null}
          {interludeBonus > 0 ? (
            <p className="results-bonus-note">
              Includes +{SCORE_FORMATTER.format(interludeBonus)} from speed rounds
            </p>
          ) : null}

          <ul className="results-stats">
            <li>
              <span>Accuracy</span>
              <strong>{Math.round(results.accuracyPct)}%</strong>
            </li>
            <li>
              <span>Best streak</span>
              <strong>×{results.longestCombo}</strong>
            </li>
            <li>
              <span>Local best</span>
              <strong>{SCORE_FORMATTER.format(highScore)}</strong>
            </li>
            <li>
              <span>Board</span>
              <strong>{leaderboardRank ? `#${leaderboardRank}` : "—"}</strong>
            </li>
            {interludeBonus > 0 ? (
              <li className="is-bonus">
                <span>Speed-round</span>
                <strong>+{SCORE_FORMATTER.format(interludeBonus)}</strong>
              </li>
            ) : null}
          </ul>

          <div className="results-actions">
            {actions.map((action, index) => (
              <button
                key={action.label}
                type="button"
                className={menuIndex === index ? "is-active" : undefined}
                onClick={action.onClick}
              >
                {action.label}
              </button>
            ))}
          </div>

          {shareResult === "copied" ? (
            <p className="results-share-note">Share text copied</p>
          ) : null}
          {shareResult === "shared" ? (
            <p className="results-share-note">Shared</p>
          ) : null}

          <a
            className="results-site-link"
            href={SHARE_SITE_URL}
            target="_blank"
            rel="noreferrer"
          >
            shortcuthero.app
          </a>
        </div>

        <aside className="results-shell__card" aria-label="Share card preview">
          <p className="results-card-label">Your share card</p>
          <canvas ref={canvasRef} className="results-card-canvas" />
          <p className="results-card-hint">
            Save downloads this image · includes{" "}
            <a href={SHARE_SITE_URL} target="_blank" rel="noreferrer">
              shortcuthero.app
            </a>
          </p>
        </aside>
      </div>
    </div>
  );
}
