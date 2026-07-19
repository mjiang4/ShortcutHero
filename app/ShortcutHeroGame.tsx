"use client";

import { GameScene, KeyboardInstrument } from "./components/game";
import {
  PauseOverlay,
  ResultsScreen,
  SessionHud,
} from "./components/session";
import type { EffectsMode } from "./components/settings/settings";
import type { GameSettings } from "./game";
import { useGameController } from "./gameplay";

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
  const controller = useGameController({
    settings,
    effectsMode,
    soundEnabled,
  });
  const { session, results, metrics } = controller;

  return (
    <main
      className="shortcut-hero"
      data-view-phase={controller.viewPhase}
      data-reduced-motion={controller.reducedMotion ? "true" : "false"}
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
          bloom={!controller.reducedMotion}
          onReady={() => controller.setSceneReady(true)}
        />
      </div>

      <div className="ui-layer">
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
