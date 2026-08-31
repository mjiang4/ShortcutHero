"use client";

import { useEffect, type Dispatch, type RefObject, type SetStateAction } from "react";

import {
  handleSessionKey,
  type GameSession,
  type GameSettings,
} from "../game";
import type { ProcessGameEffects } from "./types";

function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
}

type GameplayInputOptions = {
  readonly active: boolean;
  readonly audioEnabled: boolean;
  readonly audioReady: boolean;
  readonly speed: GameSettings["speed"];
  readonly sessionRef: RefObject<GameSession | null>;
  readonly setSession: (session: GameSession) => void;
  readonly setPressedKeys: Dispatch<SetStateAction<readonly string[]>>;
  readonly startAudio: (speed: GameSettings["speed"]) => Promise<boolean>;
  readonly pause: () => void;
  readonly processEffects: ProcessGameEffects;
};

export function useGameplayInput({
  active,
  audioEnabled,
  audioReady,
  speed,
  sessionRef,
  setSession,
  setPressedKeys,
  startAudio,
  pause,
  processEffects,
}: GameplayInputOptions): void {
  useEffect(() => {
    if (!active) return;

    const pressKey = (event: KeyboardEvent) => {
      if (isTextEntry(event.target)) return;
      if (audioEnabled && !audioReady) void startAudio(speed);
      const current = sessionRef.current;
      if (!current) return;

      if (
        event.code === "Escape" ||
        event.key === "Escape" ||
        event.key === "Esc"
      ) {
        if (current.phase === "playing") {
          event.preventDefault();
          event.stopImmediatePropagation();
          pause();
        }
        return;
      }
      if (current.phase !== "playing") return;

      setPressedKeys((keys) => [...new Set([...keys, event.code])]);
      window.setTimeout(
        () =>
          setPressedKeys((keys) =>
            keys.filter((key) => key !== event.code),
          ),
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
      if (sessionRef.current?.phase === "playing") pause();
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
    active,
    audioEnabled,
    audioReady,
    pause,
    processEffects,
    sessionRef,
    setPressedKeys,
    setSession,
    speed,
    startAudio,
  ]);
}
