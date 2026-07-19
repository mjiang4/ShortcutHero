"use client";

import { useEffect } from "react";

import type { GameSettings } from "../game";
import { SPEED_BPM } from "./constants";

type CountdownOptions = {
  readonly active: boolean;
  readonly sceneReady: boolean;
  readonly speed: GameSettings["speed"];
  readonly setCountdown: (value: number) => void;
  readonly onComplete: () => void;
};

export function useCountdown({
  active,
  sceneReady,
  speed,
  setCountdown,
  onComplete,
}: CountdownOptions): void {
  useEffect(() => {
    if (!active || !sceneReady) return;

    let cancelled = false;
    let next = 3;
    let timer = 0;
    const advance = () => {
      if (cancelled) return;
      next -= 1;
      if (next > 0) {
        setCountdown(next);
        timer = window.setTimeout(advance, 60_000 / SPEED_BPM[speed]);
        return;
      }
      onComplete();
    };
    timer = window.setTimeout(advance, 60_000 / SPEED_BPM[speed]);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [active, onComplete, sceneReady, setCountdown, speed]);
}
