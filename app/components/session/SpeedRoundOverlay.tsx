"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  EMPTY_INPUT_STATE,
  matchShortcutInput,
  type GameKeyEvent,
  type ShortcutDefinition,
} from "../../game";
import {
  INTERLUDE_PROMPT_COUNT,
  scoreSpeedRoundHit,
  SPEED_ROUND_WINDOW_MS,
  type MiniGameResult,
} from "../../gameplay/mini-games";

type SpeedRoundOverlayProps = {
  readonly deck: readonly ShortcutDefinition[];
  readonly title?: string;
  readonly promptCount?: number;
  readonly onComplete: (result: MiniGameResult) => void;
};

export function SpeedRoundOverlay({
  deck,
  title = "Speed Round",
  promptCount = INTERLUDE_PROMPT_COUNT,
  onComplete,
}: SpeedRoundOverlayProps) {
  const prompts = useMemo(
    () => deck.slice(0, Math.max(1, promptCount)),
    [deck, promptCount],
  );
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState(EMPTY_INPUT_STATE);
  const [deadline, setDeadline] = useState(() => Date.now() + SPEED_ROUND_WINDOW_MS);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [longestCombo, setLongestCombo] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [misses, setMisses] = useState(0);
  const [flash, setFlash] = useState<"hit" | "miss" | null>(null);
  const [startedAt] = useState(() => Date.now());
  const current = prompts[index] ?? null;

  const finish = useCallback(
    (nextCorrect: number, nextMisses: number, nextScore: number, nextLongest: number) => {
      const attempts = nextCorrect + nextMisses;
      onComplete({
        score: nextScore,
        accuracyPct: attempts === 0 ? 0 : (nextCorrect / attempts) * 100,
        longestCombo: nextLongest,
        attempts,
        correctAnswers: nextCorrect,
        misses: nextMisses,
        durationMs: Date.now() - startedAt,
      });
    },
    [onComplete, startedAt],
  );

  const advance = useCallback(
    (hit: boolean, points: number) => {
      const nextCorrect = correct + (hit ? 1 : 0);
      const nextMisses = misses + (hit ? 0 : 1);
      const nextCombo = hit ? combo + 1 : 0;
      const nextLongest = Math.max(longestCombo, nextCombo);
      const nextScore = score + points;
      setCorrect(nextCorrect);
      setMisses(nextMisses);
      setCombo(nextCombo);
      setLongestCombo(nextLongest);
      setScore(nextScore);
      setFlash(hit ? "hit" : "miss");
      setInput(EMPTY_INPUT_STATE);
      const nextIndex = index + 1;
      if (nextIndex >= prompts.length) {
        finish(nextCorrect, nextMisses, nextScore, nextLongest);
        return;
      }
      setIndex(nextIndex);
      setDeadline(Date.now() + SPEED_ROUND_WINDOW_MS);
    },
    [combo, correct, finish, index, longestCombo, misses, prompts.length, score],
  );

  useEffect(() => {
    if (!current) return;
    const timer = window.setInterval(() => {
      const now = Date.now();
      setNowTick(now);
      if (now >= deadline) {
        advance(false, 0);
      }
    }, 50);
    return () => window.clearInterval(timer);
  }, [advance, current, deadline]);

  useEffect(() => {
    if (!current) return;
    const onKey = (event: KeyboardEvent) => {
      const gameEvent: GameKeyEvent = {
        code: event.code,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        repeat: event.repeat,
        isComposing: event.isComposing,
      };
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.repeat) return;
      event.preventDefault();
      const match = matchShortcutInput(current.input, input, gameEvent, Date.now());
      if (match.status === "ignored") return;
      if (match.status === "progress") {
        setInput(match.state);
        return;
      }
      if (match.status === "wrong") {
        advance(false, 0);
        return;
      }
      const remaining = Math.max(0, deadline - Date.now());
      advance(true, scoreSpeedRoundHit(remaining));
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [advance, current, deadline, input]);

  if (!current) return null;
  const remainingMs = Math.max(0, deadline - nowTick);
  const remainingPct = (remainingMs / SPEED_ROUND_WINDOW_MS) * 100;
  const remainingSec = (remainingMs / 1000).toFixed(1);
  const elapsedSec = ((nowTick - startedAt) / 1000).toFixed(1);

  return (
    <div className={`speed-round${flash ? ` is-${flash}` : ""}`} role="dialog" aria-label={title}>
      <div className="speed-round__panel">
        <div className="speed-round__top">
          <p className="speed-round__kicker">{title}</p>
          <p className="speed-round__clock" aria-live="polite">
            <span>{remainingSec}s</span>
            <span>left</span>
          </p>
        </div>
        <p className="speed-round__progress">
          Prompt {index + 1} / {prompts.length}
        </p>
        <h2 className="speed-round__action">{current.action}</h2>
        <p className="speed-round__keys">{current.input.display}</p>
        <div className="speed-round__timer" aria-hidden>
          <span style={{ width: `${remainingPct}%` }} />
        </div>
        <div className="speed-round__stats">
          <div>
            <span>Score</span>
            <strong>{score.toLocaleString()}</strong>
          </div>
          <div>
            <span>Combo</span>
            <strong>×{combo}</strong>
          </div>
          <div>
            <span>Time</span>
            <strong>{elapsedSec}s</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
