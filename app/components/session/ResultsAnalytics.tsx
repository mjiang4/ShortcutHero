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

      {results.correctShortcuts.length > 0 ? (
        <section
          className="results-breakdown"
          aria-labelledby="correct-shortcuts-title"
        >
          <h2 id="correct-shortcuts-title">You got these right</h2>
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
                  {item.perfectHits > 0
                    ? ` · ${item.perfectHits} perfect`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {results.practice.length > 0 ? (
        <section
          className="results-breakdown"
          aria-labelledby="practice-shortcuts-title"
        >
          <h2 id="practice-shortcuts-title">Practice these next</h2>
          <ul className="review-list" aria-label="Shortcuts to practise">
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
        </section>
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
