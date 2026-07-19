"use client";

import { useEffect, type RefObject } from "react";

import { tickSession, type GameSession } from "../game";
import type { ProcessGameEffects } from "./types";

type SessionTickerOptions = {
  readonly active: boolean;
  readonly sessionRef: RefObject<GameSession | null>;
  readonly setSession: (session: GameSession) => void;
  readonly setFrameNow: (nowMs: number) => void;
  readonly processEffects: ProcessGameEffects;
};

export function useSessionTicker({
  active,
  sessionRef,
  setSession,
  setFrameNow,
  processEffects,
}: SessionTickerOptions): void {
  useEffect(() => {
    if (!active) return;

    let animationFrame = 0;
    let lastRenderAt = 0;
    const runFrame = (now: number) => {
      const current = sessionRef.current;
      if (!current || current.phase !== "playing") return;

      const update = tickSession(current, now);
      if (update.session !== current) {
        setSession(update.session);
        processEffects(update.effects, update.session, current.active, now);
      }
      if (now - lastRenderAt >= 30) {
        lastRenderAt = now;
        setFrameNow(now);
      }
      animationFrame = window.requestAnimationFrame(runFrame);
    };

    animationFrame = window.requestAnimationFrame(runFrame);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [active, processEffects, sessionRef, setFrameNow, setSession]);
}
