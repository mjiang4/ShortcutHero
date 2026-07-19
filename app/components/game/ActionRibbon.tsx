import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import {
  clamp01,
  COLORS,
  cueColor,
  cueDirection,
  isClearedState,
  isMissedState,
  isResolvedState,
  progressToZ,
} from "./scene-config";
import type { SceneCue, SceneCueState } from "./types";

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
      const mesh = child as THREE.Mesh<
        THREE.BoxGeometry,
        THREE.MeshBasicMaterial
      >;
      const spec = specs[index];
      if (!spec) return;
      const fall = missed ? -2.4 * t * t : -1.15 * t * t;
      const sideways =
        spec.velocity[0] * direction * (reducedMotion ? 0.2 : 1);
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

export function ActionRibbon({
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

    if (!resolved && inputProgress < previousInputProgress.current - 0.06) {
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
    const motionScale = reducedMotion ? 0.24 : 1;
    const laneX =
      (cue.laneOffset ?? 0) * (0.65 + Math.min(progress, 1) * 0.35);
    const outcomeX = resolved
      ? direction *
        exitT *
        (cleared ? 0.82 : missed ? 0.4 : 0.12) *
        motionScale
      : 0;
    const hover =
      reducedMotion || paused || resolved
        ? 0
        : Math.sin(clock.clock.elapsedTime * 2.4 + cue.id.length) * 0.025;
    const outcomeY = cleared
      ? exitT * 1.05 * motionScale
      : missed
        ? -exitT * exitT * 1.65 * motionScale
        : exitT * 0.08;
    const outcomeZ = resolved
      ? exitT * (cleared ? 4.4 : missed ? 2.4 : 1.2) * motionScale
      : 0;
    const fade = clamp01(1 - Math.max(exitT, passedT * 0.78));
    const targetScale = resolved
      ? cleared
        ? 1 + exitT * 0.1 * motionScale
        : 1 - exitT * 0.18
      : 1;

    group.current.position.set(
      laneX + outcomeX,
      1.05 + hover + outcomeY,
      progressToZ(progress) + outcomeZ,
    );
    group.current.scale.x = THREE.MathUtils.damp(
      group.current.scale.x,
      targetScale,
      12,
      delta,
    );
    group.current.scale.y = THREE.MathUtils.damp(
      group.current.scale.y,
      resolved
        ? targetScale * (1 - exitT * (cleared ? 0.72 : 0.42))
        : targetScale,
      12,
      delta,
    );
    group.current.rotation.z = THREE.MathUtils.damp(
      group.current.rotation.z,
      resolved
        ? direction * exitT * (missed ? 0.42 : 0.1) * motionScale
        : 0,
      12,
      delta,
    );
    group.current.rotation.x = THREE.MathUtils.damp(
      group.current.rotation.x,
      resolved ? -exitT * (missed ? 0.34 : 0.12) * motionScale : 0,
      12,
      delta,
    );

    if (body.current) body.current.visible = fade > 0.035;
    if (shellMaterial.current) {
      shellMaterial.current.opacity = (isActive ? 0.28 : 0.11) * fade;
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
        <mesh>
          <boxGeometry args={[5.72, 0.78, 0.035]} />
          <meshStandardMaterial
            ref={shellMaterial}
            color={missed ? "#3b141d" : COLORS.surfaceRaised}
            roughness={0.28}
            metalness={0.08}
            emissive={color}
            emissiveIntensity={isActive ? 0.82 : 0.24}
            transparent
            opacity={isActive ? 0.28 : 0.11}
            depthWrite={false}
          />
        </mesh>

        {[-0.4, 0.4].map((y) => (
          <mesh key={y} position={[0, y, 0.014]}>
            <boxGeometry args={[5.86, 0.018, 0.045]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={isActive ? 0.8 : 0.22}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        ))}

        {[-1, 1].map((side) => (
          <mesh
            key={side}
            position={[side * 2.79, side * 0.3, 0.045]}
            rotation={[0, 0, side * 0.78]}
          >
            <boxGeometry args={[0.42, 0.026, 0.045]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={isActive ? 0.82 : 0.3}
              toneMapped={false}
            />
          </mesh>
        ))}

        <mesh position={[-2.62, 0, 0.077]}>
          <boxGeometry args={[0.035, 0.58, 0.025]} />
          <meshBasicMaterial
            ref={accentMaterial}
            color={color}
            transparent
            opacity={isActive ? 1 : 0.58}
            toneMapped={false}
          />
        </mesh>

        <Text
          position={[-2.4, showShortcut ? 0.11 : 0, 0.075]}
          maxWidth={showShortcut ? 3.72 : 4.75}
          fontSize={0.31}
          lineHeight={1}
          color={COLORS.text}
          anchorX="left"
          anchorY="middle"
          textAlign="left"
          outlineWidth={0.005}
          outlineColor={COLORS.background}
        >
          {cue.action}
        </Text>

        {showShortcut && cue.shortcut ? (
          <>
            <Text
              position={[-2.4, -0.21, 0.076]}
              maxWidth={3.5}
              fontSize={0.16}
              letterSpacing={0.04}
              color={isActive ? COLORS.accentBright : COLORS.muted}
              anchorX="left"
              anchorY="middle"
            >
              {cue.shortcut}
            </Text>
            <mesh position={[1.62, 0, 0.082]}>
              <boxGeometry args={[0.018, 0.5, 0.025]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={isActive ? 0.8 : 0.25}
                toneMapped={false}
              />
            </mesh>
            <Text
              position={[2.04, 0, 0.102]}
              maxWidth={1.28}
              fontSize={0.21}
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
