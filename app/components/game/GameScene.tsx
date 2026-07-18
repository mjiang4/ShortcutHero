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
  if (state === "hit") return COLORS.hit;
  if (state === "miss") return COLORS.miss;
  return COLORS.accent;
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
  reducedMotion,
}: {
  combo: number;
  feedback: SceneFeedback | null;
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
    feedbackAge.current += delta;
    const portrait = size.width / Math.max(size.height, 1) < 1.05;
    const energy = comboEnergy(combo);
    const push = reducedMotion ? 0 : energy * 0.42;
    const missShake =
      !reducedMotion && feedback?.type === "miss" && feedbackAge.current < 0.32
        ? Math.sin(feedbackAge.current * 78) *
          (1 - feedbackAge.current / 0.32) *
          0.055
        : 0;
    const idle = reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.42) * 0.025;
    const targetX = missShake;
    const targetY = portrait ? 7.7 : 6.35 - push * 0.16;
    const targetZ = portrait ? 13.5 : 10.7 - push;
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
  const shellMaterial = useRef<THREE.MeshStandardMaterial>(null);
  const accentMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const currentProgress = useRef(clamp01(cue.progress));
  const state = cue.state ?? "upcoming";
  const color = cueColor(state);
  const isActive = state === "active";

  useFrame((clock, delta) => {
    if (!group.current) return;
    const targetProgress = Math.min(1.12, Math.max(-0.08, cue.progress));
    currentProgress.current = THREE.MathUtils.damp(
      currentProgress.current,
      targetProgress,
      paused ? 14 : 8,
      delta,
    );
    const progress = currentProgress.current;
    const z = THREE.MathUtils.lerp(HORIZON_Z, STRIKE_Z + 0.45, progress);
    const x = (cue.laneOffset ?? 0) * (0.65 + progress * 0.35);
    const hover =
      reducedMotion || paused
        ? 0
        : Math.sin(clock.clock.elapsedTime * 2.4 + cue.id.length) * 0.025;
    const outcomeLift = state === "hit" ? 0.28 : state === "miss" ? -0.08 : 0;
    const targetScale = state === "hit" ? 0.86 : state === "miss" ? 0.94 : 1;

    group.current.position.set(x, 1.05 + hover + outcomeLift, z);
    group.current.scale.x = THREE.MathUtils.damp(
      group.current.scale.x,
      targetScale,
      8,
      delta,
    );
    group.current.scale.y = THREE.MathUtils.damp(
      group.current.scale.y,
      targetScale,
      8,
      delta,
    );
    group.current.rotation.z = THREE.MathUtils.damp(
      group.current.rotation.z,
      state === "miss" ? -0.065 : 0,
      10,
      delta,
    );

    if (shellMaterial.current) {
      shellMaterial.current.emissiveIntensity = THREE.MathUtils.damp(
        shellMaterial.current.emissiveIntensity,
        isActive ? 0.72 : 0.24,
        8,
        delta,
      );
    }
    if (accentMaterial.current) {
      accentMaterial.current.opacity = THREE.MathUtils.damp(
        accentMaterial.current.opacity,
        isActive ? 1 : 0.58,
        8,
        delta,
      );
    }
  });

  return (
    <group ref={group}>
      <RoundedBox args={[5.9, 1.1, 0.12]} radius={0.1} smoothness={4}>
        <meshStandardMaterial
          ref={shellMaterial}
          color={state === "miss" ? "#211219" : COLORS.surfaceRaised}
          roughness={0.55}
          metalness={0.18}
          emissive={color}
          emissiveIntensity={isActive ? 0.72 : 0.24}
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
  reducedMotion,
}: {
  feedback: SceneFeedback;
  reducedMotion: boolean;
}) {
  const points = useRef<THREE.Points>(null);
  const material = useRef<THREE.PointsMaterial>(null);
  const ring = useRef<THREE.Mesh>(null);
  const ringMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const flash = useRef<THREE.PointLight>(null);
  const age = useRef(0);
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
    age.current += delta;
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
    if (flash.current) flash.current.intensity = Math.max(0, 19 * strength * (1 - t * 5));
  });

  return (
    <group position={[0, 0.12, STRIKE_Z]}>
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

  return (
    <>
      <color attach="background" args={[COLORS.background]} />
      <fog attach="fog" args={[COLORS.background, 15, 39]} />
      <CameraRig combo={combo} feedback={feedback} reducedMotion={reducedMotion} />
      <Atmosphere combo={combo} />
      <Runway combo={combo} paused={paused} />
      <FlowParticles combo={combo} reducedMotion={reducedMotion} />

      {cues.map((cue) => (
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
