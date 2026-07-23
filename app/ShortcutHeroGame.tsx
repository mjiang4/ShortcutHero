"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { useGameAudio } from "./audio";
import {
  GameScene,
  KeyboardInstrument,
  type KeyboardFeedbackTone,
  type SceneCue,
  type SceneFeedback,
} from "./components/game";
import type {
  EffectsMode,
  LaunchSettings,
} from "./components/settings/settings";
import {
  ResultsScreen,
  SessionHud,
  SpeedRoundOverlay,
  UpcomingRail,
} from "./components/session";
import {
  APPROACH_DURATION_MS,
  createGameSession,
  getApproachProgress,
  getHighScoreKey,
  getSessionDurationSeconds,
  getTempoFactor,
  getShortcutReveal,
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
import { shouldTriggerInterlude } from "./gameplay/mini-games";
import {
  persistHighScore,
  readHighScore,
} from "./gameplay/result-storage";
import { persistRoundSummary } from "./persistence/round-client";
import {
  downloadScoreCardImage,
  shareScoreCard,
  type ShareResult,
} from "./platform/share-game";
import { getToolTheme, getToolTrack, isAvailableToolId } from "./tools";
import type { AvailableToolId } from "./tools";

type ViewPhase = "countdown" | "game" | "interlude" | "results";
type RunMode = "highway" | "speed_round" | "demo";
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
type KeyboardSignal = {
  id: number;
  keys: readonly string[];
  tone: KeyboardFeedbackTone;
  status: string;
};

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
  readonly launchSettings: LaunchSettings;
  readonly effectsMode: EffectsMode;
  readonly soundEnabled: boolean;
  readonly runMode?: RunMode;
  /** Compact surface for /embed — home restarts instead of leaving the frame. */
  readonly embedded?: boolean;
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
  launchSettings,
  effectsMode,
  soundEnabled,
  runMode = "highway",
  embedded = false,
}: ShortcutHeroGameProps) {
  const trackId: AvailableToolId = isAvailableToolId(settings.trackId ?? null)
    ? (settings.trackId as AvailableToolId)
    : "linear";
  const toolTheme = getToolTheme(trackId);
  const track = getToolTrack(trackId);
  const [viewPhase, setViewPhase] = useState<ViewPhase>(
    runMode === "speed_round" ? "interlude" : "countdown",
  );
  const [countdown, setCountdown] = useState(3);
  const [session, setSessionState] = useState<GameSession | null>(null);
  const [results, setResults] = useState<GameResults | null>(null);
  const [frameNow, setFrameNow] = useState(0);
  const [pressedKeys, setPressedKeys] = useState<readonly string[]>([]);
  const [feedback, setFeedback] = useState<SceneFeedback | null>(null);
  const [judgement, setJudgement] = useState<Judgement | null>(null);
  const [departingCues, setDepartingCues] = useState<readonly DepartingCue[]>([]);
  const [keyboardSignal, setKeyboardSignal] = useState<KeyboardSignal | null>(null);
  const [pauseMenuIndex, setPauseMenuIndex] = useState(0);
  const [resultsMenuIndex, setResultsMenuIndex] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isPersonalBest, setIsPersonalBest] = useState(false);
  const [shareResult, setShareResult] = useState<ShareResult | null>(null);
  const [streakFlash, setStreakFlash] = useState<"chain" | "break" | null>(null);
  const hitsSinceInterludeRef = useRef(0);
  const [interludeBonus, setInterludeBonus] = useState(0);
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const streakFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRef = useRef<GameSession | null>(null);
  const feedbackId = useRef(0);
  const judgementId = useRef(0);
  const judgementTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishAudioTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyboardSignalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const showKeyboardSignal = useCallback(
    (keys: readonly string[], tone: KeyboardFeedbackTone, status: string) => {
      feedbackId.current += 1;
      setKeyboardSignal({ id: feedbackId.current, keys, tone, status });
      if (keyboardSignalTimer.current) clearTimeout(keyboardSignalTimer.current);
      keyboardSignalTimer.current = setTimeout(
        () => setKeyboardSignal(null),
        760,
      );
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

  const flashStreak = useCallback((kind: "chain" | "break") => {
    setStreakFlash(kind);
    if (streakFlashTimer.current) clearTimeout(streakFlashTimer.current);
    streakFlashTimer.current = setTimeout(() => setStreakFlash(null), 700);
  }, []);

  const persistResults = useCallback((finished: GameResults, game: GameSession) => {
    const withBonus: GameResults = {
      ...finished,
      score: finished.score + interludeBonus,
    };
    setResults(withBonus);
    const personalBest = persistHighScore(withBonus, game);
    setIsPersonalBest(personalBest);
    setHighScore(Math.max(readHighScore(game), withBonus.score));
    void persistRoundSummary({
      session: game,
      results: withBonus,
      launch: launchSettings,
      runMode: runMode === "speed_round" ? "speed_round" : "highway",
    });
  }, [interludeBonus, launchSettings, runMode]);

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
            showKeyboardSignal([effect.code], "wrong", "wrong key · action missed");
            showJudgement("Wrong key", "miss");
            break;
          case "timing-input":
            showKeyboardSignal(
              [effect.code],
              "wrong",
              effect.timing === "too-early" ? "too early · action missed" : "too late",
            );
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
            const clean = effect.outcome === "clean";
            if (clean) playHit(effect.judgement, effect.combo);
            else playMiss();
            emitFeedback(clean ? "hit" : "miss", strength, resolvedPrompt?.promptId);
            retainResolvedCue(resolvedPrompt, clean ? "cleared" : "missed", nowMs);
            showKeyboardSignal(
              shortcutKeys(effect.shortcut),
              clean ? "hit" : "miss",
              clean ? `${effect.judgement} hit` : "recovered · counted as miss",
            );
            showJudgement(clean ? effect.judgement : "Miss", clean ? effect.judgement : "miss");
            if (clean && effect.combo > 1) flashStreak("chain");
            if (clean && runMode === "highway") {
              hitsSinceInterludeRef.current += 1;
              if (shouldTriggerInterlude(hitsSinceInterludeRef.current)) {
                hitsSinceInterludeRef.current = 0;
                const current = sessionRef.current;
                if (current?.phase === "playing") {
                  setSession(pauseSession(current, nowMs));
                  pauseAudio();
                  setViewPhase("interlude");
                }
              }
            }
            break;
          }
          case "combo-tier":
            playCombo(effect.combo);
            emitFeedback(
              "combo",
              effect.tier === "flow" ? 1 : 0.72,
              resolvedPrompt?.promptId,
            );
            flashStreak("chain");
            break;
          case "streak-break":
            flashStreak("break");
            emitFeedback("miss", 0.9);
            showJudgement(`Streak ×${effect.previousCombo} broken`, "miss");
            break;
          case "miss":
            playMiss();
            emitFeedback("miss", 0.86, resolvedPrompt?.promptId);
            retainResolvedCue(resolvedPrompt, "missed", nowMs);
            showKeyboardSignal(
              shortcutKeys(effect.shortcut),
              "miss",
              `correct shortcut: ${effect.shortcut.input.display}`,
            );
            showJudgement("Miss", "miss");
            if (effect.brokeStreak) flashStreak("break");
            break;
          case "finished":
            persistResults(effect.results, sourceSession);
            playCombo(12);
            if (finishAudioTimer.current) clearTimeout(finishAudioTimer.current);
            finishAudioTimer.current = setTimeout(stopAudio, 900);
            setResultsMenuIndex(0);
            setViewPhase("results");
            break;
        }
      }
    },
    [
      emitFeedback,
      flashStreak,
      pauseAudio,
      persistResults,
      playCombo,
      playHit,
      playMiss,
      retainResolvedCue,
      runMode,
      setSession,
      showJudgement,
      showKeyboardSignal,
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
          setPauseMenuIndex(0);
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
        setPauseMenuIndex(0);
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
      if (keyboardSignalTimer.current) clearTimeout(keyboardSignalTimer.current);
    },
    [],
  );

  const beginRun = useCallback(() => {
    setResults(null);
    setFeedback(null);
    setJudgement(null);
    setDepartingCues([]);
    setKeyboardSignal(null);
    setSession(null);
    setCountdown(3);
    hitsSinceInterludeRef.current = 0;
    setInterludeBonus(0);
    setShareResult(null);
    setIsPersonalBest(false);
    if (finishAudioTimer.current) clearTimeout(finishAudioTimer.current);
    void startAudio(settings.speed);
    setViewPhase(runMode === "speed_round" ? "interlude" : "countdown");
  }, [runMode, setSession, settings.speed, startAudio]);

  const returnToSettings = useCallback(() => {
    if (finishAudioTimer.current) clearTimeout(finishAudioTimer.current);
    stopAudio();
    setSession(null);
    setResults(null);
    setFeedback(null);
    setKeyboardSignal(null);
    setDepartingCues([]);
    if (embedded) {
      // Stay inside the iframe — restart the same embed URL.
      window.location.reload();
      return;
    }
    window.location.assign("/");
  }, [embedded, setSession, stopAudio]);

  const skipDemo = useCallback(() => {
    if (embedded) {
      window.location.reload();
      return;
    }
    window.location.assign("/");
  }, [embedded]);

  const shareResults = useCallback(() => {
    if (!results) return;
    void shareScoreCard({
      score: results.score,
      accuracyPct: results.accuracyPct,
      longestCombo: results.longestCombo,
      trackName: track.name,
      accent: toolTheme.accent,
      interludeBonus,
    }).then(setShareResult);
  }, [interludeBonus, results, toolTheme.accent, track.name]);

  const downloadCard = useCallback(() => {
    if (!results) return;
    void downloadScoreCardImage({
      score: results.score,
      accuracyPct: results.accuracyPct,
      longestCombo: results.longestCombo,
      trackName: track.name,
      accent: toolTheme.accent,
      interludeBonus,
    });
  }, [interludeBonus, results, toolTheme.accent, track.name]);

  const completeInterlude = useCallback(
    (mini: {
      readonly score: number;
      readonly accuracyPct: number;
      readonly longestCombo: number;
      readonly attempts: number;
      readonly correctAnswers: number;
      readonly misses: number;
      readonly durationMs: number;
    }) => {
      if (runMode === "speed_round") {
        const fakeSession = createGameSession(settings);
        const finished: GameResults = {
          score: mini.score,
          accuracyPct: mini.accuracyPct,
          longestCombo: mini.longestCombo,
          attempts: mini.attempts,
          cleanHits: mini.correctAnswers,
          recoveredHits: 0,
          misses: mini.misses,
          correctAnswers: mini.correctAnswers,
          uniqueShortcutsCorrect: mini.correctAnswers,
          durationMs: mini.durationMs,
          correctShortcuts: [],
          practice: [],
        };
        persistResults(finished, fakeSession);
        playCombo(12);
        setResultsMenuIndex(0);
        setViewPhase("results");
        return;
      }
      setInterludeBonus((bonus) => bonus + mini.score);
      const current = sessionRef.current;
      if (current?.phase === "paused") {
        void startAudio(settings.speed);
        const now = performance.now();
        setFrameNow(now);
        setSession(resumeSession(current, now));
      }
      setViewPhase("game");
    },
    [persistResults, playCombo, runMode, setSession, settings, startAudio],
  );

  const resume = useCallback(() => {
    const current = sessionRef.current;
    if (!current || current.phase !== "paused") return;
    void startAudio(settings.speed);
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

  useEffect(() => {
    const paused = viewPhase === "game" && session?.phase === "paused";
    const showingResults = viewPhase === "results" && results !== null;
    if (!paused && !showingResults) return;

    const onMenuKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const itemCount = paused ? 3 : 4;
      const currentIndex = paused ? pauseMenuIndex : resultsMenuIndex;
      const setIndex = paused ? setPauseMenuIndex : setResultsMenuIndex;

      if (event.code === "ArrowDown" || event.code === "ArrowRight" || event.code === "KeyS" || event.code === "KeyD") {
        event.preventDefault();
        setIndex((current) => (current + 1) % itemCount);
        return;
      }
      if (event.code === "ArrowUp" || event.code === "ArrowLeft" || event.code === "KeyW" || event.code === "KeyA") {
        event.preventDefault();
        setIndex((current) => (current - 1 + itemCount) % itemCount);
        return;
      }
      if (event.code === "Escape") {
        event.preventDefault();
        if (paused) void resume();
        else returnToSettings();
        return;
      }
      if (event.code !== "Enter" && event.code !== "Space") return;
      event.preventDefault();
      if (paused) {
        if (currentIndex === 0) void resume();
        else if (currentIndex === 1) beginRun();
        else returnToSettings();
      } else if (currentIndex === 0) shareResults();
      else if (currentIndex === 1) downloadCard();
      else if (currentIndex === 2) beginRun();
      else returnToSettings();
    };

    window.addEventListener("keydown", onMenuKey);
    return () => window.removeEventListener("keydown", onMenuKey);
  }, [
    beginRun,
    downloadCard,
    pauseMenuIndex,
    results,
    resultsMenuIndex,
    resume,
    returnToSettings,
    session?.phase,
    shareResults,
    viewPhase,
  ]);

  const visiblePromptTimings = useMemo(
    () => (session ? getVisiblePromptTimings(session, frameNow, 5) : []),
    [frameNow, session],
  );
  const shortcutRevealEarly = getShortcutReveal(
    settings,
    session?.startedAtMs ?? null,
    frameNow,
  );
  const shortcutOpacityEarly =
    shortcutRevealEarly === "full"
      ? 1
      : shortcutRevealEarly === "ghost"
        ? 0.28
        : 0;
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
        shortcutOpacity: shortcutOpacityEarly,
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
          shortcutOpacity: shortcutOpacityEarly,
        };
      });
    return [...resolved, ...live];
  }, [
    departingCues,
    frameNow,
    settings.speed,
    shortcutOpacityEarly,
    visiblePromptTimings,
  ]);

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
  void completed;
  const tempoFactor = getTempoFactor(
    settings,
    session?.startedAtMs ?? null,
    frameNow,
  );
  const shortcutReveal = shortcutRevealEarly;
  const showShortcutLabels = shortcutReveal !== "hidden";
  const instrumentGuidance =
    settings.assistance === "pro" || shortcutReveal === "hidden"
      ? "recall"
      : "learn";
  const keyboardHints = showShortcutLabels ? hintKeysFor(session) : [];
  const keyboardStatus = keyboardSignal?.status ?? (
    session?.active
      ? showShortcutLabels
        ? `shortcut: ${session.active.shortcut.input.display}`
        : "recall the shortcut"
      : "waiting for next action"
  );
  const elapsedLabel = `${Math.floor(elapsedMs / 1000 / 60)}:${String(
    Math.floor(elapsedMs / 1000) % 60,
  ).padStart(2, "0")}`;
  const upcomingItems = visiblePromptTimings.slice(0, 4).map((timing) => ({
    id: timing.promptId,
    action: timing.shortcut.action,
    shortcut: showShortcutLabels ? timing.shortcut.input.display : undefined,
    active: timing.state === "active",
  }));

  return (
    <main
      className={`shortcut-hero${embedded ? " shortcut-hero--embed" : ""}`}
      data-tool={trackId}
      data-embedded={embedded ? "true" : undefined}
      style={
        {
          "--tool-accent": toolTheme.accent,
          "--tool-accent-soft": toolTheme.accentSoft,
          "--tool-highway": toolTheme.highway,
          "--tool-glow": toolTheme.glow,
        } as CSSProperties
      }
    >
      <div className="game-canvas" aria-hidden="true">
        <GameScene
          cues={sceneCues}
          showShortcuts={showShortcutLabels}
          combo={session?.combo ?? 0}
          runProgress={runProgress}
          feedback={feedback}
          paused={session?.phase === "paused" || viewPhase === "interlude"}
          reducedMotion={reducedMotion}
          bloom={!reducedMotion}
          onReady={() => setSceneReady(true)}
        />
      </div>

      <div className="ui-layer">
        {runMode === "demo" ? (
          <button
            type="button"
            className="demo-skip"
            onClick={skipDemo}
          >
            Skip demo
          </button>
        ) : null}
        {viewPhase === "countdown" ? (
          <div className="countdown-overlay" aria-live="assertive">
            {sceneReady || runMode === "speed_round" ? (
              <span className="countdown-number" key={countdown}>
                {countdown}
              </span>
            ) : (
              <span className="countdown-loading">loading game…</span>
            )}
          </div>
        ) : null}

        {viewPhase === "interlude" ? (
          <SpeedRoundOverlay
            deck={
              runMode === "demo" || settings.mode === "showcase"
                ? track.showcase
                : track.decks[
                    settings.mode === "medium"
                      ? "medium"
                      : settings.mode === "hard"
                        ? "hard"
                        : "easy"
                  ]
            }
            title={runMode === "speed_round" ? "Speed Round" : "Interlude · Fast Fire"}
            promptCount={runMode === "speed_round" ? 8 : undefined}
            onComplete={completeInterlude}
          />
        ) : null}

        {viewPhase === "game" && session ? (
          <>
            <SessionHud
              score={session.score + interludeBonus}
              combo={session.combo}
              bestStreak={session.longestCombo}
              highScore={highScore}
              elapsedLabel={elapsedLabel}
              tempoFactor={tempoFactor}
              judgementLabel={judgement?.label ?? null}
              judgementTone={judgement?.tone ?? null}
              streakFlash={streakFlash}
            />

            <UpcomingRail
              items={upcomingItems}
              showShortcuts={showShortcutLabels}
            />

            <div className="session-progress" aria-hidden="true">
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ transform: `scaleX(${runProgress})` }}
                />
              </div>
              <span className="progress-time">
                {DIFFICULTY_LABELS[settings.mode]} ·{" "}
                {shortcutReveal === "full"
                  ? "Learn"
                  : shortcutReveal === "ghost"
                    ? "Fading keys"
                    : "Recall"}{" "}
                · {remainingSeconds}s
                {interludeBonus > 0
                  ? ` · +${interludeBonus.toLocaleString()} SR`
                  : ""}
              </span>
              <button
                type="button"
                className="quiet-button"
                onClick={toggleMuted}
                aria-label={isMuted ? "Turn sound on" : "Mute sound"}
              >
                {isMuted ? "sound off" : "sound on"}
              </button>
            </div>

            <KeyboardInstrument
              key={keyboardSignal?.id ?? "live-keyboard"}
              pressedKeys={pressedKeys}
              hintKeys={keyboardSignal ? [] : keyboardHints}
              feedbackKeys={keyboardSignal?.keys}
              feedbackTone={keyboardSignal?.tone}
              status={keyboardStatus}
              guidance={instrumentGuidance}
            />

            {session.phase === "paused" ? (
              <div className="pause-overlay">
                <div className="pause-card">
                  <h2>Paused</h2>
                  <p>Resume, restart, or return to the title screen.</p>
                  <div className="pause-actions">
                    <button
                      type="button"
                      className={`primary-button${pauseMenuIndex === 0 ? " is-selected" : ""}`}
                      onClick={resume}
                    >
                      Resume
                    </button>
                    <button
                      type="button"
                      className={`secondary-button${pauseMenuIndex === 1 ? " is-selected" : ""}`}
                      onClick={beginRun}
                    >
                      Restart
                    </button>
                    <button
                      type="button"
                      className={`secondary-button${pauseMenuIndex === 2 ? " is-selected" : ""}`}
                      onClick={returnToSettings}
                    >
                      {embedded ? "Restart" : "Title"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {viewPhase === "results" && results ? (
          <ResultsScreen
            results={results}
            trackName={track.name}
            highScore={highScore}
            isPersonalBest={isPersonalBest}
            leaderboardRank={null}
            shareResult={shareResult}
            accent={toolTheme.accent}
            interludeBonus={interludeBonus}
            menuIndex={resultsMenuIndex}
            onShare={shareResults}
            onDownloadCard={downloadCard}
            onPlayAgain={beginRun}
            onTitle={returnToSettings}
            homeLabel={embedded ? "Restart" : "Home"}
          />
        ) : null}

        <p className="screen-reader-only" aria-live="polite">
          {session?.active
            ? `${session.active.shortcut.action}. ${
                showShortcutLabels
                  ? session.active.shortcut.input.display
                  : "Recall the shortcut."
              }`
            : ""}
        </p>
      </div>
    </main>
  );
}
