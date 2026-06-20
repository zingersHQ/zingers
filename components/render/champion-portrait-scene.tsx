"use client";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import type { Champion, CreatureType } from "@/lib/types";
import { TYPE_COLOR } from "@/lib/evolve/progression";
import { ChampionMesh } from "@/components/grounds/champion-mesh";
import { modelScaleFor } from "@/lib/render/fit";
import { RENDER_PRESETS, RENDER_YAW, type RenderPresetId } from "@/lib/render/presets";

function Rig({ lookY }: { lookY: number }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.lookAt(0, lookY, 0);
  }, [camera, lookY]);
  return null;
}

/** Standing-idle orientation: faces the viewer, then lazily glances around and
 *  breathes. Every instance gets its own phase seed so a wall of portraits never
 *  moves in lockstep — it reads as a living gallery, not a row of clones. */
function IdlePose({
  children,
  baseYaw,
  seed,
  paused,
}: {
  children: React.ReactNode;
  baseYaw: number;
  seed: number;
  paused: boolean;
}) {
  const r = useRef<THREE.Group>(null);
  const ph = useMemo(
    () => ({
      gaze: seed * 6.2831,
      glance: seed * 12.9898,
      pitch: seed * 78.233,
      bob: seed * 37.719,
      gazeSpeed: 0.1 + (seed % 0.06),
      glanceSpeed: 0.045 + ((seed * 3.3) % 0.05),
    }),
    [seed],
  );

  useEffect(() => {
    if (r.current) r.current.rotation.y = baseYaw;
  }, [baseYaw]);

  useFrame((state) => {
    const g = r.current;
    if (!g || paused) return;
    const t = state.clock.elapsedTime;
    // two slow sines beat against each other: long stretches near the front,
    // occasional drifts to glance off to one side, then a slow return.
    const gaze = Math.sin(t * ph.gazeSpeed + ph.gaze) * 0.6 + Math.sin(t * ph.glanceSpeed + ph.glance) * 0.4;
    g.rotation.y = baseYaw + gaze * 0.3 + Math.sin(t * 0.8 + ph.gaze) * 0.012;
    g.rotation.x = Math.sin(t * 0.16 + ph.pitch) * 0.035;
    g.position.y = Math.sin(t * 1.05 + ph.bob) * 0.013;
  });

  return <group ref={r}>{children}</group>;
}

function ReadyPulse({ onReady }: { onReady?: () => void }) {
  useEffect(() => {
    if (!onReady) return;
    const t = window.setTimeout(onReady, 1800);
    return () => window.clearTimeout(t);
  }, [onReady]);
  return null;
}

export function ChampionPortraitScene({
  type,
  champion,
  preset = "portrait",
  colorHex,
  onReady,
  paused = false,
  scale = 1,
  identityKey,
}: {
  type: CreatureType;
  champion: Champion;
  preset?: RenderPresetId;
  colorHex?: string;
  onReady?: () => void;
  /** When true, freeze spin (export screenshots). */
  paused?: boolean;
  /** Per-tile multiplier on the fitted body size (1 = preset default). */
  scale?: number;
  /** stable individual id → unique colour scheme */
  identityKey?: string;
}) {
  const p = RENDER_PRESETS[preset];
  const rim = colorHex ?? TYPE_COLOR[type];
  const rimIntensity = 55 * (p.rimBoost ?? 1);
  const meshScale = useMemo(() => modelScaleFor(champion, p) * scale, [champion, p, scale]);
  // per-instance seed → desynced idle pose, clip phase, and a slight base turn
  const seed = useMemo(() => Math.random(), []);
  const baseYaw = RENDER_YAW + (seed - 0.5) * 0.3;
  const idlePhase = seed * 4.2;
  const idleSpeed = 0.82 + seed * 0.34;

  return (
    <Canvas
      shadows="percentage"
      dpr={typeof window !== "undefined" ? Math.min(window.devicePixelRatio, 2) : [1, 2]}
      camera={{ position: p.camera.position, fov: p.camera.fov }}
      gl={{ antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <color attach="background" args={[p.bg]} />
      {p.fog ? <fog attach="fog" args={p.fog} /> : null}
      <Rig lookY={p.camera.lookY} />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#b9a7ff", "#160f2c", 0.7]} />
      <directionalLight position={[5, 8, 4]} intensity={1.7} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} />
      <pointLight position={[-5, 3, -3]} intensity={rimIntensity} color={rim} distance={22} />
      <pointLight position={[4, 1.5, 5]} intensity={22} color="#ffffff" distance={20} />
      <Suspense fallback={null}>
        <IdlePose baseYaw={baseYaw} seed={seed} paused={paused}>
          <group scale={meshScale}>
            <ChampionMesh
              type={type}
              champion={champion}
              position={[0, 0, 0]}
              showLabel={false}
              baseColorOverride={colorHex}
              idlePhase={idlePhase}
              idleSpeed={idleSpeed}
              auraDim
              identityKey={identityKey}
            />
          </group>
        </IdlePose>
        <ContactShadows position={[0, 0.01, 0]} opacity={0.62} scale={9 * meshScale} blur={2.6} far={5} resolution={512} color="#000000" />
        <ReadyPulse onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}
