"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { GameAudioControls } from "../audio";
import type { KeyboardFeedbackTone, SceneFeedback } from "../components/game";
import {
  getApproachProgress,
  type ActivePrompt,
  type GameEffect,
  type GameResults,
  type GameSession,
} from "../game";
import { shortcutKeys } from "./runtime-view";
import type {
  DepartingCue,
  Judgement,
  JudgementTone,
  KeyboardSignal,
  ProcessGameEffects,
} from "./types";

type FeedbackAudio = Pick<
  GameAudioControls,
  "playHit" | "playMiss" | "playCombo" | "stop"
>;

type GameFeedbackOptions = {
  readonly audio: FeedbackAudio;
  readonly onFinished: (results: GameResults, session: GameSession) => void;
};

export function useGameFeedback({
  audio,
  onFinished,
}: GameFeedbackOptions) {
  const [feedback, setFeedback] = useState<SceneFeedback | null>(null);
  const [judgement, setJudgement] = useState<Judgement | null>(null);
  const [departingCues, setDepartingCues] = useState<readonly DepartingCue[]>(
    [],
  );
  const [keyboardSignal, setKeyboardSignal] =
    useState<KeyboardSignal | null>(null);
  const feedbackId = useRef(0);
  const judgementId = useRef(0);
  const judgementTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishAudioTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyboardSignalTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const showJudgement = useCallback(
    (label: string, tone: JudgementTone) => {
      judgementId.current += 1;
      setJudgement({ id: judgementId.current, label, tone });
      if (judgementTimer.current) clearTimeout(judgementTimer.current);
      judgementTimer.current = setTimeout(() => setJudgement(null), 680);
    },
    [],
  );

  const emitFeedback = useCallback(
    (type: SceneFeedback["type"], strength = 0.7, cueId?: string) => {
      feedbackId.current += 1;
      setFeedback({ id: feedbackId.current, type, strength, cueId });
    },
    [],
  );

  const showKeyboardSignal = useCallback(
    (keys: readonly string[], tone: KeyboardFeedbackTone, status: string) => {
      feedbackId.current += 1;
      setKeyboardSignal({ id: feedbackId.current, keys, tone, status });
      if (keyboardSignalTimer.current) clearTimeout(keyboardSignalTimer.current);
      keyboardSignalTimer.current = setTimeout(
        () => setKeyboardSignal(null),
        760,
      );
    },
    [],
  );

  const retainResolvedCue = useCallback(
    (
      prompt: ActivePrompt | null,
      state: DepartingCue["state"],
      nowMs: number,
    ) => {
      if (!prompt) return;
      setDepartingCues((current) => [
        ...current.filter((cue) => cue.prompt.promptId !== prompt.promptId),
        {
          prompt,
          state,
          resolvedAtMs: nowMs,
          startProgress: getApproachProgress(prompt, nowMs),
        },
      ]);
    },
    [],
  );

  const processEffects = useCallback<ProcessGameEffects>(
    (
      effects: readonly GameEffect[],
      sourceSession: GameSession,
      resolvedPrompt: ActivePrompt | null,
      nowMs: number,
    ) => {
      for (const effect of effects) {
        switch (effect.type) {
          case "input-progress":
            showJudgement(`${effect.step} / ${effect.total}`, "sequence");
            break;
          case "wrong-input":
            emitFeedback("recovered", 0.32);
            showKeyboardSignal(
              [effect.code],
              "wrong",
              "wrong key · action missed",
            );
            showJudgement("Wrong key", "miss");
            break;
          case "timing-input":
            showKeyboardSignal(
              [effect.code],
              "wrong",
              effect.timing === "too-early"
                ? "too early · action missed"
                : "too late",
            );
            showJudgement(
              effect.timing === "too-early" ? "Too early" : "Too late",
              "wait",
            );
            break;
          case "hit": {
            const strength =
              effect.judgement === "perfect"
                ? 1
                : effect.judgement === "good"
                  ? 0.82
                  : 0.62;
            const clean = effect.outcome === "clean";
            if (clean) audio.playHit(effect.judgement, effect.combo);
            else audio.playMiss();
            emitFeedback(
              clean ? "hit" : "miss",
              strength,
              resolvedPrompt?.promptId,
            );
            retainResolvedCue(
              resolvedPrompt,
              clean ? "cleared" : "missed",
              nowMs,
            );
            showKeyboardSignal(
              shortcutKeys(effect.shortcut),
              clean ? "hit" : "miss",
              clean
                ? ""
                : `missed · correct: ${effect.shortcut.input.display}`,
            );
            if (!clean) showJudgement("Missed", "miss");
            break;
          }
          case "combo-tier":
            audio.playCombo(effect.combo);
            emitFeedback(
              "combo",
              effect.tier === "flow" ? 1 : 0.72,
              resolvedPrompt?.promptId,
            );
            break;
          case "miss":
            audio.playMiss();
            emitFeedback("miss", 0.86, resolvedPrompt?.promptId);
            retainResolvedCue(resolvedPrompt, "missed", nowMs);
            showKeyboardSignal(
              shortcutKeys(effect.shortcut),
              "miss",
              `correct shortcut: ${effect.shortcut.input.display}`,
            );
            showJudgement("Missed", "miss");
            break;
          case "finished":
            onFinished(effect.results, sourceSession);
            audio.playCombo(12);
            if (finishAudioTimer.current) {
              clearTimeout(finishAudioTimer.current);
            }
            finishAudioTimer.current = setTimeout(audio.stop, 900);
            break;
        }
      }
    },
    [
      audio,
      emitFeedback,
      onFinished,
      retainResolvedCue,
      showJudgement,
      showKeyboardSignal,
    ],
  );

  const resetFeedback = useCallback(() => {
    setFeedback(null);
    setJudgement(null);
    setDepartingCues([]);
    setKeyboardSignal(null);
    if (judgementTimer.current) clearTimeout(judgementTimer.current);
    if (finishAudioTimer.current) clearTimeout(finishAudioTimer.current);
    if (keyboardSignalTimer.current) clearTimeout(keyboardSignalTimer.current);
  }, []);

  const shiftDepartingCues = useCallback((byMs: number) => {
    setDepartingCues((cues) =>
      cues.map((cue) => ({
        ...cue,
        resolvedAtMs: cue.resolvedAtMs + byMs,
      })),
    );
  }, []);

  useEffect(
    () => () => {
      if (judgementTimer.current) clearTimeout(judgementTimer.current);
      if (finishAudioTimer.current) clearTimeout(finishAudioTimer.current);
      if (keyboardSignalTimer.current) {
        clearTimeout(keyboardSignalTimer.current);
      }
    },
    [],
  );

  return {
    feedback,
    judgement,
    departingCues,
    keyboardSignal,
    processEffects,
    resetFeedback,
    shiftDepartingCues,
  } as const;
}
