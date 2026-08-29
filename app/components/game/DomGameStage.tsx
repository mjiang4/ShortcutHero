"use client";

import { useEffect, type CSSProperties } from "react";

import type { GameSceneProps, SceneCueState } from "./types";

type StageStyle = CSSProperties & Record<`--${string}`, string | number>;

const MOUNTAINS = [
  [5, 24],
  [15, 35],
  [28, 20],
  [39, 32],
  [53, 23],
  [65, 37],
  [79, 25],
  [91, 34],
] as const;

const PARTICLES = Array.from({ length: 18 }, (_, index) => ({
  x: 7 + ((index * 37) % 88),
  y: 22 + ((index * 29) % 66),
  delay: (index % 6) * -0.37,
}));

function normalizedState(state: SceneCueState | undefined): SceneCueState {
  if (state === "hit") return "cleared";
  if (state === "miss") return "missed";
  return state ?? "upcoming";
}

export function DomGameStage({
  cues,
  showShortcuts = true,
  previewShortcuts = false,
  combo = 0,
  runProgress = 0,
  feedback = null,
  paused = false,
  reducedMotion = false,
  onReady,
  className,
  style,
}: GameSceneProps) {
  useEffect(() => {
    const timer = window.setTimeout(() => onReady?.(), 0);
    return () => window.clearTimeout(timer);
  }, [onReady]);

  const stageStyle: StageStyle = {
    "--run-progress": runProgress,
    "--combo-energy": Math.min(1, combo / 12),
    ...style,
  };

  return (
    <div
      className={`dom-game-stage${className ? ` ${className}` : ""}`}
      data-paused={paused ? "true" : "false"}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      style={stageStyle}
      aria-hidden="true"
    >
      <div className="dom-stage-sky" />
      <div className="dom-stage-sun" />
      <div className="dom-stage-horizon" />

      <div className="dom-stage-mountains">
        {MOUNTAINS.map(([left, height], index) => (
          <span
            key={`${left}-${height}`}
            style={
              {
                "--mountain-left": `${left}%`,
                "--mountain-height": `${height}vh`,
                "--mountain-depth": index % 3,
              } as StageStyle
            }
          />
        ))}
      </div>

      <div className="dom-stage-particles">
        {PARTICLES.map((particle, index) => (
          <span
            key={index}
            style={
              {
                "--particle-x": `${particle.x}%`,
                "--particle-y": `${particle.y}%`,
                "--particle-delay": `${particle.delay}s`,
              } as StageStyle
            }
          />
        ))}
      </div>

      <div className="dom-highway">
        <div className="dom-highway-grid">
          {Array.from({ length: 12 }, (_, index) => (
            <span key={index} />
          ))}
        </div>
        <div className="dom-highway-rail is-left" />
        <div className="dom-highway-rail is-right" />

        <div className="dom-strike-gate">
          <span>strike</span>
        </div>
      </div>

      <div className="dom-cue-layer">
        {cues.map((cue) => {
          const progress = Math.min(1.42, Math.max(-0.65, cue.progress));
          const travel = Math.min(1.2, Math.max(0, (progress + 0.65) / 1.65));
          const state = normalizedState(cue.state);
          const isShortcutConcealed =
            showShortcuts && previewShortcuts && progress < 0.68;
          const cueStyle: StageStyle = {
            "--cue-progress": progress,
            "--cue-y": `${23 + travel * 53}%`,
            "--cue-scale": 0.52 + travel * 0.5,
            "--cue-opacity": Math.min(1, 0.12 + travel * 1.25),
            "--cue-fill": Math.min(1, Math.max(0, progress)),
            "--cue-lane": `${(cue.laneOffset ?? 0) * 10}%`,
          };
          return (
            <div
              key={cue.id}
              className={`dom-action-ribbon is-${state}${
                isShortcutConcealed ? " is-shortcut-concealed" : ""
              }`}
              style={cueStyle}
            >
              <span className="dom-action-context">
                {cue.context ?? "Linear"}
              </span>
              <strong>{cue.action}</strong>
              {showShortcuts && cue.shortcut ? (
                <span className="dom-action-shortcut">
                  <span>shortcut</span>
                  <kbd>{cue.shortcut}</kbd>
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      {feedback ? (
        <div
          key={feedback.id}
          className={`dom-feedback-burst is-${feedback.type}`}
        >
          {Array.from({ length: 12 }, (_, index) => (
            <span
              key={index}
              style={{ transform: `rotate(${index * 30}deg)` }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
