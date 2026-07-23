"use client";

type DemoIntroProps = {
  readonly onSkip: () => void;
  readonly onStart: () => void;
};

export function DemoIntro({ onSkip, onStart }: DemoIntroProps) {
  return (
    <div className="demo-intro" role="dialog" aria-label="First-time demo">
      <div className="demo-intro__panel">
        <p className="demo-intro__kicker">First run</p>
        <h1>Shortcut Hero</h1>
        <p>
          Cards race toward the strike line. Press the shortcut in time, chain
          hits, and survive speed-round interludes. Start slow—tempo climbs as
          you play.
        </p>
        <div className="demo-intro__actions">
          <button type="button" className="is-active" onClick={onStart}>
            play demo
          </button>
          <button type="button" onClick={onSkip}>
            skip
          </button>
        </div>
        <p className="demo-intro__hint">Esc skips anytime</p>
      </div>
    </div>
  );
}
