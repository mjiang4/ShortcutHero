"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ShortcutHeroAudio,
  type AudioTempo,
  type HitQuality,
} from "./game-audio";

let sharedEngine: ShortcutHeroAudio | null = null;

function getSharedEngine(): ShortcutHeroAudio {
  sharedEngine ??= new ShortcutHeroAudio();
  return sharedEngine;
}

/**
 * Starts Web Audio directly from the settings-screen click before navigation.
 * The shared engine then survives the route transition into the game.
 */
export async function primeGameAudio(
  tempo: AudioTempo,
  muted = false,
): Promise<boolean> {
  const engine = getSharedEngine();
  engine.setMuted(muted);
  return engine.start(tempo);
}

export type GameAudioControls = {
  isReady: boolean;
  isMuted: boolean;
  /** Call from the event handler that starts a run. */
  start: (tempo?: AudioTempo) => Promise<boolean>;
  pause: () => void;
  stop: () => void;
  setTempo: (tempo: AudioTempo) => void;
  setMuted: (muted: boolean) => void;
  toggleMuted: () => boolean;
  playStart: () => void;
  playHit: (quality?: HitQuality, combo?: number) => void;
  playMiss: () => void;
  playCombo: (combo: number) => void;
};

export function useGameAudio(): GameAudioControls {
  const engine = getSharedEngine();
  const engineRef = useRef<ShortcutHeroAudio>(engine);
  const [isReady, setIsReady] = useState(engine.isReady);
  const [isMuted, setIsMutedState] = useState(engine.isMuted);

  useEffect(() => () => engineRef.current.stop(), []);

  const start = useCallback(async (tempo?: AudioTempo) => {
    const ready = await engineRef.current.start(tempo);
    setIsReady(ready);
    return ready;
  }, []);

  const pause = useCallback(() => {
    engineRef.current.pause();
  }, []);

  const stop = useCallback(() => {
    engineRef.current.stop();
  }, []);

  const setTempo = useCallback((tempo: AudioTempo) => {
    engineRef.current.setTempo(tempo);
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    engineRef.current.setMuted(muted);
    setIsMutedState(muted);
  }, []);

  const toggleMuted = useCallback(() => {
    const muted = engineRef.current.toggleMuted();
    setIsMutedState(muted);
    return muted;
  }, []);

  const playStart = useCallback(() => engineRef.current.playStart(), []);
  const playHit = useCallback(
    (quality: HitQuality = "good", combo?: number) =>
      engineRef.current.playHit(quality, combo),
    [],
  );
  const playMiss = useCallback(() => engineRef.current.playMiss(), []);
  const playCombo = useCallback(
    (combo: number) => engineRef.current.playCombo(combo),
    [],
  );

  return {
    isReady,
    isMuted,
    start,
    pause,
    stop,
    setTempo,
    setMuted,
    toggleMuted,
    playStart,
    playHit,
    playMiss,
    playCombo,
  };
}
