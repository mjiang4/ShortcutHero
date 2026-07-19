import type { GameResults } from "../../game";
import { SCORE_FORMATTER } from "../../gameplay/constants";
import { ResultsAnalytics } from "./ResultsAnalytics";

type ResultsScreenProps = {
  readonly results: GameResults;
  readonly selectedIndex: number;
  readonly onSelect: (index: number) => void;
  readonly onPlayAgain: () => void;
  readonly onReturnToTitle: () => void;
};

export function ResultsScreen({
  results,
  selectedIndex,
  onSelect,
  onPlayAgain,
  onReturnToTitle,
}: ResultsScreenProps) {
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
          <button
            type="button"
            className={`secondary-button${
              selectedIndex === 1 ? " is-selected" : ""
            }`}
            aria-current={selectedIndex === 1 ? "true" : undefined}
            onMouseEnter={() => onSelect(1)}
            onFocus={() => onSelect(1)}
            onClick={onReturnToTitle}
          >
            Title
          </button>
        </div>
      </div>
    </section>
  );
}
