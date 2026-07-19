import type { GameSession, GameSettings } from "../../game";
import { DIFFICULTY_LABELS, SCORE_FORMATTER } from "../../gameplay/constants";

type SessionHudProps = {
  readonly session: GameSession;
  readonly settings: GameSettings;
  readonly accuracy: number;
  readonly actLabel: string;
  readonly remainingSeconds: number;
  readonly runProgress: number;
  readonly isMuted: boolean;
  readonly onToggleMuted: () => void;
  readonly onPause: () => void;
};

export function SessionHud({
  session,
  settings,
  accuracy,
  actLabel,
  remainingSeconds,
  runProgress,
  isMuted,
  onToggleMuted,
  onPause,
}: SessionHudProps) {
  return (
    <>
      <section className="hud" aria-label="Current game status">
        <div className="hud-cluster">
          <HudStat
            label="Score"
            value={SCORE_FORMATTER.format(session.score)}
          />
          <HudStat label="Accuracy" value={`${accuracy}%`} />
        </div>
        <div className="combo-display" aria-live="polite">
          <span className="combo-value">{session.combo}</span>
          <span className="combo-label">
            {session.combo >= 9 ? "Flow state" : "Combo"}
          </span>
        </div>
        <div className="hud-cluster is-right">
          <HudStat label={actLabel} value={`${remainingSeconds}s`} />
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
          {DIFFICULTY_LABELS[settings.mode]} ·{" "}
          {settings.assistance === "novice" ? "Learn" : "Recall"}
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
