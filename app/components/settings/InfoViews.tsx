import type { LeaderboardEntry } from "../../leaderboard/contract";
import { appRequestHref } from "../../tools";
import { BackButton, TitlePanel } from "./TitleShell";
import type { ScoreEntry, TitleView } from "./title-types";

export type LeaderboardView =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly entries: readonly LeaderboardEntry[] }
  | { readonly status: "unavailable" };

export function InfoView({
  view,
  scores,
  leaderboard,
  leaderboardLabel,
  onBack,
  onReplayDemo,
}: {
  readonly view: Extract<TitleView, "scores" | "help" | "credits">;
  readonly scores: readonly ScoreEntry[];
  readonly leaderboard: LeaderboardView;
  readonly leaderboardLabel: string;
  readonly onBack: () => void;
  readonly onReplayDemo: () => void;
}) {
  if (view === "scores") {
    return (
      <TitlePanel title="high scores" subtitle="public board · your strongest runs">
        <h2 className="score-list__heading">Public board · {leaderboardLabel}</h2>
        {leaderboard.status === "ready" && leaderboard.entries.length > 0 ? (
          <ol className="score-list" aria-label="Public board">
            {leaderboard.entries.map((entry, index) => (
              <li key={`${entry.name}-${entry.score}-${entry.completedAt}`}>
                <span className="score-list__rank">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="score-list__identity">
                  <span className="score-list__name">{entry.name}</span>
                </span>
                <strong>{entry.score.toLocaleString("en-US")}</strong>
              </li>
            ))}
          </ol>
        ) : (
          <p className="title-panel__empty" role="status">
            {leaderboard.status === "loading"
              ? "Loading the public board…"
              : leaderboard.status === "unavailable"
                ? "The public board is unavailable right now."
                : "No public scores yet for these settings. Post yours from the results screen."}
          </p>
        )}
        <h2 className="score-list__heading">This device</h2>
        {scores.length > 0 ? (
          <ol className="score-list" aria-label="Your scores">
            {scores.map((entry, index) => (
              <li key={`${entry.label}-${entry.score}`}>
                <span className="score-list__rank">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="score-list__identity">
                  <span className="score-list__name">{entry.name}</span>
                  <span className="score-list__label">{entry.label}</span>
                </span>
                <strong>{entry.score.toLocaleString("en-US")}</strong>
              </li>
            ))}
          </ol>
        ) : (
          <p className="title-panel__empty">
            No scores yet. Play a round to set your first score.
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
        <p className="title-panel__note">G → I: press G first, then I at the line. ⇧ E: hold Shift and press E.</p>
        <div className="setup-actions">
          <button type="button" className="primary-button" onClick={onReplayDemo}>play tutorial</button>
          <BackButton onClick={onBack} />
          <a className="title-panel__back" href={appRequestHref()} target="_blank" rel="noreferrer">
            request an app <span aria-hidden="true">↗</span>
          </a>
        </div>
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
