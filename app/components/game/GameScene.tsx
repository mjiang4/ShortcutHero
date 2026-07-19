"use client";

import { AdaptiveDpr } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useMemo } from "react";
import * as THREE from "three";

import { ActionRibbon } from "./ActionRibbon";
import { Runway } from "./Runway";
import { FeedbackBurst, FlowParticles } from "./SceneEffects";
import {
  COLORS,
  SCENE_PERFORMANCE,
} from "./scene-config";
import { Atmosphere, CameraRig, SkyWorld } from "./SceneWorld";
import { StrikeGate } from "./StrikeGate";
import type { GameSceneProps, SceneFeedback } from "./types";

function SceneContent({
  cues,
  showShortcuts,
  combo,
  runProgress,
  feedback,
  paused,
  reducedMotion,
  bloom,
}: Required<
  Pick<
    GameSceneProps,
    | "cues"
    | "showShortcuts"
    | "combo"
    | "runProgress"
    | "paused"
    | "reducedMotion"
    | "bloom"
  >
> & { feedback: SceneFeedback | null }) {
  const orderedCues = useMemo(
    () => [...cues].sort((first, second) => first.progress - second.progress),
    [cues],
  );

  return (
    <>
      <color attach="background" args={[COLORS.background]} />
      <fog attach="fog" args={[COLORS.background, 15, 39]} />
      <SkyWorld
        combo={combo}
        runProgress={runProgress}
        reducedMotion={reducedMotion}
      />
      <CameraRig
        combo={combo}
        feedback={feedback}
        paused={paused}
        reducedMotion={reducedMotion}
      />
      <Atmosphere combo={combo} runProgress={runProgress} />
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

      {feedback ? (
        <FeedbackBurst
          key={feedback.id}
          feedback={feedback}
          progress={
            feedback.cueId
              ? orderedCues.find((cue) => cue.id === feedback.cueId)?.progress ??
                1
              : 1
          }
          paused={paused}
          reducedMotion={reducedMotion}
        />
      ) : null}

      {bloom && !reducedMotion ? (
        <EffectComposer multisampling={0} enabled={!paused}>
          <Bloom
            intensity={combo >= 9 ? 0.95 : combo >= 6 ? 0.68 : 0.46}
            luminanceThreshold={SCENE_PERFORMANCE.bloom.threshold}
            luminanceSmoothing={SCENE_PERFORMANCE.bloom.smoothing}
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
 * Declarative geometries and materials are disposed by R3F when cues and
 * feedback bursts unmount.
 */
export function GameScene({
  cues,
  showShortcuts = true,
  combo = 0,
  runProgress = 0,
  feedback = null,
  paused = false,
  reducedMotion = false,
  bloom = true,
  onReady,
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
        dpr={SCENE_PERFORMANCE.dpr}
        camera={SCENE_PERFORMANCE.camera}
        frameloop={paused ? "demand" : "always"}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
        shadows={false}
        onCreated={onReady}
        style={{ display: "block", width: "100%", height: "100%" }}
      >
        <SceneContent
          cues={cues}
          showShortcuts={showShortcuts}
          combo={combo}
          runProgress={runProgress}
          feedback={feedback}
          paused={paused}
          reducedMotion={reducedMotion}
          bloom={bloom}
        />
      </Canvas>
    </div>
  );
}
