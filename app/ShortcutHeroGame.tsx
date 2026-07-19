"use client";

import { useState } from "react";

import { GameScene, KeyboardInstrument } from "./components/game";
import {
  PauseOverlay,
  ResultsScreen,
  SessionHud,
} from "./components/session";
import type { EffectsMode } from "./components/settings/settings";
import {
  GameLoadingScreen,
  GameRuntimeBoundary,
  SystemScreen,
} from "./components/system";
import type { GameSettings } from "./game";
import { useGameController } from "./gameplay";
import { useBrowserCapabilities } from "./platform/browser-capabilities";
import { useSystemInfo } from "./platform/launch-compatibility";
import { shareGameLink, type ShareResult } from "./platform/share-game";

// The rendering remains available for the dedicated keyboard mode planned
// after the main action-highway launch.
const SHOW_KEYBOARD_MODE = false;

export interface ShortcutHeroGameProps {
  readonly settings: GameSettings;
  readonly effectsMode: EffectsMode;
  readonly soundEnabled: boolean;
}

export function ShortcutHeroGame({
  settings,
  effectsMode,
  soundEnabled,
}: ShortcutHeroGameProps) {
  return (
    <GameRuntimeBoundary>
      <ShortcutHeroGameRuntime
        settings={settings}
        effectsMode={effectsMode}
        soundEnabled={soundEnabled}
      />
    </GameRuntimeBoundary>
  );
}

function ShortcutHeroGameRuntime({
  settings,
  effectsMode,
  soundEnabled,
}: ShortcutHeroGameProps) {
  const capabilities = useBrowserCapabilities();
  const systemInfo = useSystemInfo();
  const [graphicsContextLost, setGraphicsContextLost] = useState(false);
  const [compatibilityAcknowledged, setCompatibilityAcknowledged] =
    useState(false);
  const [shareResult, setShareResult] = useState<ShareResult | null>(null);
  const controller = useGameController({
    settings,
    effectsMode,
    soundEnabled,
  });
  const { session, results, metrics } = controller;

  if (capabilities.graphics === "checking" || systemInfo === null) {
    return <GameLoadingScreen />;
  }

  if (systemInfo.launchSupport === "mobile") {
    const shareLabel =
      shareResult === "copied"
        ? "link copied"
        : shareResult === "shared"
          ? "link sent"
          : shareResult === "unavailable"
            ? "copy this page's URL"
            : "send to desktop";
    return (
      <SystemScreen
        eyebrow="physical keyboard required"
        title="continue on desktop"
        message="Shortcut Hero needs timing-sensitive keyboard input. Open this game on a Mac with Chrome, Safari, or Firefox."
        primaryLabel={shareLabel}
        onPrimary={() => void shareGameLink().then(setShareResult)}
      />
    );
  }

  if (
    systemInfo.launchSupport === "untested" &&
    !compatibilityAcknowledged
  ) {
    return (
      <SystemScreen
        eyebrow="browser check"
        title="this setup is untested"
        message="Shortcut Hero is launch-tested on macOS with Chrome, Safari, and Firefox. You can continue, but graphics or keyboard input may vary."
        primaryLabel="continue anyway"
        onPrimary={() => setCompatibilityAcknowledged(true)}
      />
    );
  }

  if (capabilities.graphics === "unavailable" || graphicsContextLost) {
    return (
      <SystemScreen
        eyebrow="3D graphics unavailable"
        title={graphicsContextLost ? "the stage went dark" : "WebGL is off"}
        message={
          graphicsContextLost
            ? "The browser lost its graphics connection during this run. Reload to rebuild the stage."
            : "Shortcut Hero needs WebGL to draw the action highway. Turn on hardware acceleration or try a current desktop browser."
        }
        primaryLabel="reload game"
        onPrimary={() => window.location.reload()}
      />
    );
  }

  const renderQuality =
    controller.reducedMotion || capabilities.renderQuality === "reduced"
      ? "reduced"
      : "full";

  return (
    <main
      className="shortcut-hero"
      data-view-phase={controller.viewPhase}
      data-reduced-motion={controller.reducedMotion ? "true" : "false"}
      data-render-quality={renderQuality}
    >
      <div className="game-canvas" aria-hidden="true">
        <GameScene
          cues={controller.sceneCues}
          showShortcuts={settings.assistance === "novice"}
          combo={session?.combo ?? 0}
          runProgress={metrics.runProgress}
          feedback={controller.feedback}
          paused={session?.phase === "paused"}
          reducedMotion={controller.reducedMotion}
          bloom={!controller.reducedMotion && renderQuality === "full"}
          renderQuality={renderQuality}
          onReady={() => controller.setSceneReady(true)}
          onContextLost={() => setGraphicsContextLost(true)}
        />
      </div>

      <div className="ui-layer">
        <div className="capability-notices">
          {systemInfo.launchSupport === "mac-layout" ? (
            <p className="capability-notice" role="status">
              Preview mode: shortcuts use the Mac keyboard layout.
            </p>
          ) : null}
          {soundEnabled && capabilities.audio === "unavailable" ? (
            <p className="capability-notice" role="status">
              Sound is unavailable. The game will continue silently.
            </p>
          ) : null}
        </div>

        {controller.viewPhase === "countdown" ? (
          <div className="countdown-overlay" aria-live="assertive">
            {controller.sceneReady ? (
              <span className="countdown-number" key={controller.countdown}>
                {controller.countdown}
              </span>
            ) : (
              <span className="countdown-loading">loading game…</span>
            )}
          </div>
        ) : null}

        {controller.viewPhase === "game" && session ? (
          <>
            <SessionHud
              session={session}
              settings={settings}
              accuracy={metrics.accuracy}
              actLabel={metrics.actLabel}
              remainingSeconds={metrics.remainingSeconds}
              runProgress={metrics.runProgress}
              isMuted={controller.isMuted}
              onToggleMuted={controller.toggleMuted}
              onPause={controller.pause}
            />

            {SHOW_KEYBOARD_MODE ? (
              <KeyboardInstrument
                key={controller.keyboardSignal?.id ?? "live-keyboard"}
                pressedKeys={controller.pressedKeys}
                hintKeys={controller.keyboardSignal ? [] : controller.keyboardHints}
                feedbackKeys={controller.keyboardSignal?.keys}
                feedbackTone={controller.keyboardSignal?.tone}
                status={controller.keyboardStatus}
                guidance={
                  settings.assistance === "novice" ? "learn" : "recall"
                }
              />
            ) : null}

            {controller.judgement ? (
              <div
                key={controller.judgement.id}
                className={`judgement-toast is-${controller.judgement.tone}`}
                aria-live="polite"
              >
                <span className="judgement-label">
                  {controller.judgement.label}
                </span>
              </div>
            ) : null}

            {session.phase === "paused" ? (
              <PauseOverlay
                selectedIndex={controller.pauseMenuIndex}
                onSelect={controller.setPauseMenuIndex}
                onResume={controller.resume}
                onRestart={controller.beginRun}
                onReturnToTitle={controller.returnToSettings}
              />
            ) : null}
          </>
        ) : null}

        {controller.viewPhase === "results" && results ? (
          <ResultsScreen
            results={results}
            selectedIndex={controller.resultsMenuIndex}
            onSelect={controller.setResultsMenuIndex}
            onPlayAgain={controller.beginRun}
            onReturnToTitle={controller.returnToSettings}
          />
        ) : null}

        <p className="screen-reader-only" aria-live="polite">
          {session?.active
            ? `${session.active.shortcut.action}. ${
                settings.assistance === "novice"
                  ? session.active.shortcut.input.display
                  : "Recall the shortcut."
              }`
            : ""}
        </p>
      </div>
    </main>
  );
}
