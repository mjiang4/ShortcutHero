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
import { persistPlayerName, restoreOnboarding } from "../components/settings/storage";
import {
  createGameSession,
  getShortcutHintOpacity,
  getShortcutDeck,
  pauseSession,
  resumeSession,
  startSession,
  type GameResults,
  type GameSession,
  type GameSettings,
} from "../game";
import { recordLesson, selectLesson, type CurriculumProgress } from "../game/curriculum";
import { persistRoundSummary } from "../persistence/round-client";
import type { ShareResult } from "../platform/share-game";
import {
  recordCompletedRoundForSharing,
  shareReferralChallenge,
} from "../referrals/client";
import type { SharePromptTrigger } from "../referrals/contract";
import { nameSavedHighScore, persistHighScore, persistCurriculumProgress, readCurriculumProgress, type SavedHighScore } from "./result-storage";
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
  const [playerName, setPlayerName] = useState("Guest");
  const savedHighScoreRef = useRef<SavedHighScore | null>(null);
  const [frameNow, setFrameNow] = useState(0);
  const [pressedKeys, setPressedKeys] = useState<readonly string[]>([]);
  const [pauseMenuIndex, setPauseMenuIndex] = useState(0);
  const [resultsMenuIndex, setResultsMenuIndex] = useState(0);
  const [sharePromptTrigger, setSharePromptTrigger] =
    useState<SharePromptTrigger | null>(null);
  const [shareResult, setShareResult] = useState<ShareResult | null>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const sessionRef = useRef<GameSession | null>(null);
  const runNumberRef = useRef(0);
  const curriculumRef = useRef<CurriculumProgress | null>(null);
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
      const trackId = sourceSession.settings.trackId ?? "linear";
      const platform = sourceSession.settings.platform ?? "macos";
      curriculumRef.current = recordLesson(
        curriculumRef.current ?? readCurriculumProgress(trackId, platform),
        sourceSession.attempts,
      );
      persistCurriculumProgress(trackId, curriculumRef.current, platform);
      const name = restoreOnboarding().name.trim() || "Guest";
      setPlayerName(name);
      savedHighScoreRef.current = persistHighScore(finished, sourceSession, name);
      const isPersonalBest = savedHighScoreRef.current !== null && finished.score > 0;
      void persistRoundSummary(finished, sourceSession, effectsMode, soundEnabled)
        .then((persistence) => {
          if (persistence.referralConverted) {
            analytics.capture("referred_player_completed_round", {
              ...analyticsContext,
              referral_present: true,
            });
          }
        });
      const promptTrigger = recordCompletedRoundForSharing({
        personalBest: isPersonalBest,
        accuracyPct: finished.accuracyPct,
        attempts: finished.attempts,
      });
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
      setSharePromptTrigger(promptTrigger);
      setShareResult(null);
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
    curriculumRef.current ??= readCurriculumProgress(settings.trackId ?? "linear", settings.platform);
    const catalog = getShortcutDeck(settings.mode, settings.trackId, settings.platform);
    const deck = settings.mode === "showcase" ? catalog : selectLesson(catalog, curriculumRef.current);
    const nextSession = startSession(createGameSession(settings, { deck }), now);
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
    (reason: "restart" | "home" | "page_exit") => {
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
    savedHighScoreRef.current = null;
    setResults(null);
    setSharePromptTrigger(null);
    setShareResult(null);
    resetFeedback();
    setSession(null);
    setCountdown(3);
    if (soundEnabled) void startAudio(settings.speed);
    setViewPhase("countdown");
  }, [captureAbandonment, resetFeedback, setSession, settings.speed, soundEnabled, startAudio]);

  const returnHome = useCallback(() => {
    captureAbandonment("home");
    stopAudio();
    setSession(null);
    setResults(null);
    resetFeedback();
    window.location.assign("/");
  }, [captureAbandonment, resetFeedback, setSession, stopAudio]);

  const shareResults = useCallback(() => {
    void shareReferralChallenge().then(setShareResult);
  }, []);

  const savePlayerName = useCallback((name: string): boolean => {
    const trimmed = name.trim().slice(0, 32);
    if (!trimmed || !persistPlayerName(trimmed)) return false;
    const saved = savedHighScoreRef.current;
    if (saved && !nameSavedHighScore(saved, trimmed)) return false;
    setPlayerName(trimmed);
    return true;
  }, []);

  const resume = useCallback(() => {
    const current = sessionRef.current;
    if (!current || current.phase !== "paused") return;
    if (soundEnabled) void startAudio(settings.speed);
    const now = performance.now();
    const pausedAt = current.pausedAtMs ?? now;
    const pausedFor = Math.max(0, now - pausedAt);
    shiftDepartingCues(pausedFor);
    setFrameNow(now);
    setSession(resumeSession(current, now));
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
    returnHome,
    resultsActionCount: sharePromptTrigger ? 3 : 2,
    shareResults,
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
  const keyboardHints = useMemo(() => hintKeysFor(session, frameNow), [session, frameNow]);
  const sequenceStarted = session?.active?.shortcut.input.kind === "sequence" &&
    session.input.sequenceIndex > 0 && session.input.lastInputAtMs !== null &&
    frameNow - session.input.lastInputAtMs <= session.active.shortcut.input.maxGapMs;
  const keyboardStatus = sequenceStarted ? "finish the shortcut at the line" :
    keyboardSignal?.status ??
    (session?.active
      ? getShortcutHintOpacity(settings, session.active.strikeAtMs - frameNow) > 0
        ? `shortcut: ${session.active.shortcut.input.display}`
        : "recall the shortcut"
      : "waiting for next action");

  return {
    viewPhase,
    countdown,
    session,
    results,
    playerName,
    savePlayerName,
    pressedKeys,
    pauseMenuIndex,
    resultsMenuIndex,
    sharePromptTrigger,
    shareResult,
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
    shareResults,
    returnHome,
    feedback,
    judgement,
    departingCues,
    keyboardSignal,
    processEffects,
    resetFeedback,
    shiftDepartingCues,
  } as const;
}
