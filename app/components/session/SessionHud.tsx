import type { GameSession, GameSettings } from "../../game";
import { DIFFICULTY_LABELS, SCORE_FORMATTER } from "../../gameplay/constants";

type SessionHudProps = {
  readonly session: GameSession;
  readonly settings: GameSettings;
  readonly remainingSeconds: number;
  readonly runProgress: number;
  readonly isMuted: boolean;
  readonly onToggleMuted: () => void;
  readonly onPause: () => void;
};

export function SessionHud({
  session,
  settings,
  remainingSeconds,
  runProgress,
  isMuted,
  onToggleMuted,
  onPause,
}: SessionHudProps) {
  const lastAttempt = session.attempts.at(-1);
  const cleanHit = session.combo > 0 && lastAttempt?.outcome === "clean";
  const milestone = [3, 6, 9].includes(session.combo);

  return (
    <>
      <section className="hud" aria-label="Current game status">
        <div className="hud-cluster">
          <HudStat
            label="Score"
            value={SCORE_FORMATTER.format(session.score)}
          />
        </div>
        <div className="streak-display" aria-label={`Streak: ${session.combo}`}>
          <span className="hud-stat-label">streak</span>
          <strong
            key={`${lastAttempt?.promptId ?? "start"}-${session.combo}`}
            className={`streak-count${cleanHit ? " is-hit" : ""}${milestone ? " is-milestone" : ""}`}
          >
            {session.combo}
          </strong>
        </div>
        <div className="hud-cluster is-right">
          <HudStat label="Time remaining" value={`${remainingSeconds}s`} />
          <button
            type="button"
            className="quiet-button"
            onClick={onToggleMuted}
            aria-label={isMuted ? "Turn sound on" : "Mute sound"}
          >
            {isMuted ? "sound off" : "sound on"}
          </button>
          <button type="button" className="quiet-button" onClick={onPause}>
            Pause
          </button>
        </div>
      </section>

      <div className="session-progress" aria-hidden="true">
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ transform: `scaleX(${runProgress})` }}
          />
        </div>
        <span className="progress-time">
          {DIFFICULTY_LABELS[settings.mode]}
        </span>
      </div>
    </>
  );
}

function HudStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="hud-stat">
      <span className="hud-stat-label">{label}</span>
      <span className="hud-stat-value">{value}</span>
    </div>
  );
}
