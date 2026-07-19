import { BackButton, TitlePanel } from "./TitleShell";
import type { ScoreEntry, TitleView } from "./title-types";

export function InfoView({
  view,
  scores,
  onBack,
}: {
  readonly view: Exclude<TitleView, "menu" | "options">;
  readonly scores: readonly ScoreEntry[];
  readonly onBack: () => void;
}) {
  if (view === "scores") {
    return (
      <TitlePanel title="high scores" subtitle="your strongest runs">
        {scores.length > 0 ? (
          <ol className="score-list">
            {scores.map((entry, index) => (
              <li key={`${entry.label}-${entry.score}`}>
                <span className="score-list__rank">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="score-list__label">{entry.label}</span>
                <strong>{entry.score.toLocaleString("en-US")}</strong>
              </li>
            ))}
          </ol>
        ) : (
          <p className="title-panel__empty">
            No runs yet. The highway is waiting.
          </p>
        )}
        <BackButton onClick={onBack} />
      </TitlePanel>
    );
  }

  if (view === "help") {
    return (
      <TitlePanel
        title="how to play"
        subtitle="match the action to its shortcut"
      >
        <ol className="instruction-list">
          <li>
            <span>01</span>Read the action.
          </li>
          <li>
            <span>02</span>Press its shortcut at the strike line.
          </li>
          <li>
            <span>03</span>Chain hits for a higher score.
          </li>
        </ol>
        <BackButton onClick={onBack} />
      </TitlePanel>
    );
  }

  return (
    <TitlePanel title="credits" subtitle="built in one improbable sprint">
      <div className="credit-copy">
        <p>100% designed and built by Codex.</p>
        <p>
          Inspired by Linear, rhythm games, golden-hour skies, and the pleasure
          of remembering without looking.
        </p>
      </div>
      <BackButton onClick={onBack} />
    </TitlePanel>
  );
}
