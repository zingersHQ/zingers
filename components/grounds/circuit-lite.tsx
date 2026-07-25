"use client";
// ─────────────────────────────────────────────────────────────────────────────
// THE CLIMB — the one-thumb ascent ("our flappy bird"), mobile native body.
//
// The MOBILE native body of the Circuit (see docs/essence.md › "One soul, native
// bodies" and docs/climb.md › "The Hundred-Sector Ascent"). It REUSES the shared
// 3D scene (CircuitScene) but swaps the six-DOF Handler controller for a single-
// input, auto-forward flyer under a trailing chase camera — the whole game
// collapses to: HOLD to rise, release to fall, thread the gate; three lives, then reset.
//
// Content is the 100-sector climb (components/grounds/climb/*): ten themed
// Reaches (each a band of 10 sectors wearing an existing biome skin — the mirror
// law), difficulty as a deterministic function of (sector, reach, role). Depth is
// soul → Trainer XP + an ascent sigil (shared identity); time/mastery is craft →
// Crowns + the shared /api/circuit board. Rewards gate on genuine improvement.
// ─────────────────────────────────────────────────────────────────────────────
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { RotateCcw, Flag, Skull, ChevronLeft, ChevronRight, Hand, Trophy, Crown, Zap, Sparkles, Share2, Swords, Rocket } from "lucide-react";
import { CircuitScene } from "./circuit-scene";
import { READER_SCALE, WORLD_AGENT_SCALE } from "./champion-mesh";
import { RobotPilot, FlyingFollower } from "./flying-cast";
import { ClimbProveGate } from "./climb/prove-gate";
import { ClimbGhostRacer } from "./climb/ghost-racer";
import { ChallengeOvertakeToast } from "./climb/challenge-overtake-toast";
import {
  buildShareGhostPaths,
  challengeTipFurthestZ,
  climbChallengeMark,
  createClimbChallengeUrl,
  isChallengeTipSectorClear,
  type ClimbChallenge,
  type ClimbChallengeMark,
} from "@/lib/climb-challenge";
import {
  ghostPathForSector,
  ghostPathHasSamples,
  type ClimbGhostSample,
  type ClimbGhostSectors,
} from "@/lib/climb-ghost";
import {
  ALTITUDE_KEY_SECTOR,
  ascentCraftCrowns,
  ascentDepthXp,
  ascentSessionMods,
  clearAscentSessionMods,
  CLIMB_SECTOR_COUNT,
  lifeRestoreOnReachClear,
  needsAltitudeProve,
  setAscentSessionMods,
} from "@/lib/ascent-rules";
import { sectorFlightCruise } from "./climb/flight-cruise";
import {
  evaluateLadder,
  hitsRankLock,
  isScoutOpen,
  reachLockCopy,
} from "@/lib/unlock-ladder";
import { trainerLevel } from "@/lib/evolve/trainer";
import {
  earnedTraitsAvailable,
  loadoutLine,
  resolveFlightModifiers,
  resolveLoadout,
  traitGloss,
  traitLabel,
  wingInputFrom,
  type FlightModifiers,
  type WingTraitId,
} from "@/lib/wing-traits";
import {
  CLEAR_SKY,
  dailyFlightCondition,
  mergeRunMods,
  type RunMods,
} from "@/lib/conditions";
import { applyCareerToMods, readCareer } from "@/lib/career-friction";
import {
  EXPEDITION_CROWN_MULT,
  EXPEDITION_XP_MULT,
  isExpeditionOpen,
  isExpeditionRunBetter,
  loadExpeditionPersonalBest,
  saveExpeditionPersonalBest,
  thisWeekExpedition,
} from "@/lib/expeditions";
import { goldRingCrowns, rollGoldRing, withGoldDetour } from "./climb/gold-ring";
import {
  firstLightChestCrowns,
  HUNDRED_CHEST_CROWNS,
  SCOUT_CROWN_MULT,
  SCOUT_XP_MULT,
  scoutStartSector,
} from "@/lib/climb-campaign";
import { climbCanvasGfx, useGraphicsTier } from "@/lib/graphics-tier";
import { loadCircuitPersonalBest, saveCircuitPersonalBest, isCircuitRunBetter } from "./circuit-tracks";
import type { CircuitPersonalBest } from "./circuit-tracks";
import { noteGuestClimbDepth } from "@/lib/guest-climb";
import { getHandle } from "@/lib/owner";
import { reachTheme, reachThemeByIndex, type ReachTheme } from "./climb/reaches";
import { sectorHazards, hazardHits, type Hazard } from "./climb/hazards";
import { HazardField } from "./climb/hazard-field";
import { sectorModifier, type Modifier } from "./climb/modifiers";
import { ClimbDressing, ClimbDriftMotes, climbMoteScale } from "./climb/climb-dressing";
import { AscentSigil } from "./climb/ascent-sigil";
import {
  desktopCircuitSector,
  toClimbCanonical,
  DESKTOP_GAP_SCALE,
  DESKTOP_VERT_SCALE,
} from "./climb/desktop-adapter";
import type { BiomeConfig } from "./biomes";
import { CIRCUIT_LIVES, CIRCUIT_SECTOR_INTRO, circuitGatePlaneCross, formatCircuitMs } from "./circuit";
import type { CircuitTrackDef } from "./circuit";
import { CircuitGhostLeave, type CircuitGhostPose } from "./circuit-ghost";
import { usePrefersReducedMotion } from "@/components/arena/juice";
import { NextLine } from "@/components/director/next-card";
import { useChampions } from "@/store/champions";
import { ROSTER } from "@/lib/engine/roster";
import { getOwnerToken } from "@/lib/owner";
import type { Champion, CreatureType } from "@/lib/types";
import { setJet, stopJet, jetFallSfx, rewardSfx, badLuckSfx } from "@/lib/sfx";
import { setAmbienceIntensity, duckAmbience } from "@/lib/ambience-bus";
import { track as pingEvent } from "@/lib/track";

// a leaderboard row as returned by /api/circuit
interface BoardRow {
  handle: string;
  sectors: number;
  totalMs: number;
  clearedAll: boolean;
  you?: boolean;
}
// what a finished run paid out — shown on the outcome card
interface RunReward {
  xp: number;
  crowns: number;
  deeper: boolean;
}

// ── flight feel — a HEAVY robot fighting a POWERFUL jetpack ───────────────────
// Acceleration-based (not velocity-eased), so there's real weight: gravity is
// always pulling hard, thrust punches up through it, a tap gives an instant kick.
// Forward SPEED is per-sector (difficulty §3 × desktop gap scale) so authored
// gapSec is real time on both bodies. Vertical feel stays constant.
const GRAVITY = 28;
const THRUST_ACCEL = 50;
const PRESS_KICK = 4.0;
const MAX_FALL = 18;
const MAX_RISE = 12;
const DIVE_LEAD = 2.2;
const FLOOR_Y = -9;
// Chase camera — a touch farther so cast/rings match desktop scale in frame.
const CAM_DIST = 11.2;
const CAM_PITCH = 0.14;
const CAM_SIDE = 0;
const CAM_BACK = CAM_DIST * Math.cos(CAM_PITCH);
const CAM_UP = CAM_DIST * Math.sin(CAM_PITCH);
const CAM_LEAD = 2.4; // more down-track look = stronger forward rush
const CAM_HEIGHT = 0.27;
const CAM_LERP = 7;
const CAM_FOV = 54; // slight widen + lead sells the wind

// Flying cast scales — same absolute sizes as desktop Circuit / Grounds.
const PILOT_SCALE = READER_SCALE;
const FOLLOWER_SCALE = WORLD_AGENT_SCALE;
const CHAMP_FACE = 0;
/** Flight only — drops the mesh so the torso centres the gate-thread point. */
const CHAMP_Y = -0.72;
/** Ready pad — circuit-scene deck top is y=0; RobotExpressive origin = soles. */
const PAD_TOP_Y = 0;
// Looking +Z: screen-right is −X (same pedestal side as desktop CircuitSpectator).
const PED_OFF: [number, number, number] = [-2.6, -1.35, 0.45];
const PED_H = 1.05;
const PED_R_TOP = 0.52;
const PED_R_BOT = 0.64;

const CROWN = "#f5d020"; // fixed Crowns colour, independent of the Reach accent

type Phase = "ready" | "running" | "failed" | "done" | "ceiling" | "ranklock" | "continue" | "prove";
type FailReason = "fall" | "gates";
type RunMode = "ranked" | "scout" | "expedition";

// prototype fallback body while the champion GLTF resolves (also our old mech)
function MechBody({ accent }: { accent: string }) {
  return (
    <>
      <mesh castShadow>
        <boxGeometry args={[0.8, 0.9, 0.66]} />
        <meshStandardMaterial color="#3a3f4a" metalness={0.85} roughness={0.35} emissive={accent} emissiveIntensity={0.12} />
      </mesh>
      <mesh position={[0.2, 0.16, 0.34]}>
        <boxGeometry args={[0.42, 0.16, 0.04]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
    </>
  );
}

// ── the flyer: kinematic, one vertical input, drives the camera ───────────────
function Flyer({
  track,
  speed,
  hazards,
  champType,
  ascentReaches,
  accent,
  sigilAccent,
  holdRef,
  altRef,
  flyerPosRef,
  flyerHeadingRef,
  pilotBurstRef,
  samplesRef,
  sectorStart,
  onGate,
  onSectorClear,
  onFail,
  onStumble,
}: {
  track: CircuitTrackDef;
  speed: number;
  hazards: Hazard[];
  champType: CreatureType;
  ascentReaches: number;
  accent: string;
  sigilAccent: string;
  holdRef: React.RefObject<boolean>;
  altRef: React.RefObject<number>;
  /** the pilot's live world position — the FlyingFollower champion trails it */
  flyerPosRef: React.RefObject<THREE.Vector3>;
  /** the pilot's heading (down-track) */
  flyerHeadingRef: React.RefObject<number>;
  /** bump to emit a jetpack puff from the pilot */
  pilotBurstRef: React.RefObject<number>;
  /** ghost-path samples for THIS sector (t = ms since sector start) */
  samplesRef: React.MutableRefObject<ClimbGhostSample[]>;
  sectorStart: React.MutableRefObject<number>;
  onGate: (nextIdx: number) => void;
  onSectorClear: () => void;
  onFail: (r: FailReason) => void;
  onStumble: () => void;
}) {
  const grp = useRef<THREE.Group>(null);
  const { camera } = useThree();

  const pos = useRef(new THREE.Vector3(track.spawn[0], track.spawn[1], track.spawn[2]));
  const vy = useRef(0);
  // Hard wind from frame 0 — no spool (spool read as "hovering then drifting").
  const fwd = useRef(speed);
  const wasHeld = useRef(false); // rising-edge detect for the tap-kick
  const cpNext = useRef(1); // skip the start pad (checkpoint 0); thread gates 1..finish
  const prevZ = useRef(track.spawn[2]);
  const dead = useRef(false);
  const lockUntil = useRef(0);   // control ignored until this clock time (stumble)
  const immuneUntil = useRef(0); // no new stumble until this clock time (grace)
  const lastSampleT = useRef(0);

  // the pilot (robot) is always flying here; puff its jetpack while thrusting
  const flyingRef = useRef(true);
  const climbVelRef = useRef(0); // published for RobotPilot ground-ring sink/ride
  const jetEmit = useRef(0);

  const camWant = useRef(new THREE.Vector3());
  const lookAt = useRef(
    new THREE.Vector3(track.spawn[0], track.spawn[1] + CAM_HEIGHT, track.spawn[2] + CAM_LEAD),
  );

  useFrame((state, dtRaw) => {
    if (dead.current) return;
    const dt = Math.min(0.05, dtRaw);
    const tSec = state.clock.elapsedTime;
    // control is briefly ignored right after a stumble, so the shove reads
    const controlLocked = tSec < lockUntil.current;
    const held = !controlLocked && !!holdRef.current;

    // Hard wind — lock cruise every frame (desktop Circuit's constant +Z push).
    // Wing Tailwind multiplies via session mods.
    fwd.current = speed * ascentSessionMods().cruiseSpeedMult;
    pos.current.z += fwd.current * dt;

    const cp = track.checkpoints[cpNext.current];

    // vertical: thrust climbs; released thumb cruises with a slight sink, or a
    // deeper dive when the next ring is clearly below (auto-+Z is always on).
    // Stumble lock drops into a hard gravity fall so the shove still reads.
    if (held && !wasHeld.current) {
      vy.current = Math.max(vy.current, 0) + PRESS_KICK;
    }
    wasHeld.current = held;
    if (held) {
      vy.current = THREE.MathUtils.clamp(
        vy.current + (THRUST_ACCEL - GRAVITY) * dt,
        -MAX_FALL,
        MAX_RISE,
      );
    } else if (controlLocked) {
      vy.current = THREE.MathUtils.clamp(vy.current - GRAVITY * dt, -MAX_FALL, MAX_RISE);
    } else {
      const ses = ascentSessionMods();
      let sink: number = ses.cruiseSink;
      let glide: number = ses.cruiseGlide;
      if (cp && pos.current.y > cp.pos[1] + DIVE_LEAD) {
        sink = ses.diveSink;
        glide = ses.diveGlide;
      }
      const k = 1 - Math.exp(-glide * dt);
      vy.current = vy.current + (sink - vy.current) * k;
    }
    pos.current.y += vy.current * dt;
    climbVelRef.current = vy.current;

    // coplanar corridor (climb-feel §1c): rings sit at x=0 — pin the flyer to the
    // flight plane. No lateral ease toward a weaving next-gate (that rubber-band
    // was the "weird correction" players hated).
    pos.current.x = 0;

    // Publish the *visual* Trainer pose (mesh sits at CHAMP_Y). Follower wingDrop
    // is authored relative to the body, not the gate-thread point above it.
    flyerPosRef.current.set(pos.current.x, pos.current.y + CHAMP_Y, pos.current.z);
    flyerHeadingRef.current = CHAMP_FACE;
    // puff the pilot's jetpack: a steady cadence while held, sparse while gliding
    jetEmit.current += dt;
    const emitGap = held ? 0.05 : 0.16;
    if (jetEmit.current > emitGap) {
      jetEmit.current = 0;
      pilotBurstRef.current += 1;
    }

    if (grp.current) {
      grp.current.position.copy(pos.current);
      grp.current.rotation.y = CHAMP_FACE;
      // Strong forward lean into the wind + climb/sink attitude.
      const pitch = THREE.MathUtils.clamp(0.28 - vy.current * 0.045, -0.15, 0.62);
      grp.current.rotation.x = THREE.MathUtils.lerp(grp.current.rotation.x, pitch, 1 - Math.exp(-12 * dt));
    }

    // Chase the visual Trainer (CHAMP_Y), not the gate-thread point above it.
    const pivotY = pos.current.y + CHAMP_Y + CAM_HEIGHT;
    camWant.current.set(pos.current.x + CAM_SIDE, pivotY + CAM_UP, pos.current.z - CAM_BACK);
    const kc = 1 - Math.exp(-CAM_LERP * dt);
    camera.position.lerp(camWant.current, kc);
    lookAt.current.lerp(
      { x: pos.current.x, y: pivotY, z: pos.current.z + CAM_LEAD } as THREE.Vector3,
      kc,
    );
    camera.lookAt(lookAt.current);
    const cam = camera as THREE.PerspectiveCamera;
    if (Math.abs(cam.fov - CAM_FOV) > 0.05) {
      cam.fov += (CAM_FOV - cam.fov) * (1 - Math.exp(-3 * dt));
      cam.updateProjectionMatrix();
    }

    altRef.current = pos.current.y;

    // Sparse path samples in Climb-canonical space (same as desktop challenge URLs).
    const wall = performance.now();
    if (wall - lastSampleT.current >= 400) {
      lastSampleT.current = wall;
      const t0 = sectorStart.current || wall;
      const canon = toClimbCanonical(pos.current.y, pos.current.z);
      samplesRef.current.push({
        t: Math.max(0, wall - t0),
        y: canon.y,
        z: canon.z,
      });
      if (samplesRef.current.length > 80) samplesRef.current.shift();
    }

  // fall = spend a life (or run over when out)
    if (pos.current.y < FLOOR_Y) {
      dead.current = true;
      onFail("fall");
      return;
    }

    // hazard collision → a STUMBLE (shove + brief lockout), not a death. Usually
    // cascades into a miss/fall, so no third fail state (§4). Grace after a hit.
    if (hazards.length && tSec >= immuneUntil.current) {
      const px = pos.current.x;
      const py = pos.current.y;
      const pz = pos.current.z;
      for (let hi = 0; hi < hazards.length; hi++) {
        if (hazardHits(hazards[hi]!, tSec, px, py, pz)) {
          const ses = ascentSessionMods();
          vy.current = ses.stumbleVy;
          lockUntil.current = tSec + ses.stumbleLockS;
          immuneUntil.current = tSec + ses.stumbleImmuneS;
          onStumble();
          break;
        }
      }
    }

    // gate threading — shared plane-cross rule with desktop Circuit (miss = run over)
    if (cp) {
      const cross = circuitGatePlaneCross(prevZ.current, pos.current.z, pos.current, cp);
      if (cross === "pass") {
        cpNext.current += 1;
        if (cp.finish) {
          dead.current = true;
          onSectorClear();
        } else {
          onGate(cpNext.current);
        }
      } else if (cross === "miss") {
        dead.current = true;
        onFail("gates");
        return;
      }
    }
    prevZ.current = pos.current.z;
  });

  return (
    <group ref={grp} position={track.spawn}>
      <group position={[0, CHAMP_Y, 0]}>
        <Suspense fallback={<group scale={PILOT_SCALE}><MechBody accent={accent} /></group>}>
          <RobotPilot
            force={champType}
            flyingRef={flyingRef}
            burstRef={pilotBurstRef}
            faceHeading={CHAMP_FACE}
            scale={PILOT_SCALE}
            lean={0.42}
            climbVelRef={climbVelRef}
          />
        </Suspense>
      </group>
      <AscentSigil reaches={ascentReaches} accent={sigilAccent} />
    </group>
  );
}

/** Pedestal top — same math as desktop CircuitSpectator (world.tsx). */
function climbPedestalTop(spawn: [number, number, number]): [number, number, number] {
  return [spawn[0] + PED_OFF[0], spawn[1] + PED_OFF[1] + PED_H, spawn[2] + PED_OFF[2]];
}

function ClimbPedestal({ spawn, accent }: { spawn: [number, number, number]; accent: string }) {
  const px = spawn[0] + PED_OFF[0];
  const py = spawn[1] + PED_OFF[1];
  const pz = spawn[2] + PED_OFF[2];
  const top = py + PED_H;
  return (
    <group>
      <mesh position={[px, py + PED_H * 0.5, pz]} castShadow>
        <cylinderGeometry args={[PED_R_TOP, PED_R_BOT, PED_H, 20]} />
        <meshStandardMaterial color="#141230" emissive={accent} emissiveIntensity={0.28} metalness={0.4} roughness={0.6} />
      </mesh>
      <mesh position={[px, top + 0.02, pz]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[PED_R_TOP * 0.62, PED_R_TOP * 0.98, 28]} />
        <meshBasicMaterial color={accent} transparent opacity={0.55} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

// ── ready: Trainer on the launch pad; champion waits on the pedestal (desktop parity) ──
function ReadyPose({
  track,
  champType,
  ascentReaches,
  accent,
  sigilAccent,
  flyerPosRef,
}: {
  track: CircuitTrackDef;
  champType: CreatureType;
  ascentReaches: number;
  accent: string;
  sigilAccent: string;
  flyerPosRef: React.RefObject<THREE.Vector3>;
}) {
  const grp = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const grounded = useRef(false); // jetpack stowed on the pad
  const noBurst = useRef(0);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // Tiny idle settle — stay planted on the deck (no hover float).
    const py = PAD_TOP_Y + Math.sin(t * 1.6) * 0.02;
    if (grp.current) grp.current.position.y = py;
    flyerPosRef.current.set(track.spawn[0], py, track.spawn[2]);
    const sx = track.spawn[0];
    const sy = py + CAM_HEIGHT + 0.55; // chest-ish while standing (no CHAMP_Y)
    const sz = track.spawn[2];
    camera.position.set(sx + CAM_SIDE, sy + CAM_UP, sz - CAM_BACK);
    camera.lookAt(sx, sy, sz + CAM_LEAD);
  });
  return (
    <group ref={grp} position={[track.spawn[0], PAD_TOP_Y, track.spawn[2]]}>
      <Suspense fallback={<group scale={PILOT_SCALE}><MechBody accent={accent} /></group>}>
        <RobotPilot force={champType} flyingRef={grounded} burstRef={noBurst} faceHeading={CHAMP_FACE} scale={PILOT_SCALE} lean={0} />
      </Suspense>
      <AscentSigil reaches={ascentReaches} accent={sigilAccent} />
    </group>
  );
}

function Lights({
  biome,
  lite = false,
  shadowMapSize = 1024,
}: {
  biome: BiomeConfig;
  lite?: boolean;
  shadowMapSize?: number;
}) {
  return (
    <>
      <hemisphereLight args={[biome.lights.hemiSky, biome.lights.hemiGround, biome.lights.hemiInt]} />
      <ambientLight color={biome.lights.ambient} intensity={biome.lights.ambientInt} />
      <directionalLight
        position={[18, 30, 14]}
        intensity={biome.lights.sunInt}
        color={biome.lights.sun}
        castShadow={!lite}
        shadow-mapSize={[shadowMapSize, shadowMapSize]}
        shadow-camera-near={2}
        shadow-camera-far={90}
        shadow-camera-left={-28}
        shadow-camera-right={28}
        shadow-camera-top={36}
        shadow-camera-bottom={-20}
        shadow-bias={-0.00025}
      />
    </>
  );
}

// Sky-shift: eases the scene's background, fog and exposure toward the current
// Reach's targets each frame (docs/climb.md §2). Managing them imperatively lets
// a Reach boundary or a Duskfall modifier LERP in over ~1s instead of snapping.
function SkyShift({ bg, fogColor, fogNear, fogFar, exposure }: { bg: string; fogColor: string; fogNear: number; fogFar: number; exposure: number }) {
  const { scene, gl } = useThree();
  const bgRef = useRef<THREE.Color | null>(null);
  const fogRef = useRef<THREE.Fog | null>(null);
  const target = useMemo(() => ({ bg: new THREE.Color(bg), fog: new THREE.Color(fogColor) }), [bg, fogColor]);
  const nearRef = useRef(fogNear);
  const farRef = useRef(fogFar);
  const expRef = useRef(exposure);
  nearRef.current = fogNear;
  farRef.current = fogFar;
  expRef.current = exposure;
  useEffect(() => {
    if (!bgRef.current) {
      bgRef.current = new THREE.Color(bg);
      scene.background = bgRef.current;
    }
    if (!fogRef.current) {
      fogRef.current = new THREE.Fog(fogColor, fogNear, fogFar);
      scene.fog = fogRef.current;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-2.0 * Math.min(0.05, dt));
    if (bgRef.current) bgRef.current.lerp(target.bg, k);
    if (fogRef.current) {
      fogRef.current.color.lerp(target.fog, k);
      fogRef.current.near += (nearRef.current - fogRef.current.near) * k;
      fogRef.current.far += (farRef.current - fogRef.current.far) * k;
    }
    gl.toneMappingExposure += (expRef.current - gl.toneMappingExposure) * k;
  });
  return null;
}

// `embedded` = rendered inside the mobile shell as the Climb tab (docs/mobile.md):
// fill the parent tab area, drop the standalone island chrome.
export default function CircuitLite({
  embedded = false,
  onExit,
  guestKey,
  onClaim,
  challenge = null,
}: {
  embedded?: boolean;
  onExit?: () => void;
  /** loaner "wild mind" flown when the player owns no champion yet (guest Climb) */
  guestKey?: string;
  /** the claim hook — reached from the fall card ("Claim this mind") */
  onClaim?: () => void;
  /** Incoming async Climb challenge (depth + optional ghost path). */
  challenge?: ClimbChallenge | null;
} = {}) {
  const gfxTier = useGraphicsTier();
  const gfx = useMemo(() => climbCanvasGfx(gfxTier, embedded), [gfxTier, embedded]);
  const [mounted, setMounted] = useState(false);
  const [runId, setRunId] = useState(0);
  const [sector, setSector] = useState(0);
  const [phase, setPhase] = useState<Phase>("ready");
  const [failReason, setFailReason] = useState<FailReason>("fall");
  const [lives, setLives] = useState(CIRCUIT_LIVES);
  const livesRef = useRef(CIRCUIT_LIVES);
  const [ghost, setGhost] = useState<(CircuitGhostPose & { id: number }) | null>(null);
  const ghostId = useRef(0);
  const continueTimers = useRef<number[]>([]);
  const clearContinueTimers = useCallback(() => {
    for (const id of continueTimers.current) window.clearTimeout(id);
    continueTimers.current = [];
  }, []);
  const prefersReduced = usePrefersReducedMotion();
  const [targetIdx, setTargetIdx] = useState(1); // next gate to thread (for highlight + pips)
  // live ref for CircuitScene green-pass feedback (same path as desktop)
  const cpNextRef = useRef(1);
  useEffect(() => {
    cpNextRef.current = targetIdx;
  }, [targetIdx]);
  const [alt, setAlt] = useState(0);
  const [holding, setHolding] = useState(false);
  const [best, setBest] = useState<CircuitPersonalBest | null>(null);
  const [newBest, setNewBest] = useState(false);
  const [board, setBoard] = useState<BoardRow[]>([]);
  const [boardLoading, setBoardLoading] = useState(false);
  const [reward, setReward] = useState<RunReward | null>(null);
  /** Last finished run depth/time — for share + challenge links on the fall card. */
  const [lastRun, setLastRun] = useState<{ sectors: number; totalMs: number } | null>(null);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const [challengeResult, setChallengeResult] = useState<ClimbChallengeMark | null>(null);
  const [overtakeToast, setOvertakeToast] = useState(false);
  const samplesRef = useRef<ClimbGhostSample[]>([]);
  const sectorPathsRef = useRef<ClimbGhostSectors>([]);
  const [ghostStartMs, setGhostStartMs] = useState(0);
  // WebGL context loss handling — a phone GPU can evict our context under memory
  // pressure. preventDefault() asks for the same context back; a watchdog rebuilds
  // once if the browser never restores, capped so a starved device can't churn.
  const [glLost, setGlLost] = useState(false);
  const [glDead, setGlDead] = useState(false);
  const glWatchdog = useRef<number | null>(null);
  const glRebuilds = useRef<number[]>([]);
  const runIdRef = useRef(0);

  const holdRef = useRef(false);
  const altRef = useRef(0);
  const runStart = useRef(0); // performance.now() when the run went live
  const sectorStart = useRef(0); // performance.now() when the live sector started
  // the pilot (robot) publishes its live world pose here; the champion follower trails it
  const flyerPosRef = useRef(new THREE.Vector3());
  const champPosRef = useRef(new THREE.Vector3());
  const flyerHeadingRef = useRef(CHAMP_FACE);
  const pilotBurstRef = useRef(0);

  // which champion is flying: the adopted mind, else a sensible roster default
  const owned = useChampions((s) => s.owned);
  const getChampion = useChampions((s) => s.get);
  const awardTrainerXp = useChampions((s) => s.awardTrainerXp);
  const awardGauntlet = useChampions((s) => s.awardGauntlet);
  const lightCamp = useChampions((s) => s.lightCamp);
  const pushEvent = useChampions((s) => s.pushEvent);
  const scoutCrownsRemaining = useChampions((s) => s.scoutCrownsRemaining);
  const noteScoutCrowns = useChampions((s) => s.noteScoutCrowns);
  const campsLit = useChampions((s) => s.climb.campsLit);
  const bestSectors = useChampions((s) => s.climb.bestSectors);
  const climbHundred = useChampions((s) => s.climb.hundred);
  const trainerXp = useChampions((s) => s.trainerXp);
  const trainerLvl = trainerLevel(trainerXp).level;
  const scoutRankOpen = isScoutOpen(trainerLvl, campsLit);
  // guest Climb (docs/two-doors.md §3): with no owned champion, a loaner "wild
  // mind" flies with you. Guest runs mark nothing — claim it to keep your climb.
  const guest = !owned;
  const activeKey = owned ?? guestKey ?? "AXIOM";
  const champType = (ROSTER[activeKey]?.type ?? "LOGIC") as CreatureType;
  const champion = useMemo(() => getChampion(activeKey), [getChampion, activeKey]);
  // Wins must be reactive — the altitude prove writes a win, and a stale memoized
  // champion.wins would re-lock the gate every time you clear sector 11.
  const champWins = useChampions((s) => s.progress[activeKey]?.wins ?? 0);
  const recipe = useChampions((s) => (owned ? s.recipes[owned] : undefined));
  const sagaEvents = useChampions((s) => (owned ? s.events[owned] : undefined));
  const ladder = useMemo(
    () =>
      evaluateLadder({
        trainerXp,
        wins: champWins,
        bestSectors,
        campsLit,
        rosterCount: owned ? 1 : 0,
        firstDuelDone: true,
      }),
    [trainerXp, champWins, bestSectors, campsLit, owned],
  );
  const rankLock = reachLockCopy(ladder.maxReaches, ladder.next);

  // Ranked vs scout — declared early so Conditions can gate on it.
  const [runMode, setRunMode] = useState<RunMode>("ranked");
  const [scoutCamp, setScoutCamp] = useState(1);
  const runModeRef = useRef<RunMode>("ranked");
  const startSectorRef = useRef(0);
  runModeRef.current = runMode;
  startSectorRef.current = runMode === "scout" ? scoutStartSector(scoutCamp) : 0;

  // ── Wing traits (Stage 2) + Conditions (Stage 3) + career (Stage 4) ──────
  const [earnedPick, setEarnedPick] = useState<WingTraitId | null>(null);
  const wingInput = useMemo(() => {
    if (guest) return null;
    return wingInputFrom(activeKey, champion, recipe?.strat, campsLit);
  }, [guest, activeKey, champion, recipe, campsLit]);
  const earnedOptions = useMemo(
    () => (wingInput ? earnedTraitsAvailable(wingInput) : []),
    [wingInput],
  );
  const loadout = useMemo(
    () => (wingInput ? resolveLoadout(wingInput, earnedPick) : []),
    [wingInput, earnedPick],
  );
  const wingMods = useMemo(
    () => (loadout.length ? resolveFlightModifiers(loadout) : resolveFlightModifiers([])),
    [loadout],
  );
  const [dayCondition] = useState(() => dailyFlightCondition());
  const [expedition] = useState(() => thisWeekExpedition());
  const expeditionOpen = isExpeditionOpen(bestSectors, campsLit);
  const layoutSeed = runMode === "expedition" ? expedition.seed : "";
  const routeCap = runMode === "expedition" ? expedition.sectors : CLIMB_SECTOR_COUNT;
  const activeCondition =
    runMode === "expedition" && !guest
      ? expedition.condition
      : runMode === "ranked" && !guest
        ? dayCondition
        : CLEAR_SKY;
  const career = useMemo(
    () => (!guest && owned ? readCareer(champion, sagaEvents) : null),
    [guest, owned, champion, sagaEvents],
  );
  const runMods = useMemo(() => {
    const base = mergeRunMods(wingMods, activeCondition);
    return career ? applyCareerToMods(base, career) : base;
  }, [wingMods, activeCondition, career]);
  const runModsRef = useRef<RunMods>(runMods);
  runModsRef.current = runMods;
  const scoutUnlocked = scoutRankOpen && !runMods.banScout;

  const wingLivesCap = useRef(CIRCUIT_LIVES);
  const applyWingSession = useCallback((mods: FlightModifiers, refillLives: boolean) => {
    setAscentSessionMods({
      cruiseSink: mods.cruiseSink,
      cruiseGlide: mods.cruiseGlide,
      diveSink: mods.diveSink,
      diveGlide: mods.diveGlide,
      stumbleVy: mods.stumbleVy,
      stumbleLockS: mods.stumbleLockS,
      stumbleImmuneS: mods.stumbleImmuneS,
      cruiseSpeedMult: mods.cruiseSpeedMult,
    });
    if (refillLives) {
      livesRef.current = mods.lives;
      setLives(mods.lives);
    }
    wingLivesCap.current = mods.lives;
  }, []);

  // Physics track wings + Condition; lives refill only on fresh ready / full lives.
  useEffect(() => {
    const atFull = livesRef.current >= wingLivesCap.current;
    applyWingSession(runMods, phase === "ready" && atFull);
  }, [runMods, phase, applyWingSession]);

  useEffect(() => () => clearAscentSessionMods(), []);
  /** Session latch: once proved this run, never re-open the altitude gate. */
  const altitudeProvedRef = useRef(false);
  useEffect(() => {
    if (!needsAltitudeProve(champWins)) altitudeProvedRef.current = true;
  }, [champWins]);
  const guestPinged = useRef(false);

  // Golden ring (§7b): rare, pays Crowns, and sits off the racing line so greed
  // costs altitude commitment — not a free recolor of a straight-through gate.
  const [goldGate, setGoldGate] = useState(-1);
  const [goldGeom, setGoldGeom] = useState<{ idx: number; dy: number } | null>(null);
  const bonusCrowns = useRef(0);

  // Same scaled layout as desktop Circuit (bigger rings + gaps) — one Ascent.
  // Expedition passes a weekly seed so the route differs from the Hundred.
  const baseTrack = useMemo(() => desktopCircuitSector(sector, layoutSeed), [sector, layoutSeed]);
  // Greedy gold detour baked into the live track (geometry stays after payout so
  // the ring doesn't snap mid-sector).
  const track = useMemo(() => withGoldDetour(baseTrack, goldGeom), [baseTrack, goldGeom]);
  // Seed overlap poses before the first ReadyPose frame (ghosts read these).
  useEffect(() => {
    flyerPosRef.current.set(track.spawn[0], PAD_TOP_Y, track.spawn[2]);
    const ped = climbPedestalTop(track.spawn);
    champPosRef.current.set(ped[0], ped[1], ped[2]);
  }, [track]);
  const theme: ReachTheme = reachTheme(sector);
  const biome = theme.biome;
  const accent = theme.accent;
  const modifier: Modifier | null = useMemo(() => sectorModifier(sector), [sector]);
  const speed = useMemo(
    () => sectorFlightCruise(sector) * (modifier?.speedMult ?? 1),
    [sector, modifier],
  );
  const hazards = useMemo(() => sectorHazards(sector, track, layoutSeed), [sector, track, layoutSeed]);
  const moteColor = runMods.moteColor ?? modifier?.moteColor ?? accent;
  const fogNear = 30 * (modifier?.fogNearMult ?? 1) * runMods.fogNearMult;
  const exposure = biome.exposure * ((modifier?.warm || runMods.warm) ? 1.08 : 1);
  const [stumbleFlash, setStumbleFlash] = useState(false);
  const stumbleTimer = useRef<number | null>(null);

  // Sigil = cross-device camps lit (climb-p2), not the local board PB.
  const ascentReaches = Math.min(10, Math.max(0, campsLit));
  const sigilAccent = ascentReaches > 0 ? reachThemeByIndex(ascentReaches - 1).accent : accent;

  // Shared boards — ranked Hundred vs this week's Expedition.
  const loadBoard = useCallback(() => {
    const tok = getOwnerToken();
    setBoardLoading(true);
    if (runModeRef.current === "expedition") {
      fetch(
        `/api/expedition?body=thumb&week=${encodeURIComponent(expedition.weekId)}&limit=8${tok ? `&token=${encodeURIComponent(tok)}` : ""}`,
      )
        .then((r) => r.json())
        .then((d: { entries?: BoardRow[] }) => {
          setBoard((d.entries ?? []).map((e) => ({ ...e, you: !!e.you })));
        })
        .catch(() => {})
        .finally(() => setBoardLoading(false));
      return;
    }
    fetch(`/api/circuit?body=thumb&limit=8${tok ? `&token=${encodeURIComponent(tok)}` : ""}`)
      .then((r) => r.json())
      .then((d: { entries?: BoardRow[]; mine?: CircuitPersonalBest | null }) => {
        setBoard((d.entries ?? []).map((e) => ({ ...e, you: !!e.you })));
        if (d.mine) setBest((prev) => (isCircuitRunBetter(d.mine!, prev) ? d.mine! : prev));
      })
      .catch(() => {})
      .finally(() => setBoardLoading(false));
  }, [expedition.weekId]);

  useEffect(() => {
    setMounted(true);
    setBest(loadCircuitPersonalBest("thumb"));
    loadBoard();
    // Seed camps from local board depth (silent — no chest dump for veterans).
    try {
      const thumb = loadCircuitPersonalBest("thumb");
      const flight = loadCircuitPersonalBest("flight");
      const deepest = Math.max(thumb?.sectors ?? 0, flight?.sectors ?? 0);
      const cleared = !!(thumb?.clearedAll || flight?.clearedAll);
      if (deepest > 0) lightCamp(deepest, cleared, { silent: true });
    } catch {
      /* ignore */
    }
  }, [loadBoard, lightCamp]);

  useEffect(() => {
    if (!scoutUnlocked && runMode === "scout") setRunMode("ranked");
    else setScoutCamp((c) => Math.min(Math.max(1, c), campsLit));
  }, [campsLit, scoutUnlocked, runMode]);

  useEffect(() => {
    if (!expeditionOpen && runMode === "expedition") setRunMode("ranked");
  }, [expeditionOpen, runMode]);

  useEffect(() => {
    loadBoard();
  }, [runMode, loadBoard]);

  // stop the jetpack roar if we leave the page mid-run
  useEffect(() => () => stopJet(), []);

  // Ranked: depth→XP / time→Crowns / board / camps. Scout: fractional, no board.
  const recordRun = useCallback(
    (sectorsCleared: number, clearedAll: boolean) => {
      const totalMs = Math.max(0, performance.now() - runStart.current);
      const mode = runModeRef.current;
      const startAt = startSectorRef.current;
      setLastRun({ sectors: sectorsCleared, totalMs });
      if (challenge && mode === "ranked") {
        const tipZ = challengeTipFurthestZ(challenge.path, challenge.sectors);
        const mark = climbChallengeMark(
          {
            sectors: sectorsCleared,
            totalMs,
            failZ: clearedAll ? null : samplesRef.current[samplesRef.current.length - 1]?.z,
            failSectorIdx: clearedAll ? null : sector,
          },
          { sectors: challenge.sectors, totalMs: challenge.totalMs, tipZ },
        );
        setChallengeResult(mark);
        pingEvent(
          mark === "beat"
            ? "climb_challenge_beat"
            : mark === "surpassed"
              ? "climb_challenge_surpass"
              : "climb_challenge_miss",
        );
      }
      if (guest) {
        if (mode === "ranked") noteGuestClimbDepth(sectorsCleared);
        setReward(null);
        setNewBest(false);
        return;
      }

      // Scout: pay only for sectors advanced this run (never farm start depth).
      if (mode === "scout") {
        const advanced = Math.max(0, sectorsCleared - startAt);
        let xp = Math.round(ascentDepthXp(advanced, false) * SCOUT_XP_MULT);
        let crowns = Math.round(ascentCraftCrowns(advanced, false) * SCOUT_CROWN_MULT);
        const room = scoutCrownsRemaining();
        crowns = Math.min(crowns, room);
        const bonus = bonusCrowns.current;
        if (xp > 0) awardTrainerXp(xp);
        if (crowns > 0) {
          void awardGauntlet(crowns);
          noteScoutCrowns(crowns);
        }
        if (bonus > 0) void awardGauntlet(bonus);
        setReward(xp > 0 || crowns + bonus > 0 ? { xp, crowns: crowns + bonus, deeper: false } : null);
        setNewBest(false);
        return;
      }

      // Expedition: weekly seeded route — own board, no camps, fractional payout.
      if (mode === "expedition") {
        const capped = Math.min(sectorsCleared, expedition.sectors);
        const clearedRoute = capped >= expedition.sectors || clearedAll;
        const run = {
          weekId: expedition.weekId,
          sectors: capped,
          totalMs,
          clearedAll: clearedRoute,
        };
        const prev = loadExpeditionPersonalBest("thumb", expedition.weekId);
        const better = isExpeditionRunBetter(run, prev);
        const deeper = run.sectors > (prev?.sectors ?? -1);
        let xp = 0;
        if (deeper) {
          xp = Math.round(ascentDepthXp(run.sectors, clearedRoute) * EXPEDITION_XP_MULT);
          if (xp > 0) awardTrainerXp(xp);
        }
        const bonus = bonusCrowns.current;
        const expectCraft = better
          ? Math.round(ascentCraftCrowns(run.sectors, clearedRoute) * EXPEDITION_CROWN_MULT)
          : 0;
        if (expectCraft > 0) void awardGauntlet(expectCraft);
        if (bonus > 0) void awardGauntlet(bonus);
        setReward(
          xp > 0 || expectCraft + bonus > 0
            ? { xp, crowns: expectCraft + bonus, deeper }
            : null,
        );
        if (better) {
          saveExpeditionPersonalBest(run, "thumb");
          setNewBest(true);
        } else {
          setNewBest(false);
        }
        const tok = getOwnerToken();
        if (tok) {
          fetch("/api/expedition", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token: tok,
              weekId: expedition.weekId,
              sectors: run.sectors,
              totalMs: run.totalMs,
              body: "thumb",
            }),
          })
            .then(() => loadBoard())
            .catch(() => {});
        }
        return;
      }

      const run: CircuitPersonalBest = {
        sectors: sectorsCleared,
        totalMs,
        clearedAll,
      };
      const prev = loadCircuitPersonalBest("thumb");
      const better = isCircuitRunBetter(run, prev);
      const deeper = run.sectors > (prev?.sectors ?? -1);

      let xp = 0;
      if (deeper) {
        xp = ascentDepthXp(run.sectors, clearedAll);
        if (xp > 0) awardTrainerXp(xp);
      }
      const bonus = bonusCrowns.current;
      if (bonus > 0) void awardGauntlet(bonus);
      const expectCraft = better ? ascentCraftCrowns(run.sectors, clearedAll) : 0;

      // Camps + first-light chests + Hundred (climb-p2).
      const lit = lightCamp(run.sectors, clearedAll);
      let chestCrowns = 0;
      for (const n of lit.newlyLit) {
        const pay = firstLightChestCrowns(n);
        chestCrowns += pay;
        void awardGauntlet(pay);
        const theme = reachThemeByIndex(n - 1);
        if (activeKey) {
          pushEvent(activeKey, {
            kind: "ascent",
            title: `First light at Camp ${theme.roman}`,
            detail: theme.name,
          });
        }
      }
      if (lit.hundredJustCleared) {
        chestCrowns += HUNDRED_CHEST_CROWNS;
        void awardGauntlet(HUNDRED_CHEST_CROWNS);
        if (activeKey) {
          pushEvent(activeKey, {
            kind: "ascent",
            title: "Cleared the Hundred",
            detail: "hundred",
          });
        }
      }

      setReward(
        xp > 0 || expectCraft + bonus + chestCrowns > 0
          ? { xp, crowns: expectCraft + bonus + chestCrowns, deeper }
          : null,
      );

      if (better) {
        saveCircuitPersonalBest(run, "thumb");
        setBest(run);
        setNewBest(true);
      } else {
        setNewBest(false);
      }

      const tok = getOwnerToken();
      if (tok) {
        fetch("/api/circuit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: tok,
            sectors: run.sectors,
            totalMs: run.totalMs,
            clearedAll,
            body: "thumb",
            campsLit: lit.climb.campsLit,
          }),
        })
          .then(async (r) => {
            try {
              const j = (await r.json()) as { balance?: number };
              if (typeof j.balance === "number") useChampions.getState().setBalance(j.balance);
            } catch {
              /* ignore */
            }
            return loadBoard();
          })
          .catch(() => {});
      }
    },
    [
      guest,
      awardTrainerXp,
      awardGauntlet,
      loadBoard,
      challenge,
      lightCamp,
      pushEvent,
      activeKey,
      scoutCrownsRemaining,
      noteScoutCrowns,
      sector,
    ],
  );

  // read the altitude ref at ~12fps so the number ticks without re-rendering
  useEffect(() => {
    const id = setInterval(() => setAlt(altRef.current), 80);
    return () => clearInterval(id);
  }, []);

  // ── Sector-open card on ready (start / continue). Mid-ascent only flashes
  // when the Reach band changes — flight stays continuous between sectors.
  // Starting flight MUST dismiss the card: ready→running cleanup used to cancel
  // the hide timer and leave REACH / tagline painted over the climb. ──
  const [reachCardOn, setReachCardOn] = useState(true);
  const [reachCardOut, setReachCardOut] = useState(false);
  const reachCardHideT = useRef<number | null>(null);
  const dismissReachCard = useCallback((fade = true) => {
    if (reachCardHideT.current != null) {
      window.clearTimeout(reachCardHideT.current);
      reachCardHideT.current = null;
    }
    if (!fade) {
      setReachCardOn(false);
      setReachCardOut(false);
      return;
    }
    setReachCardOut(true);
    reachCardHideT.current = window.setTimeout(() => {
      setReachCardOn(false);
      setReachCardOut(false);
      reachCardHideT.current = null;
    }, 380);
  }, []);
  useEffect(() => () => {
    if (reachCardHideT.current != null) window.clearTimeout(reachCardHideT.current);
  }, []);
  useEffect(() => {
    if (phase !== "ready") return;
    if (reachCardHideT.current != null) {
      window.clearTimeout(reachCardHideT.current);
      reachCardHideT.current = null;
    }
    setReachCardOut(false);
    setReachCardOn(true);
    rewardSfx("small");
    // Title card alone — HOLD button is the only fly cue.
    const doneT = window.setTimeout(() => dismissReachCard(true), CIRCUIT_SECTOR_INTRO.cardMs);
    return () => {
      window.clearTimeout(doneT);
    };
  }, [phase, sector, dismissReachCard]);
  // First press / flight start — fade the title card off the climb.
  useEffect(() => {
    if (phase !== "running") return;
    dismissReachCard(true);
  }, [phase, dismissReachCard]);
  // Mid-ascent Reach band change: brief flash, then fade (flight stays live).
  // Intentionally omit `phase` from deps — only theme.index should re-arm the card.
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const reachBandInit = useRef(true);
  useEffect(() => {
    if (reachBandInit.current) {
      reachBandInit.current = false;
      return;
    }
    if (phaseRef.current !== "running") return;
    if (reachCardHideT.current != null) {
      window.clearTimeout(reachCardHideT.current);
      reachCardHideT.current = null;
    }
    setReachCardOut(false);
    setReachCardOn(true);
    const doneT = window.setTimeout(() => dismissReachCard(true), 2000);
    return () => window.clearTimeout(doneT);
  }, [theme.index, dismissReachCard]);
  // Roll a golden ring per sector (§7b). Non-finish mid gate, pulled off the
  // glide line so threading it is a deliberate climb/dive.
  useEffect(() => {
    const g = rollGoldRing(baseTrack.checkpoints, runModsRef.current.goldOddsMult);
    if (g) {
      setGoldGeom(g);
      setGoldGate(g.idx);
    } else {
      setGoldGeom(null);
      setGoldGate(-1);
    }
  }, [baseTrack, runId]);

  // music intensity per sector — Silent Sky drops it to a bare drone (§5)
  useEffect(() => {
    setAmbienceIntensity(runMods.ambience ?? modifier?.ambience ?? 0.32);
  }, [sector, modifier, runMods.ambience]);

  // a hazard hit: flash the screen edges + duck the score under the thud
  const onStumble = useCallback(() => {
    duckAmbience(0.6, 260);
    setStumbleFlash(true);
    if (stumbleTimer.current != null) window.clearTimeout(stumbleTimer.current);
    stumbleTimer.current = window.setTimeout(() => setStumbleFlash(false), 260);
  }, []);
  useEffect(() => () => {
    if (stumbleTimer.current != null) window.clearTimeout(stumbleTimer.current);
  }, []);

  const setHold = useCallback((on: boolean) => {
    holdRef.current = on;
    setHolding(on);
    setJet(on ? 0.9 : 0);
  }, []);

  // the flyer sits idle until the first press — no dying before you react
  const press = useCallback(() => {
    setPhase((p) => {
      if (p === "ready") {
        const now = performance.now();
        if (sector === 0 || !runStart.current) {
          runStart.current = now;
          sectorPathsRef.current = [];
          setChallengeResult(null);
        }
        sectorStart.current = now;
        setGhostStartMs(now);
        // Seed t=0 at the pad in Climb-canonical space (desktop challenge parity).
        const seed = runModeRef.current === "expedition" ? expedition.seed : "";
        const sp = desktopCircuitSector(sector, seed).spawn;
        const origin = toClimbCanonical(sp[1], sp[2]);
        samplesRef.current = [{ t: 0, y: origin.y, z: origin.z }];
        if (guest && !guestPinged.current) {
          guestPinged.current = true;
          pingEvent("m_guest_run");
        }
        return "running";
      }
      return p;
    });
    setHold(true);
  }, [setHold, guest, sector, expedition.seed]);

  // Ordinary restart: reset run state and REUSE the live WebGL context (never
  // bump runId — remounting the Canvas spins a fresh context and can push a
  // memory-tight phone into a loss loop). The Flyer remounts fresh on its own.
  const resetRun = useCallback(() => {
    clearContinueTimers();
    setHold(false);
    const start = runModeRef.current === "scout" ? startSectorRef.current : 0;
    setSector(start);
    setTargetIdx(1);
    setNewBest(false);
    setReward(null);
    setChallengeResult(null);
    setOvertakeToast(false);
    samplesRef.current = [];
    sectorPathsRef.current = [];
    setGhostStartMs(0);
    sectorStart.current = 0;
    runStart.current = 0;
    bonusCrowns.current = 0;
    applyWingSession(runModsRef.current, true);
    setGhost(null);
    altitudeProvedRef.current = !needsAltitudeProve(champWins);
    setPhase("ready");
  }, [setHold, clearContinueTimers, champWins, applyWingSession]);

  const pickRanked = useCallback(() => {
    setRunMode("ranked");
    setSector(0);
    setTargetIdx(1);
  }, []);

  const pickScout = useCallback((camp: number) => {
    const bonus = runModsRef.current.scoutCampBonus;
    const n = Math.max(1, Math.min(campsLit, camp + bonus));
    setRunMode("scout");
    setScoutCamp(n);
    setSector(scoutStartSector(n));
    setTargetIdx(1);
  }, [campsLit]);

  const pickExpedition = useCallback(() => {
    setRunMode("expedition");
    setSector(0);
    setTargetIdx(1);
  }, []);

  // Space: hold-to-fly while live; confirm try/run again on outcome overlays
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== "Enter") return;
      e.preventDefault();
      if (phase === "failed" || phase === "done" || phase === "ceiling" || phase === "ranklock") {
        resetRun();
        return;
      }
      if (e.code === "Space" && (phase === "ready" || phase === "running")) press();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") setHold(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [phase, press, setHold, resetRun]);

  // ── WebGL context-loss watchdog ──────────────────────────────────────────
  const GL_RESTORE_GRACE_MS = 2500;
  const GL_REBUILD_WINDOW_MS = 20000;
  const GL_MAX_REBUILDS = 3;

  const clearGlWatchdog = useCallback(() => {
    if (glWatchdog.current != null) {
      window.clearTimeout(glWatchdog.current);
      glWatchdog.current = null;
    }
  }, []);

  const onGlRestored = useCallback(() => {
    clearGlWatchdog();
    glRebuilds.current = [];
    setGlLost(false);
    setGlDead(false);
  }, [clearGlWatchdog]);

  const rebuildCanvas = useCallback(() => {
    resetRun();
    setRunId((n) => n + 1);
  }, [resetRun]);

  const onGlLost = useCallback(() => {
    setGlLost(true);
    clearGlWatchdog();
    glWatchdog.current = window.setTimeout(() => {
      const now = performance.now();
      glRebuilds.current = glRebuilds.current.filter((t) => now - t < GL_REBUILD_WINDOW_MS);
      if (glRebuilds.current.length < GL_MAX_REBUILDS) {
        glRebuilds.current.push(now);
        setGlLost(false);
        rebuildCanvas();
      } else {
        setGlLost(false);
        setGlDead(true);
      }
    }, GL_RESTORE_GRACE_MS);
  }, [clearGlWatchdog, rebuildCanvas]);

  const recoverGraphics = useCallback(() => {
    glRebuilds.current = [];
    setGlDead(false);
    setGlLost(false);
    rebuildCanvas();
  }, [rebuildCanvas]);

  useEffect(() => () => clearGlWatchdog(), [clearGlWatchdog]);

  const onGate = useCallback(
    (nextIdx: number) => {
      setTargetIdx(nextIdx);
      // the ring just threaded is nextIdx-1 — if it was the golden ring, pay out
      if (nextIdx - 1 === goldGate) {
        bonusCrowns.current += goldRingCrowns(runModsRef.current.goldCrownsMult);
        setGoldGate(-1);
        rewardSfx("big");
      } else {
        rewardSfx("small");
      }
    },
    [goldGate],
  );

  const onSectorClear = useCallback(() => {
    // Back to the pad — next sector waits for HOLD (desktop sector-ready beat).
    setHold(false);
    stopJet();
    setTargetIdx(1);
    setSector((s) => {
      if (samplesRef.current.length >= 2) {
        const paths = sectorPathsRef.current.slice();
        // Passed attempt only — overwrites any stale miss from a spent life.
        paths[s] = [...samplesRef.current];
        sectorPathsRef.current = paths;
      }
      if (
        challenge &&
        runModeRef.current === "ranked" &&
        isChallengeTipSectorClear(s, challenge.sectors)
      ) {
        setOvertakeToast(true);
        setChallengeResult("beat");
        pingEvent("climb_challenge_overtake");
      }
      const next = s + 1;
      const cap = runModeRef.current === "expedition" ? expedition.sectors : CLIMB_SECTOR_COUNT;
      if (next >= cap) {
        samplesRef.current = [];
        rewardSfx("epic");
        recordRun(cap, true);
        setPhase("done");
        return s;
      }
      // Thin altitude key: Reach II+ asks for a proven mind (one win). Ranked
      // only — scout / expedition skip the campaign door.
      if (
        runModeRef.current === "ranked" &&
        next >= ALTITUDE_KEY_SECTOR &&
        !guest &&
        !altitudeProvedRef.current &&
        needsAltitudeProve(champWins)
      ) {
        samplesRef.current = [];
        rewardSfx("big");
        recordRun(next, true);
        setPhase("ceiling");
        return s;
      }
      // Trainer-rank ceiling — higher Reaches drip via the Unlock Ladder.
      if (
        runModeRef.current === "ranked" &&
        !guest &&
        hitsRankLock(next, trainerLvl, champWins, bestSectors)
      ) {
        samplesRef.current = [];
        rewardSfx("big");
        recordRun(next, true);
        setPhase("ranklock");
        return s;
      }
      // Reach Gate Trial clear → one life back (capped at run max). Depth breath,
      // not a camp warp — ranked still dies back to sector 1 when lives hit 0.
      if (lifeRestoreOnReachClear(s) && livesRef.current < wingLivesCap.current) {
        livesRef.current += 1;
        setLives(livesRef.current);
      }
      rewardSfx("big");
      samplesRef.current = [];
      setGhostStartMs(0);
      sectorStart.current = 0;
      setPhase("ready");
      return next;
    });
  }, [setHold, recordRun, guest, champWins, trainerLvl, bestSectors, expedition.sectors, challenge]);

  const onFail = useCallback(
    (r: FailReason) => {
      setHold(false);
      stopJet();
      if (r === "fall") jetFallSfx();
      else badLuckSfx();
      setFailReason(r);

      // One continue — staged beat so fail SFX + ghost aren't a blink.
      if (livesRef.current > 1) {
        clearContinueTimers();
        livesRef.current -= 1;
        setLives(livesRef.current);
        setTargetIdx(1);
        // Drop the missed attempt so share/ghost keep only the pass that follows.
        samplesRef.current = [];
        duckAmbience(0.55, 800);
        setPhase("continue");
        continueTimers.current.push(
          window.setTimeout(() => {
            ghostId.current += 1;
            setGhost({
              id: ghostId.current,
              x: track.spawn[0],
              y: track.spawn[1] + CHAMP_Y,
              z: track.spawn[2],
              heading: CHAMP_FACE,
            });
          }, 380),
        );
        continueTimers.current.push(
          window.setTimeout(() => {
            setPhase("ready");
          }, 2800),
        );
        return;
      }

      clearContinueTimers();
      livesRef.current = 0;
      setLives(0);
      recordRun(sector, false);
      setPhase("failed");
    },
    [setHold, sector, recordRun, track.spawn, clearContinueTimers],
  );

  const shareChallenge = useCallback(async () => {
    const sectors = lastRun?.sectors ?? sector;
    const totalMs = lastRun?.totalMs ?? Math.max(0, performance.now() - runStart.current);
    const failed = phase === "failed";
    const paths = buildShareGhostPaths(
      sectorPathsRef.current,
      sectors,
      failed && samplesRef.current.length >= 2 ? samplesRef.current : null,
    );
    const url = await createClimbChallengeUrl({
      sectors,
      totalMs,
      name: getHandle() || undefined,
      mind: activeKey || undefined,
      path: ghostPathHasSamples(paths) ? paths : undefined,
      door: "thumb",
    });
    try {
      if (navigator.share) {
        // URL only — no blurb; share sheets concatenate text+url into one mess.
        await navigator.share({ url });
        pingEvent("climb_share_native");
        return;
      }
    } catch {
      // fall through to clipboard
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareMsg("Challenge link copied");
      pingEvent("climb_share_copy");
      window.setTimeout(() => setShareMsg(null), 2200);
    } catch {
      setShareMsg("Copy failed");
      window.setTimeout(() => setShareMsg(null), 2200);
    }
  }, [lastRun, sector, activeKey, phase]);

  const gateCount = track.checkpoints.length - 1; // gates 1..finish
  const gatesCleared = Math.max(0, targetIdx - 1); // in the current sector
  const running = phase === "running";
  const live = phase === "ready" || phase === "running"; // not during life-lost beat
  runIdRef.current = runId;
  // cumulative-ish altitude so the score always reads as a climb across sectors
  const shownAlt = Math.max(0, Math.round(sector * 28 + alt));
  const sectorLabel = `${Math.min(sector + 1, CLIMB_SECTOR_COUNT)}/${CLIMB_SECTOR_COUNT}`;

  return (
    <div
      style={{ position: embedded ? "absolute" : "fixed", inset: 0, zIndex: embedded ? undefined : 1000, background: biome.bg, overflow: "hidden", touchAction: "none", userSelect: "none" }}
      onPointerDown={() => live && press()}
      onPointerUp={() => setHold(false)}
      onPointerLeave={() => setHold(false)}
      onPointerCancel={() => setHold(false)}
    >
      {mounted && (
        <Canvas
          key={`${runId}-${gfxTier}`}
          frameloop="always"
          shadows={gfx.shadows}
          dpr={gfx.dpr}
          camera={{
            position: [
              track.spawn[0] + CAM_SIDE,
              track.spawn[1] + CAM_HEIGHT + CAM_UP,
              track.spawn[2] - CAM_BACK,
            ],
            fov: CAM_FOV,
            near: 0.1,
            far: gfx.far,
          }}
          gl={{ antialias: gfx.antialias, powerPreference: gfx.powerPreference }}
          style={{ pointerEvents: "none" }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = biome.exposure;
            if (gfx.shadows) {
              gl.shadowMap.enabled = true;
              gl.shadowMap.type = THREE.PCFSoftShadowMap;
            }
            const bornAt = runId;
            setGlLost(false);
            clearGlWatchdog();
            const canvas = gl.domElement;
            canvas.addEventListener("webglcontextlost", (e) => {
              e.preventDefault();
              if (runIdRef.current !== bornAt) return;
              onGlLost();
            });
            canvas.addEventListener("webglcontextrestored", () => {
              if (runIdRef.current !== bornAt) return;
              onGlRestored();
            });
          }}
        >
          <SkyShift bg={biome.bg} fogColor={biome.fog.color} fogNear={fogNear} fogFar={190} exposure={exposure} />
          <Lights biome={biome} lite={gfx.liteLights} shadowMapSize={gfx.shadowMapSize} />
          <ClimbDressing
            key={`dress-${theme.index}-${biome.id}`}
            biome={biome}
            track={track}
            sector={sector}
            tier={gfxTier}
            densityScale={0.45}
          />
          <CircuitScene
            track={track}
            biome={biome}
            highlightIndex={running ? targetIdx : undefined}
            goldIndex={goldGate >= 0 ? goldGate : undefined}
            cpNextRef={running ? cpNextRef : undefined}
            staticMode
            showFloor={false}
          />
          <ClimbDriftMotes track={track} accent={moteColor} countScale={climbMoteScale(sector) * 0.28} />
          {running && <HazardField key={`haz-${runId}-${sector}`} hazards={hazards} />}
          {(phase === "ready" || phase === "continue") && (
            <ReadyPose
              track={track}
              champType={champType}
              ascentReaches={ascentReaches}
              accent={accent}
              sigilAccent={sigilAccent}
              flyerPosRef={flyerPosRef}
            />
          )}
          {running && (
            <Flyer
              key={`${runId}-${sector}`}
              track={track}
              speed={speed}
              hazards={hazards}
              champType={champType}
              ascentReaches={ascentReaches}
              accent={accent}
              sigilAccent={sigilAccent}
              holdRef={holdRef}
              altRef={altRef}
              flyerPosRef={flyerPosRef}
              flyerHeadingRef={flyerHeadingRef}
              pilotBurstRef={pilotBurstRef}
              samplesRef={samplesRef}
              sectorStart={sectorStart}
              onGate={onGate}
              onSectorClear={onSectorClear}
              onFail={onFail}
              onStumble={onStumble}
            />
          )}
          {/* Pedestal + champion — desktop CircuitSpectator staging (stand to the right). */}
          {(phase === "ready" || phase === "continue" || running) && (
            <>
              <ClimbPedestal spawn={track.spawn} accent={accent} />
              <FlyingFollower
                key={`wing-${activeKey}-${sector}`}
                type={champType}
                champion={champion}
                identityKey={activeKey}
                targetRef={flyerPosRef}
                headingRef={flyerHeadingRef}
                scale={FOLLOWER_SCALE}
                renderPriority={0}
                spawnFrom={climbPedestalTop(track.spawn)}
                chasing={running}
                poseOut={champPosRef}
              />
            </>
          )}
          {(phase === "ready" || running) && (() => {
            const ghostPath = ghostPathForSector(challenge?.path, sector);
            if (!ghostPath) return null;
            const ghostMind = challenge?.mind;
            const ghostType = (ghostMind && ROSTER[ghostMind]?.type) || champType;
            return (
              <ClimbGhostRacer
                key={`ghost-${ghostMind || ghostType}-${sector}-${ghostStartMs}`}
                path={ghostPath}
                running={running}
                runStartMs={ghostStartMs}
                type={ghostType as CreatureType}
                mindKey={ghostMind || undefined}
                accent="#8aa0ff"
                scaleY={DESKTOP_VERT_SCALE}
                scaleZ={DESKTOP_GAP_SCALE}
                spawn={[track.spawn[0], track.spawn[1] + CHAMP_Y, track.spawn[2]]}
                followPos={flyerPosRef}
                champFollowPos={champPosRef}
                faceHeading={CHAMP_FACE}
              />
            );
          })()}
          {ghost && (
            <CircuitGhostLeave
              key={ghost.id}
              pose={ghost}
              force={champType}
              lite
              reducedMotion={prefersReduced}
              onDone={() => setGhost(null)}
            />
          )}
        </Canvas>
      )}

      {/* ── renderer recovery veil (context hiccup — the run keeps its state) ── */}
      {glLost && !glDead && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(6,5,11,.72)", zIndex: 40, pointerEvents: "none" }}>
          <div className="mono" style={{ textAlign: "center", color: accent }}>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1 }}>RESTORING GRAPHICS…</div>
            <div style={{ fontSize: 10, color: "var(--muted, #9a96b8)", marginTop: 6, letterSpacing: 0.5 }}>
              the renderer hiccuped. One moment.
            </div>
          </div>
        </div>
      )}

      {/* ── auto-recovery exhausted → manual retry ── */}
      {glDead && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(6,5,11,.86)", zIndex: 45, padding: 24 }}>
          <div className="mono" style={{ textAlign: "center", color: "#fff", maxWidth: 320 }}>
            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1, color: accent }}>GRAPHICS KEEP DROPPING</div>
            <div style={{ fontSize: 11, color: "var(--muted, #9a96b8)", marginTop: 8, marginBottom: 18, letterSpacing: 0.5, lineHeight: 1.5 }}>
              your device ran low on graphics memory. close other tabs, then reload the page.
            </div>
            <button
              type="button"
              onClick={recoverGraphics}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 22px", borderRadius: 12, border: "none", background: accent, color: "#0a0a12", fontWeight: 800, cursor: "pointer", fontSize: 15 }}
            >
              <RotateCcw size={16} strokeWidth={2.4} /> Reload graphics
            </button>
          </div>
        </div>
      )}

      {/* ── ALTITUDE — the score. Hidden while the sector title card owns the open
          so SECTOR 1/100 doesn't stack on the big intro number. ── */}
      <div
        style={{
          position: "absolute",
          top: guest || (embedded && !onExit) ? 12 : 54,
          left: 12,
          zIndex: 18,
          pointerEvents: "none",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          padding: "8px 12px 9px",
          borderRadius: 14,
          background: "rgba(8,7,14,.42)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          border: "1px solid rgba(255,255,255,.06)",
          opacity: reachCardOn && !reachCardOut && phase === "ready" ? 0 : 1,
          transition: "opacity 0.35s ease",
        }}
      >
        <div className="mono" style={{ fontSize: 9, letterSpacing: 1.5, color: accent, opacity: 0.9 }}>
          SECTOR {sectorLabel}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
          <span style={{ fontSize: 52, fontWeight: 800, color: "#fff", letterSpacing: -1.5, lineHeight: 0.95, fontVariantNumeric: "tabular-nums", textShadow: `0 0 26px ${accent}` }}>
            {shownAlt}
          </span>
          <span className="mono" style={{ fontSize: 16, color: "var(--muted, #9a96b8)" }}>m</span>
        </div>
        <div className="mono" style={{ fontSize: 8.5, letterSpacing: 2, color: "var(--muted2, #6b6785)" }}>ALTITUDE</div>
        {/* gate progress for THIS sector (what the ring-pips mean) */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
          <span className="mono" style={{ fontSize: 8.5, letterSpacing: 1.5, color: "var(--muted2, #6b6785)" }}>GATES</span>
          <span style={{ display: "flex", gap: 4 }}>
            {Array.from({ length: gateCount }, (_, i) => (
              <span
                key={i}
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 7,
                  background: i < gatesCleared ? accent : "transparent",
                  border: `1.5px solid ${accent}`,
                  opacity: i < gatesCleared ? 0.95 : 0.5,
                }}
              />
            ))}
          </span>
        </div>
        {(phase === "ready" || phase === "running") && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }} aria-label={`${lives} lives left`}>
            <span className="mono" style={{ fontSize: 8.5, letterSpacing: 1.5, color: "var(--muted2, #6b6785)" }}>LIVES</span>
            <span style={{ display: "flex", gap: 4 }}>
              {Array.from({ length: runMods.lives }, (_, i) => (
                <span
                  key={i}
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 7,
                    background: i < lives ? accent : "transparent",
                    border: `1.5px solid ${accent}`,
                    opacity: i < lives ? 0.95 : 0.4,
                    boxShadow: i < lives ? `0 0 8px ${accent}66` : "none",
                  }}
                />
              ))}
            </span>
          </div>
        )}
      </div>

      {/* ── personal best — top-right, quiet ── */}
      {best && (
        <div
          className="mono"
          style={{
            position: "absolute",
            top: 14,
            right: 12,
            zIndex: 18,
            pointerEvents: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "5px 9px",
            borderRadius: 999,
            background: "rgba(8,7,14,.38)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            border: "1px solid rgba(255,255,255,.05)",
            fontSize: 9.5,
            letterSpacing: 0.8,
            color: "var(--muted, #9a96b8)",
          }}
        >
          <Trophy size={10} strokeWidth={2.2} style={{ color: accent }} />
          {best.sectors}/{CLIMB_SECTOR_COUNT}
          {best.totalMs > 0 && <span style={{ color: "var(--muted2, #6b6785)" }}>· {formatCircuitMs(best.totalMs)}</span>}
        </div>
      )}

      {/* ── Sector-open cinematic — Reach + sector number, then tap cue ── */}
      {reachCardOn && (phase === "ready" || phase === "running") && (
        <div
          className={`circuit-sector-intro${reachCardOut ? " circuit-sector-intro--out" : ""}`}
          aria-live="polite"
          style={{ zIndex: 16 }}
        >
          <div className="circuit-sector-intro__wash" style={{ ["--ac" as string]: accent }} />
          <div className="circuit-sector-intro__card">
            <div className="circuit-sector-intro__kicker mono" style={{ color: accent }}>
              REACH {theme.roman} · {theme.name.toUpperCase()}
            </div>
            <div className="circuit-sector-intro__rule" style={{ background: accent }} />
            <div className="circuit-sector-intro__num">
              {sector + 1}
              <span className="circuit-sector-intro__of"> / {CLIMB_SECTOR_COUNT}</span>
            </div>
            {modifier && (
              <div
                className="mono"
                style={{
                  display: "inline-block",
                  marginTop: 10,
                  padding: "3px 10px",
                  borderRadius: 999,
                  border: `1px solid ${accent}`,
                  color: accent,
                  fontSize: 9.5,
                  letterSpacing: 1.5,
                }}
              >
                {modifier.label}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── stumble flash: a hazard clipped you (screen-edge pulse, §4) ── */}
      {stumbleFlash && (
        <div style={{ position: "absolute", inset: 0, zIndex: 22, pointerEvents: "none", boxShadow: "inset 0 0 90px 12px rgba(255,74,106,.55)", background: "radial-gradient(circle at center, transparent 55%, rgba(255,74,106,.18) 100%)" }} />
      )}

      {/* Guests: top-right claim (continue). Owned/standalone: leave chrome. */}
      {guest && onClaim && phase !== "failed" && phase !== "done" && phase !== "ceiling" && phase !== "ranklock" && (
        <button
          type="button"
          onClick={onClaim}
          aria-label="Claim a champion"
          style={{
            position: "absolute",
            top: 14,
            right: 12,
            zIndex: 20,
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: 12.5,
            fontWeight: 600,
            color: accent,
            background: "rgba(8,7,14,.55)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border: `1px solid ${accent}`,
            padding: "7px 12px",
            borderRadius: 999,
            cursor: "pointer",
            boxShadow: "0 4px 16px -6px rgba(0,0,0,.5)",
          }}
        >
          Claim a champion <ChevronRight size={15} strokeWidth={2.4} />
        </button>
      )}
      {!guest && (!embedded || onExit) && (() => {
        const backStyle = {
          position: "absolute" as const,
          top: 14,
          left: 12,
          zIndex: 20,
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontSize: 12.5,
          fontWeight: 600,
          color: "#e6e2f5",
          textDecoration: "none",
          background: "rgba(8,7,14,.55)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,.12)",
          padding: "7px 13px 7px 9px",
          borderRadius: 999,
          pointerEvents: "auto" as const,
          boxShadow: "0 4px 16px -6px rgba(0,0,0,.5)",
        };
        return onExit ? (
          <button type="button" onClick={onExit} aria-label="Leave Flight" style={{ ...backStyle, cursor: "pointer" }}>
            <ChevronLeft size={15} strokeWidth={2.4} /> Back
          </button>
        ) : (
          <Link href="/grounds" aria-label="Back to the Hub" style={backStyle}>
            <ChevronLeft size={15} strokeWidth={2.4} /> Hub
          </Link>
        );
      })()}

      {overtakeToast &&
        phase !== "failed" &&
        phase !== "continue" &&
        phase !== "prove" && (
        <ChallengeOvertakeToast
          name={challenge?.name}
          accent={accent}
          onDone={() => setOvertakeToast(false)}
        />
      )}

      {/* ── life-lost beat — hold the pad so fail SFX + ghost can land ── */}
      {phase === "continue" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            pointerEvents: "none",
            zIndex: 28,
            background: "radial-gradient(ellipse at center, rgba(40,8,12,.5) 0%, rgba(6,5,11,.58) 75%)",
          }}
        >
          <div className="mono" style={{ textAlign: "center", color: "#fff" }}>
            <div style={{ fontSize: 12, letterSpacing: 2.4, fontWeight: 800, color: "#ff5a5a", marginBottom: 8 }}>LIFE LOST</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>{failReason === "gates" ? "Missed a gate" : "You fell"}</div>
            <div style={{ fontSize: 11, color: "var(--muted, #9a96b8)", letterSpacing: 1 }}>
              {lives} {lives === 1 ? "life" : "lives"} left · same sector
            </div>
          </div>
        </div>
      )}

      {/* ── Camp picker (ready only, at run start) + HOLD affordance ── */}
      {live && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: embedded ? 88 : 34,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            pointerEvents: "none",
            padding: "0 16px",
          }}
        >
          {phase === "ready" && !guest && lives === runMods.lives && sector === startSectorRef.current && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                maxWidth: 420,
                pointerEvents: "auto",
              }}
            >
              {runMode === "expedition" && (
                <div className="mono" style={{ fontSize: 9, letterSpacing: 1.2, color: "var(--gold)", fontWeight: 800, textAlign: "center" }} title={expedition.gloss}>
                  WEEK · {expedition.name.toUpperCase()} · {expedition.condition.name.toUpperCase()}
                </div>
              )}
              {runMode === "ranked" && activeCondition.id !== "clear" && (
                <div className="mono" style={{ fontSize: 9, letterSpacing: 1.2, color: "var(--gold)", fontWeight: 800, textAlign: "center" }} title={activeCondition.gloss}>
                  TODAY · {activeCondition.name.toUpperCase()}
                </div>
              )}
              {loadout.length > 0 && (
                <div className="mono" style={{ fontSize: 9, letterSpacing: 1.2, color: accent, fontWeight: 800, textAlign: "center" }} title={loadout.map(traitGloss).join(" · ")}>
                  WINGS · {loadoutLine(loadout)}
                </div>
              )}
              {career && (career.form !== "steady" || career.fatigue > 0 || career.scars.length > 0) && (
                <div
                  className="mono"
                  style={{ fontSize: 9, letterSpacing: 1.2, color: "rgba(242,238,251,.72)", fontWeight: 800, textAlign: "center" }}
                  title={career.scars.map((s) => s.gloss).join(" · ") || undefined}
                >
                  FORM · {career.formLabel.toUpperCase()}
                  {career.fatigue > 0 ? ` · ${career.fatigueLabel.toUpperCase()}` : ""}
                  {career.scars[0] ? ` · ${career.scars[0].name.toUpperCase()}` : ""}
                </div>
              )}
              {earnedOptions.length > 1 && (
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 5 }}>
                  {earnedOptions.map((id) => {
                    const on = loadout[1] === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        title={traitGloss(id)}
                        onClick={() => setEarnedPick(id)}
                        className="mono"
                        style={{
                          padding: "4px 9px",
                          borderRadius: 999,
                          border: `1px solid ${on ? accent : "rgba(255,255,255,.16)"}`,
                          background: on ? `${accent}28` : "rgba(10,10,18,.45)",
                          color: on ? accent : "rgba(242,238,251,.7)",
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: 0.5,
                          cursor: "pointer",
                        }}
                      >
                        {traitLabel(id)}
                      </button>
                    );
                  })}
                </div>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 6 }}>
                <button
                  type="button"
                  onClick={pickRanked}
                  className="mono"
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    border: `1.5px solid ${runMode === "ranked" ? accent : "rgba(255,255,255,.18)"}`,
                    background: runMode === "ranked" ? `${accent}33` : "rgba(10,10,18,.55)",
                    color: runMode === "ranked" ? accent : "rgba(242,238,251,.75)",
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: 0.8,
                    cursor: "pointer",
                  }}
                >
                  RANKED · SECTOR 1
                </button>
                {expeditionOpen && !guest && (
                  <button
                    type="button"
                    onClick={pickExpedition}
                    className="mono"
                    title={expedition.gloss}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 999,
                      border: `1.5px solid ${runMode === "expedition" ? "var(--gold)" : "rgba(255,255,255,.18)"}`,
                      background: runMode === "expedition" ? "rgba(245,208,32,.22)" : "rgba(10,10,18,.55)",
                      color: runMode === "expedition" ? "var(--gold)" : "rgba(242,238,251,.75)",
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: 0.8,
                      cursor: "pointer",
                    }}
                  >
                    WEEK · {expedition.name.toUpperCase()}
                  </button>
                )}
                {scoutUnlocked &&
                  Array.from({ length: campsLit }, (_, i) => {
                    const camp = i + 1;
                    const on = runMode === "scout" && scoutCamp === camp;
                    const theme = reachThemeByIndex(camp - 1);
                    return (
                      <button
                        key={camp}
                        type="button"
                        onClick={() => pickScout(camp)}
                        className="mono"
                        title={`Scout from Camp ${theme.roman} · ${theme.name} (unranked)`}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 999,
                          border: `1.5px solid ${on ? theme.accent : "rgba(255,255,255,.18)"}`,
                          background: on ? `${theme.accent}33` : "rgba(10,10,18,.55)",
                          color: on ? theme.accent : "rgba(242,238,251,.75)",
                          fontSize: 10,
                          fontWeight: 800,
                          letterSpacing: 0.6,
                          cursor: "pointer",
                        }}
                      >
                        SCOUT · CAMP {theme.roman}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
          {phase === "ready" && runMode === "scout" && (
            <div className="mono" style={{ fontSize: 9, letterSpacing: 1, color: "rgba(242,238,251,.55)", textAlign: "center" }}>
              PRACTICE · no board · half XP · quarter Crowns
              {climbHundred ? " · ★ Hundred" : ""}
            </div>
          )}
          {phase === "ready" && runMode === "expedition" && (
            <div className="mono" style={{ fontSize: 9, letterSpacing: 1, color: "rgba(242,238,251,.55)", textAlign: "center" }}>
              EXPEDITION · {routeCap} sectors · weekly board · no camps
            </div>
          )}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 26px",
              borderRadius: 999,
              border: `2px solid ${accent}`,
              background: holding ? accent : "rgba(10,10,18,.45)",
              color: holding ? "#0a0a12" : accent,
              fontWeight: 800,
              letterSpacing: 1,
              boxShadow: holding ? `0 0 40px -6px ${accent}` : "none",
              transition: "background .08s, color .08s, box-shadow .12s",
            }}
          >
            <Hand size={18} strokeWidth={2.4} /> HOLD
          </div>
        </div>
      )}

      {/* ── outcome overlays ── */}
      {(phase === "failed" || phase === "done") && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(6,5,11,.62)", backdropFilter: "blur(5px)", zIndex: 30 }}>
          <div style={{ position: "relative", textAlign: "center", padding: 26, borderRadius: 18, border: `1px solid ${phase === "done" ? accent : "#ff5a5a"}`, background: "rgba(12,11,18,.9)", maxWidth: "88vw", width: 360 }}>
            <button
              type="button"
              onClick={() => void shareChallenge()}
              title="Share challenge"
              aria-label="Share challenge"
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,.16)",
                background: "transparent",
                color: "var(--muted, #9a96b8)",
                cursor: "pointer",
              }}
            >
              <Share2 size={15} strokeWidth={2.4} />
            </button>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8, color: phase === "done" ? accent : "#ff5a5a" }}>
              {phase === "done" ? <Flag size={30} strokeWidth={2.2} /> : <Skull size={30} strokeWidth={2.2} />}
            </div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: 2, color: phase === "done" ? accent : "#ff5a5a" }}>
              {phase === "done" ? "FULL CLEAR" : "RUN OVER"}
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", margin: "8px 0 4px" }}>
              {phase === "done" ? `All ${CLIMB_SECTOR_COUNT} sectors` : `${sector} sector${sector === 1 ? "" : "s"} cleared`}
            </div>
            <div className="mono" style={{ fontSize: 11, color: "var(--muted, #9a96b8)", marginBottom: 14 }}>
              {phase === "done"
                ? "you flew the whole climb"
                : failReason === "gates"
                  ? "out of lives. Missed a gate · back to sector 1"
                  : "out of lives · back to sector 1"}
            </div>
            {newBest ? (
              <div className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16, padding: "5px 12px", borderRadius: 999, background: accent, color: "#0a0a12", fontWeight: 800, fontSize: 11, letterSpacing: 1 }}>
                <Trophy size={13} strokeWidth={2.6} /> NEW BEST
              </div>
            ) : (
              best && (
                <div className="mono" style={{ marginBottom: 16, fontSize: 11, color: "var(--muted2, #6b6785)", letterSpacing: 1 }}>
                  best {best.sectors}/{CLIMB_SECTOR_COUNT}
                  {best.totalMs > 0 && ` · ${formatCircuitMs(best.totalMs)}`}
                </div>
              )
            )}
            {reward && (reward.xp > 0 || reward.crowns > 0) && (
              <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 14 }}>
                {reward.xp > 0 && (
                  <span className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 10, background: "rgba(255,255,255,.06)", border: `1px solid ${accent}55`, color: "#fff", fontSize: 12, fontWeight: 700 }}>
                    <Zap size={13} strokeWidth={2.4} style={{ color: accent }} /> +{reward.xp} XP
                  </span>
                )}
                {reward.crowns > 0 && (
                  <span className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 10, background: "rgba(255,255,255,.06)", border: `1px solid ${CROWN}55`, color: "#fff", fontSize: 12, fontWeight: 700 }}>
                    <Crown size={13} strokeWidth={2.4} fill={CROWN} style={{ color: CROWN }} /> +{reward.crowns}
                  </span>
                )}
              </div>
            )}

            {ascentReaches > 0 && (
              <div className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16, fontSize: 10, letterSpacing: 1.5, color: reward?.deeper ? accent : "var(--muted, #9a96b8)" }}>
                <Sparkles size={12} strokeWidth={2.2} style={{ color: accent }} />
                ASCENT SIGIL · {ascentReaches} REACH{ascentReaches === 1 ? "" : "ES"}
              </div>
            )}

            {!guest && <NextLine accent={accent} />}

            {challengeResult && challenge && (
              <div
                className="mono"
                style={{
                  marginBottom: 14,
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: `1px solid ${
                    challengeResult === "miss" ? "#ff5a5a88" : accent
                  }`,
                  color: challengeResult === "miss" ? "#ff8a8a" : accent,
                  fontSize: 11,
                  letterSpacing: 1,
                  fontWeight: 800,
                }}
              >
                {challengeResult === "beat"
                  ? `YOU BEAT ${challenge.name || "THEM"} · ${challenge.sectors}/100`
                  : challengeResult === "surpassed"
                    ? `PAST THEIR MARK · further than ${challenge.name || "them"}`
                    : `${challenge.name || "THEY"} HOLD · need ${challenge.sectors}+ sectors`}
              </div>
            )}

            {/* compact shared leaderboard (depth-then-time) */}
            <div style={{ marginBottom: 18, textAlign: "left", border: "1px solid rgba(255,255,255,.08)", borderRadius: 12, padding: "10px 12px", background: "rgba(255,255,255,.02)" }}>
              <div className="mono" style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--muted2, #6b6785)", marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
                <span>ASCENT LEADERBOARD</span>
                <span>{boardLoading ? "…" : `${board.length}`}</span>
              </div>
              {board.length === 0 ? (
                <div className="mono" style={{ fontSize: 10, color: "var(--muted2, #6b6785)" }}>
                  {getOwnerToken() ? "no runs yet. Set the pace" : "claim a Trainer to rank"}
                </div>
              ) : (
                board.slice(0, 5).map((r, i) => (
                  <div
                    key={`${r.handle}-${i}`}
                    className="mono"
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 11, padding: "2px 0", color: r.you ? accent : "#d9d5ea", fontWeight: r.you ? 800 : 500 }}
                  >
                    <span style={{ width: 16, color: "var(--muted2, #6b6785)" }}>{i + 1}</span>
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.handle || "anon"}{r.you ? " · you" : ""}</span>
                    <span>{r.sectors}/{CLIMB_SECTOR_COUNT}</span>
                    <span style={{ width: 52, textAlign: "right", color: "var(--muted, #9a96b8)" }}>{r.totalMs > 0 ? formatCircuitMs(r.totalMs) : "—"}</span>
                  </div>
                ))
              )}
            </div>

            {/* guest Climb: the wild mind you just flew is claimable here — the
                run marks nothing until you keep it (docs/two-doors.md §3) */}
            {guest && onClaim && (
              <>
                <div className="mono" style={{ fontSize: 10.5, color: "var(--muted, #9a96b8)", lineHeight: 1.5, marginBottom: 12, letterSpacing: 0.3 }}>
                  A wild mind flew with you. Claim it to keep your run. Earn XP, Crowns, and a place on the board.
                </div>
                <button
                  type="button"
                  onClick={onClaim}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 22px", borderRadius: 12, border: "none", background: accent, color: "#0a0a12", fontWeight: 800, cursor: "pointer", fontSize: 15, marginBottom: 10, width: "100%", justifyContent: "center" }}
                >
                  <Sparkles size={16} strokeWidth={2.4} /> Claim {ROSTER[activeKey]?.name ?? "this mind"}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={resetRun}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 22px", borderRadius: 12, border: "none", background: accent, color: "#0a0a12", fontWeight: 800, cursor: "pointer", fontSize: 15, width: "100%", justifyContent: "center" }}
            >
              <Rocket size={16} strokeWidth={2.4} /> {phase === "done" ? "Run again" : "Try again"}
            </button>
            {shareMsg && (
              <div className="mono" style={{ fontSize: 10, letterSpacing: 1, color: accent, marginTop: 10 }}>
                {shareMsg}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Thin altitude key — Reach II needs a short prove fight in-place. */}
      {phase === "ceiling" && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(6,5,11,.68)", backdropFilter: "blur(5px)", zIndex: 30 }}>
          <div style={{ textAlign: "center", padding: 26, borderRadius: 18, border: `1px solid ${accent}`, background: "rgba(12,11,18,.92)", maxWidth: "88vw", width: 360 }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8, color: accent }}>
              <Sparkles size={30} strokeWidth={2.2} />
            </div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: 2, color: accent }}>
              ALTITUDE GATE
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "8px 0 6px" }}>
              Prove your mind for the higher sky
            </div>
            <div className="mono" style={{ fontSize: 11, color: "var(--muted, #9a96b8)", marginBottom: 18, lineHeight: 1.5 }}>
              A short fight opens Reach II. Win here, then keep climbing.
            </div>
            {!guest && (
              <button
                type="button"
                onClick={() => {
                  pingEvent("climb_prove_open");
                  setPhase("prove");
                }}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 22px", borderRadius: 12, border: "none", background: accent, color: "#0a0a12", fontWeight: 800, cursor: "pointer", fontSize: 15, width: "100%", justifyContent: "center", marginBottom: 8 }}
              >
                <Swords size={15} strokeWidth={2.4} /> Prove now
              </button>
            )}
            <button
              type="button"
              onClick={resetRun}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 22px", borderRadius: 12, border: "1px solid rgba(255,255,255,.16)", background: "transparent", color: "#e6e2f5", fontWeight: 800, cursor: "pointer", fontSize: 14, width: "100%", justifyContent: "center", marginBottom: 8 }}
            >
              <RotateCcw size={15} strokeWidth={2.4} /> Practice Reach I again
            </button>
            {guest && onClaim && (
              <button
                type="button"
                onClick={onClaim}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 22px", borderRadius: 12, border: "none", background: accent, color: "#0a0a12", fontWeight: 800, cursor: "pointer", fontSize: 15, width: "100%", justifyContent: "center" }}
              >
                Claim a champion to prove
              </button>
            )}
          </div>
        </div>
      )}

      {/* Trainer-rank ceiling — Unlock Ladder rations higher Reaches. */}
      {phase === "ranklock" && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(6,5,11,.68)", backdropFilter: "blur(5px)", zIndex: 30 }}>
          <div style={{ textAlign: "center", padding: 26, borderRadius: 18, border: `1px solid ${accent}`, background: "rgba(12,11,18,.92)", maxWidth: "88vw", width: 360 }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8, color: accent }}>
              <Sparkles size={30} strokeWidth={2.2} />
            </div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: 2, color: accent }}>
              {rankLock.kicker}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "8px 0 6px" }}>
              {rankLock.title}
            </div>
            <div className="mono" style={{ fontSize: 11, color: "var(--muted, #9a96b8)", marginBottom: 18, lineHeight: 1.5 }}>
              {rankLock.detail}
            </div>
            <button
              type="button"
              onClick={resetRun}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 22px", borderRadius: 12, border: "none", background: accent, color: "#0a0a12", fontWeight: 800, cursor: "pointer", fontSize: 15, width: "100%", justifyContent: "center", marginBottom: 8 }}
            >
              <RotateCcw size={15} strokeWidth={2.4} /> Fly the open sky again
            </button>
          </div>
        </div>
      )}

      {phase === "prove" && !guest && (
        <ClimbProveGate
          activeKey={activeKey}
          accent={accent}
          onClose={() => {
            setPhase("ceiling");
          }}
          onWon={() => {
            // Win recorded on champion — latch + resume past the altitude key.
            altitudeProvedRef.current = true;
            setSector(ALTITUDE_KEY_SECTOR);
            setTargetIdx(1);
            setPhase("ready");
            pingEvent("climb_prove_resume");
          }}
        />
      )}
    </div>
  );
}
