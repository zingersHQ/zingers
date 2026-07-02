"use client";
import { memo, useMemo } from "react";
import * as THREE from "three";
import { RigidBody } from "@react-three/rapier";
import type { BiomeConfig } from "./biomes";
import type { CircuitCheckpoint, CircuitPlatform, CircuitTrackDef } from "./circuit";
import { sectorBounds } from "./circuit-tracks";

const CheckpointRing = memo(function CheckpointRing({
  cp,
  color,
  finish,
}: {
  cp: CircuitCheckpoint;
  color: string;
  finish?: boolean;
}) {
  const r = cp.radius;
  return (
    <group position={cp.pos}>
      <mesh>
        <torusGeometry args={[r, finish ? 0.14 : 0.1, 12, 48]} />
        <meshBasicMaterial color={color} transparent opacity={finish ? 0.95 : 0.72} depthWrite={false} />
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

const TrackPlatform = memo(function TrackPlatform({ plat, biome }: { plat: CircuitPlatform; biome: BiomeConfig }) {
  const color =
    plat.accent === "top" ? biome.platform.top : plat.accent === "b" ? biome.platform.b : biome.platform.a;
  const topY = plat.pos[1] + plat.size[1] / 2;
  return (
    <RigidBody type="fixed" colliders="cuboid">
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
    </RigidBody>
  );
});

/** Void safety net — catches a fall (triggers run failure in the Handler). */
function SafetyFloor({ color, track }: { color: string; track: CircuitTrackDef }) {
  const { maxZ } = sectorBounds(track);
  return (
    <RigidBody type="fixed" colliders="cuboid" position={[0, -12, maxZ * 0.45]}>
      <mesh receiveShadow>
        <boxGeometry args={[48, 1, maxZ + 24]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.08} metalness={0.2} roughness={0.9} />
      </mesh>
    </RigidBody>
  );
}

export const CircuitScene = memo(function CircuitScene({ track, biome }: { track: CircuitTrackDef; biome: BiomeConfig }) {
  const accent = biome.lights.arenaPoint;
  const floor = useMemo(() => biome.terrain.low, [biome.terrain.low]);
  return (
    <>
      <SafetyFloor color={floor} track={track} />
      {track.platforms.map((p, i) => (
        <TrackPlatform key={i} plat={p} biome={biome} />
      ))}
      {track.checkpoints.map((cp) => (
        <CheckpointRing key={cp.index} cp={cp} color={cp.finish ? biome.platform.top : accent} finish={cp.finish} />
      ))}
    </>
  );
});
