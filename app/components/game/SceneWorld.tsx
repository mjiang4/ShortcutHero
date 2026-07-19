import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import type { SceneFeedback } from "./types";
import { clamp01, COLORS, comboEnergy, STRIKE_Z } from "./scene-config";

export function CameraRig({
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
    const idle = reducedMotion
      ? 0
      : Math.sin(state.clock.elapsedTime * 0.42) * 0.025;
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

export function SkyWorld({
  combo,
  runProgress,
  reducedMotion,
}: {
  combo: number;
  runProgress: number;
  reducedMotion: boolean;
}) {
  const skyMaterial = useRef<THREE.ShaderMaterial>(null);
  const sun = useRef<THREE.Mesh>(null);
  const world = useRef<THREE.Group>(null);
  const energy = comboEnergy(combo);
  const skyUniforms = useMemo(
    () => ({
      uProgress: { value: 0 },
      uEnergy: { value: 0 },
    }),
    [],
  );
  const mountains = useMemo(
    () =>
      Array.from({ length: 13 }, (_, index) => ({
        x: -25 + index * 4.2,
        height: 2.6 + ((index * 17) % 7) * 0.38,
        width: 4.6 + ((index * 13) % 5) * 0.45,
        z: -27.5 - (index % 3) * 1.4,
      })),
    [],
  );
  const monoliths = useMemo(
    () =>
      Array.from({ length: 16 }, (_, index) => ({
        side: index % 2 === 0 ? -1 : 1,
        z: -22 + index * 1.48,
        height: 0.55 + ((index * 7) % 5) * 0.24,
      })),
    [],
  );

  useFrame((state, delta) => {
    if (skyMaterial.current) {
      skyMaterial.current.uniforms.uProgress.value = THREE.MathUtils.damp(
        skyMaterial.current.uniforms.uProgress.value,
        runProgress,
        2.4,
        delta,
      );
      skyMaterial.current.uniforms.uEnergy.value = THREE.MathUtils.damp(
        skyMaterial.current.uniforms.uEnergy.value,
        energy,
        3.2,
        delta,
      );
    }
    if (sun.current) {
      sun.current.position.y = 2.25 - runProgress * 1.35;
      const scale = 1 + energy * 0.13;
      sun.current.scale.setScalar(scale);
      sun.current.rotation.z = reducedMotion
        ? 0
        : state.clock.elapsedTime * 0.018;
    }
    if (world.current && !reducedMotion) {
      world.current.position.x =
        Math.sin(state.clock.elapsedTime * 0.08) * 0.08;
    }
  });

  return (
    <group ref={world}>
      <mesh position={[0, 7.5, -35]} renderOrder={-10}>
        <planeGeometry args={[82, 38]} />
        <shaderMaterial
          ref={skyMaterial}
          uniforms={skyUniforms}
          depthWrite={false}
          vertexShader={`
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            varying vec2 vUv;
            uniform float uProgress;
            uniform float uEnergy;
            void main() {
              vec3 dawnTop = vec3(0.075, 0.045, 0.16);
              vec3 dawnBottom = vec3(0.58, 0.18, 0.24);
              vec3 nightTop = vec3(0.018, 0.025, 0.10);
              vec3 nightBottom = vec3(0.20, 0.07, 0.31);
              vec3 top = mix(dawnTop, nightTop, smoothstep(0.18, 0.92, uProgress));
              vec3 bottom = mix(dawnBottom, nightBottom, smoothstep(0.1, 0.88, uProgress));
              float horizon = smoothstep(0.0, 0.72, vUv.y);
              vec3 color = mix(bottom, top, horizon);
              float band = exp(-pow((vUv.y - 0.31) * 7.0, 2.0));
              color += vec3(0.18, 0.07, 0.15) * band * (0.35 + uEnergy * 0.55);
              float vignette = smoothstep(0.98, 0.3, distance(vUv, vec2(0.5, 0.52)));
              color *= 0.72 + vignette * 0.32;
              gl_FragColor = vec4(color, 1.0);
            }
          `}
        />
      </mesh>

      <mesh ref={sun} position={[5.3, 2.25, -33.5]} renderOrder={-8}>
        <circleGeometry args={[1.95, 64]} />
        <meshBasicMaterial
          color={COLORS.sun}
          transparent
          opacity={Math.max(0.08, 0.76 - runProgress * 0.6)}
          depthWrite={false}
          fog={false}
          toneMapped={false}
        />
      </mesh>
      <pointLight
        position={[5.3, 3.2, -20]}
        color={COLORS.gold}
        intensity={5.5 * (1 - runProgress * 0.55)}
        distance={38}
        decay={1.5}
      />

      <group position={[0, -1.75, 0]}>
        {mountains.map((mountain, index) => (
          <mesh
            key={`${mountain.x}-${mountain.z}`}
            position={[mountain.x, mountain.height * 0.35, mountain.z]}
            rotation={[0, 0, index % 2 === 0 ? 0.04 : -0.05]}
          >
            <coneGeometry args={[mountain.width, mountain.height, 3]} />
            <meshBasicMaterial
              color={index % 3 === 0 ? "#332441" : "#211a34"}
              transparent
              opacity={0.88}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>

      <group>
        {monoliths.map((item, index) => (
          <group
            key={`${item.z}-${index}`}
            position={[item.side * 5.2, 0.15, item.z]}
          >
            <mesh
              position={[0, item.height / 2, 0]}
              rotation={[0, item.side * 0.18, 0]}
            >
              <boxGeometry args={[0.13, item.height, 0.18]} />
              <meshStandardMaterial
                color="#18162b"
                emissive={index % 3 === 0 ? COLORS.gold : COLORS.accent}
                emissiveIntensity={0.12 + energy * 0.5}
                roughness={0.7}
              />
            </mesh>
            <mesh position={[0, item.height + 0.08, 0]}>
              <boxGeometry args={[0.4, 0.025, 0.025]} />
              <meshBasicMaterial
                color={
                  index % 3 === 0 ? COLORS.sun : COLORS.accentBright
                }
                transparent
                opacity={0.18 + energy * 0.45}
                toneMapped={false}
              />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

export function Atmosphere({
  combo,
  runProgress,
}: {
  combo: number;
  runProgress: number;
}) {
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
      <ambientLight intensity={0.34 + runProgress * 0.08} color="#d7c6ce" />
      <hemisphereLight args={["#b99bd2", "#080a14", 0.62]} />
      <spotLight
        position={[0, 9, 5]}
        angle={0.55}
        penumbra={0.9}
        intensity={18}
        color={runProgress < 0.48 ? COLORS.sun : "#d7d2ff"}
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
