"use client";

import {
  AdaptiveDpr,
  RoundedBox,
  Text,
} from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";

import type {
  GameSceneProps,
  SceneCue,
  SceneCueState,
  SceneFeedback,
} from "./types";

const COLORS = {
  background: "#050507",
  runway: "#0c0c11",
  runwayEdge: "#252431",
  surface: "#14131a",
  surfaceRaised: "#1a1921",
  text: "#f5f3f8",
  muted: "#8b8994",
  accent: "#6f65dc",
  accentBright: "#a59cff",
  hit: "#aef2d0",
  miss: "#ff7087",
} as const;

const STRIKE_Z = 1.75;
const HORIZON_Z = -22;
const EXIT_Z = 7.15;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

function normalizeKey(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (
    normalized === "SHIFT" ||
    normalized === "SHIFTLEFT" ||
    normalized === "SHIFTRIGHT" ||
    normalized === "⇧"
  ) {
    return "SHIFT";
  }
  if (normalized.startsWith("KEY") && normalized.length === 4) {
    return normalized.slice(3);
  }
  return normalized;
}

function cueColor(state: SceneCueState): string {
  if (state === "hit" || state === "cleared") return COLORS.hit;
  if (state === "miss" || state === "missed") return COLORS.miss;
  return COLORS.accent;
}

function isClearedState(state: SceneCueState): boolean {
  return state === "hit" || state === "cleared";
}

function isMissedState(state: SceneCueState): boolean {
  return state === "miss" || state === "missed";
}

function isResolvedState(state: SceneCueState): boolean {
  return isClearedState(state) || isMissedState(state) || state === "exiting";
}

function progressToZ(progress: number): number {
  if (progress <= 1) {
    return THREE.MathUtils.lerp(HORIZON_Z, STRIKE_Z, progress);
  }
  return THREE.MathUtils.lerp(
    STRIKE_Z,
    EXIT_Z,
    Math.min(1, (progress - 1) / 0.38),
  );
}

function cueDirection(id: string): -1 | 1 {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = Math.imul(hash ^ id.charCodeAt(index), 31);
  }
  return hash % 2 === 0 ? -1 : 1;
}

function comboEnergy(combo: number): number {
  if (combo >= 9) return 1;
  if (combo >= 6) return 0.68;
  if (combo >= 3) return 0.38;
  return 0.12;
}

function CameraRig({
  combo,
  feedback,
  paused,
  reducedMotion,
}: {
  combo: number;
  feedback: SceneFeedback | null;
  paused: boolean;
  reducedMotion: boolean;
}) {
  const { camera, size } = useThree();
  const cameraRef = useRef(camera);
  const feedbackAge = useRef(10);

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  useEffect(() => {
    feedbackAge.current = 0;
  }, [feedback?.id]);

  useFrame((state, delta) => {
    if (!paused) feedbackAge.current += delta;
    const portrait = size.width / Math.max(size.height, 1) < 1.05;
    const energy = comboEnergy(combo);
    const push = reducedMotion ? 0 : energy * 0.42;
    const impactLife = clamp01(1 - feedbackAge.current / 0.24);
    const hitKick =
      !reducedMotion && feedback && feedback.type !== "miss"
        ? impactLife * impactLife * (feedback.strength ?? 0.75)
        : 0;
    const missShake =
      !reducedMotion && feedback?.type === "miss" && feedbackAge.current < 0.32
        ? Math.sin(feedbackAge.current * 78) *
          (1 - feedbackAge.current / 0.32) *
          0.055
        : 0;
    const idle = reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.42) * 0.025;
    const targetX = missShake;
    const targetY = (portrait ? 7.7 : 6.35 - push * 0.16) - hitKick * 0.055;
    const targetZ = (portrait ? 13.5 : 10.7 - push) - hitKick * 0.3;
    const sceneCamera = cameraRef.current;

    sceneCamera.position.x = THREE.MathUtils.damp(
      sceneCamera.position.x,
      targetX,
      8,
      delta,
    );
    sceneCamera.position.y = THREE.MathUtils.damp(
      sceneCamera.position.y,
      targetY + idle,
      5,
      delta,
    );
    sceneCamera.position.z = THREE.MathUtils.damp(
      sceneCamera.position.z,
      targetZ,
      5,
      delta,
    );
    sceneCamera.lookAt(0, 0.15, portrait ? -5.9 : -6.4);
    if (sceneCamera instanceof THREE.PerspectiveCamera) {
      sceneCamera.fov = THREE.MathUtils.damp(
        sceneCamera.fov,
        39 - hitKick * 1.15,
        13,
        delta,
      );
      sceneCamera.updateProjectionMatrix();
    }
  });

  return null;
}

function Atmosphere({ combo }: { combo: number }) {
  const accentLight = useRef<THREE.PointLight>(null);
  const energy = comboEnergy(combo);

  useFrame((state, delta) => {
    if (!accentLight.current) return;
    const pulse = 0.5 + Math.sin(state.clock.elapsedTime * 1.8) * 0.5;
    accentLight.current.intensity = THREE.MathUtils.damp(
      accentLight.current.intensity,
      5.5 + energy * 8 + pulse * energy * 2.5,
      4,
      delta,
    );
  });

  return (
    <>
      <ambientLight intensity={0.32} color="#b9b5ca" />
      <hemisphereLight args={["#7772a4", "#08080d", 0.5]} />
      <spotLight
        position={[0, 9, 5]}
        angle={0.55}
        penumbra={0.9}
        intensity={18}
        color="#d7d2ff"
        target-position={[0, 0, -7]}
      />
      <pointLight
        ref={accentLight}
        position={[0, 0.7, STRIKE_Z]}
        distance={12}
        decay={2}
        color={COLORS.accentBright}
      />
    </>
  );
}

function Runway({ combo, paused }: { combo: number; paused: boolean }) {
  const energy = comboEnergy(combo);
  const pulseMaterial = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((state) => {
    if (!pulseMaterial.current) return;
    pulseMaterial.current.opacity = paused
      ? 0.1
      : 0.15 + energy * 0.17 + Math.sin(state.clock.elapsedTime * 2) * 0.025;
  });

  const ticks = useMemo(
    () => Array.from({ length: 22 }, (_, index) => -20.5 + index * 1.08),
    [],
  );

  return (
    <group>
      <mesh position={[0, -0.16, -10.2]} receiveShadow>
        <boxGeometry args={[8.4, 0.18, 29.6]} />
        <meshStandardMaterial
          color={COLORS.runway}
          roughness={0.82}
          metalness={0.18}
        />
      </mesh>

      {[-4.18, 4.18].map((x) => (
        <mesh key={x} position={[x, -0.015, -10.2]}>
          <boxGeometry args={[0.045, 0.08, 29.7]} />
          <meshStandardMaterial
            color={COLORS.runwayEdge}
            emissive={COLORS.accent}
            emissiveIntensity={0.48 + energy * 0.75}
          />
        </mesh>
      ))}

      {ticks.map((z, index) => (
        <mesh key={z} position={[0, -0.045, z]}>
          <boxGeometry args={[7.95, 0.018, index % 4 === 0 ? 0.045 : 0.018]} />
          <meshBasicMaterial
            color={index % 4 === 0 ? "#383548" : "#22212b"}
            transparent
            opacity={index % 4 === 0 ? 0.26 : 0.16}
          />
        </mesh>
      ))}

      <mesh position={[0, 0.015, STRIKE_Z]}>
        <boxGeometry args={[8.05, 0.055, 0.085]} />
        <meshBasicMaterial
          ref={pulseMaterial}
          color={COLORS.accentBright}
          transparent
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, -0.055, STRIKE_Z + 0.04]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8.25, 1.55]} />
        <meshBasicMaterial
          color={COLORS.accent}
          transparent
          opacity={0.045 + energy * 0.06}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <HorizonFrames energy={energy} />
    </group>
  );
}

function HorizonFrames({ energy }: { energy: number }) {
  return (
    <group>
      {[-19.5, -15, -10.5, -6].map((z, index) => {
        const scale = 1 - index * 0.035;
        return (
          <group key={z} position={[0, 0, z]} scale={scale}>
            <mesh position={[-4.14, 1.65, 0]}>
              <boxGeometry args={[0.025, 3.3, 0.025]} />
              <meshBasicMaterial
                color={COLORS.accent}
                transparent
                opacity={0.11 + energy * 0.08}
              />
            </mesh>
            <mesh position={[4.14, 1.65, 0]}>
              <boxGeometry args={[0.025, 3.3, 0.025]} />
              <meshBasicMaterial
                color={COLORS.accent}
                transparent
                opacity={0.11 + energy * 0.08}
              />
            </mesh>
            <mesh position={[0, 3.28, 0]}>
              <boxGeometry args={[8.3, 0.025, 0.025]} />
              <meshBasicMaterial
                color={COLORS.accent}
                transparent
                opacity={0.09 + energy * 0.06}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function StrikeGate({
  combo,
  feedback,
  hittable,
  paused,
  reducedMotion,
}: {
  combo: number;
  feedback: SceneFeedback | null;
  hittable: boolean;
  paused: boolean;
  reducedMotion: boolean;
}) {
  const gate = useRef<THREE.Group>(null);
  const curtainMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const edgeMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const scan = useRef<THREE.Mesh>(null);
  const scanMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const feedbackAge = useRef(10);
  const energy = comboEnergy(combo);

  useEffect(() => {
    feedbackAge.current = 0;
  }, [feedback?.id]);

  useFrame((state, delta) => {
    if (!paused) feedbackAge.current += delta;
    const strength = feedback?.strength ?? 0.76;
    const impact = feedback
      ? clamp01(1 - feedbackAge.current / 0.42) * strength
      : 0;
    const breath = paused
      ? 0
      : 0.5 + Math.sin(state.clock.elapsedTime * 3.4) * 0.5;
    const readyPulse =
      !paused && hittable
        ? reducedMotion
          ? 0.65
          : 0.5 + Math.sin(state.clock.elapsedTime * 12) * 0.5
        : 0;
    const miss = feedback?.type === "miss";

    if (gate.current) {
      const scale = reducedMotion ? 1 : 1 + impact * 0.035 + readyPulse * 0.012;
      gate.current.scale.x = THREE.MathUtils.damp(
        gate.current.scale.x,
        scale,
        18,
        delta,
      );
      gate.current.scale.y = THREE.MathUtils.damp(
        gate.current.scale.y,
        1 + impact * 0.025,
        18,
        delta,
      );
    }
    if (curtainMaterial.current) {
      curtainMaterial.current.color.set(miss ? COLORS.miss : COLORS.accentBright);
      curtainMaterial.current.opacity =
        0.025 + energy * 0.018 + breath * 0.008 + readyPulse * 0.045 + impact * 0.16;
    }
    if (edgeMaterial.current) {
      edgeMaterial.current.color.set(miss ? COLORS.miss : COLORS.accentBright);
      edgeMaterial.current.opacity =
        0.58 + energy * 0.24 + readyPulse * 0.18 + impact * 0.4;
    }
    if (scan.current) {
      scan.current.position.y = reducedMotion
        ? 0.98
        : 0.25 + ((state.clock.elapsedTime * 0.52) % 1) * 1.5;
    }
    if (scanMaterial.current) {
      scanMaterial.current.opacity = paused ? 0.08 : 0.15 + energy * 0.1;
    }
  });

  return (
    <group ref={gate} position={[0, 0, STRIKE_Z]}>
      <mesh position={[0, 1.02, 0]}>
        <planeGeometry args={[7.3, 1.92]} />
        <meshBasicMaterial
          ref={curtainMaterial}
          color={COLORS.accentBright}
          transparent
          opacity={0.035}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      {[-3.64, 3.64].map((x) => (
        <mesh key={x} position={[x, 1.02, 0.015]}>
          <boxGeometry args={[0.045, 2.05, 0.055]} />
          <meshBasicMaterial
            color={COLORS.accentBright}
            transparent
            opacity={0.72 + energy * 0.18}
            toneMapped={false}
          />
        </mesh>
      ))}
      <mesh position={[0, 2.04, 0.015]}>
        <boxGeometry args={[7.32, 0.045, 0.055]} />
        <meshBasicMaterial
          ref={edgeMaterial}
          color={COLORS.accentBright}
          transparent
          opacity={0.64}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={scan} position={[0, 0.98, 0.025]}>
        <planeGeometry args={[6.95, 0.026]} />
        <meshBasicMaterial
          ref={scanMaterial}
          color={COLORS.accentBright}
          transparent
          opacity={0.16}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      <mesh position={[0, 0.012, 0]}>
        <boxGeometry args={[8.08, 0.075, 0.13]} />
        <meshBasicMaterial
          color={COLORS.accentBright}
          transparent
          opacity={0.9}
          toneMapped={false}
        />
      </mesh>
      <Text
        position={[0, 0.032, 0.48]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.13}
        letterSpacing={0.18}
        color={COLORS.accentBright}
        anchorX="center"
        anchorY="middle"
      >
        STRIKE
      </Text>
    </group>
  );
}

type FragmentSpec = {
  position: readonly [number, number, number];
  size: readonly [number, number, number];
  velocity: readonly [number, number, number];
  spin: number;
};

function RibbonFragments({
  cueId,
  state,
  color,
  paused,
  reducedMotion,
}: {
  cueId: string;
  state: SceneCueState;
  color: string;
  paused: boolean;
  reducedMotion: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const age = useRef(10);
  const direction = cueDirection(cueId);
  const resolved = isClearedState(state) || isMissedState(state);
  const missed = isMissedState(state);
  const specs = useMemo<readonly FragmentSpec[]>(
    () => [
      {
        position: [-2.55, 0.42, 0.02],
        size: [0.52, 0.18, 0.08],
        velocity: [-1.45, 1.15, 0.6],
        spin: -2.2,
      },
      {
        position: [2.5, 0.34, 0.02],
        size: [0.62, 0.2, 0.08],
        velocity: [1.65, 1.35, 0.75],
        spin: 2.6,
      },
      {
        position: [-2.25, -0.39, 0.02],
        size: [0.72, 0.16, 0.08],
        velocity: [-1.2, -0.25, 0.9],
        spin: -3.1,
      },
      {
        position: [2.15, -0.41, 0.02],
        size: [0.8, 0.17, 0.08],
        velocity: [1.28, -0.18, 0.65],
        spin: 2.9,
      },
      {
        position: [0.1, 0.48, 0.02],
        size: [0.45, 0.14, 0.08],
        velocity: [0.35, 1.55, 1],
        spin: 3.4,
      },
    ],
    [],
  );

  useEffect(() => {
    age.current = resolved ? 0 : 10;
  }, [resolved, state]);

  useFrame((_, delta) => {
    if (!group.current) return;
    if (!paused) age.current += delta;
    const t = Math.min(age.current, 0.9);
    const life = clamp01(1 - t / 0.78);
    group.current.visible = resolved && life > 0.01;
    if (!group.current.visible) return;

    group.current.children.forEach((child, index) => {
      const mesh = child as THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>;
      const spec = specs[index];
      if (!spec) return;
      const fall = missed ? -2.4 * t * t : -1.15 * t * t;
      const sideways = spec.velocity[0] * direction * (reducedMotion ? 0.2 : 1);
      mesh.position.set(
        spec.position[0] + sideways * t,
        spec.position[1] + spec.velocity[1] * t + fall,
        spec.position[2] + spec.velocity[2] * t,
      );
      mesh.rotation.z = spec.spin * direction * t;
      mesh.rotation.y = spec.spin * 0.42 * t;
      mesh.material.opacity = reducedMotion ? life * 0.45 : life * 0.9;
    });
  });

  return (
    <group ref={group} visible={false}>
      {specs.map((spec, index) => (
        <mesh key={index} position={spec.position}>
          <boxGeometry args={spec.size} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function ActionRibbon({
  cue,
  showShortcut,
  paused,
  reducedMotion,
}: {
  cue: SceneCue;
  showShortcut: boolean;
  paused: boolean;
  reducedMotion: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const shellMaterial = useRef<THREE.MeshStandardMaterial>(null);
  const accentMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const trailMaterials = useRef<THREE.MeshBasicMaterial[]>([]);
  const currentProgress = useRef(
    Math.min(1.45, Math.max(-0.1, cue.progress)),
  );
  const previousInputProgress = useRef(cue.progress);
  const continuityOrigin = useRef(cue.progress);
  const continuityOffset = useRef(0);
  const outcomeAge = useRef(10);
  const state = cue.state ?? "upcoming";
  const color = cueColor(state);
  const isActive = state === "active";
  const cleared = isClearedState(state);
  const missed = isMissedState(state);
  const resolved = isResolvedState(state);
  const direction = cueDirection(cue.id);

  useEffect(() => {
    outcomeAge.current = resolved ? 0 : 10;
  }, [resolved, state]);

  useFrame((clock, delta) => {
    if (!group.current) return;
    if (!paused) outcomeAge.current += delta;
    const inputProgress = Math.min(1.45, Math.max(-0.1, cue.progress));

    // Older callers restarted a promoted cue at zero. Rebase that discontinuity
    // and bleed the offset away by the strike line so a card never flies back to
    // the horizon. Independently scheduled callers simply take the fast path.
    if (
      !resolved &&
      inputProgress < previousInputProgress.current - 0.06
    ) {
      continuityOrigin.current = inputProgress;
      continuityOffset.current = Math.max(
        0,
        currentProgress.current - inputProgress,
      );
    }
    previousInputProgress.current = inputProgress;

    let targetProgress = inputProgress;
    if (continuityOffset.current > 0 && inputProgress < 1) {
      const remainingAtOrigin = Math.max(0.001, 1 - continuityOrigin.current);
      const carry =
        continuityOffset.current *
        clamp01((1 - inputProgress) / remainingAtOrigin);
      targetProgress += carry;
    } else if (inputProgress >= 1) {
      continuityOffset.current = 0;
    }

    currentProgress.current = THREE.MathUtils.damp(
      currentProgress.current,
      targetProgress,
      paused ? 22 : 32,
      delta,
    );
    const progress = currentProgress.current;
    const exitT = resolved
      ? reducedMotion
        ? clamp01(outcomeAge.current / 0.26)
        : THREE.MathUtils.smootherstep(outcomeAge.current, 0, 0.64)
      : 0;
    const passedT = clamp01((progress - 1) / 0.38);
    const laneX = (cue.laneOffset ?? 0) * (0.65 + Math.min(progress, 1) * 0.35);
    const outcomeX = resolved
      ? direction * exitT * (cleared ? 0.62 : missed ? 0.32 : 0.12)
      : 0;
    const hover =
      reducedMotion || paused || resolved
        ? 0
        : Math.sin(clock.clock.elapsedTime * 2.4 + cue.id.length) * 0.025;
    const outcomeY = cleared
      ? exitT * 0.72
      : missed
        ? -exitT * exitT * 1.2
        : exitT * 0.08;
    const fade = clamp01(1 - Math.max(exitT, passedT * 0.78));
    const targetScale = resolved ? 1 - exitT * (cleared ? 0.32 : 0.2) : 1;

    group.current.position.set(
      laneX + outcomeX,
      1.05 + hover + outcomeY,
      progressToZ(progress),
    );
    group.current.scale.x = THREE.MathUtils.damp(
      group.current.scale.x,
      targetScale,
      12,
      delta,
    );
    group.current.scale.y = THREE.MathUtils.damp(
      group.current.scale.y,
      resolved ? targetScale * (1 - exitT * 0.48) : targetScale,
      12,
      delta,
    );
    group.current.rotation.z = THREE.MathUtils.damp(
      group.current.rotation.z,
      resolved ? direction * exitT * (missed ? 0.32 : 0.18) : 0,
      12,
      delta,
    );
    group.current.rotation.x = THREE.MathUtils.damp(
      group.current.rotation.x,
      resolved ? -exitT * (missed ? 0.22 : 0.1) : 0,
      12,
      delta,
    );

    if (body.current) {
      body.current.visible = fade > 0.035;
    }
    if (shellMaterial.current) {
      shellMaterial.current.opacity = fade;
      shellMaterial.current.emissiveIntensity = THREE.MathUtils.damp(
        shellMaterial.current.emissiveIntensity,
        cleared ? 2.5 * fade : missed ? 1.35 * fade : isActive ? 0.82 : 0.24,
        cleared ? 22 : 8,
        delta,
      );
    }
    if (accentMaterial.current) {
      accentMaterial.current.opacity = THREE.MathUtils.damp(
        accentMaterial.current.opacity,
        (cleared ? 1.5 : isActive ? 1 : 0.58) * fade,
        cleared ? 24 : 8,
        delta,
      );
    }
    trailMaterials.current.forEach((material) => {
      material.opacity = THREE.MathUtils.damp(
        material.opacity,
        (isActive ? 0.28 : 0.1) * fade,
        8,
        delta,
      );
    });
  });

  return (
    <group ref={group}>
      <group ref={body}>
        <RoundedBox args={[5.9, 1.1, 0.12]} radius={0.1} smoothness={4}>
          <meshStandardMaterial
            ref={shellMaterial}
            color={missed ? "#211219" : COLORS.surfaceRaised}
            roughness={0.55}
            metalness={0.18}
            emissive={color}
            emissiveIntensity={isActive ? 0.82 : 0.24}
            transparent
            opacity={1}
          />
        </RoundedBox>

        <RoundedBox
          args={[0.055, 0.73, 0.025]}
          radius={0.02}
          smoothness={3}
          position={[-2.66, 0, 0.077]}
        >
          <meshBasicMaterial
            ref={accentMaterial}
            color={color}
            transparent
            opacity={isActive ? 1 : 0.58}
            toneMapped={false}
          />
        </RoundedBox>

        <Text
          position={[-2.45, showShortcut ? 0.13 : 0, 0.075]}
          maxWidth={showShortcut ? 3.65 : 4.65}
          fontSize={0.28}
          lineHeight={1}
          color={COLORS.text}
          anchorX="left"
          anchorY="middle"
          textAlign="left"
          outlineWidth={0.005}
          outlineColor="#050507"
        >
          {cue.action}
        </Text>

        {showShortcut && cue.shortcut ? (
          <>
            <Text
              position={[-2.45, -0.25, 0.076]}
              maxWidth={3.5}
              fontSize={0.19}
              letterSpacing={0.04}
              color={isActive ? COLORS.accentBright : COLORS.muted}
              anchorX="left"
              anchorY="middle"
            >
              {cue.shortcut}
            </Text>
            <RoundedBox
              args={[1.35, 0.48, 0.03]}
              radius={0.09}
              smoothness={3}
              position={[2.03, 0, 0.082]}
            >
              <meshBasicMaterial
                color={color}
                transparent
                opacity={isActive ? 0.16 : 0.08}
              />
            </RoundedBox>
            <Text
              position={[2.03, 0, 0.102]}
              maxWidth={1.12}
              fontSize={0.2}
              letterSpacing={0.035}
              color={isActive ? COLORS.text : COLORS.muted}
              anchorX="center"
              anchorY="middle"
            >
              {cue.shortcut}
            </Text>
          </>
        ) : null}

        {cue.context ? (
          <Text
            position={[2.63, -0.42, 0.076]}
            maxWidth={2}
            fontSize={0.11}
            letterSpacing={0.04}
            color={COLORS.muted}
            anchorX="right"
            anchorY="middle"
          >
            {cue.context.toUpperCase()}
          </Text>
        ) : null}
      </group>

      {[-2.67, 2.67].map((x, index) => (
        <mesh key={x} position={[x, 0, -0.64]}>
          <boxGeometry args={[0.024, 0.024, 1.2]} />
          <meshBasicMaterial
            ref={(material) => {
              if (material) trailMaterials.current[index] = material;
            }}
            color={color}
            transparent
            opacity={0.08}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}

      <RibbonFragments
        cueId={cue.id}
        state={state}
        color={color}
        paused={paused}
        reducedMotion={reducedMotion}
      />
    </group>
  );
}

type KeySpec = { id: string; label: string; width?: number };

const KEY_ROWS: readonly (readonly KeySpec[])[] = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"].map((key) => ({
    id: key,
    label: key,
  })),
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"].map((key) => ({
    id: key,
    label: key,
  })),
  [
    { id: "SHIFT", label: "shift", width: 1.35 },
    ...["Z", "X", "C", "V", "B", "N", "M"].map((key) => ({
      id: key,
      label: key,
    })),
    { id: "SHIFT", label: "shift", width: 1.35 },
  ],
] as const;

function ReactiveKey({
  spec,
  x,
  z,
  pressed,
  hinted,
}: {
  spec: KeySpec;
  x: number;
  z: number;
  pressed: boolean;
  hinted: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const width = spec.width ?? 0.64;

  useFrame((state, delta) => {
    if (!group.current || !material.current) return;
    group.current.position.y = THREE.MathUtils.damp(
      group.current.position.y,
      pressed ? -0.07 : hinted ? 0.045 : 0,
      pressed ? 26 : 12,
      delta,
    );
    const hintPulse = hinted ? 0.1 + Math.sin(state.clock.elapsedTime * 3.5) * 0.04 : 0;
    material.current.emissiveIntensity = THREE.MathUtils.damp(
      material.current.emissiveIntensity,
      pressed ? 2.8 : hinted ? 0.78 + hintPulse : 0.08,
      pressed ? 24 : 9,
      delta,
    );
  });

  return (
    <group ref={group} position={[x, 0, z]}>
      <RoundedBox args={[width, 0.16, 0.61]} radius={0.075} smoothness={3}>
        <meshStandardMaterial
          ref={material}
          color={pressed ? "#e9e5ff" : hinted ? "#25213d" : "#1d1c24"}
          emissive={pressed ? COLORS.accentBright : COLORS.accent}
          emissiveIntensity={pressed ? 2.8 : hinted ? 0.78 : 0.08}
          roughness={0.5}
          metalness={0.14}
        />
      </RoundedBox>
      <Text
        position={[0, 0.096, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={spec.id === "SHIFT" ? 0.12 : 0.18}
        letterSpacing={spec.id === "SHIFT" ? 0.025 : 0.01}
        color={pressed ? "#15131f" : hinted ? COLORS.text : "#898691"}
        anchorX="center"
        anchorY="middle"
      >
        {spec.label}
      </Text>
    </group>
  );
}

function KeyboardDeck({
  pressedKeys,
  hintKeys,
  combo,
}: {
  pressedKeys: ReadonlySet<string>;
  hintKeys: ReadonlySet<string>;
  combo: number;
}) {
  const energy = comboEnergy(combo);
  const rowGap = 0.71;
  const keyGap = 0.07;

  return (
    <group position={[0, 0.03, 4.28]}>
      <RoundedBox
        args={[8.1, 0.2, 2.65]}
        radius={0.19}
        smoothness={5}
        position={[0, -0.13, 0.05]}
      >
        <meshStandardMaterial
          color="#101016"
          roughness={0.58}
          metalness={0.28}
          emissive={COLORS.accent}
          emissiveIntensity={0.03 + energy * 0.12}
        />
      </RoundedBox>

      {KEY_ROWS.map((row, rowIndex) => {
        const rowWidth = row.reduce(
          (sum, spec, index) =>
            sum + (spec.width ?? 0.64) + (index > 0 ? keyGap : 0),
          0,
        );
        let cursor = -rowWidth / 2;
        const z = -0.72 + rowIndex * rowGap;

        return (
          <Fragment key={rowIndex}>
            {row.map((spec, keyIndex) => {
              const width = spec.width ?? 0.64;
              const x = cursor + width / 2;
              cursor += width + keyGap;
              return (
                <ReactiveKey
                  key={`${spec.id}-${keyIndex}`}
                  spec={spec}
                  x={x}
                  z={z}
                  pressed={pressedKeys.has(spec.id)}
                  hinted={hintKeys.has(spec.id)}
                />
              );
            })}
          </Fragment>
        );
      })}
    </group>
  );
}

function mulberry32(seed: number) {
  return () => {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function feedbackSeed(feedback: SceneFeedback): number {
  const value = `${feedback.id}:${feedback.type}`;
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function FeedbackBurst({
  feedback,
  progress,
  paused,
  reducedMotion,
}: {
  feedback: SceneFeedback;
  progress: number;
  paused: boolean;
  reducedMotion: boolean;
}) {
  const points = useRef<THREE.Points>(null);
  const material = useRef<THREE.PointsMaterial>(null);
  const ring = useRef<THREE.Mesh>(null);
  const ringMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const gateRing = useRef<THREE.Mesh>(null);
  const gateRingMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const horizonWave = useRef<THREE.Mesh>(null);
  const horizonWaveMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const playerWave = useRef<THREE.Mesh>(null);
  const playerWaveMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const flash = useRef<THREE.PointLight>(null);
  const age = useRef(0);
  const [impactZ] = useState(() => progressToZ(progress));
  const isMiss = feedback.type === "miss";
  const color = isMiss ? COLORS.miss : feedback.type === "recovered" ? "#f4cf8a" : COLORS.hit;
  const count = reducedMotion ? 10 : feedback.type === "combo" ? 62 : 38;
  const strength = clamp01(
    feedback.strength ?? (feedback.type === "combo" ? 1 : isMiss ? 0.72 : 0.84),
  );

  const particleData = useMemo(() => {
    const random = mulberry32(feedbackSeed(feedback));
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const offset = index * 3;
      positions[offset] = (random() - 0.5) * 0.24;
      positions[offset + 1] = random() * 0.12;
      positions[offset + 2] = (random() - 0.5) * 0.16;
      const angle = random() * Math.PI * 2;
      const speed = (0.8 + random() * 2.5) * (0.55 + strength * 0.7);
      velocities[offset] = Math.cos(angle) * speed;
      velocities[offset + 1] = (0.65 + random() * 2.7) * (isMiss ? 0.65 : 1);
      velocities[offset + 2] = Math.sin(angle) * speed * 0.7;
    }
    return { positions, velocities };
  }, [count, feedback, isMiss, strength]);
  const velocityRef = useRef(particleData.velocities);

  useFrame((_, delta) => {
    if (!paused) age.current += delta;
    const t = age.current;
    const velocities = velocityRef.current;
    const positionAttribute = points.current?.geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute | undefined;
    const positions = positionAttribute?.array;

    if (positions) {
      for (let index = 0; index < count; index += 1) {
        const offset = index * 3;
        positions[offset] += velocities[offset] * delta;
        positions[offset + 1] += velocities[offset + 1] * delta;
        positions[offset + 2] += velocities[offset + 2] * delta;
        velocities[offset] *= 0.985;
        velocities[offset + 1] -= 3.8 * delta;
        velocities[offset + 2] *= 0.985;
      }
    }
    if (positionAttribute) positionAttribute.needsUpdate = true;

    const life = clamp01(1 - t / (isMiss ? 0.68 : 0.9));
    if (material.current) material.current.opacity = life * life;
    if (ring.current) {
      const scale = 0.5 + t * (3.8 + strength * 2);
      ring.current.scale.setScalar(scale);
    }
    if (ringMaterial.current) ringMaterial.current.opacity = life * 0.58;
    if (gateRing.current) {
      gateRing.current.scale.set(1 + t * 4.8, 0.68 + t * 2.6, 1);
    }
    if (gateRingMaterial.current) {
      gateRingMaterial.current.opacity = life * life * 0.52;
    }
    if (horizonWave.current) {
      horizonWave.current.position.z = -t * (reducedMotion ? 4 : 17);
      horizonWave.current.scale.x = 1 + t * 0.14;
    }
    if (playerWave.current) {
      playerWave.current.position.z = t * (reducedMotion ? 1.5 : 6.5);
      playerWave.current.scale.x = 1 - t * 0.08;
    }
    if (horizonWaveMaterial.current) {
      horizonWaveMaterial.current.opacity = life * life * (isMiss ? 0.24 : 0.54);
    }
    if (playerWaveMaterial.current) {
      playerWaveMaterial.current.opacity = life * life * (isMiss ? 0.18 : 0.36);
    }
    if (flash.current) flash.current.intensity = Math.max(0, 19 * strength * (1 - t * 5));
  });

  return (
    <group position={[0, 0.12, impactZ]}>
      <points ref={points}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[particleData.positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          ref={material}
          color={color}
          size={isMiss ? 0.075 : 0.095}
          sizeAttenuation
          transparent
          opacity={1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <ringGeometry args={[0.35, 0.39, 64]} />
        <meshBasicMaterial
          ref={ringMaterial}
          color={color}
          transparent
          opacity={0.55}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={gateRing} position={[0, 0.9, 0.035]}>
        <ringGeometry args={[0.44, 0.48, 64]} />
        <meshBasicMaterial
          ref={gateRingMaterial}
          color={color}
          transparent
          opacity={0.5}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={horizonWave} position={[0, -0.085, 0]}>
        <boxGeometry args={[7.75, 0.018, 0.22]} />
        <meshBasicMaterial
          ref={horizonWaveMaterial}
          color={color}
          transparent
          opacity={0.5}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={playerWave} position={[0, -0.075, 0]}>
        <boxGeometry args={[7.45, 0.016, 0.13]} />
        <meshBasicMaterial
          ref={playerWaveMaterial}
          color={color}
          transparent
          opacity={0.34}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <pointLight ref={flash} color={color} distance={10} decay={2} />
    </group>
  );
}

function FlowParticles({ combo, reducedMotion }: { combo: number; reducedMotion: boolean }) {
  const count = reducedMotion ? 18 : combo >= 9 ? 92 : combo >= 6 ? 54 : combo >= 3 ? 28 : 16;
  const points = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const random = mulberry32(7719 + count);
    const values = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      values[index * 3] = (random() - 0.5) * 11;
      values[index * 3 + 1] = random() * 3.8 + 0.05;
      values[index * 3 + 2] = -22 + random() * 26;
    }
    return values;
  }, [count]);

  useFrame((_, delta) => {
    if (!points.current || reducedMotion) return;
    const positionAttribute = points.current.geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    for (let index = 0; index < count; index += 1) {
      const offset = index * 3 + 2;
      positionAttribute.array[offset] += delta * (combo >= 9 ? 4.2 : 2.2);
      if (positionAttribute.array[offset] > 4.5) positionAttribute.array[offset] = -22;
    }
    positionAttribute.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={COLORS.accentBright}
        size={combo >= 9 ? 0.045 : 0.028}
        transparent
        opacity={combo >= 9 ? 0.42 : combo >= 3 ? 0.24 : 0.1}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

function SceneContent({
  cues,
  pressedKeys,
  hintKeys,
  showShortcuts,
  combo,
  feedback,
  paused,
  reducedMotion,
  bloom,
}: Required<
  Pick<
    GameSceneProps,
    | "cues"
    | "pressedKeys"
    | "hintKeys"
    | "showShortcuts"
    | "combo"
    | "paused"
    | "reducedMotion"
    | "bloom"
  >
> & { feedback: SceneFeedback | null }) {
  const normalizedPressedKeys = useMemo(
    () => new Set(pressedKeys.map(normalizeKey)),
    [pressedKeys],
  );
  const normalizedHintKeys = useMemo(
    () => new Set(hintKeys.map(normalizeKey)),
    [hintKeys],
  );
  const orderedCues = useMemo(
    () => [...cues].sort((first, second) => first.progress - second.progress),
    [cues],
  );

  return (
    <>
      <color attach="background" args={[COLORS.background]} />
      <fog attach="fog" args={[COLORS.background, 15, 39]} />
      <CameraRig
        combo={combo}
        feedback={feedback}
        paused={paused}
        reducedMotion={reducedMotion}
      />
      <Atmosphere combo={combo} />
      <Runway combo={combo} paused={paused} />
      <StrikeGate
        combo={combo}
        feedback={feedback}
        hittable={orderedCues.some((cue) => cue.state === "active")}
        paused={paused}
        reducedMotion={reducedMotion}
      />
      <FlowParticles combo={combo} reducedMotion={reducedMotion} />

      {orderedCues.map((cue) => (
        <ActionRibbon
          key={cue.id}
          cue={cue}
          showShortcut={showShortcuts}
          paused={paused}
          reducedMotion={reducedMotion}
        />
      ))}

      <KeyboardDeck
        pressedKeys={normalizedPressedKeys}
        hintKeys={normalizedHintKeys}
        combo={combo}
      />

      {feedback ? (
        <FeedbackBurst
          key={feedback.id}
          feedback={feedback}
          progress={
            feedback.cueId
              ? orderedCues.find((cue) => cue.id === feedback.cueId)?.progress ?? 1
              : 1
          }
          paused={paused}
          reducedMotion={reducedMotion}
        />
      ) : null}

      {bloom ? (
        <EffectComposer multisampling={0} enabled={!paused}>
          <Bloom
            intensity={combo >= 9 ? 0.95 : combo >= 6 ? 0.68 : 0.46}
            luminanceThreshold={0.72}
            luminanceSmoothing={0.18}
            mipmapBlur
          />
        </EffectComposer>
      ) : null}
      <AdaptiveDpr pixelated />
    </>
  );
}

/**
 * Purely visual R3F scene. The parent owns timing, keyboard input, scoring,
 * audio, and cue lifecycle; this component renders the supplied snapshot.
 * For a seamless stream, provide several independently scheduled cues and keep
 * resolved cues mounted while their progress advances from 1 to about 1.35.
 */
export function GameScene({
  cues,
  pressedKeys = [],
  hintKeys = [],
  showShortcuts = true,
  combo = 0,
  feedback = null,
  paused = false,
  reducedMotion = false,
  bloom = true,
  className,
  style,
}: GameSceneProps) {
  return (
    <div
      className={className}
      style={{
        width: "100%",
        height: "100%",
        minHeight: 320,
        overflow: "hidden",
        background: COLORS.background,
        ...style,
      }}
      aria-hidden="true"
    >
      <Canvas
        dpr={[1, 1.8]}
        camera={{ position: [0, 6.35, 10.7], fov: 39, near: 0.1, far: 70 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
        shadows={false}
        style={{ display: "block", width: "100%", height: "100%" }}
      >
        <SceneContent
          cues={cues}
          pressedKeys={pressedKeys}
          hintKeys={hintKeys}
          showShortcuts={showShortcuts}
          combo={combo}
          feedback={feedback}
          paused={paused}
          reducedMotion={reducedMotion}
          bloom={bloom}
        />
      </Canvas>
    </div>
  );
}
