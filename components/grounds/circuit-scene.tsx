"use client";
import { memo, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import type { BiomeConfig } from "./biomes";
import type { CircuitCheckpoint, CircuitPlatform, CircuitTrackDef } from "./circuit";
import { sectorBounds } from "./circuit-tracks";

// the colour a ring flips to the instant you thread it — the "it counted" read
const PASS_GREEN = "#5cf08a";

const CheckpointRing = memo(function CheckpointRing({
  cp,
  color,
  finish,
  highlight = false,
  cpNextRef,
  floorRing = true,
}: {
  cp: CircuitCheckpoint;
  color: string;
  finish?: boolean;
  /** the next gate the flyer is aiming for — pulses so the target reads at a glance */
  highlight?: boolean;
  /** live "next checkpoint index" — when present, rings flip green as you pass
   *  them and the current target pulses (the desktop 6-DOF feedback the mobile
   *  Climb `highlight` never got). A ref so per-gate progress needs no re-render. */
  cpNextRef?: React.MutableRefObject<number>;
  /** the flat halo on the ground under each ring — a depth cue in the 6-DOF
   *  Handler venue, but confusing clutter in the one-thumb Climb (there's no
   *  ground, and it reads as a second, horizontal "gate"). Off on mobile. */
  floorRing?: boolean;
}) {
  const r = cp.radius;
  const grp = useRef<THREE.Group>(null);
  const torusMat = useRef<THREE.MeshBasicMaterial>(null);
  const floorMat = useRef<THREE.MeshBasicMaterial>(null);
  const burst = useRef<THREE.Mesh>(null);
  const burstMat = useRef<THREE.MeshBasicMaterial>(null);
  const burstT = useRef(0);
  const wasPassed = useRef(false);
  const base = useMemo(() => new THREE.Color(color), [color]);
  const passCol = useMemo(() => new THREE.Color(PASS_GREEN), []);
  const target = useMemo(() => new THREE.Color(color), [color]);

  useFrame(({ clock }, dt) => {
    const g = grp.current;
    if (!g) return;
    const next = cpNextRef ? cpNextRef.current : -1;
    const passed = cpNextRef ? cp.index < next : false;
    const isNext = cpNextRef ? cp.index === next : highlight;

    // fresh crossing → kick the confirmation burst
    if (passed && !wasPassed.current) burstT.current = 0.55;
    wasPassed.current = passed;

    g.scale.setScalar(isNext ? 1 + Math.sin(clock.elapsedTime * 5) * 0.07 : 1);

    const k = 1 - Math.exp(-11 * dt);
    target.copy(passed ? passCol : base);
    if (torusMat.current) {
      torusMat.current.color.lerp(target, k);
      torusMat.current.opacity = passed ? 0.9 : isNext ? 1 : finish ? 0.92 : 0.6;
    }
    if (floorMat.current && torusMat.current) floorMat.current.color.copy(torusMat.current.color);

    if (burstT.current > 0) {
      burstT.current = Math.max(0, burstT.current - dt);
      const u = 1 - burstT.current / 0.55; // 0 → 1
      if (burst.current) {
        burst.current.visible = true;
        burst.current.scale.setScalar(1 + u * 1.7);
      }
      if (burstMat.current) burstMat.current.opacity = (1 - u) * 0.85;
    } else if (burst.current) {
      burst.current.visible = false;
    }
  });

  return (
    <group ref={grp} position={cp.pos}>
      <mesh>
        <torusGeometry args={[r, highlight ? 0.18 : finish ? 0.14 : 0.1, 12, 48]} />
        <meshBasicMaterial ref={torusMat} color={color} transparent opacity={highlight ? 1 : finish ? 0.95 : 0.72} depthWrite={false} />
      </mesh>
      {/* confirmation burst — a bright ring that blooms outward once on a pass */}
      <mesh ref={burst} visible={false}>
        <torusGeometry args={[r, 0.06, 8, 40]} />
        <meshBasicMaterial ref={burstMat} color={PASS_GREEN} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      {floorRing && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.8, 0]}>
          <ringGeometry args={[r - 0.2, r + 0.35, 48]} />
          <meshBasicMaterial
            ref={floorMat}
            color={color}
            transparent
            opacity={0.55}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            fog={false}
          />
        </mesh>
      )}
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
  goldIndex,
  staticMode = false,
  cpNextRef,
}: {
  track: CircuitTrackDef;
  biome: BiomeConfig;
  /** optional: pulse this checkpoint as the next target (used by the one-thumb mode) */
  highlightIndex?: number;
  /** optional: render this checkpoint as a gold "golden ring" surprise reward */
  goldIndex?: number;
  /** render the track as plain meshes (no Rapier bodies) — the mobile one-thumb
   *  Climb is fully kinematic, so it drops the physics engine entirely. */
  staticMode?: boolean;
  /** live next-checkpoint index (desktop) — rings flip green as you pass them */
  cpNextRef?: React.MutableRefObject<number>;
}) {
  const accent = biome.lights.arenaPoint;
  const floor = useMemo(() => biome.terrain.low, [biome.terrain.low]);
  // Mobile Climb (`staticMode`): platforms are non-colliding scenery that read as
  // clutter against the Flappy push-front. Hide them — rings + hazards carry the
  // challenge. Desktop keeps solid pads for land / bump.
  const showPlatforms = !staticMode;
  return (
    <>
      <SafetyFloor color={floor} track={track} staticMode={staticMode} />
      {showPlatforms && track.platforms.map((p, i) => (
        <TrackPlatform key={i} plat={p} biome={biome} staticMode={staticMode} />
      ))}
      {track.checkpoints.map((cp) => {
        const gold = cp.index === goldIndex;
        return (
          <CheckpointRing
            key={cp.index}
            cp={cp}
            color={gold ? "#f5d020" : cp.finish ? biome.platform.top : accent}
            finish={cp.finish}
            highlight={cp.index === highlightIndex || gold}
            cpNextRef={cpNextRef}
            floorRing={!staticMode}
          />
        );
      })}
    </>
  );
});
