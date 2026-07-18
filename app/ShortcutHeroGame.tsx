"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useGameAudio } from "./audio";
import { GameScene, type SceneCue, type SceneFeedback } from "./components/game";
import type { EffectsMode } from "./components/settings/settings";
import {
  APPROACH_DURATION_MS,
  createGameSession,
  getApproachProgress,
  getHighScoreKey,
  getSessionDurationSeconds,
  getVisiblePromptTimings,
  handleSessionKey,
  pauseSession,
  resumeSession,
  startSession,
  tickSession,
  type GameEffect,
  type GameResults,
  type GameSession,
  type GameSettings,
  type HitJudgement,
  type ActivePrompt,
  type ShortcutDefinition,
} from "./game";

type ViewPhase = "countdown" | "game" | "results";
type JudgementTone = HitJudgement | "miss" | "wait" | "sequence";
type Judgement = {
  id: number;
  label: string;
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

const SPEED_BPM = {
  relaxed: 140,
  standard: 180,
  turbo: 220,
};

const DIFFICULTY_LABELS = {
  easy: "Novice · Single",
  medium: "Medium · Sequence",
  hard: "Hard · Chord",
  showcase: "All skills",
};

const DEPARTURE_DURATION_MS = 560;

export interface ShortcutHeroGameProps {
  readonly settings: GameSettings;
  readonly effectsMode: EffectsMode;
  readonly soundEnabled: boolean;
}

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

export function ShortcutHeroGame({
  settings,
  effectsMode,
  soundEnabled,
}: ShortcutHeroGameProps) {
  const [viewPhase, setViewPhase] = useState<ViewPhase>("countdown");
  const [countdown, setCountdown] = useState(3);
  const [session, setSessionState] = useState<GameSession | null>(null);
  const [results, setResults] = useState<GameResults | null>(null);
  const [frameNow, setFrameNow] = useState(0);
  const [pressedKeys, setPressedKeys] = useState<readonly string[]>([]);
  const [feedback, setFeedback] = useState<SceneFeedback | null>(null);
  const [judgement, setJudgement] = useState<Judgement | null>(null);
  const [departingCues, setDepartingCues] = useState<readonly DepartingCue[]>([]);
  const [, setHighScore] = useState(0);
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const sessionRef = useRef<GameSession | null>(null);
  const feedbackId = useRef(0);
  const judgementId = useRef(0);
  const judgementTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishAudioTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    isReady,
    isMuted,
    start: startAudio,
    pause: pauseAudio,
    stop: stopAudio,
    setMuted,
    toggleMuted,
    playStart,
    playHit,
    playMiss,
    playCombo,
  } = useGameAudio();

  const reducedMotion =
    effectsMode === "reduced" ||
    (effectsMode === "system" && systemReducedMotion);

  const setSession = useCallback((next: GameSession | null) => {
    sessionRef.current = next;
    setSessionState(next);
  }, []);

  const showJudgement = useCallback(
    (label: string, tone: JudgementTone) => {
      judgementId.current += 1;
      setJudgement({ id: judgementId.current, label, tone });
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
            showJudgement(`${effect.step} / ${effect.total}`, "sequence");
            break;
          case "wrong-input":
            emitFeedback("recovered", 0.32);
            showJudgement("Wrong key", "miss");
            break;
          case "timing-input":
            showJudgement(
              effect.timing === "too-early" ? "Too early" : "Too late",
              "wait",
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
            showJudgement(
              effect.outcome === "recovered"
                ? "Recovered"
                : effect.judgement,
              effect.judgement,
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
            showJudgement("Miss", "miss");
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
    const update = () => setSystemReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    setMuted(!soundEnabled);
    if (sceneReady) void startAudio(settings.speed);
  }, [sceneReady, setMuted, settings.speed, soundEnabled, startAudio]);

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
    if (viewPhase !== "countdown" || !sceneReady) return;

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
  }, [playStart, sceneReady, setSession, settings, viewPhase]);

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
      if (!isReady) void startAudio(settings.speed);
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
  }, [
    isReady,
    pauseAudio,
    processEffects,
    setSession,
    settings.speed,
    startAudio,
    viewPhase,
  ]);

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

  const returnToSettings = useCallback(() => {
    if (finishAudioTimer.current) clearTimeout(finishAudioTimer.current);
    stopAudio();
    setSession(null);
    setResults(null);
    setFeedback(null);
    setDepartingCues([]);
    window.location.assign("/");
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
  }, [departingCues, frameNow, settings.speed, visiblePromptTimings]);

  const completed = session?.attempts.length ?? 0;
  const sessionDurationMs = getSessionDurationSeconds(settings) * 1_000;
  const elapsedMs = session?.startedAtMs
    ? Math.max(0, frameNow - session.startedAtMs)
    : 0;
  const runProgress = Math.min(1, elapsedMs / sessionDurationMs);
  const remainingSeconds = Math.max(
    0,
    Math.ceil((sessionDurationMs - elapsedMs) / 1_000),
  );
  const accuracy =
    completed === 0
      ? 100
      : Math.round(
          (session!.attempts.filter((attempt) => attempt.outcome !== "miss").length /
            completed) *
            100,
        );
  const actLabel =
    runProgress < 0.18
      ? "Ignition"
      : runProgress < 0.56
        ? "Acceleration"
        : runProgress < 0.84
          ? "Flow"
          : "Overload";

  return (
    <main className="shortcut-hero">
      <div className="game-canvas" aria-hidden="true">
        <GameScene
          cues={sceneCues}
          pressedKeys={pressedKeys}
          hintKeys={hintKeysFor(session)}
          showShortcuts={settings.assistance === "novice"}
          combo={session?.combo ?? 0}
          runProgress={runProgress}
          feedback={feedback}
          paused={session?.phase === "paused"}
          reducedMotion={reducedMotion}
          bloom={!reducedMotion}
          onReady={() => setSceneReady(true)}
        />
      </div>

      <div className="ui-layer">
        {viewPhase === "countdown" ? (
          <div className="countdown-overlay" aria-live="assertive">
            {sceneReady ? (
              <span className="countdown-number" key={countdown}>
                {countdown}
              </span>
            ) : (
              <span className="countdown-loading">loading game…</span>
            )}
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
                  label={actLabel}
                  value={`${remainingSeconds}s`}
                />
                <button
                  type="button"
                  className="quiet-button"
                  onClick={toggleMuted}
                  aria-label={isMuted ? "Turn sound on" : "Mute sound"}
                >
                  {isMuted ? "sound off" : "sound on"}
                </button>
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
                {DIFFICULTY_LABELS[settings.mode]} · {settings.assistance === "novice" ? "Learn" : "Recall"}
              </span>
            </div>

            {judgement ? (
              <div
                key={judgement.id}
                className={`judgement-toast is-${judgement.tone}`}
                aria-live="polite"
              >
                <span className="judgement-label">{judgement.label}</span>
              </div>
            ) : null}

            {session.phase === "paused" ? (
              <div className="pause-overlay">
                <div className="pause-card">
                  <h2>Paused</h2>
                  <p>Resume, restart, or return to the title screen.</p>
                  <div className="pause-actions">
                    <button type="button" className="primary-button" onClick={resume}>
                      Resume
                    </button>
                    <button type="button" className="secondary-button" onClick={beginRun}>
                      Restart
                    </button>
                    <button type="button" className="secondary-button" onClick={returnToSettings}>
                      Title
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
              <h1 id="results-title">Run complete</h1>
              <p className="results-subtitle">
                {results.correctAnswers} correct · {results.misses} missed
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
                <ResultStat
                  label="Unique shortcuts"
                  value={String(results.uniqueShortcutsCorrect)}
                />
              </div>

              {results.correctShortcuts.length > 0 ? (
                <section className="results-breakdown" aria-labelledby="correct-shortcuts-title">
                  <h2 id="correct-shortcuts-title">You got these right</h2>
                  <ul className="correct-list">
                    {results.correctShortcuts.map((item) => (
                      <li className="correct-item" key={item.shortcut.id}>
                        <span className="correct-item__identity">
                          <strong>{item.shortcut.action}</strong>
                          <span className="review-shortcut">{item.shortcut.input.display}</span>
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
                <section className="results-breakdown" aria-labelledby="practice-shortcuts-title">
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

              <div className="results-actions">
                <button type="button" className="primary-button" onClick={beginRun}>
                  Play again
                </button>
                <button type="button" className="secondary-button" onClick={returnToSettings}>
                  Title
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
