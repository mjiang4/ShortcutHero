import type { GameResults } from "../../game";

export function ResultsAnalytics({ results }: { readonly results: GameResults }) {
  return (
    <>
      <div className="results-grid">
        <ResultStat label="Accuracy" value={`${results.accuracyPct}%`} />
        <ResultStat label="Best combo" value={String(results.longestCombo)} />
        <ResultStat
          label="Unique shortcuts"
          value={String(results.uniqueShortcutsCorrect)}
        />
      </div>

      {results.practice.length > 0 ? (
        <details className="results-breakdown" open>
          <summary className="results-breakdown__summary">
            <span className="results-breakdown__caret" aria-hidden="true">
              ›
            </span>
            <span id="practice-shortcuts-title">Needs review</span>
            <span className="results-breakdown__count">
              {results.practice.length}
            </span>
          </summary>
          <ul className="review-list" aria-label="Shortcuts needing review">
            {results.practice.map((item) => (
              <li className="review-item" key={item.shortcut.id}>
                <span className="review-item__identity">
                  <strong>{item.shortcut.action}</strong>
                  <span className="review-shortcut">
                    {item.shortcut.input.display}
                  </span>
                </span>
                <span className="review-item__stats">
                  {item.misses} {item.misses === 1 ? "miss" : "misses"}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {results.correctShortcuts.length > 0 ? (
        <details className="results-breakdown" open>
          <summary className="results-breakdown__summary">
            <span className="results-breakdown__caret" aria-hidden="true">
              ›
            </span>
            <span id="correct-shortcuts-title">Mastered</span>
            <span className="results-breakdown__count">
              {results.correctShortcuts.length}
            </span>
          </summary>
          <ul className="correct-list">
            {results.correctShortcuts.map((item) => (
              <li className="correct-item" key={item.shortcut.id}>
                <span className="correct-item__identity">
                  <strong>{item.shortcut.action}</strong>
                  <span className="review-shortcut">
                    {item.shortcut.input.display}
                  </span>
                </span>
                <span className="correct-item__stats">
                  {item.correct}/{item.attempts} correct
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </>
  );
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="result-stat">
      <span className="result-stat-label">{label}</span>
      <span className="result-stat-value">{value}</span>
    </div>
  );
}
