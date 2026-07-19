"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  analytics,
  buildGameAnalyticsContext,
  buildResultAnalyticsSummary,
} from "../analytics";
import { useGameAudio } from "../audio";
import type { EffectsMode } from "../components/settings/settings";
import {
  createGameSession,
  pauseSession,
  resumeSession,
  startSession,
  type GameResults,
  type GameSession,
  type GameSettings,
} from "../game";
import { persistRoundSummary } from "../persistence/round-client";
import { SPEED_BPM } from "./constants";
import { persistHighScore } from "./result-storage";
import {
  buildSceneCues,
  calculateRuntimeMetrics,
  hintKeysFor,
} from "./runtime-view";
import { useCountdown } from "./use-countdown";
import { useGameFeedback } from "./use-game-feedback";
import { useGameplayInput } from "./use-gameplay-input";
import { useOverlayMenuNavigation } from "./use-overlay-menu-navigation";
import { useSessionTicker } from "./use-session-ticker";
import { useSystemReducedMotion } from "./use-system-reduced-motion";
import type { ViewPhase } from "./types";

type GameControllerOptions = {
  readonly settings: GameSettings;
  readonly effectsMode: EffectsMode;
  readonly soundEnabled: boolean;
};

export function useGameController({
  settings,
  effectsMode,
  soundEnabled,
}: GameControllerOptions) {
  const [viewPhase, setViewPhase] = useState<ViewPhase>("countdown");
  const [countdown, setCountdown] = useState(3);
  const [session, setSessionState] = useState<GameSession | null>(null);
  const [results, setResults] = useState<GameResults | null>(null);
  const [frameNow, setFrameNow] = useState(0);
  const [pressedKeys, setPressedKeys] = useState<readonly string[]>([]);
  const [pauseMenuIndex, setPauseMenuIndex] = useState(0);
  const [resultsMenuIndex, setResultsMenuIndex] = useState(0);
  const [sceneReady, setSceneReady] = useState(false);
  const sessionRef = useRef<GameSession | null>(null);
  const runNumberRef = useRef(0);
  const {
    isReady: audioReady,
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
  const reducedMotion = useSystemReducedMotion(effectsMode);
  const analyticsContext = useMemo(
    () => buildGameAnalyticsContext(settings, effectsMode, soundEnabled),
    [effectsMode, settings, soundEnabled],
  );

  const setSession = useCallback((next: GameSession | null) => {
    sessionRef.current = next;
    setSessionState(next);
  }, []);

  const handleFinished = useCallback(
    (finished: GameResults, sourceSession: GameSession) => {
      const isPersonalBest = persistHighScore(finished, sourceSession);
      void persistRoundSummary(
        finished,
        sourceSession,
        effectsMode,
        soundEnabled,
      );
      const resultSummary = buildResultAnalyticsSummary(finished);
      analytics.capture("game_completed", {
        ...analyticsContext,
        ...resultSummary,
      });
      analytics.capture("results_viewed", {
        ...analyticsContext,
        ...resultSummary,
      });
      if (isPersonalBest) {
        analytics.capture("personal_best_achieved", {
          ...analyticsContext,
          score: finished.score,
          accuracy_pct: finished.accuracyPct,
        });
      }
      setResults(finished);
      setResultsMenuIndex(0);
      setViewPhase("results");
    },
    [analyticsContext, effectsMode, soundEnabled],
  );

  const feedbackAudio = useMemo(
    () => ({
      playHit,
      playMiss,
      playCombo,
      stop: stopAudio,
    }),
    [playCombo, playHit, playMiss, stopAudio],
  );
  const {
    feedback,
    judgement,
    departingCues,
    keyboardSignal,
    processEffects,
    resetFeedback,
    shiftDepartingCues,
  } = useGameFeedback({
    audio: feedbackAudio,
    onFinished: handleFinished,
  });

  useEffect(() => {
    setMuted(!soundEnabled);
    if (sceneReady && soundEnabled) void startAudio(settings.speed);
  }, [sceneReady, setMuted, settings.speed, soundEnabled, startAudio]);

  const completeCountdown = useCallback(() => {
    const now = performance.now();
    const nextSession = startSession(createGameSession(settings), now);
    setFrameNow(now);
    setSession(nextSession);
    runNumberRef.current += 1;
    analytics.capture("game_started", {
      ...analyticsContext,
      run_number: runNumberRef.current,
    });
    playStart();
    setViewPhase("game");
  }, [analyticsContext, playStart, setSession, settings]);

  useCountdown({
    active: viewPhase === "countdown",
    sceneReady,
    speed: settings.speed,
    setCountdown,
    onComplete: completeCountdown,
  });

  useSessionTicker({
    active: viewPhase === "game" && session?.phase === "playing",
    sessionRef,
    setSession,
    setFrameNow,
    processEffects,
  });

  const pause = useCallback(() => {
    const current = sessionRef.current;
    if (current?.phase !== "playing") return;
    setPauseMenuIndex(0);
    setSession(pauseSession(current, performance.now()));
    pauseAudio();
  }, [pauseAudio, setSession]);

  useGameplayInput({
    active: viewPhase === "game",
    audioEnabled: soundEnabled,
    audioReady,
    speed: settings.speed,
    sessionRef,
    setSession,
    setPressedKeys,
    startAudio,
    pause,
    processEffects,
  });

  const captureAbandonment = useCallback(
    (reason: "restart" | "title" | "page_exit") => {
      const current = sessionRef.current;
      if (
        !current ||
        (current.phase !== "playing" && current.phase !== "paused")
      ) {
        return;
      }
      analytics.capture("game_abandoned", {
        ...analyticsContext,
        reason,
        attempts: current.attempts.length,
        score: current.score,
      });
    },
    [analyticsContext],
  );

  useEffect(() => {
    const onPageExit = () => captureAbandonment("page_exit");
    window.addEventListener("pagehide", onPageExit);
    return () => window.removeEventListener("pagehide", onPageExit);
  }, [captureAbandonment]);

  const beginRun = useCallback(() => {
    captureAbandonment("restart");
    setResults(null);
    resetFeedback();
    setSession(null);
    setCountdown(3);
    if (soundEnabled) void startAudio(settings.speed);
    setViewPhase("countdown");
  }, [captureAbandonment, resetFeedback, setSession, settings.speed, soundEnabled, startAudio]);

  const returnToSettings = useCallback(() => {
    captureAbandonment("title");
    stopAudio();
    setSession(null);
    setResults(null);
    resetFeedback();
    window.location.assign("/");
  }, [captureAbandonment, resetFeedback, setSession, stopAudio]);

  const resume = useCallback(() => {
    const current = sessionRef.current;
    if (!current || current.phase !== "paused") return;
    if (soundEnabled) void startAudio(settings.speed);
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
    shiftDepartingCues(pausedFor);
    setFrameNow(now);
    setSession(resumeSession(current, now + alignmentDelay));
  }, [setSession, settings.speed, shiftDepartingCues, soundEnabled, startAudio]);

  useOverlayMenuNavigation({
    paused: viewPhase === "game" && session?.phase === "paused",
    showingResults: viewPhase === "results" && results !== null,
    pauseMenuIndex,
    resultsMenuIndex,
    setPauseMenuIndex,
    setResultsMenuIndex,
    resume,
    restart: beginRun,
    returnToTitle: returnToSettings,
  });

  const sceneCues = useMemo(
    () =>
      buildSceneCues(
        session,
        frameNow,
        departingCues,
        settings.speed,
      ),
    [
      frameNow,
      departingCues,
      session,
      settings.speed,
    ],
  );
  const metrics = useMemo(
    () => calculateRuntimeMetrics(session, frameNow, settings),
    [frameNow, session, settings],
  );
  const keyboardHints = useMemo(() => hintKeysFor(session), [session]);
  const keyboardStatus =
    keyboardSignal?.status ??
    (session?.active
      ? settings.assistance === "novice"
        ? `shortcut: ${session.active.shortcut.input.display}`
        : "recall the shortcut"
      : "waiting for next action");

  return {
    viewPhase,
    countdown,
    session,
    results,
    pressedKeys,
    pauseMenuIndex,
    resultsMenuIndex,
    sceneReady,
    setSceneReady,
    setPauseMenuIndex,
    setResultsMenuIndex,
    sceneCues,
    metrics,
    keyboardHints,
    keyboardStatus,
    reducedMotion,
    isMuted,
    toggleMuted,
    pause,
    resume,
    beginRun,
    returnToSettings,
    feedback,
    judgement,
    departingCues,
    keyboardSignal,
    processEffects,
    resetFeedback,
    shiftDepartingCues,
  } as const;
}
