"use client";
import { memo, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import type { BiomeConfig } from "./biomes";
import type { CircuitCheckpoint, CircuitPlatform, CircuitTrackDef } from "./circuit";
import { sectorBounds } from "./circuit-tracks";

const CheckpointRing = memo(function CheckpointRing({
  cp,
  color,
  finish,
  highlight = false,
}: {
  cp: CircuitCheckpoint;
  color: string;
  finish?: boolean;
  /** the next gate the flyer is aiming for — pulses so the target reads at a glance */
  highlight?: boolean;
}) {
  const r = cp.radius;
  const grp = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!grp.current) return;
    const s = highlight ? 1 + Math.sin(clock.elapsedTime * 5) * 0.06 : 1;
    grp.current.scale.setScalar(s);
  });
  return (
    <group ref={grp} position={cp.pos}>
      <mesh>
        <torusGeometry args={[r, highlight ? 0.18 : finish ? 0.14 : 0.1, 12, 48]} />
        <meshBasicMaterial color={color} transparent opacity={highlight ? 1 : finish ? 0.95 : 0.72} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.8, 0]}>
        <ringGeometry args={[r - 0.2, r + 0.35, 48]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.55}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          fog={false}
        />
      </mesh>
    </group>
  );
});

// Physics wrapper that collapses to a plain group when the scene is rendered
// `static` (the mobile one-thumb Climb): there, movement is kinematic and gate
// hits are manual z-plane checks, so the Rapier bodies are pure dead weight —
// and the physics WASM/world is exactly the kind of memory a phone GPU can't
// spare, which is what pushes the WebGL context over the edge. Desktop (the
// Handler venue in world.tsx) still gets real fixed colliders.
function PhysBody({
  staticMode,
  position,
  children,
}: {
  staticMode: boolean;
  position?: [number, number, number];
  children: ReactNode;
}) {
  if (staticMode) return <group position={position}>{children}</group>;
  return (
    <RigidBody type="fixed" colliders="cuboid" position={position}>
      {children}
    </RigidBody>
  );
}

const TrackPlatform = memo(function TrackPlatform({ plat, biome, staticMode }: { plat: CircuitPlatform; biome: BiomeConfig; staticMode: boolean }) {
  const color =
    plat.accent === "top" ? biome.platform.top : plat.accent === "b" ? biome.platform.b : biome.platform.a;
  const topY = plat.pos[1] + plat.size[1] / 2;
  return (
    <PhysBody staticMode={staticMode}>
      <mesh position={plat.pos} castShadow receiveShadow>
        <boxGeometry args={plat.size} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={plat.accent === "top" ? 0.55 : 0.32}
          metalness={0.4}
          roughness={0.5}
        />
      </mesh>
      <mesh position={[plat.pos[0], topY + 0.012, plat.pos[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[Math.min(plat.size[0], plat.size[2]) / 2 - 0.14, Math.min(plat.size[0], plat.size[2]) / 2, 44]} />
        <meshBasicMaterial color={color} transparent opacity={0.45} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </PhysBody>
  );
});

/** Void safety net — catches a fall (triggers run failure in the Handler). */
function SafetyFloor({ color, track, staticMode }: { color: string; track: CircuitTrackDef; staticMode: boolean }) {
  const { maxZ } = sectorBounds(track);
  return (
    <PhysBody staticMode={staticMode} position={[0, -12, maxZ * 0.45]}>
      <mesh receiveShadow>
        <boxGeometry args={[48, 1, maxZ + 24]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.08} metalness={0.2} roughness={0.9} />
      </mesh>
    </PhysBody>
  );
}

export const CircuitScene = memo(function CircuitScene({
  track,
  biome,
  highlightIndex,
  staticMode = false,
}: {
  track: CircuitTrackDef;
  biome: BiomeConfig;
  /** optional: pulse this checkpoint as the next target (used by the one-thumb mode) */
  highlightIndex?: number;
  /** render the track as plain meshes (no Rapier bodies) — the mobile one-thumb
   *  Climb is fully kinematic, so it drops the physics engine entirely. */
  staticMode?: boolean;
}) {
  const accent = biome.lights.arenaPoint;
  const floor = useMemo(() => biome.terrain.low, [biome.terrain.low]);
  return (
    <>
      <SafetyFloor color={floor} track={track} staticMode={staticMode} />
      {track.platforms.map((p, i) => (
        <TrackPlatform key={i} plat={p} biome={biome} staticMode={staticMode} />
      ))}
      {track.checkpoints.map((cp) => (
        <CheckpointRing
          key={cp.index}
          cp={cp}
          color={cp.finish ? biome.platform.top : accent}
          finish={cp.finish}
          highlight={cp.index === highlightIndex}
        />
      ))}
    </>
  );
});
