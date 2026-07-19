import * as THREE from "three";

import type { SceneCueState } from "./types";

export const COLORS = {
  background: "#080a14",
  runway: "#0c0d1a",
  runwayEdge: "#342d56",
  surface: "#151426",
  surfaceRaised: "#1b1930",
  text: "#f4f1ea",
  muted: "#aaa6b4",
  accent: "#7c6cff",
  accentBright: "#a897ff",
  gold: "#f4a261",
  sun: "#ffd6a3",
  hit: "#b7f5d3",
  miss: "#ff706b",
} as const;

export const STRIKE_Z = 1.75;
export const HORIZON_Z = -22;
export const EXIT_Z = 7.15;

export const SCENE_PERFORMANCE = {
  dpr: [1, 1.8] as [number, number],
  camera: {
    position: [0, 6.35, 10.7] as [number, number, number],
    fov: 39,
    near: 0.1,
    far: 70,
  },
  bloom: {
    threshold: 0.72,
    smoothing: 0.18,
  },
  particles: {
    reduced: 18,
    idle: 16,
    trail: 28,
    surge: 54,
    flow: 92,
  },
} as const;

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function cueColor(state: SceneCueState): string {
  if (state === "hit" || state === "cleared") return COLORS.hit;
  if (state === "miss" || state === "missed") return COLORS.miss;
  return COLORS.accent;
}

export function isClearedState(state: SceneCueState): boolean {
  return state === "hit" || state === "cleared";
}

export function isMissedState(state: SceneCueState): boolean {
  return state === "miss" || state === "missed";
}

export function isResolvedState(state: SceneCueState): boolean {
  return isClearedState(state) || isMissedState(state) || state === "exiting";
}

export function progressToZ(progress: number): number {
  if (progress <= 1) {
    return THREE.MathUtils.lerp(HORIZON_Z, STRIKE_Z, progress);
  }
  return THREE.MathUtils.lerp(
    STRIKE_Z,
    EXIT_Z,
    Math.min(1, (progress - 1) / 0.38),
  );
}

export function cueDirection(id: string): -1 | 1 {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = Math.imul(hash ^ id.charCodeAt(index), 31);
  }
  return hash % 2 === 0 ? -1 : 1;
}

export function comboEnergy(combo: number): number {
  if (combo >= 9) return 1;
  if (combo >= 6) return 0.68;
  if (combo >= 3) return 0.38;
  return 0.12;
}
