"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGameAudio } from "../../audio";
import {
  createGameSession, getPromptTiming, pauseSession, resumeSession, startSession,
  type GameSession, type GameSettings, type KeyboardPlatform, type ShortcutDefinition,
} from "../../game";
import { buildSceneCues, hintKeysFor } from "../../gameplay/runtime-view";
import type { ProcessGameEffects } from "../../gameplay/types";
import { useGameFeedback } from "../../gameplay/use-game-feedback";
import { useGameplayInput } from "../../gameplay/use-gameplay-input";
import { useSessionTicker } from "../../gameplay/use-session-ticker";
import { useSystemReducedMotion } from "../../gameplay/use-system-reduced-motion";
import { getToolTrack } from "../../tools";
import { DomGameStage, KeyboardInstrument } from "../game";
import type { LaunchSettings } from "./settings";

const NO_SAVED_RESULTS = () => {};

export function OnboardingDemo({ settings, platform, onComplete }: {
  readonly settings: LaunchSettings;
  readonly platform: KeyboardPlatform;
  readonly onComplete: () => void;
}) {
  const [step, setStep] = useState(0);
  const track = getToolTrack(settings.tool, platform);
  // Teach only input types the selected app actually contains.
  const steps = [track.decks.easy[0], track.decks.medium[0], track.decks.hard[0]]
    .filter((shortcut): shortcut is ShortcutDefinition => Boolean(shortcut));
  return <TutorialStep key={steps[step].id} shortcut={steps[step]} settings={settings} platform={platform}
    step={step} stepCount={steps.length} appName={track.name} onComplete={onComplete}
    onContinue={() => step + 1 === steps.length ? onComplete() : setStep(step + 1)} />;
}

function TutorialStep({ shortcut, settings, platform, step, stepCount, appName, onComplete, onContinue }: {
  readonly shortcut: ShortcutDefinition;
  readonly settings: LaunchSettings;
  readonly platform: KeyboardPlatform;
  readonly step: number;
  readonly stepCount: number;
  readonly appName: string;
  readonly onComplete: () => void;
  readonly onContinue: () => void;
}) {
  const practiceSettings = useMemo<GameSettings>(() => ({
    trackId: settings.tool, platform, mode: shortcut.difficulty,
    speed: settings.pace, assistance: "novice", hints: "always", durationSeconds: 30,
  }), [platform, settings.pace, settings.tool, shortcut.difficulty]);
  const makeSession = useCallback(() => createGameSession(practiceSettings, {
    deck: [shortcut], maxRequeues: 0,
  }), [practiceSettings, shortcut]);
  const [session, setSessionState] = useState(makeSession);
  const sessionRef = useRef<GameSession | null>(session);
  const [frameNow, setFrameNow] = useState(0);
  const [hit, setHit] = useState(false);
  const hitRef = useRef(false);
  const [message, setMessage] = useState("");
  const [pressedKeys, setPressedKeys] = useState<readonly string[]>([]);
  const heldSuccessKey = useRef<string | null>(null);
  const continueKey = useRef<string | null>(null);
  const reducedMotion = useSystemReducedMotion(settings.effects);
  const { start, pause: pauseAudio, stop, setMuted, playHit, playMiss, playCombo, isReady } = useGameAudio();
  const feedbackAudio = useMemo(() => ({ playHit, playMiss, playCombo, stop }), [playHit, playMiss, playCombo, stop]);
  const { feedback, departingCues, keyboardSignal, processEffects: showEffects,
    resetFeedback, shiftDepartingCues } = useGameFeedback({ audio: feedbackAudio, onFinished: NO_SAVED_RESULTS });
  const setSession = useCallback((next: GameSession) => {
    sessionRef.current = next;
    setSessionState(next);
  }, []);

  const processEffects = useCallback<ProcessGameEffects>((effects, next, prompt, now) => {
    if (hitRef.current) return;
    // Practice rounds can be retried indefinitely, without saving a result.
    if (effects.some(effect => effect.type === "finished")) {
      setSession(startSession(makeSession(), now));
      setFrameNow(now);
      setMessage("");
      resetFeedback();
      return;
    }
    showEffects(effects, next, prompt, now);
    for (const effect of effects) {
      if (effect.type === "hit" && effect.outcome === "clean") {
        hitRef.current = true;
        heldSuccessKey.current = shortcut.input.kind === "sequence" ? shortcut.input.codes[1] : shortcut.input.code;
        setHit(true);
        setMessage("");
      } else if (effect.type === "hit") {
        setMessage("Right keys. Try a clean hit on the next card.");
      } else if (effect.type === "input-progress") {
        const keys = shortcut.input.display.split(" → ");
        setMessage(`${keys[0]} pressed. Now press ${keys[1]} at the line.`);
      } else if (effect.type === "timing-input") {
        setMessage(effect.timing === "too-early" ? "Too early. Wait for the line." : "Too late. Try the next card.");
      } else if (effect.type === "wrong-input") {
        setMessage(`Use ${shortcut.input.display}. Try the next card.`);
      } else if (effect.type === "miss") {
        setMessage("Missed. Try the next card.");
      }
    }
  }, [makeSession, resetFeedback, setSession, shortcut.input, showEffects]);

  useSessionTicker({ active: session.phase === "playing", sessionRef, setSession, setFrameNow, processEffects });

  const pause = useCallback(() => {
    const current = sessionRef.current;
    if (current?.phase !== "playing") return;
    const now = performance.now();
    setFrameNow(now);
    setSession(pauseSession(current, now));
    pauseAudio();
  }, [pauseAudio, setSession]);

  useGameplayInput({ active: session.phase === "playing" && !hit,
    audioEnabled: settings.sound === "on", audioReady: isReady, speed: settings.pace,
    sessionRef, setSession, setPressedKeys, startAudio: start, pause, processEffects });

  const startOrResume = useCallback(() => {
    const now = performance.now();
    const current = sessionRef.current!;
    setMuted(settings.sound === "off");
    if (settings.sound === "on") void start(settings.pace);
    if (current.phase === "paused") {
      shiftDepartingCues(now - current.pausedAtMs!);
      setSession(resumeSession(current, now));
    } else {
      resetFeedback();
      setSession(startSession(current, now));
    }
    setFrameNow(now);
    setMessage("");
  }, [resetFeedback, setMuted, setSession, settings.pace, settings.sound, shiftDepartingCues, start]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat || event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.code === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (sessionRef.current?.phase === "paused") startOrResume();
        else if (sessionRef.current?.phase === "playing" && !hitRef.current) pause();
        else onComplete();
        return;
      }
      if (hitRef.current) {
        if (heldSuccessKey.current || continueKey.current || ["Shift", "Control", "Alt", "Meta", "Tab"].includes(event.key)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        continueKey.current = event.code;
      } else if (sessionRef.current?.phase !== "playing" && event.code === "Space") {
        event.preventDefault();
        event.stopImmediatePropagation();
        startOrResume();
      }
    }
    function onKeyUp(event: KeyboardEvent) {
      if (event.code === heldSuccessKey.current) heldSuccessKey.current = null;
      if (event.code === continueKey.current) {
        event.preventDefault();
        event.stopImmediatePropagation();
        onContinue();
      }
    }
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
    };
  }, [onComplete, onContinue, pause, startOrResume]);

  const cues = buildSceneCues(session, frameNow, departingCues, settings.pace)
    .filter(cue => !hit || cue.state === "cleared" || cue.state === "missed");
  const timing = session.active ? getPromptTiming(session.active, frameNow, session.settings) : null;
  const ready = session.phase === "ready";
  const paused = session.phase === "paused";
  const input = shortcut.input;
  const [first, second] = input.display.split(" → ");
  const instruction = input.kind === "sequence" ? `Press ${first} first. Press ${second} at the line.`
    : input.kind === "chord" ? `Hold Shift. Press ${input.display.replace("⇧ ", "")} at the line.`
      : `Press ${input.display} when the card reaches the line.`;

  return (
    <main className="tutorial-screen" aria-labelledby="tutorial-heading" data-phase={session.phase}>
      <header className="tutorial-header">
        <h1 id="tutorial-heading">tutorial</h1>
        <span>{step + 1} / {stepCount} · {input.kind === "single" ? "Single key" : input.kind === "sequence" ? "Sequence" : "Chord"}</span>
        <span>{appName} · sandbox</span>
        <button type="button" onClick={onComplete}>skip tutorial</button>
      </header>
      <section className="tutorial-instruction" aria-label="Instructions">
        <h2>{instruction}</h2>
        <p>{input.kind === "sequence" ? `Up to ${input.maxGapMs / 1_000}s between keys. Finish at the line.`
          : input.kind === "chord" ? "Keep Shift held as you press the other key."
            : "Same timing as the game. No scores are saved."}</p>
      </section>
      <div className="tutorial-arena" data-hittable={!ready && !paused && !hit && timing?.canHit ? "true" : "false"}>
        <DomGameStage cues={cues} feedback={feedback} paused={ready || paused} reducedMotion={reducedMotion} />
      </div>
      <KeyboardInstrument pressedKeys={pressedKeys} availableKeys={session.capturedCodes}
        hintKeys={hit ? [] : hintKeysFor(session, frameNow)} feedbackKeys={keyboardSignal?.keys}
        feedbackTone={keyboardSignal?.tone} guidance="always" status={paused ? "Paused" : `shortcut: ${input.display}`} />
      <footer className={`tutorial-feedback${hit ? " is-hit" : ""}`} aria-live="polite">
        <p>{hit ? "" : ready ? "Ready when you are." : paused ? "Paused" : message || "Try it. Misses are free here."}</p>
        {ready || paused ? <button type="button" onClick={startOrResume}>
          {paused ? "Press Space to resume" : "Press Space to start"}
        </button> : hit ? <button type="button" onClick={onContinue}>Press any key to continue</button>
          : <button type="button" onClick={pause}>Esc to pause</button>}
      </footer>
    </main>
  );
}
