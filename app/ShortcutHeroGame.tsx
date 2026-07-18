"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useGameAudio } from "./audio";
import { GameScene, type SceneCue, type SceneFeedback } from "./components/game";
import {
  createGameSession,
  getApproachProgress,
  getHighScoreKey,
  handleSessionKey,
  pauseSession,
  resumeSession,
  startSession,
  tickSession,
  type GameEffect,
  type GameMode,
  type GameResults,
  type GameSession,
  type GameSettings,
  type ShortcutDefinition,
  type SpeedPreset,
  type AssistanceMode,
} from "./game";

type ViewPhase = "menu" | "countdown" | "game" | "results";
type Judgement = { id: number; text: string; tone: "hit" | "miss" };

const SCORE_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const MODE_OPTIONS: readonly { value: GameMode; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
  { value: "showcase", label: "Mix" },
];

const ASSISTANCE_OPTIONS: readonly {
  value: AssistanceMode;
  label: string;
}[] = [
  { value: "novice", label: "Novice" },
  { value: "pro", label: "Pro" },
];

const SPEED_OPTIONS: readonly { value: SpeedPreset; label: string }[] = [
  { value: "relaxed", label: "Relaxed" },
  { value: "standard", label: "Standard" },
  { value: "turbo", label: "Turbo" },
];

const DEFAULT_SETTINGS: GameSettings = {
  mode: "showcase",
  assistance: "novice",
  speed: "standard",
};

function shortcutKeys(shortcut: ShortcutDefinition): readonly string[] {
  const { input } = shortcut;
  if (input.kind === "single") return [input.code];
  if (input.kind === "sequence") return input.codes;
  return ["SHIFT", input.code];
}

function hintKeysFor(session: GameSession | null): readonly string[] {
  if (!session?.active || session.settings.assistance !== "novice") return [];
  const { input } = session.active.shortcut;
  if (input.kind === "sequence") {
    return [input.codes[Math.min(session.input.sequenceIndex, 1)]];
  }
  return shortcutKeys(session.active.shortcut);
}

function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
}

export function ShortcutHeroGame() {
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [viewPhase, setViewPhase] = useState<ViewPhase>("menu");
  const [countdown, setCountdown] = useState(3);
  const [session, setSessionState] = useState<GameSession | null>(null);
  const [results, setResults] = useState<GameResults | null>(null);
  const [frameNow, setFrameNow] = useState(0);
  const [pressedKeys, setPressedKeys] = useState<readonly string[]>([]);
  const [feedback, setFeedback] = useState<SceneFeedback | null>(null);
  const [judgement, setJudgement] = useState<Judgement | null>(null);
  const [highScore, setHighScore] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const sessionRef = useRef<GameSession | null>(null);
  const feedbackId = useRef(0);
  const judgementId = useRef(0);
  const judgementTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    isMuted,
    start: startAudio,
    stop: stopAudio,
    toggleMuted,
    playStart,
    playHit,
    playMiss,
    playCombo,
  } = useGameAudio();

  const setSession = useCallback((next: GameSession | null) => {
    sessionRef.current = next;
    setSessionState(next);
  }, []);

  const showJudgement = useCallback((text: string, tone: "hit" | "miss") => {
    judgementId.current += 1;
    setJudgement({ id: judgementId.current, text, tone });
    if (judgementTimer.current) clearTimeout(judgementTimer.current);
    judgementTimer.current = setTimeout(() => setJudgement(null), 760);
  }, []);

  const emitFeedback = useCallback(
    (type: SceneFeedback["type"], strength = 0.7) => {
      feedbackId.current += 1;
      setFeedback({ id: feedbackId.current, type, strength });
    },
    [],
  );

  const persistResults = useCallback((finished: GameResults, game: GameSession) => {
    setResults(finished);
    const key = getHighScoreKey(game.settings);
    try {
      const previous = Number(window.localStorage.getItem(key) ?? 0);
      if (finished.score > previous) {
        window.localStorage.setItem(key, String(finished.score));
        setHighScore(finished.score);
      } else {
        setHighScore(previous);
      }
    } catch {
      // Local persistence is optional; a blocked storage API should not stop play.
    }
  }, []);

  const processEffects = useCallback(
    (effects: readonly GameEffect[], sourceSession: GameSession) => {
      for (const effect of effects) {
        switch (effect.type) {
          case "input-progress":
            showJudgement(`${effect.step} / ${effect.total}`, "hit");
            break;
          case "wrong-input":
            emitFeedback("recovered", 0.32);
            showJudgement("Try again", "miss");
            break;
          case "hit": {
            const perfect = effect.outcome === "clean" && effect.points >= 180;
            playHit(perfect ? "perfect" : "good");
            emitFeedback(effect.outcome === "clean" ? "hit" : "recovered");
            showJudgement(
              effect.outcome === "recovered"
                ? `Recovered  +${effect.points}`
                : `${perfect ? "Instant" : "Clear"}  +${effect.points}`,
              "hit",
            );
            break;
          }
          case "combo-tier":
            playCombo(effect.combo);
            emitFeedback("combo", effect.tier === "flow" ? 1 : 0.72);
            showJudgement(effect.tier === "flow" ? "Flow state" : `${effect.combo} combo`, "hit");
            break;
          case "miss":
            playMiss();
            emitFeedback("miss", 0.78);
            showJudgement(effect.requeued ? "Miss · returning later" : "Miss", "miss");
            break;
          case "finished":
            persistResults(effect.results, sourceSession);
            playCombo(12);
            setTimeout(stopAudio, 900);
            setViewPhase("results");
            break;
        }
      }
    },
    [emitFeedback, persistResults, playCombo, playHit, playMiss, showJudgement, stopAudio],
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const key = getHighScoreKey(settings);
    const frame = window.requestAnimationFrame(() => {
      try {
        setHighScore(Number(window.localStorage.getItem(key) ?? 0));
      } catch {
        setHighScore(0);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [settings]);

  useEffect(() => {
    if (viewPhase !== "countdown") return;

    let next = 3;
    const timer = window.setInterval(() => {
      next -= 1;
      if (next > 0) {
        setCountdown(next);
        return;
      }

      window.clearInterval(timer);
      const now = performance.now();
      const nextSession = startSession(createGameSession(settings), now);
      setFrameNow(now);
      setSession(nextSession);
      playStart();
      setViewPhase("game");
    }, 720);

    return () => window.clearInterval(timer);
  }, [playStart, setSession, settings, viewPhase]);

  useEffect(() => {
    if (viewPhase !== "game" || session?.phase !== "playing") return;

    let animationFrame = 0;
    let lastRenderAt = 0;
    const runFrame = (now: number) => {
      const current = sessionRef.current;
      if (!current || current.phase !== "playing") return;

      const update = tickSession(current, now);
      if (update.session !== current) {
        setSession(update.session);
        processEffects(update.effects, update.session);
      }
      if (now - lastRenderAt >= 30) {
        lastRenderAt = now;
        setFrameNow(now);
      }
      animationFrame = window.requestAnimationFrame(runFrame);
    };

    animationFrame = window.requestAnimationFrame(runFrame);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [processEffects, session?.phase, setSession, viewPhase]);

  useEffect(() => {
    if (viewPhase !== "game") return;

    const pressKey = (event: KeyboardEvent) => {
      if (isTextEntry(event.target)) return;
      const current = sessionRef.current;
      if (!current) return;

      if (event.code === "Escape") {
        event.preventDefault();
        if (current.phase === "playing") {
          setSession(pauseSession(current, performance.now()));
        }
        return;
      }

      if (current.phase !== "playing") return;
      setPressedKeys((keys) => [...new Set([...keys, event.code])]);
      window.setTimeout(
        () => setPressedKeys((keys) => keys.filter((key) => key !== event.code)),
        150,
      );

      const update = handleSessionKey(current, event, performance.now());
      if (update.preventDefault) event.preventDefault();
      if (update.session !== current) setSession(update.session);
      processEffects(update.effects, update.session);
    };

    const releaseKey = (event: KeyboardEvent) => {
      setPressedKeys((keys) => keys.filter((key) => key !== event.code));
    };

    const pauseOnBlur = () => {
      const current = sessionRef.current;
      if (current?.phase === "playing") {
        setSession(pauseSession(current, performance.now()));
      }
      setPressedKeys([]);
    };

    window.addEventListener("keydown", pressKey, { capture: true });
    window.addEventListener("keyup", releaseKey, { capture: true });
    window.addEventListener("blur", pauseOnBlur);
    document.addEventListener("visibilitychange", pauseOnBlur);
    return () => {
      window.removeEventListener("keydown", pressKey, { capture: true });
      window.removeEventListener("keyup", releaseKey, { capture: true });
      window.removeEventListener("blur", pauseOnBlur);
      document.removeEventListener("visibilitychange", pauseOnBlur);
    };
  }, [processEffects, setSession, viewPhase]);

  useEffect(
    () => () => {
      if (judgementTimer.current) clearTimeout(judgementTimer.current);
    },
    [],
  );

  const beginRun = useCallback(() => {
    setResults(null);
    setFeedback(null);
    setJudgement(null);
    setSession(null);
    setCountdown(3);
    void startAudio();
    setViewPhase("countdown");
  }, [setSession, startAudio]);

  const returnToMenu = useCallback(() => {
    stopAudio();
    setSession(null);
    setResults(null);
    setFeedback(null);
    setViewPhase("menu");
  }, [setSession, stopAudio]);

  const resume = useCallback(() => {
    const current = sessionRef.current;
    if (!current || current.phase !== "paused") return;
    void startAudio();
    setSession(resumeSession(current, performance.now()));
  }, [setSession, startAudio]);

  const progress = getApproachProgress(session?.active ?? null, frameNow);
  const sceneCues = useMemo<readonly SceneCue[]>(() => {
    if (viewPhase === "menu") {
      return [
        {
          id: "menu-preview",
          action: "Go to Inbox",
          shortcut: "G  →  I",
          keys: ["KeyG", "KeyI"],
          progress: 0.58,
          state: "active",
          context: "Linear navigation",
        },
      ];
    }

    if (!session?.active) return [];
    const active: SceneCue = {
      id: session.active.promptId,
      action: session.active.shortcut.action,
      shortcut: session.active.shortcut.input.display,
      keys: shortcutKeys(session.active.shortcut),
      progress,
      state: "active",
      context: session.active.shortcut.context,
    };
    const future = session.queue.slice(0, 2).map<SceneCue>((queued, index) => ({
      id: queued.promptId,
      action: queued.shortcut.action,
      shortcut: queued.shortcut.input.display,
      keys: shortcutKeys(queued.shortcut),
      progress: Math.max(-0.06, progress - (index + 1) * 0.31),
      state: "upcoming",
      context: queued.shortcut.context,
      laneOffset: index === 0 ? -0.55 : 0.55,
    }));
    return [active, ...future];
  }, [progress, session, viewPhase]);

  const completed = session?.attempts.length ?? 0;
  const remaining = (session?.queue.length ?? 0) + (session?.active ? 1 : 0);
  const totalPrompts = completed + remaining;
  const runProgress = totalPrompts === 0 ? 0 : completed / totalPrompts;
  const accuracy =
    completed === 0
      ? 100
      : Math.round(
          (session!.attempts.filter((attempt) => attempt.outcome !== "miss").length /
            completed) *
            100,
        );

  return (
    <main className="shortcut-hero">
      <div className="game-canvas" aria-hidden="true">
        <GameScene
          cues={sceneCues}
          pressedKeys={pressedKeys}
          hintKeys={hintKeysFor(session)}
          showShortcuts={settings.assistance === "novice"}
          combo={session?.combo ?? 0}
          feedback={feedback}
          paused={session?.phase === "paused"}
          reducedMotion={reducedMotion}
          bloom={!reducedMotion}
        />
      </div>

      <div className="ui-layer">
        <header className="topbar">
          <div className="brand" aria-label="Shortcut Hero">
            <span className="brand-mark" aria-hidden="true" />
            Shortcut Hero
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className="edition-badge">
              <span className="status-dot" aria-hidden="true" />
              Linear edition · macOS
            </span>
            <button
              type="button"
              className="quiet-button"
              onClick={toggleMuted}
              aria-label={isMuted ? "Turn sound on" : "Mute sound"}
            >
              {isMuted ? "Sound off" : "Sound on"}
            </button>
          </div>
        </header>

        {viewPhase === "menu" ? (
          <section className="screen menu-screen" aria-labelledby="game-title">
            <div className="menu-panel">
              <p className="eyebrow">Build recall. Enter flow.</p>
              <h1 className="hero-title" id="game-title">
                Shortcut <span>Hero</span>
              </h1>
              <p className="hero-copy">
                Enter the Linear shortcut before the action reaches the strike line.
                Clean hits build your combo—and wake up the runway.
              </p>

              <div className="menu-controls">
                <SettingControl
                  label="Difficulty"
                  value={settings.mode}
                  options={MODE_OPTIONS}
                  onChange={(mode) => setSettings((current) => ({ ...current, mode }))}
                />
                <SettingControl
                  label="Guidance"
                  value={settings.assistance}
                  options={ASSISTANCE_OPTIONS}
                  onChange={(assistance) =>
                    setSettings((current) => ({ ...current, assistance }))
                  }
                />
                <SettingControl
                  label="Speed"
                  value={settings.speed}
                  options={SPEED_OPTIONS}
                  onChange={(speed) => setSettings((current) => ({ ...current, speed }))}
                />
              </div>

              <div className="menu-actions">
                <button type="button" className="primary-button" onClick={beginRun}>
                  Start {settings.mode === "showcase" ? "showcase" : `${settings.mode} run`}
                  <span aria-hidden="true">→</span>
                </button>
              </div>

              <div className="menu-meta">
                <span className="high-score">
                  Personal best
                  <strong>{SCORE_FORMATTER.format(highScore)}</strong>
                </span>
                <span className="keycaps-demo" aria-label="Example shortcut G then I">
                  <span className="keycap">G</span>
                  <span className="key-separator">→</span>
                  <span className="keycap">I</span>
                </span>
              </div>
              <p className="unsupported-note">A physical keyboard is required to play.</p>
            </div>
            <div className="menu-preview" aria-hidden="true" />
          </section>
        ) : null}

        {viewPhase === "countdown" ? (
          <div className="countdown-overlay" aria-live="assertive">
            <span className="countdown-number" key={countdown}>
              {countdown}
            </span>
          </div>
        ) : null}

        {viewPhase === "game" && session ? (
          <>
            <section className="hud" aria-label="Current game status">
              <div className="hud-cluster">
                <HudStat label="Score" value={SCORE_FORMATTER.format(session.score)} />
                <HudStat label="Accuracy" value={`${accuracy}%`} />
              </div>
              <div className="combo-display" aria-live="polite">
                <span className="combo-value">{session.combo}</span>
                <span className="combo-label">
                  {session.combo >= 9 ? "Flow state" : "Combo"}
                </span>
              </div>
              <div className="hud-cluster is-right">
                <HudStat
                  label="Mode"
                  value={`${settings.mode === "showcase" ? "Mix" : settings.mode} · ${settings.assistance}`}
                />
                <button
                  type="button"
                  className="quiet-button"
                  onClick={() => {
                    const current = sessionRef.current;
                    if (current?.phase === "playing") {
                      setSession(pauseSession(current, performance.now()));
                    }
                  }}
                >
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
                {completed}/{Math.max(totalPrompts, completed)}
              </span>
            </div>

            {judgement ? (
              <div
                key={judgement.id}
                className={`judgement-toast is-${judgement.tone}`}
                aria-live="polite"
              >
                {judgement.text}
              </div>
            ) : null}

            {session.phase === "paused" ? (
              <div className="pause-overlay">
                <div className="pause-card">
                  <p className="eyebrow">Run paused</p>
                  <h2>Hold that thought.</h2>
                  <p>Your prompt is frozen. Resume when your hands are ready.</p>
                  <div className="pause-actions">
                    <button type="button" className="primary-button" onClick={resume}>
                      Resume
                    </button>
                    <button type="button" className="secondary-button" onClick={returnToMenu}>
                      End run
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {viewPhase === "results" && results ? (
          <section className="results-screen" aria-labelledby="results-title">
            <div className="results-card">
              <p className="eyebrow">Run complete</p>
              <h1 id="results-title">
                {results.accuracyPct >= 90
                  ? "Shortcut instinct."
                  : results.accuracyPct >= 70
                    ? "Finding the flow."
                    : "Memory in motion."}
              </h1>
              <p className="results-subtitle">
                {results.practice.length === 0
                  ? "Clean run. Try Pro mode or turn up the speed."
                  : "The misses below are already queued for your next run."}
              </p>

              <div className="results-score">
                <span className="results-score-label">Final score</span>
                <span className="results-score-value">
                  {SCORE_FORMATTER.format(results.score)}
                </span>
              </div>

              <div className="results-grid">
                <ResultStat label="Accuracy" value={`${results.accuracyPct}%`} />
                <ResultStat label="Best combo" value={String(results.longestCombo)} />
                <ResultStat label="Shortcuts" value={String(results.uniqueShortcutsCorrect)} />
              </div>

              {results.practice.length > 0 ? (
                <ul className="review-list" aria-label="Shortcuts to practise">
                  {results.practice.map((item) => (
                    <li className="review-item" key={item.shortcut.id}>
                      <span>{item.shortcut.action}</span>
                      <span className="review-shortcut">{item.shortcut.input.display}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="results-actions">
                <button type="button" className="primary-button" onClick={beginRun}>
                  Play again
                </button>
                <button type="button" className="secondary-button" onClick={returnToMenu}>
                  Change mode
                </button>
              </div>
            </div>
          </section>
        ) : null}

        <p className="screen-reader-only" aria-live="polite">
          {session?.active
            ? `${session.active.shortcut.action}. ${settings.assistance === "novice" ? session.active.shortcut.input.display : "Recall the shortcut."}`
            : ""}
        </p>
      </div>
    </main>
  );
}

function SettingControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="control-row">
      <span className="control-label">{label}</span>
      <div className="segmented" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            type="button"
            className={`segment ${option.value === value ? "is-active" : ""}`}
            aria-pressed={option.value === value}
            key={option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
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

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="result-stat">
      <span className="result-stat-label">{label}</span>
      <span className="result-stat-value">{value}</span>
    </div>
  );
}
