import type { GameResults } from "../../game";
import { SCORE_FORMATTER } from "../../gameplay/constants";
import type { ShareResult } from "../../platform/share-game";
import type { SharePromptTrigger } from "../../referrals/contract";
import { ResultsAnalytics } from "./ResultsAnalytics";

type ResultsScreenProps = {
  readonly results: GameResults;
  readonly selectedIndex: number;
  readonly onSelect: (index: number) => void;
  readonly onPlayAgain: () => void;
  readonly onReturnHome: () => void;
  readonly sharePromptTrigger: SharePromptTrigger | null;
  readonly shareResult: ShareResult | null;
  readonly onShare: () => void;
};

export function ResultsScreen({
  results,
  selectedIndex,
  onSelect,
  onPlayAgain,
  onReturnHome,
  sharePromptTrigger,
  shareResult,
  onShare,
}: ResultsScreenProps) {
  const titleIndex = sharePromptTrigger ? 2 : 1;
  const shareLabel =
    shareResult === "copied"
      ? "link copied"
      : shareResult === "shared"
        ? "challenge sent"
        : shareResult === "unavailable"
          ? "try sharing again"
          : "challenge a friend";
  return (
    <section className="results-screen" aria-labelledby="results-title">
      <div className="results-card">
        <h1 id="results-title">Run complete</h1>
        <p className="results-subtitle">
          {results.correctAnswers} correct · {results.misses} missed
        </p>

        <div className="results-score">
          <span className="results-score-label">Final score</span>
          <span className="results-score-value">
            {SCORE_FORMATTER.format(results.score)}
          </span>
        </div>

        <ResultsAnalytics results={results} />

        {sharePromptTrigger ? (
          <div className="results-referral">
            <span>Know someone who should learn keyboard shortcuts?</span>
            <strong>Send them this challenge.</strong>
          </div>
        ) : null}

        <div className="results-actions">
          <button
            type="button"
            className={`primary-button${
              selectedIndex === 0 ? " is-selected" : ""
            }`}
            aria-current={selectedIndex === 0 ? "true" : undefined}
            onMouseEnter={() => onSelect(0)}
            onFocus={() => onSelect(0)}
            onClick={onPlayAgain}
          >
            Play again
          </button>
          {sharePromptTrigger ? (
            <button
              type="button"
              className={`secondary-button${
                selectedIndex === 1 ? " is-selected" : ""
              }`}
              aria-current={selectedIndex === 1 ? "true" : undefined}
              onMouseEnter={() => onSelect(1)}
              onFocus={() => onSelect(1)}
              onClick={onShare}
            >
              {shareLabel}
            </button>
          ) : null}
          <button
            type="button"
            className={`secondary-button${
              selectedIndex === titleIndex ? " is-selected" : ""
            }`}
            aria-current={selectedIndex === titleIndex ? "true" : undefined}
            onMouseEnter={() => onSelect(titleIndex)}
            onFocus={() => onSelect(titleIndex)}
            onClick={onReturnHome}
          >
            Home
          </button>
        </div>
      </div>
    </section>
  );
}
