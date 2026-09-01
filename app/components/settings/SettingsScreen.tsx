"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ShortcutHeroGame } from "../../ShortcutHeroGame";
import { analytics } from "../../analytics";
import { primeGameAudio } from "../../audio/use-game-audio";
import { captureReferralLanding } from "../../referrals/client";
import { getToolTrack } from "../../tools";
import { CompatibilityView } from "./CompatibilityView";
import { GameSetup } from "./GameSetup";
import { InfoView } from "./InfoViews";
import { MainMenu } from "./MainMenu";
import { OnboardingDemo } from "./OnboardingDemo";
import { OptionsView } from "./OptionsView";
import { DEFAULT_SYSTEM_INFO, detectSystem } from "./platform";
import {
  DEFAULT_LAUNCH_SETTINGS,
  createPlayHref,
  parseLaunchSettings,
  type LaunchSettings,
} from "./settings";
import {
  persistOnboarding,
  persistSettings,
  readHighScores,
  restoreOnboarding,
  restoreSettings,
} from "./storage";
import {
  DIFFICULTIES,
  EFFECTS,
  HINT_MODES,
  LABELS,
  PACES,
  SOUND,
  cycleValue,
} from "./title-config";
import { TitleShell } from "./TitleShell";
import type {
  MenuAction,
  ScoreEntry,
  ScreenView,
} from "./title-types";
import { useTitleKeyboardNavigation } from "./use-title-keyboard-navigation";

export function SettingsScreen() {
  const [view, setView] = useState<ScreenView>("menu");
  const [menuIndex, setMenuIndex] = useState(0);
  const [optionIndex, setOptionIndex] = useState(0);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [systemInfo, setSystemInfo] = useState(DEFAULT_SYSTEM_INFO);
  const [settings, setSettings] = useState<LaunchSettings>(
    DEFAULT_LAUNCH_SETTINGS,
  );
  const [previewingFirstVisit, setPreviewingFirstVisit] = useState(false);
  const [scores, setScores] = useState<readonly ScoreEntry[]>([]);
  const [hasRestoredSettings, setHasRestoredSettings] = useState(false);
  const [activeGame, setActiveGame] = useState<LaunchSettings | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (captureReferralLanding()) {
        analytics.capture("referral_landing", { referral_present: true });
      }
      const restored = restoreSettings();
      const onboarding = restoreOnboarding();
      const launchParams = new URLSearchParams(window.location.search);
      const requestedPlay = launchParams.get("play") === "1";
      const requestedSettings = parseLaunchSettings(launchParams);
      const detectedSystem = detectSystem(window.navigator.userAgent, {
        maxTouchPoints: window.navigator.maxTouchPoints,
        coarsePointer: window.matchMedia("(pointer: coarse)").matches,
        viewportWidth: window.innerWidth,
      });
      const launchSettings = requestedPlay ? requestedSettings : restored;
      const initialSettings = launchSettings;
      setSettings(initialSettings);
      setScores(readHighScores());
      setSystemInfo(detectedSystem);
      setOnboardingComplete(onboarding.complete);
      if (detectedSystem.launchSupport === "mobile") {
        setView("compatibility");
      } else if (requestedPlay && onboarding.complete) {
        setActiveGame(initialSettings);
      }
      setHasRestoredSettings(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (hasRestoredSettings && !previewingFirstVisit) persistSettings(settings);
  }, [hasRestoredSettings, previewingFirstVisit, settings]);

  const startGame = useCallback(() => {
    window.history.replaceState(window.history.state, "", createPlayHref(settings));
    setActiveGame(settings);
  }, [settings]);

  const showWarmup = useCallback(() => {
    if (!previewingFirstVisit) analytics.capture("onboarding_started", {
      operating_system: systemInfo.operatingSystem,
      browser: systemInfo.browser,
      launch_support: systemInfo.launchSupport,
    });
    setView("warmup");
  }, [previewingFirstVisit, systemInfo]);

  const completeOnboarding = useCallback(() => {
    if (!previewingFirstVisit) persistOnboarding(restoreOnboarding().name);
    setOnboardingComplete(true);
    if (!previewingFirstVisit) analytics.capture("onboarding_completed", {
      operating_system: systemInfo.operatingSystem,
      browser: systemInfo.browser,
      launch_support: systemInfo.launchSupport,
    });
    window.history.replaceState(window.history.state, "", "/");
    setView("menu");
  }, [previewingFirstVisit, systemInfo]);

  const beginPlay = useCallback(() => {
    if (!onboardingComplete) completeOnboarding();
    void primeGameAudio(settings.pace, settings.sound === "off");
    startGame();
  }, [completeOnboarding, onboardingComplete, settings.pace, settings.sound, startGame]);

  const toggleFirstVisitPreview = useCallback(() => {
    if (previewingFirstVisit) {
      setSettings(restoreSettings());
      setOnboardingComplete(restoreOnboarding().complete);
    } else {
      setSettings(DEFAULT_LAUNCH_SETTINGS);
      setOnboardingComplete(false);
    }
    setPreviewingFirstVisit(!previewingFirstVisit);
    setMenuIndex(0);
    setView("menu");
    window.history.replaceState(window.history.state, "", "/");
  }, [previewingFirstVisit]);

  const openView = useCallback(
    (action: MenuAction) => {
      if (action === "start") {
        if (!hasRestoredSettings) return;
        if (
          systemInfo.launchSupport === "mobile" ||
          systemInfo.launchSupport === "untested"
        ) {
          setView("compatibility");
          return;
        }
        setView("setup");
        return;
      }
      if (action === "scores") setScores(previewingFirstVisit ? [] : readHighScores());
      if (action === "options") {
        setOptionIndex(0);
      }
      setView(action);
    },
    [hasRestoredSettings, previewingFirstVisit, systemInfo.launchSupport],
  );

  const adjustOption = useCallback((index: number, direction: -1 | 1) => {
    setSettings((current) => {
      switch (index) {
        case 0:
          return {
            ...current,
            difficulty: cycleValue(
              DIFFICULTIES,
              current.difficulty,
              direction,
            ),
          };
        case 1:
          return {
            ...current,
            hints: cycleValue(HINT_MODES, current.hints, direction),
          };
        case 2:
          return {
            ...current,
            pace: cycleValue(PACES, current.pace, direction),
          };
        case 3:
          return {
            ...current,
            sound: cycleValue(SOUND, current.sound, direction),
          };
        case 4:
          return {
            ...current,
            effects: cycleValue(EFFECTS, current.effects, direction),
          };
        default:
          return current;
      }
    });
  }, []);

  useTitleKeyboardNavigation({
    enabled: activeGame === null && hasRestoredSettings,
    view,
    menuIndex,
    optionIndex,
    setView,
    setMenuIndex,
    setOptionIndex,
    onOpen: openView,
    onAdjustOption: adjustOption,
  });

  const activeTrack = getToolTrack(settings.tool);
  const summary = useMemo(
    () =>
      `${LABELS.difficulty[settings.difficulty]} · hints ${LABELS.hints[settings.hints]} · ${settings.session}s`,
    [settings],
  );

  if (activeGame) {
    return (
      <ShortcutHeroGame
        settings={{
          trackId: activeGame.tool,
          mode: activeGame.difficulty,
          assistance: activeGame.hints === "off" ? "pro" : "novice",
          hints: activeGame.hints,
          platform: "macos",
          speed: activeGame.pace,
          durationSeconds: activeGame.session,
        }}
        effectsMode={activeGame.effects}
        soundEnabled={activeGame.sound === "on"}
      />
    );
  }

  if (view === "warmup" || view === "tutorial") {
    return <OnboardingDemo settings={settings} onComplete={view === "warmup" ? completeOnboarding : () => setView("help")} />;
  }

  return (
    <TitleShell track={activeTrack} view={view} summary={summary}>
      {view === "menu" ? (
        <MainMenu
          ready={hasRestoredSettings}
          summary={`${settings.session} seconds · ${LABELS.difficulty[settings.difficulty]} · ${LABELS.hints[settings.hints]} hints`}
          selectedIndex={menuIndex}
          onSelect={setMenuIndex}
          onOpen={openView}
          onPreviewFirstVisit={process.env.NODE_ENV === "development" ? toggleFirstVisitPreview : undefined}
          previewingFirstVisit={previewingFirstVisit}
        />
      ) : null}

      {view === "setup" ? (
        <GameSetup settings={settings} firstVisit={!onboardingComplete} onChange={setSettings}
          onContinue={beginPlay} onPlayTutorial={showWarmup} onBack={() => setView("menu")} />
      ) : null}

      {view === "options" ? (
        <OptionsView
          settings={settings}
          selectedIndex={optionIndex}
          onSelect={setOptionIndex}
          onChange={setSettings}
          onBack={() => setView("menu")}
        />
      ) : null}

      {view === "compatibility" ? (
        <CompatibilityView
          systemInfo={systemInfo}
          onContinue={() => setView("setup")}
          onBack={() => setView("menu")}
        />
      ) : null}

      {view === "scores" || view === "help" || view === "credits" ? (
        <InfoView
          view={view}
          scores={scores}
          onBack={() => setView("menu")}
          onReplayDemo={() => setView("tutorial")}
        />
      ) : null}
    </TitleShell>
  );
}
