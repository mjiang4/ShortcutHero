import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

import { clamp01, COLORS, comboEnergy, STRIKE_Z } from "./scene-config";
import type { SceneFeedback } from "./types";

export function StrikeGate({
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
      curtainMaterial.current.color.set(
        miss ? COLORS.miss : COLORS.accentBright,
      );
      curtainMaterial.current.opacity =
        0.018 +
        energy * 0.014 +
        breath * 0.006 +
        readyPulse * 0.032 +
        impact * 0.085;
    }
    if (edgeMaterial.current) {
      edgeMaterial.current.color.set(
        miss ? COLORS.miss : COLORS.accentBright,
      );
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
      <mesh position={[0, 0.88, 0]}>
        <planeGeometry args={[6.8, 1.58]} />
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

      {[-3.4, 3.4].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.88, 0.015]}>
            <boxGeometry args={[0.045, 1.72, 0.055]} />
            <meshBasicMaterial
              color={COLORS.accentBright}
              transparent
              opacity={0.72 + energy * 0.18}
              toneMapped={false}
            />
          </mesh>
          <mesh
            position={[x - Math.sign(x) * 0.15, 1.64, 0.018]}
            rotation={[0, 0, Math.sign(x) * 0.72]}
          >
            <boxGeometry args={[0.46, 0.045, 0.06]} />
            <meshBasicMaterial
              color={COLORS.accentBright}
              transparent
              opacity={0.76 + energy * 0.16}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 1.74, 0.015]}>
        <boxGeometry args={[6.84, 0.045, 0.055]} />
        <meshBasicMaterial
          ref={edgeMaterial}
          color={COLORS.accentBright}
          transparent
          opacity={0.64}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={scan} position={[0, 0.84, 0.025]}>
        <planeGeometry args={[6.5, 0.026]} />
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
        <boxGeometry args={[7.3, 0.065, 0.13]} />
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
