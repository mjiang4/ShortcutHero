import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import { COLORS, comboEnergy, STRIKE_Z } from "./scene-config";

export function Runway({ combo, paused }: { combo: number; paused: boolean }) {
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
  const approachMarks = useMemo(
    () => Array.from({ length: 6 }, (_, index) => STRIKE_Z - 1.05 - index * 1.08),
    [],
  );

  return (
    <group>
      <mesh position={[0, -0.27, -10.2]} receiveShadow>
        <boxGeometry args={[58, 0.08, 31]} />
        <meshStandardMaterial color="#070914" roughness={1} metalness={0} />
      </mesh>
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
          <boxGeometry
            args={[7.95, 0.018, index % 4 === 0 ? 0.045 : 0.018]}
          />
          <meshBasicMaterial
            color={index % 4 === 0 ? "#383548" : "#22212b"}
            transparent
            opacity={index % 4 === 0 ? 0.26 : 0.16}
          />
        </mesh>
      ))}

      {approachMarks.map((z, index) => (
        <group key={z} position={[0, -0.018, z]}>
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              position={[side * (3.48 - index * 0.035), 0, 0]}
              rotation={[0, side * 0.68, 0]}
            >
              <boxGeometry args={[0.46, 0.025, 0.035]} />
              <meshBasicMaterial
                color={COLORS.accentBright}
                transparent
                opacity={0.34 - index * 0.035 + energy * 0.12}
                toneMapped={false}
              />
            </mesh>
          ))}
        </group>
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
      <mesh
        position={[0, -0.055, STRIKE_Z + 0.04]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
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
