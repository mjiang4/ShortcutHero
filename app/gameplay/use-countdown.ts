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

    let next = 3;
    const timer = window.setInterval(() => {
      next -= 1;
      if (next > 0) {
        setCountdown(next);
        return;
      }
      window.clearInterval(timer);
      onComplete();
    }, 60_000 / SPEED_BPM[speed]);

    return () => window.clearInterval(timer);
  }, [active, onComplete, sceneReady, setCountdown, speed]);
}
