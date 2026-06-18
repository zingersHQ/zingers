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

function Spin({ children, speed, yaw }: { children: React.ReactNode; speed: number; yaw: number }) {
  const r = useRef<THREE.Group>(null);
  useEffect(() => {
    if (r.current) r.current.rotation.y = yaw;
  }, [yaw]);
  useFrame((_, dt) => {
    if (r.current && speed > 0) r.current.rotation.y += dt * speed;
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
}: {
  type: CreatureType;
  champion: Champion;
  preset?: RenderPresetId;
  colorHex?: string;
  onReady?: () => void;
  /** When true, freeze spin (export screenshots). */
  paused?: boolean;
}) {
  const p = RENDER_PRESETS[preset];
  const rim = colorHex ?? TYPE_COLOR[type];
  const rimIntensity = 55 * (p.rimBoost ?? 1);
  const meshScale = useMemo(() => modelScaleFor(champion, p), [champion, p]);

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
        <Spin speed={paused ? 0 : p.spin} yaw={RENDER_YAW}>
          <group scale={meshScale}>
            <ChampionMesh
              type={type}
              champion={champion}
              position={[0, 0, 0]}
              showLabel={false}
              baseColorOverride={colorHex}
            />
          </group>
        </Spin>
        <ContactShadows position={[0, 0.01, 0]} opacity={0.62} scale={9 * meshScale} blur={2.6} far={5} resolution={512} color="#000000" />
        <ReadyPulse onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}
