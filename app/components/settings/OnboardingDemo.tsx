"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { EMPTY_INPUT_STATE, getShortcutById, matchShortcutInput } from "../../game";

type DemoStyle = CSSProperties & Record<`--${string}`, string | number>;

const DEMO_DURATION_MS = 2_600;
const HIT_WINDOW_START = 0.72;
const HIT_WINDOW_END = 0.96;
const DEMO_STEPS = [
  { shortcut: getShortcutById("new-issue"), instruction: "Press C when the card reaches the line." },
  { shortcut: getShortcutById("go-inbox"), instruction: "Press G first. Press I at the line." },
  { shortcut: getShortcutById("set-estimate"), instruction: "Hold Shift. Press E at the line." },
] as const;

export function OnboardingDemo({
  onComplete,
}: {
  readonly onComplete: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState(0);
  const [hit, setHit] = useState(false);
  const [message, setMessage] = useState("");
  const progressRef = useRef(0);
  const inputRef = useRef(EMPTY_INPUT_STATE);
  const hitRef = useRef(false);
  const currentStep = DEMO_STEPS[step];

  useEffect(() => {
    if (hit) return;
    const startedAt = performance.now();
    let frame = 0;
    let cycle = 0;
    inputRef.current = EMPTY_INPUT_STATE;
    hitRef.current = false;
    progressRef.current = 0;

    const animate = (now: number) => {
      const nextCycle = Math.floor((now - startedAt) / DEMO_DURATION_MS);
      if (nextCycle !== cycle) inputRef.current = EMPTY_INPUT_STATE;
      cycle = nextCycle;
      const next = ((now - startedAt) % DEMO_DURATION_MS) / DEMO_DURATION_MS;
      progressRef.current = next;
      setProgress(next);
      frame = window.requestAnimationFrame(animate);
    };

    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [hit, step]);

  useEffect(() => {
    if (!hit) return;
    const timer = window.setTimeout(() => {
      if (step === DEMO_STEPS.length - 1) onComplete();
      else {
        setStep(step + 1);
        setHit(false);
        setMessage("");
      }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [hit, onComplete, step]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (hitRef.current) return;
      const match = matchShortcutInput(currentStep.shortcut.input, inputRef.current, event, performance.now());
      if (match.status === "ignored") return;
      event.preventDefault();
      const current = progressRef.current;
      if (match.status === "progress" && current >= 0.42 && current <= HIT_WINDOW_END) {
        inputRef.current = match.state;
        setMessage("G pressed. Now press I at the line.");
      } else if (match.status === "correct" && current >= HIT_WINDOW_START && current <= HIT_WINDOW_END) {
        hitRef.current = true;
        setHit(true);
        setProgress(0.88);
        setMessage("Nice hit!");
      } else if (current < HIT_WINDOW_START) {
        inputRef.current = EMPTY_INPUT_STATE;
        setMessage("Too early. Wait for the line.");
      } else {
        inputRef.current = match.state;
        setMessage(match.status === "wrong" ? currentStep.instruction : "Too late. Try the next pass.");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [currentStep]);

  const hittable = progress >= HIT_WINDOW_START && progress <= HIT_WINDOW_END;

  return (
    <div className="onboarding-demo">
      <p>{step + 1} / {DEMO_STEPS.length} · {currentStep.instruction}</p>
      <div
        className={`onboarding-demo__stage${hit ? " is-hit" : ""}`}
        style={{ "--demo-progress": progress } as DemoStyle}
      >
        <div
          className="onboarding-demo__card"
          data-hittable={hittable ? "true" : "false"}
        >
          <span>{currentStep.shortcut.action}</span>
          <kbd>{currentStep.shortcut.input.display}</kbd>
        </div>
        <div className="onboarding-demo__line">
          <span>strike</span>
        </div>
      </div>
      <p className="onboarding-demo__status" aria-live="polite">
        {message || "Follow the card to the line."}
      </p>
      <button
        type="button"
        className="title-panel__back onboarding-demo__skip"
        onClick={onComplete}
      >
        skip demo
      </button>
    </div>
  );
}
