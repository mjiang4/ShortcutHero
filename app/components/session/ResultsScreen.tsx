"use client";

import type { GameResults } from "../../game";
import type { ShareResult } from "../../platform/share-game";

type ResultsScreenProps = {
  readonly results: GameResults;
  readonly trackName: string;
  readonly highScore: number;
  readonly isPersonalBest: boolean;
  readonly leaderboardRank: number | null;
  readonly shareResult: ShareResult | null;
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
  menuIndex,
  onShare,
  onDownloadCard,
  onPlayAgain,
  onTitle,
}: ResultsScreenProps) {
  const actions = [
    { label: "share score", onClick: onShare },
    { label: "save card", onClick: onDownloadCard },
    { label: "play again", onClick: onPlayAgain },
    { label: "title", onClick: onTitle },
  ] as const;

  return (
    <div className="results-overlay" role="dialog" aria-label="Run results">
      <div className="results-panel">
        <p className="results-kicker">{trackName}</p>
        <h2 className="results-title">Run complete</h2>
        <p className="results-score">{SCORE_FORMATTER.format(results.score)}</p>
        {isPersonalBest ? <p className="results-pb">Personal best</p> : null}
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
            <span>Leaderboard</span>
            <strong>{leaderboardRank ? `#${leaderboardRank}` : "—"}</strong>
          </li>
        </ul>

        {results.correctShortcuts.length > 0 ? (
          <div className="results-section">
            <h3>You got these</h3>
            <ul>
              {results.correctShortcuts.slice(0, 4).map((item) => (
                <li key={item.shortcut.id}>
                  {item.shortcut.action}
                  <span>{item.shortcut.input.display}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {results.practice.length > 0 ? (
          <div className="results-section">
            <h3>Practice next</h3>
            <ul>
              {results.practice.slice(0, 4).map((item) => (
                <li key={item.shortcut.id}>
                  {item.shortcut.action}
                  <span>{item.shortcut.input.display}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {shareResult === "copied" ? (
          <p className="results-share-note">Share text copied to clipboard</p>
        ) : null}
        {shareResult === "shared" ? (
          <p className="results-share-note">Shared</p>
        ) : null}

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
      </div>
    </div>
  );
}
