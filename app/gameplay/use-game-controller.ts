"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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

  const setSession = useCallback((next: GameSession | null) => {
    sessionRef.current = next;
    setSessionState(next);
  }, []);

  const handleFinished = useCallback(
    (finished: GameResults, sourceSession: GameSession) => {
      persistHighScore(finished, sourceSession);
      setResults(finished);
      setResultsMenuIndex(0);
      setViewPhase("results");
    },
    [],
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
    if (sceneReady) void startAudio(settings.speed);
  }, [sceneReady, setMuted, settings.speed, soundEnabled, startAudio]);

  const completeCountdown = useCallback(() => {
    const now = performance.now();
    const nextSession = startSession(createGameSession(settings), now);
    setFrameNow(now);
    setSession(nextSession);
    playStart();
    setViewPhase("game");
  }, [playStart, setSession, settings]);

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
    audioReady,
    speed: settings.speed,
    sessionRef,
    setSession,
    setPressedKeys,
    startAudio,
    pause,
    processEffects,
  });

  const beginRun = useCallback(() => {
    setResults(null);
    resetFeedback();
    setSession(null);
    setCountdown(3);
    void startAudio(settings.speed);
    setViewPhase("countdown");
  }, [resetFeedback, setSession, settings.speed, startAudio]);

  const returnToSettings = useCallback(() => {
    stopAudio();
    setSession(null);
    setResults(null);
    resetFeedback();
    window.location.assign("/");
  }, [resetFeedback, setSession, stopAudio]);

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
    shiftDepartingCues(pausedFor);
    setFrameNow(now);
    setSession(resumeSession(current, now + alignmentDelay));
  }, [setSession, settings.speed, shiftDepartingCues, startAudio]);

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
