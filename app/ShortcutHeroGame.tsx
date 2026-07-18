"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useGameAudio } from "./audio";
import { GameScene, type SceneCue, type SceneFeedback } from "./components/game";
import {
  APPROACH_DURATION_MS,
  createGameSession,
  getApproachProgress,
  getHighScoreKey,
  getVisiblePromptTimings,
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
  type HitJudgement,
  type ActivePrompt,
  type ShortcutDefinition,
  type SpeedPreset,
  type AssistanceMode,
} from "./game";

type ViewPhase = "menu" | "countdown" | "game" | "results";
type JudgementTone = HitJudgement | "miss" | "wait" | "sequence";
type Judgement = {
  id: number;
  label: string;
  detail?: string;
  tone: JudgementTone;
};
type DepartingCue = {
  prompt: ActivePrompt;
  state: "cleared" | "missed";
  resolvedAtMs: number;
  startProgress: number;
};

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
  { value: "standard", label: "Fast" },
  { value: "turbo", label: "Turbo" },
];

const SPEED_BPM: Readonly<Record<SpeedPreset, number>> = {
  relaxed: 120,
  standard: 150,
  turbo: 200,
};

const DEPARTURE_DURATION_MS = 820;

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
  const [departingCues, setDepartingCues] = useState<readonly DepartingCue[]>([]);
  const [highScore, setHighScore] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const sessionRef = useRef<GameSession | null>(null);
  const feedbackId = useRef(0);
  const judgementId = useRef(0);
  const judgementTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishAudioTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    isMuted,
    start: startAudio,
    pause: pauseAudio,
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

  const showJudgement = useCallback(
    (label: string, tone: JudgementTone, detail?: string) => {
      judgementId.current += 1;
      setJudgement({ id: judgementId.current, label, detail, tone });
      if (judgementTimer.current) clearTimeout(judgementTimer.current);
      judgementTimer.current = setTimeout(() => setJudgement(null), 680);
    },
    [],
  );

  const emitFeedback = useCallback(
    (type: SceneFeedback["type"], strength = 0.7, cueId?: string) => {
      feedbackId.current += 1;
      setFeedback({ id: feedbackId.current, type, strength, cueId });
    },
    [],
  );

  const retainResolvedCue = useCallback(
    (
      prompt: ActivePrompt | null,
      state: DepartingCue["state"],
      nowMs: number,
    ) => {
      if (!prompt) return;
      setDepartingCues((current) => [
        ...current.filter((cue) => cue.prompt.promptId !== prompt.promptId),
        {
          prompt,
          state,
          resolvedAtMs: nowMs,
          startProgress: getApproachProgress(prompt, nowMs),
        },
      ]);
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
    (
      effects: readonly GameEffect[],
      sourceSession: GameSession,
      resolvedPrompt: ActivePrompt | null,
      nowMs: number,
    ) => {
      for (const effect of effects) {
        switch (effect.type) {
          case "input-progress":
            showJudgement(
              `${effect.step} / ${effect.total}`,
              "sequence",
              "Finish inside the strike gate",
            );
            break;
          case "wrong-input":
            emitFeedback("recovered", 0.32);
            showJudgement("Wrong key", "miss", "Combo broken · recover it");
            break;
          case "timing-input":
            showJudgement(
              effect.timing === "too-early" ? "Too early" : "Too late",
              "wait",
              effect.timing === "too-early"
                ? "Wait for the strike gate"
                : "That cue has passed",
            );
            break;
          case "hit": {
            const strength =
              effect.judgement === "perfect"
                ? 1
                : effect.judgement === "good"
                  ? 0.82
                  : 0.62;
            playHit(effect.judgement, effect.combo);
            emitFeedback(
              effect.outcome === "clean" ? "hit" : "recovered",
              strength,
              resolvedPrompt?.promptId,
            );
            retainResolvedCue(resolvedPrompt, "cleared", nowMs);
            const offset = Math.round(Math.abs(effect.timingOffsetMs));
            const timingDetail =
              effect.judgement === "perfect"
                ? `${offset <= 12 ? "On beat" : `${offset} ms`} · +${effect.points}`
                : `${offset} ms ${effect.timingOffsetMs < 0 ? "early" : "late"} · +${effect.points}`;
            showJudgement(
              effect.outcome === "recovered"
                ? "Recovered"
                : effect.judgement,
              effect.judgement,
              timingDetail,
            );
            break;
          }
          case "combo-tier":
            playCombo(effect.combo);
            emitFeedback(
              "combo",
              effect.tier === "flow" ? 1 : 0.72,
              resolvedPrompt?.promptId,
            );
            break;
          case "miss":
            playMiss();
            emitFeedback("miss", 0.86, resolvedPrompt?.promptId);
            retainResolvedCue(resolvedPrompt, "missed", nowMs);
            showJudgement(
              "Miss",
              "miss",
              effect.requeued ? "Returning later" : "Cue lost",
            );
            break;
          case "finished":
            persistResults(effect.results, sourceSession);
            playCombo(12);
            if (finishAudioTimer.current) clearTimeout(finishAudioTimer.current);
            finishAudioTimer.current = setTimeout(stopAudio, 900);
            setViewPhase("results");
            break;
        }
      }
    },
    [
      emitFeedback,
      persistResults,
      playCombo,
      playHit,
      playMiss,
      retainResolvedCue,
      showJudgement,
      stopAudio,
    ],
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
    }, 60_000 / SPEED_BPM[settings.speed]);

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
        processEffects(update.effects, update.session, current.active, now);
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
          pauseAudio();
        }
        return;
      }

      if (current.phase !== "playing") return;
      setPressedKeys((keys) => [...new Set([...keys, event.code])]);
      window.setTimeout(
        () => setPressedKeys((keys) => keys.filter((key) => key !== event.code)),
        150,
      );

      const now = performance.now();
      const update = handleSessionKey(current, event, now);
      if (update.preventDefault) event.preventDefault();
      if (update.session !== current) setSession(update.session);
      processEffects(update.effects, update.session, current.active, now);
    };

    const releaseKey = (event: KeyboardEvent) => {
      setPressedKeys((keys) => keys.filter((key) => key !== event.code));
    };

    const pauseOnBlur = () => {
      const current = sessionRef.current;
      if (current?.phase === "playing") {
        setSession(pauseSession(current, performance.now()));
        pauseAudio();
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
  }, [pauseAudio, processEffects, setSession, viewPhase]);

  useEffect(
    () => () => {
      if (judgementTimer.current) clearTimeout(judgementTimer.current);
      if (finishAudioTimer.current) clearTimeout(finishAudioTimer.current);
    },
    [],
  );

  const beginRun = useCallback(() => {
    setResults(null);
    setFeedback(null);
    setJudgement(null);
    setDepartingCues([]);
    setSession(null);
    setCountdown(3);
    if (finishAudioTimer.current) clearTimeout(finishAudioTimer.current);
    void startAudio(settings.speed);
    setViewPhase("countdown");
  }, [setSession, settings.speed, startAudio]);

  const returnToMenu = useCallback(() => {
    if (finishAudioTimer.current) clearTimeout(finishAudioTimer.current);
    stopAudio();
    setSession(null);
    setResults(null);
    setFeedback(null);
    setDepartingCues([]);
    setViewPhase("menu");
  }, [setSession, stopAudio]);

  const resume = useCallback(async () => {
    const current = sessionRef.current;
    if (!current || current.phase !== "paused") return;
    await startAudio(settings.speed);
    const now = performance.now();
    const beatMs = 60_000 / SPEED_BPM[settings.speed];
    const pausedAt = current.pausedAtMs ?? now;
    const remainingToStrike = current.active
      ? Math.max(0, current.active.strikeAtMs - pausedAt)
      : beatMs;
    const beatsToStrike = Math.max(1, Math.ceil(remainingToStrike / beatMs));
    const alignedRemaining = beatsToStrike * beatMs + 35;
    const alignmentDelay = Math.max(0, alignedRemaining - remainingToStrike);
    const pausedFor = Math.max(0, now - pausedAt);
    setDepartingCues((cues) =>
      cues.map((cue) => ({
        ...cue,
        resolvedAtMs: cue.resolvedAtMs + pausedFor,
      })),
    );
    setFrameNow(now);
    setSession(resumeSession(current, now + alignmentDelay));
  }, [setSession, settings.speed, startAudio]);

  const visiblePromptTimings = useMemo(
    () => (session ? getVisiblePromptTimings(session, frameNow, 5) : []),
    [frameNow, session],
  );
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

    const live = visiblePromptTimings
      .filter((timing) => timing.progress > -0.1)
      .map<SceneCue>((timing) => ({
        id: timing.promptId,
        action: timing.shortcut.action,
        shortcut: timing.shortcut.input.display,
        keys: shortcutKeys(timing.shortcut),
        progress: timing.progress,
        state:
          timing.state === "active" && timing.canHit ? "active" : "upcoming",
        context: timing.shortcut.context,
        laneOffset: 0,
      }));
    const resolved = departingCues
      .filter((cue) => frameNow - cue.resolvedAtMs < DEPARTURE_DURATION_MS)
      .map<SceneCue>((cue) => {
        const elapsed = Math.max(0, frameNow - cue.resolvedAtMs);
        const travel = APPROACH_DURATION_MS[settings.speed];
        return {
          id: cue.prompt.promptId,
          action: cue.prompt.shortcut.action,
          shortcut: cue.prompt.shortcut.input.display,
          keys: shortcutKeys(cue.prompt.shortcut),
          progress: Math.min(1.4, cue.startProgress + (elapsed / travel) * 0.9),
          state: cue.state,
          context: cue.prompt.shortcut.context,
        };
      });
    return [...resolved, ...live];
  }, [departingCues, frameNow, settings.speed, viewPhase, visiblePromptTimings]);

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
                Hit the Linear shortcut as the action crosses the strike gate.
                Timing—not speed—builds your combo and wakes up the runway.
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
                      pauseAudio();
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
                <span className="judgement-label">{judgement.label}</span>
                {judgement.detail ? (
                  <span className="judgement-detail">{judgement.detail}</span>
                ) : null}
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
