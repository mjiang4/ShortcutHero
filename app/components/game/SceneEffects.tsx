import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import {
  clamp01,
  COLORS,
  progressToZ,
  SCENE_PERFORMANCE,
} from "./scene-config";
import type { SceneFeedback } from "./types";

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

export function FeedbackBurst({
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
  const color = isMiss
    ? COLORS.miss
    : feedback.type === "recovered"
      ? "#f4cf8a"
      : COLORS.hit;
  const count = reducedMotion
    ? 10
    : feedback.type === "combo"
      ? 62
      : 38;
  const strength = clamp01(
    feedback.strength ??
      (feedback.type === "combo" ? 1 : isMiss ? 0.72 : 0.84),
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
      velocities[offset + 1] =
        (0.65 + random() * 2.7) * (isMiss ? 0.65 : 1);
      velocities[offset + 2] = Math.sin(angle) * speed * 0.7;
    }
    return { positions, velocities };
  }, [count, feedback, isMiss, strength]);
  const velocityRef = useRef(particleData.velocities);

  useEffect(() => {
    velocityRef.current = particleData.velocities;
  }, [particleData.velocities]);

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
      horizonWaveMaterial.current.opacity =
        life * life * (isMiss ? 0.24 : 0.54);
    }
    if (playerWaveMaterial.current) {
      playerWaveMaterial.current.opacity =
        life * life * (isMiss ? 0.18 : 0.36);
    }
    if (flash.current) {
      flash.current.intensity = Math.max(
        0,
        19 * strength * (1 - t * 5),
      );
    }
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
      <mesh
        ref={ring}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.015, 0]}
      >
        <ringGeometry args={[0.35, 0.39, 20]} />
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
        <ringGeometry args={[0.44, 0.48, 12]} />
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

export function FlowParticles({
  combo,
  reducedMotion,
}: {
  combo: number;
  reducedMotion: boolean;
}) {
  const particleCounts = SCENE_PERFORMANCE.particles;
  const count = reducedMotion
    ? particleCounts.reduced
    : combo >= 9
      ? particleCounts.flow
      : combo >= 6
        ? particleCounts.surge
        : combo >= 3
          ? particleCounts.trail
          : particleCounts.idle;
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
      if (positionAttribute.array[offset] > 4.5) {
        positionAttribute.array[offset] = -22;
      }
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
