"use client";

type SessionHudProps = {
  readonly score: number;
  readonly combo: number;
  readonly bestStreak: number;
  readonly highScore: number;
  readonly elapsedLabel: string;
  readonly tempoFactor: number;
  readonly judgementLabel: string | null;
  readonly judgementTone: string | null;
  readonly streakFlash: "chain" | "break" | null;
};

const SCORE_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

export function SessionHud({
  score,
  combo,
  bestStreak,
  highScore,
  elapsedLabel,
  tempoFactor,
  judgementLabel,
  judgementTone,
  streakFlash,
}: SessionHudProps) {
  const pacePct = Math.round((tempoFactor - 1) * 100);
  return (
    <div className="session-hud" aria-live="polite">
      <div className="session-hud__score">
        <span className="session-hud__label">score</span>
        <strong>{SCORE_FORMATTER.format(score)}</strong>
        <span className="session-hud__sub">best {SCORE_FORMATTER.format(highScore)}</span>
      </div>
      <div
        className={`session-hud__combo${streakFlash === "chain" ? " is-chain" : ""}${streakFlash === "break" ? " is-break" : ""}`}
      >
        <strong>×{combo}</strong>
        <span>combo</span>
        <span className="session-hud__sub">streak max ×{bestStreak}</span>
      </div>
      <div className="session-hud__meta">
        <span>{elapsedLabel}</span>
        <span className="session-hud__tempo">+{pacePct}% tempo</span>
      </div>
      {judgementLabel ? (
        <div className={`session-hud__judgement tone-${judgementTone ?? "wait"}`}>
          {judgementLabel}
        </div>
      ) : null}
    </div>
  );
}
