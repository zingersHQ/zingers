"use client";
import { memo, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import type { BiomeConfig } from "./biomes";
import type { CircuitCheckpoint, CircuitTrackDef } from "./circuit";
import { sectorBounds } from "./circuit-tracks";
import { VENUE_EXIT } from "./venues";

// the colour a ring flips to the instant you thread it — the "it counted" read
const PASS_GREEN = "#5cf08a";

const CheckpointRing = memo(function CheckpointRing({
  cp,
  color,
  finish,
  highlight = false,
  cpNextRef,
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
}) {
  const r = cp.radius;
  const grp = useRef<THREE.Group>(null);
  const torusMat = useRef<THREE.MeshBasicMaterial>(null);
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
    </group>
  );
});

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

/** Deck top sits at y=0 so AscentReturnPortal feet (VENUE_EXIT.circuit y=0) plant flush. */
const DECK_THICK = 0.38;
const DECK_TOP_Y = 0;
// Arch half-width is ~3.6 — deck must be wider than the portal so it doesn't float past the edges.
const DECK_HALF_X = 4.5;
const PORTAL_APRON_BEHIND = 3.2;
const PORTAL_APRON_AHEAD = 2.4;

/**
 * Walkable arrival deck — from the return portal up to the launch mark.
 * Desktop: Rapier floor so you can walk back through the portal. Mobile Climb
 * is kinematic — compact launch mark only (exit is a tab, not a walk).
 */
function ArrivalDeck({
  spawn,
  staticMode,
  accent,
}: {
  spawn: [number, number, number];
  staticMode: boolean;
  accent: string;
}) {
  const [sx, , sz] = spawn;
  const padY = DECK_TOP_Y - DECK_THICK / 2;

  if (staticMode) {
    return (
      <group position={[sx, padY, sz]}>
        <mesh receiveShadow>
          <boxGeometry args={[3.2, DECK_THICK, 3.2]} />
          <meshStandardMaterial color="#2a2438" emissive={accent} emissiveIntensity={0.22} metalness={0.35} roughness={0.62} />
        </mesh>
        <mesh position={[0, DECK_THICK / 2 + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.35, 1.55, 28]} />
          <meshBasicMaterial color={accent} transparent opacity={0.55} depthWrite={false} />
        </mesh>
      </group>
    );
  }

  const portalZ = VENUE_EXIT.circuit.pos[2];
  // Deck includes an apron behind + under the arch so the portal is built into
  // the platform, then runs forward past the launch mark.
  const zBack = portalZ - PORTAL_APRON_BEHIND;
  const zFront = sz + 2.8;
  const zMid = (zBack + zFront) / 2;
  const zLen = Math.abs(zFront - zBack);
  const halfZ = zLen / 2;
  const halfX = DECK_HALF_X;
  const pos: [number, number, number] = [sx, padY, zMid];
  const portalLocalZ = portalZ - zMid;

  return (
    <RigidBody type="fixed" colliders={false} position={pos}>
      <CuboidCollider args={[halfX, DECK_THICK / 2 + 0.04, halfZ]} />
      <mesh receiveShadow castShadow>
        <boxGeometry args={[halfX * 2, DECK_THICK, zLen]} />
        <meshStandardMaterial
          color="#2a2438"
          emissive={accent}
          emissiveIntensity={0.14}
          metalness={0.35}
          roughness={0.62}
        />
      </mesh>
      {/* Raised sill under the return arch — reads as threshold, not a hovering door. */}
      <mesh position={[0, DECK_THICK / 2 + 0.12, portalLocalZ]} castShadow receiveShadow>
        <boxGeometry args={[ARCH_SILL_W, 0.28, PORTAL_APRON_BEHIND + PORTAL_APRON_AHEAD]} />
        <meshStandardMaterial
          color="#1e1a2c"
          emissive={accent}
          emissiveIntensity={0.2}
          metalness={0.4}
          roughness={0.55}
        />
      </mesh>
      <mesh position={[0, DECK_THICK / 2 + 0.27, portalLocalZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.6, 3.5, 40]} />
        <meshBasicMaterial color={accent} transparent opacity={0.4} depthWrite={false} />
      </mesh>
      {/* launch mark under the spawn */}
      <mesh position={[0, DECK_THICK / 2 + 0.02, sz - zMid]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.2, 1.45, 28]} />
        <meshBasicMaterial color={accent} transparent opacity={0.55} depthWrite={false} />
      </mesh>
      {/* soft edge rails so the walk back to the portal reads as a path */}
      <mesh position={[-halfX + 0.1, DECK_THICK / 2 + 0.1, 0]}>
        <boxGeometry args={[0.14, 0.2, zLen * 0.98]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.35} metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[halfX - 0.1, DECK_THICK / 2 + 0.1, 0]}>
        <boxGeometry args={[0.14, 0.2, zLen * 0.98]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.35} metalness={0.5} roughness={0.4} />
      </mesh>
    </RigidBody>
  );
}

const ARCH_SILL_W = 8.4; // wider than arch feet (±3.6) so the threshold frames the portal

/** Void safety net — catches a fall (triggers run failure in the Handler).
 *  When Climb dressing paints the visible ground, hide the slab mesh but keep
 *  the desktop Rapier collider so a fall still has a physical catch plane. */
function SafetyFloor({
  color,
  track,
  staticMode,
  visible = true,
}: {
  color: string;
  track: CircuitTrackDef;
  staticMode: boolean;
  visible?: boolean;
}) {
  const { maxZ } = sectorBounds(track);
  return (
    <PhysBody staticMode={staticMode} position={[0, -12, maxZ * 0.45]}>
      <mesh receiveShadow visible={visible}>
        <boxGeometry args={[48, 1, maxZ + 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.08}
          metalness={0.2}
          roughness={0.9}
          transparent={!visible}
          opacity={visible ? 1 : 0}
          depthWrite={visible}
        />
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
  showFloor = true,
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
  /** false when ClimbDressing supplies the under-corridor ground */
  showFloor?: boolean;
}) {
  const accent = biome.lights.arenaPoint;
  const floor = useMemo(() => biome.terrain.low, [biome.terrain.low]);
  // Jetpack-only Ascent: rings + hazards carry the challenge. Arrival deck is the
  // only walkable surface (spawn ↔ return portal); no stepping-stones along the run.
  return (
    <>
      <SafetyFloor color={floor} track={track} staticMode={staticMode} visible={showFloor} />
      <ArrivalDeck spawn={track.spawn} staticMode={staticMode} accent={accent} />
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
          />
        );
      })}
    </>
  );
});
