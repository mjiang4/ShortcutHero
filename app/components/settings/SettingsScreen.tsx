"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ShortcutHeroGame } from "../../ShortcutHeroGame";
import { analytics } from "../../analytics";
import { primeGameAudio } from "../../audio/use-game-audio";
import { captureReferralLanding } from "../../referrals/client";
import { getToolTrack } from "../../tools";
import { CompatibilityView } from "./CompatibilityView";
import { InfoView } from "./InfoViews";
import { MainMenu } from "./MainMenu";
import { OnboardingViews } from "./OnboardingViews";
import { OptionsView } from "./OptionsView";
import { DEFAULT_SYSTEM_INFO, detectSystem } from "./platform";
import {
  DEFAULT_LAUNCH_SETTINGS,
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
  GUIDANCE,
  LABELS,
  PACES,
  SESSIONS,
  SOUND,
  cycleValue,
} from "./title-config";
import { TitleShell } from "./TitleShell";
import type {
  MenuAction,
  OnboardingView,
  ScoreEntry,
  ScreenView,
} from "./title-types";
import { useTitleKeyboardNavigation } from "./use-title-keyboard-navigation";

function isOnboardingView(view: ScreenView): view is OnboardingView {
  return view.startsWith("onboarding");
}

export function SettingsScreen() {
  const [view, setView] = useState<ScreenView>("onboarding-name");
  const [menuIndex, setMenuIndex] = useState(0);
  const [optionIndex, setOptionIndex] = useState(0);
  const [userName, setUserName] = useState("");
  const [systemInfo, setSystemInfo] = useState(DEFAULT_SYSTEM_INFO);
  const [settings, setSettings] = useState<LaunchSettings>(
    DEFAULT_LAUNCH_SETTINGS,
  );
  const [draftSettings, setDraftSettings] = useState<LaunchSettings>(
    DEFAULT_LAUNCH_SETTINGS,
  );
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
      setSettings(restored);
      setDraftSettings(restored);
      setScores(readHighScores());
      setSystemInfo(detectedSystem);
      setUserName((current) => current || onboarding.name);
      if (detectedSystem.launchSupport === "mobile") {
        setView("compatibility");
      } else if (requestedPlay) {
        setSettings(requestedSettings);
        setDraftSettings(requestedSettings);
        setActiveGame(requestedSettings);
      } else if (onboarding.complete) {
        setView("menu");
      } else {
        analytics.capture("onboarding_started", {
          operating_system: detectedSystem.operatingSystem,
          browser: detectedSystem.browser,
          launch_support: detectedSystem.launchSupport,
        });
      }
      setHasRestoredSettings(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (hasRestoredSettings) persistSettings(settings);
  }, [hasRestoredSettings, settings]);

  const startGame = useCallback(() => {
    void primeGameAudio(settings.pace, settings.sound === "off");
    setActiveGame(settings);
  }, [settings]);

  const continueFromName = useCallback(() => {
    if (userName.trim()) setView("onboarding-system");
  }, [userName]);

  const completeOnboarding = useCallback(() => {
    persistOnboarding(userName);
    analytics.capture("onboarding_completed", {
      operating_system: systemInfo.operatingSystem,
      browser: systemInfo.browser,
      launch_support: systemInfo.launchSupport,
    });
    setView("menu");
  }, [systemInfo, userName]);

  const openView = useCallback(
    (action: MenuAction) => {
      if (action === "start") {
        if (
          systemInfo.launchSupport === "mobile" ||
          systemInfo.launchSupport === "untested"
        ) {
          setView("compatibility");
          return;
        }
        startGame();
        return;
      }
      if (action === "scores") setScores(readHighScores());
      if (action === "options") {
        setDraftSettings(settings);
        setOptionIndex(0);
      }
      setView(action);
    },
    [settings, startGame, systemInfo.launchSupport],
  );

  const adjustOption = useCallback((index: number, direction: -1 | 1) => {
    setDraftSettings((current) => {
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
            guidance: cycleValue(GUIDANCE, current.guidance, direction),
          };
        case 2:
          return {
            ...current,
            pace: cycleValue(PACES, current.pace, direction),
          };
        case 3:
          return {
            ...current,
            session: cycleValue(SESSIONS, current.session, direction),
          };
        case 4:
          return {
            ...current,
            sound: cycleValue(SOUND, current.sound, direction),
          };
        case 5:
          return {
            ...current,
            effects: cycleValue(EFFECTS, current.effects, direction),
          };
        default:
          return current;
      }
    });
  }, []);

  const confirmOptions = useCallback(() => {
    setSettings(draftSettings);
    setView("menu");
  }, [draftSettings]);

  const cancelOptions = useCallback(() => {
    setDraftSettings(settings);
    setView("menu");
  }, [settings]);

  useTitleKeyboardNavigation({
    enabled: activeGame === null,
    view,
    menuIndex,
    optionIndex,
    setView,
    setMenuIndex,
    setOptionIndex,
    onContinueName: continueFromName,
    onCompleteOnboarding: completeOnboarding,
    onOpen: openView,
    onAdjustOption: adjustOption,
    onConfirmOptions: confirmOptions,
    onCancelOptions: cancelOptions,
  });

  const activeTrack = getToolTrack(settings.tool);
  const summary = useMemo(
    () =>
      `${activeTrack.name} · ${LABELS.difficulty[settings.difficulty]} · ${
        LABELS.guidance[settings.guidance]
      } · ${LABELS.pace[settings.pace]} · ${settings.session}s`,
    [activeTrack.name, settings],
  );

  if (activeGame) {
    return (
      <ShortcutHeroGame
        settings={{
          trackId: activeGame.tool,
          mode: activeGame.difficulty,
          assistance: activeGame.guidance,
          speed: activeGame.pace,
          durationSeconds: activeGame.session,
        }}
        effectsMode={activeGame.effects}
        soundEnabled={activeGame.sound === "on"}
      />
    );
  }

  return (
    <TitleShell track={activeTrack} view={view} summary={summary}>
      {isOnboardingView(view) ? (
        <OnboardingViews
          view={view}
          userName={userName}
          setUserName={setUserName}
          systemInfo={systemInfo}
          restored={hasRestoredSettings}
          onContinueName={continueFromName}
          onContinueSystem={() => setView("onboarding-guide")}
          onComplete={completeOnboarding}
        />
      ) : null}

      {view === "menu" ? (
        <MainMenu
          track={activeTrack}
          selectedIndex={menuIndex}
          onSelect={setMenuIndex}
          onOpen={openView}
        />
      ) : null}

      {view === "options" ? (
        <OptionsView
          settings={settings}
          draft={draftSettings}
          selectedIndex={optionIndex}
          onSelect={setOptionIndex}
          onChange={setDraftSettings}
          onConfirm={confirmOptions}
          onCancel={cancelOptions}
        />
      ) : null}

      {view === "compatibility" ? (
        <CompatibilityView
          systemInfo={systemInfo}
          onContinue={startGame}
          onBack={() => setView("menu")}
        />
      ) : null}

      {view === "scores" || view === "help" || view === "credits" ? (
        <InfoView
          view={view}
          scores={scores}
          onBack={() => setView("menu")}
        />
      ) : null}
    </TitleShell>
  );
}
