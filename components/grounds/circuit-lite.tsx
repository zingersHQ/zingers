"use client";
// ─────────────────────────────────────────────────────────────────────────────
// THE CLIMB — the one-thumb ascent ("our flappy bird"), mobile native body.
//
// The MOBILE native body of the Circuit (see docs/essence.md › "One soul, native
// bodies" and docs/climb.md › "The Hundred-Sector Ascent"). It REUSES the shared
// 3D scene (CircuitScene) but swaps the six-DOF Handler controller for a single-
// input, auto-forward flyer under a trailing chase camera — the whole game
// collapses to: HOLD to rise, release to fall, thread the gate, one fall resets.
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
import { RotateCcw, Flag, Skull, ChevronLeft, Hand, Trophy, Crown, Zap, Sparkles } from "lucide-react";
import { CircuitScene } from "./circuit-scene";
import { ChampionMesh, READER_SCALE, WORLD_AGENT_SCALE } from "./champion-mesh";
import { RobotPilot, FlyingFollower } from "./flying-cast";
import { COMPANION_FOLLOW, companionDockSlot } from "./companion-follow";
import { climbCanvasGfx, useGraphicsTier } from "@/lib/graphics-tier";
import { loadCircuitPersonalBest, saveCircuitPersonalBest, isCircuitRunBetter } from "./circuit-tracks";
import type { CircuitPersonalBest } from "./circuit-tracks";
import { noteGuestClimbDepth } from "@/lib/guest-climb";
import { CLIMB_SECTORS, CLIMB_SECTOR_COUNT } from "./climb/sectors";
import { sectorDifficulty } from "./climb/difficulty";
import { reachTheme, type ReachTheme } from "./climb/reaches";
import { sectorHazards, hazardHits, type Hazard } from "./climb/hazards";
import { HazardField } from "./climb/hazard-field";
import { sectorModifier, type Modifier } from "./climb/modifiers";
import { ClimbDressing, ClimbDriftMotes, climbMoteScale } from "./climb/climb-dressing";
import type { BiomeConfig } from "./biomes";
import { circuitGatePlaneCross, formatCircuitMs } from "./circuit";
import type { CircuitTrackDef } from "./circuit";
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
// Forward SPEED is per-sector now (difficulty §3); the rest is constant feel.
const FORWARD_SPOOL = 11;   // snappy launch into cruise (climb-feel §4 — infinite-runner heartbeat)
// Forward push: mobile Climb multiplies per-sector difficulty speed. Desktop
// Circuit cruises at ~14 (world.tsx CIRCUIT_CRUISE); raw difficulty is 8.2–12.5,
// so we push harder so the one-thumb run feels like a runner, not a glide.
const FORWARD_PUSH = 1.55;
const GRAVITY = 24;         // downward accel (u/s²) — hard fall when not cruising
const THRUST_ACCEL = 40;    // jetpack up accel while held → controllable climb
const PRESS_KICK = 3.0;     // instant upward velocity pop on each new press (a flap)
const MAX_FALL = 15;        // terminal fall speed (sticky, but never uncontrollable)
const MAX_RISE = 10;        // climb clamp — a full hold rises, but you can still aim
// Auto-forward is always on in Climb — released thumb = cruise glide (slight
// descent), not a stone drop. Matches desktop world/Circuit cruise feel.
const CRUISE_SINK = -2.0;   // target vy while gliding forward without thrust
const CRUISE_GLIDE = 6;     // ease rate toward cruise sink
const FLOOR_Y = -9;         // fall below this → run over
// Soft ceiling: a full hold parks you INSIDE the next ring's opening so simply
// holding threads the gate instead of overshooting into the void.
const CEIL_GATE_FRAC = 0.5;

// ── stumble (docs/climb.md §4) — a hazard hit is NOT a death; it shoves you and
// briefly locks control, so it usually CASCADES into a miss or a fall without
// adding a third fail state. Then a grace window so you're not chain-stunned. ──
const STUMBLE_VY = -6;      // downward shove on a hit
const STUMBLE_LOCK = 0.4;   // seconds control is ignored after a hit
const STUMBLE_IMMUNE = 1.6; // seconds before another hit can register (lock + grace)
const GOLD_RING_ODDS = 0.125; // §7b — chance a sector hides a golden ring (+Crowns)
const GOLD_RING_CROWNS = 25;

// ── chase camera ── Flappy read (climb-feel §3): tiny flyer, big corridor,
// 2–3 rings visible ahead. Character should occupy ≲15% of frame height.
const CAM_SIDE = 2.4;     // slight +X so the body reads in 3/4, not dead-on
const CAM_UP = 4.2;       // lift above the flyer
const CAM_BACK = 16.0;    // trail well behind (travel is +Z)
const CAM_LEAD = 14.0;    // look well down-track so upcoming rings are centred
const CAM_HEIGHT = 0.6;   // look-at lift — keeps the hero low-centre of frame
const CAM_LERP = 6;       // exp-damping rate for smooth follow (frame-rate indep.)

// ── the flying cast (canon: the Trainer flies, the champion flies beside) ──
// Same absolute scales as the Grounds / desktop Circuit (world.tsx):
// Trainer = READER_SCALE (2/3), champion = WORLD_AGENT_SCALE (2/9) → ~⅓.
// Camera stay-back (CAM_*) keeps the Flappy "small bird, big sky" read — don't
// invent a second proportion for the phone.
const PILOT_SCALE = READER_SCALE;
const FOLLOWER_SCALE = WORLD_AGENT_SCALE;
const CHAMP_FACE = 0;      // Y-rotation so it faces the travel direction (+Z)
const CHAMP_Y = -0.72;     // drop so the torso centres on the gate-thread point
/** Ready-pose wing dock — same COMPANION_FOLLOW slot as Grounds OwnedCompanion. */
const READY_DOCK = companionDockSlot(0, 0, CHAMP_FACE);

const CROWN = "#f5d020"; // fixed Crowns colour, independent of the Reach accent

type Phase = "ready" | "running" | "failed" | "done" | "ceiling";
type FailReason = "fall" | "gates";

/** Reach II (sector index 10) needs one duel win — thin altitude key (flyover §3). */
const ALTITUDE_KEY_SECTOR = 10;

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

// ascent sigil: a slowly-rotating halo of glyphs above the flyer. Glyph count =
// your best depth in Reaches (essence §3 "an ascent sigil baked onto the body").
function AscentSigil({ reaches, accent }: { reaches: number; accent: string }) {
  const grp = useRef<THREE.Group>(null);
  const n = Math.min(10, Math.max(0, reaches));
  useFrame((_, dt) => {
    if (grp.current) grp.current.rotation.y += dt * 0.8;
  });
  if (n <= 0) return null;
  return (
    <group ref={grp} position={[0, 1.55, 0]}>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.62, 0, Math.sin(a) * 0.62]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.08, 0.026, 8, 20]} />
            <meshBasicMaterial color={accent} transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
          </mesh>
        );
      })}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.62, 0.012, 8, 48]} />
        <meshBasicMaterial color={accent} transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
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
  holdRef,
  altRef,
  flyerPosRef,
  flyerHeadingRef,
  pilotBurstRef,
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
  holdRef: React.RefObject<boolean>;
  altRef: React.RefObject<number>;
  /** the pilot's live world position — the FlyingFollower champion trails it */
  flyerPosRef: React.RefObject<THREE.Vector3>;
  /** the pilot's heading (down-track) */
  flyerHeadingRef: React.RefObject<number>;
  /** bump to emit a jetpack puff from the pilot */
  pilotBurstRef: React.RefObject<number>;
  onGate: (nextIdx: number) => void;
  onSectorClear: () => void;
  onFail: (r: FailReason) => void;
  onStumble: () => void;
}) {
  const grp = useRef<THREE.Group>(null);
  const { camera } = useThree();

  const pos = useRef(new THREE.Vector3(track.spawn[0], track.spawn[1], track.spawn[2]));
  const vy = useRef(0);
  const fwd = useRef(0);         // forward speed, spools up to `speed` (launch feel)
  const wasHeld = useRef(false); // rising-edge detect for the tap-kick
  const cpNext = useRef(1); // skip the start pad (checkpoint 0); thread gates 1..finish
  const prevZ = useRef(track.spawn[2]);
  const dead = useRef(false);
  const lockUntil = useRef(0);   // control ignored until this clock time (stumble)
  const immuneUntil = useRef(0); // no new stumble until this clock time (grace)

  // the pilot (robot) is always flying here; puff its jetpack while thrusting
  const flyingRef = useRef(true);
  const jetEmit = useRef(0);

  const camWant = useRef(new THREE.Vector3());
  const lookAt = useRef(new THREE.Vector3(track.spawn[0], track.spawn[1], track.spawn[2] + CAM_LEAD));

  useFrame((state, dtRaw) => {
    if (dead.current) return;
    const dt = Math.min(0.05, dtRaw);
    const tSec = state.clock.elapsedTime;
    // control is briefly ignored right after a stumble, so the shove reads
    const controlLocked = tSec < lockUntil.current;
    const held = !controlLocked && !!holdRef.current;

    // auto-forward, spooling up to this sector's cruise speed
    fwd.current += (speed - fwd.current) * (1 - Math.exp(-FORWARD_SPOOL * dt));
    pos.current.z += fwd.current * dt;

    const cp = track.checkpoints[cpNext.current];

    // vertical: thrust climbs; released thumb cruises forward with a slight sink
    // (auto-+Z is always on). Stumble lock drops into a hard gravity fall so the
    // shove still reads. Kick on each fresh press.
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
      const k = 1 - Math.exp(-CRUISE_GLIDE * dt);
      vy.current = vy.current + (CRUISE_SINK - vy.current) * k;
    }
    pos.current.y += vy.current * dt;

    // soft ceiling inside the next gate's opening — a hold threads it, not misses
    const ceilY = cp ? cp.pos[1] + cp.radius * CEIL_GATE_FRAC : Infinity;
    if (pos.current.y > ceilY) {
      pos.current.y = ceilY;
      if (vy.current > 0) vy.current = 0;
    }

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
      const pitch = THREE.MathUtils.clamp(-vy.current * 0.035, -0.35, 0.42);
      grp.current.rotation.x = THREE.MathUtils.lerp(grp.current.rotation.x, pitch, 1 - Math.exp(-12 * dt));
    }

    // trailing chase camera, exp-damped
    camWant.current.set(pos.current.x + CAM_SIDE, pos.current.y + CAM_UP, pos.current.z - CAM_BACK);
    const kc = 1 - Math.exp(-CAM_LERP * dt);
    camera.position.lerp(camWant.current, kc);
    lookAt.current.lerp(
      { x: pos.current.x, y: pos.current.y + CAM_HEIGHT, z: pos.current.z + CAM_LEAD } as THREE.Vector3,
      kc,
    );
    camera.lookAt(lookAt.current);

    altRef.current = pos.current.y;

    // fall = run over (the soul atom)
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
          vy.current = STUMBLE_VY;
          lockUntil.current = tSec + STUMBLE_LOCK;
          immuneUntil.current = tSec + STUMBLE_IMMUNE;
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
          <RobotPilot force={champType} flyingRef={flyingRef} burstRef={pilotBurstRef} faceHeading={CHAMP_FACE} scale={PILOT_SCALE} />
        </Suspense>
      </group>
      <AscentSigil reaches={ascentReaches} accent={accent} />
    </group>
  );
}

// ── ready pose: the OWNED champion waits on the start pad, idling ─────────────
function ReadyPose({
  track,
  champType,
  champion,
  ascentReaches,
  accent,
}: {
  track: CircuitTrackDef;
  champType: CreatureType;
  champion: Champion;
  ascentReaches: number;
  accent: string;
}) {
  const grp = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const grounded = useRef(false); // pilot is on the pad, jetpack stowed
  const noBurst = useRef(0);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (grp.current) grp.current.position.y = track.spawn[1] + CHAMP_Y + Math.sin(t * 1.6) * 0.07;
    camera.lookAt(track.spawn[0], track.spawn[1] + 0.5, track.spawn[2] + 0.4);
  });
  return (
    <group ref={grp} position={[track.spawn[0], track.spawn[1] + CHAMP_Y, track.spawn[2]]}>
      <Suspense fallback={<group scale={PILOT_SCALE}><MechBody accent={accent} /></group>}>
        {/* the Trainer's robot, ready on the pad */}
        <RobotPilot force={champType} flyingRef={grounded} burstRef={noBurst} faceHeading={CHAMP_FACE} scale={PILOT_SCALE} lean={0} />
        {/* champion on the Grounds wing dock — same COMPANION_FOLLOW slot as the 3D world */}
        <group position={[READY_DOCK.tx, -COMPANION_FOLLOW.wingDrop * 0.35, READY_DOCK.tz]}>
          <ChampionMesh
            type={champType}
            champion={champion}
            position={[0, 0, 0]}
            rotation={CHAMP_FACE - 0.25}
            showLabel={false}
            hideFloaters
            breatheIntensity={0.9}
            restPose="standing"
            sceneScale={FOLLOWER_SCALE}
          />
        </group>
      </Suspense>
      <AscentSigil reaches={ascentReaches} accent={accent} />
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
}: {
  embedded?: boolean;
  onExit?: () => void;
  /** loaner "wild mind" flown when the player owns no champion yet (guest Climb) */
  guestKey?: string;
  /** the claim hook — reached from the fall card ("Claim this mind") */
  onClaim?: () => void;
} = {}) {
  const gfxTier = useGraphicsTier();
  const gfx = useMemo(() => climbCanvasGfx(gfxTier, embedded), [gfxTier, embedded]);
  const [mounted, setMounted] = useState(false);
  const [runId, setRunId] = useState(0);
  const [sector, setSector] = useState(0);
  const [phase, setPhase] = useState<Phase>("ready");
  const [failReason, setFailReason] = useState<FailReason>("fall");
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
  // the pilot (robot) publishes its live world pose here; the champion follower trails it
  const flyerPosRef = useRef(new THREE.Vector3());
  const flyerHeadingRef = useRef(CHAMP_FACE);
  const pilotBurstRef = useRef(0);

  // which champion is flying: the adopted mind, else a sensible roster default
  const owned = useChampions((s) => s.owned);
  const getChampion = useChampions((s) => s.get);
  const awardTrainerXp = useChampions((s) => s.awardTrainerXp);
  const awardGauntlet = useChampions((s) => s.awardGauntlet);
  // guest Climb (docs/two-doors.md §3): with no owned champion, a loaner "wild
  // mind" flies with you. Guest runs mark nothing — claim it to keep your climb.
  const guest = !owned;
  const activeKey = owned ?? guestKey ?? "AXIOM";
  const champType = (ROSTER[activeKey]?.type ?? "LOGIC") as CreatureType;
  const champion = useMemo(() => getChampion(activeKey), [getChampion, activeKey]);
  const guestPinged = useRef(false);

  // ── the current sector's theme + difficulty + modifier (the Reach it lives in) ──
  const track = CLIMB_SECTORS[sector]!;
  const theme: ReachTheme = reachTheme(sector);
  const biome = theme.biome;
  const accent = theme.accent;
  const modifier: Modifier | null = useMemo(() => sectorModifier(sector), [sector]);
  const speed = useMemo(() => sectorDifficulty(sector).speed * (modifier?.speedMult ?? 1) * FORWARD_PUSH, [sector, modifier]);
  const hazards = useMemo(() => sectorHazards(sector, track), [sector, track]);
  const moteColor = modifier?.moteColor ?? accent;
  const fogNear = 30 * (modifier?.fogNearMult ?? 1);
  const exposure = biome.exposure * (modifier?.warm ? 1.08 : 1);

  // a golden ring hides in some sectors (§7b surprise): threading it pays Crowns
  const [goldGate, setGoldGate] = useState(-1);
  const bonusCrowns = useRef(0);
  const [stumbleFlash, setStumbleFlash] = useState(false);
  const stumbleTimer = useRef<number | null>(null);

  // depth is soul: your best depth marks the champion with an ascent sigil whose
  // glyph count is the number of Reaches you've reached (§6).
  const ascentReaches = best ? Math.min(10, Math.ceil(best.sectors / 10)) : 0;

  // pull the shared leaderboard (depth-then-time). `you` flags your own row.
  const loadBoard = useCallback(() => {
    const tok = getOwnerToken();
    setBoardLoading(true);
    fetch(`/api/circuit?body=thumb&limit=8${tok ? `&token=${encodeURIComponent(tok)}` : ""}`)
      .then((r) => r.json())
      .then((d: { entries?: BoardRow[]; mine?: CircuitPersonalBest | null }) => {
        setBoard((d.entries ?? []).map((e) => ({ ...e, you: !!e.you })));
        if (d.mine) setBest((prev) => (isCircuitRunBetter(d.mine!, prev) ? d.mine! : prev));
      })
      .catch(() => {})
      .finally(() => setBoardLoading(false));
  }, []);

  useEffect(() => {
    setMounted(true);
    setBest(loadCircuitPersonalBest());
    loadBoard();
  }, [loadBoard]);

  // stop the jetpack roar if we leave the page mid-run
  useEffect(() => () => stopJet(), []);

  // A finished run is scored against your personal best AND pays out per essence §3:
  //   depth is SOUL → Trainer XP + the ascent sigil; time/mastery is CRAFT → Crowns.
  // Reward is gated on genuine improvement so sector 1 can't be farmed.
  const recordRun = useCallback(
    (sectorsCleared: number, clearedAll: boolean) => {
      // a guest run marks nothing on the board/career yet — but we hold the best
      // depth so claim can convert it into the first Trainer mark (two-doors §3.3).
      if (guest) {
        noteGuestClimbDepth(sectorsCleared);
        setReward(null);
        setNewBest(false);
        return;
      }
      const run: CircuitPersonalBest = {
        sectors: sectorsCleared,
        totalMs: Math.max(0, performance.now() - runStart.current),
        clearedAll,
      };
      const prev = loadCircuitPersonalBest();
      const better = isCircuitRunBetter(run, prev);
      const deeper = run.sectors > (prev?.sectors ?? -1);

      let xp = 0;
      let crowns = 0;
      if (deeper) {
        const reaches = Math.ceil(run.sectors / 10);
        xp = run.sectors * 20 + reaches * 12 + (clearedAll ? 100 : 0); // depth → XP (soul)
        if (xp > 0) awardTrainerXp(xp);
      }
      if (better) {
        const reaches = Math.ceil(run.sectors / 10);
        crowns = Math.round(run.sectors * 3 + reaches * 15 + (clearedAll ? 50 : 0)); // craft → Crowns
      }
      crowns += bonusCrowns.current; // golden-ring surprise pays regardless (§7b)
      if (crowns > 0) void awardGauntlet(crowns);
      setReward(xp > 0 || crowns > 0 ? { xp, crowns, deeper } : null);

      if (better) {
        saveCircuitPersonalBest(run);
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
          body: JSON.stringify({ token: tok, sectors: run.sectors, totalMs: run.totalMs, clearedAll, body: "thumb" }),
        })
          .then(() => loadBoard())
          .catch(() => {});
      }
    },
    [guest, awardTrainerXp, awardGauntlet, loadBoard],
  );

  // read the altitude ref at ~12fps so the number ticks without re-rendering
  useEffect(() => {
    const id = setInterval(() => setAlt(altRef.current), 80);
    return () => clearInterval(id);
  }, []);

  // ── Reach title card: flash "REACH n · NAME" for a beat whenever the Reach
  // changes (including at the start of a run). Cheap storytelling of altitude. ──
  const [reachCardOn, setReachCardOn] = useState(true);
  useEffect(() => {
    setReachCardOn(true);
    const id = setTimeout(() => setReachCardOn(false), 2600);
    return () => clearTimeout(id);
  }, [theme.index]);

  // roll for a golden ring on each sector (a rationed surprise, §7b). Picks a
  // non-finish gate so the sector-clear flourish isn't the one that pays.
  useEffect(() => {
    const gc = track.checkpoints.length - 1; // gates incl. finish
    if (gc >= 3 && Math.random() < GOLD_RING_ODDS) setGoldGate(1 + Math.floor(Math.random() * (gc - 1)));
    else setGoldGate(-1);
  }, [track, runId]);

  // music intensity per sector — Silent Sky drops it to a bare drone (§5)
  useEffect(() => {
    setAmbienceIntensity(modifier?.ambience ?? 0.32);
  }, [sector, modifier]);

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
        runStart.current = performance.now();
        if (guest && !guestPinged.current) {
          guestPinged.current = true;
          pingEvent("m_guest_run");
        }
        return "running";
      }
      return p;
    });
    setHold(true);
  }, [setHold, guest]);

  // Ordinary restart: reset run state and REUSE the live WebGL context (never
  // bump runId — remounting the Canvas spins a fresh context and can push a
  // memory-tight phone into a loss loop). The Flyer remounts fresh on its own.
  const resetRun = useCallback(() => {
    setHold(false);
    setSector(0);
    setTargetIdx(1);
    setNewBest(false);
    setReward(null);
    bonusCrowns.current = 0;
    setPhase("ready");
  }, [setHold]);

  // Space: hold-to-fly while live; confirm try/run again on outcome overlays
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== "Enter") return;
      e.preventDefault();
      if (phase === "failed" || phase === "done" || phase === "ceiling") {
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
        bonusCrowns.current += GOLD_RING_CROWNS;
        setGoldGate(-1);
        rewardSfx("big");
      } else {
        rewardSfx("small");
      }
    },
    [goldGate],
  );

  const onSectorClear = useCallback(() => {
    setHold(false);
    setTargetIdx(1);
    setSector((s) => {
      const next = s + 1;
      if (next >= CLIMB_SECTOR_COUNT) {
        stopJet();
        rewardSfx("epic");
        recordRun(CLIMB_SECTOR_COUNT, true);
        setPhase("done");
        return s;
      }
      // Thin altitude key: Reach II+ asks for a proven mind (one win). Ranked
      // board still records depth from this run; campaign height pauses here.
      if (next >= ALTITUDE_KEY_SECTOR && !guest && (champion.wins ?? 0) < 1) {
        stopJet();
        rewardSfx("big");
        recordRun(next, true);
        setPhase("ceiling");
        return s;
      }
      rewardSfx("big");
      return next;
    });
  }, [setHold, recordRun, guest, champion.wins]);

  const onFail = useCallback(
    (r: FailReason) => {
      setHold(false);
      stopJet();
      if (r === "fall") jetFallSfx();
      else badLuckSfx();
      recordRun(sector, false);
      setFailReason(r);
      setPhase("failed");
    },
    [setHold, sector, recordRun],
  );

  const gateCount = track.checkpoints.length - 1; // gates 1..finish
  const gatesCleared = Math.max(0, targetIdx - 1); // in the current sector
  const running = phase === "running";
  const live = phase === "ready" || phase === "running";
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
          camera={{ position: [CAM_SIDE, track.spawn[1] + CAM_UP, track.spawn[2] - CAM_BACK], fov: 55, near: 0.1, far: gfx.far }}
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
          <ClimbDressing key={`dress-${theme.index}-${biome.id}`} biome={biome} track={track} sector={sector} tier={gfxTier} />
          <CircuitScene
            track={track}
            biome={biome}
            highlightIndex={running ? targetIdx : undefined}
            goldIndex={goldGate >= 0 ? goldGate : undefined}
            cpNextRef={running ? cpNextRef : undefined}
            staticMode
            showFloor={false}
          />
          <ClimbDriftMotes track={track} accent={moteColor} countScale={climbMoteScale(sector)} />
          {running && <HazardField key={`haz-${runId}-${sector}`} hazards={hazards} />}
          {phase === "ready" && (
            <ReadyPose track={track} champType={champType} champion={champion} ascentReaches={ascentReaches} accent={accent} />
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
              holdRef={holdRef}
              altRef={altRef}
              flyerPosRef={flyerPosRef}
              flyerHeadingRef={flyerHeadingRef}
              pilotBurstRef={pilotBurstRef}
              onGate={onGate}
              onSectorClear={onSectorClear}
              onFail={onFail}
              onStumble={onStumble}
            />
          )}
          {running && (
            <FlyingFollower
              key={`follow-${runId}`}
              type={champType}
              champion={champion}
              identityKey={activeKey}
              targetRef={flyerPosRef}
              headingRef={flyerHeadingRef}
              scale={FOLLOWER_SCALE}
              // MUST stay 0 — priority > 0 steals the lite canvas render loop
              // (no EffectComposer / manual gl.render). Flyer mounts first so
              // same-priority order still leashes to this frame's pose.
              renderPriority={0}
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
              the renderer hiccuped — one moment
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
              your device ran low on graphics memory. close other tabs, then reload the climb.
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

      {/* ── ALTITUDE — the score. Top-left, big, the loudest thing on screen. ── */}
      <div
        style={{
          position: "absolute",
          top: embedded && !onExit ? 12 : 54,
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

      {/* ── Reach title card — a brief altitude beat on every new Reach ── */}
      {reachCardOn && (phase === "ready" || phase === "running") && (
        <div style={{ position: "absolute", top: "26%", left: 0, right: 0, display: "grid", placeItems: "center", zIndex: 16, pointerEvents: "none" }}>
          <div style={{ textAlign: "center", animation: "none" }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: 4, color: accent, textShadow: `0 0 18px ${accent}` }}>
              REACH {theme.roman}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: 0.5, marginTop: 3, textShadow: "0 2px 18px rgba(0,0,0,.6)" }}>
              {theme.name}
            </div>
            <div className="mono" style={{ fontSize: 10, color: "var(--muted, #9a96b8)", marginTop: 5, maxWidth: 280, letterSpacing: 0.3 }}>
              {theme.tagline}
            </div>
            {modifier && (
              <div className="mono" style={{ display: "inline-block", marginTop: 8, padding: "3px 10px", borderRadius: 999, border: `1px solid ${accent}`, color: accent, fontSize: 9.5, letterSpacing: 1.5, textShadow: "none" }}>
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

      {/* ── back chrome — a rounded pill top-left. Standalone links to /grounds;
           embedded (mobile shell) calls onExit to leave the immersive Climb and
           return to the previous tab, so the shell can drop its bottom bar. ── */}
      {(!embedded || onExit) && (() => {
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
          <button type="button" onClick={onExit} aria-label="Leave the Climb" style={{ ...backStyle, cursor: "pointer" }}>
            <ChevronLeft size={15} strokeWidth={2.4} /> Back
          </button>
        ) : (
          <Link href="/grounds" aria-label="Back to the Grounds" style={backStyle}>
            <ChevronLeft size={15} strokeWidth={2.4} /> Grounds
          </Link>
        );
      })()}

      {/* ── ready gate: wait for the first press so you never die before reacting ── */}
      {phase === "ready" && !reachCardOn && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none", zIndex: 15, paddingBottom: embedded && !onExit ? 72 : 0 }}>
          <div className="mono" style={{ textAlign: "center", color: "#fff", textShadow: `0 0 20px ${accent}` }}>
            <div style={{ fontSize: embedded ? 17 : 20, fontWeight: 800, letterSpacing: 1 }}>TAP &amp; HOLD TO FLY</div>
            <div style={{ fontSize: 11, color: "var(--muted, #9a96b8)", marginTop: 6, letterSpacing: 1 }}>
              thread every ring · miss or fall = restart
            </div>
          </div>
        </div>
      )}

      {/* ── the HOLD affordance (the whole screen is also a hold surface) ── */}
      {live && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: embedded ? 88 : 34, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
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
          <div style={{ textAlign: "center", padding: 26, borderRadius: 18, border: `1px solid ${phase === "done" ? accent : "#ff5a5a"}`, background: "rgba(12,11,18,.9)", maxWidth: "88vw", width: 360 }}>
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
                  ? "missed a gate — every ring must be threaded · back to sector 1"
                  : "one fall ends the run · back to sector 1"}
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

            {/* compact shared leaderboard (depth-then-time) */}
            <div style={{ marginBottom: 18, textAlign: "left", border: "1px solid rgba(255,255,255,.08)", borderRadius: 12, padding: "10px 12px", background: "rgba(255,255,255,.02)" }}>
              <div className="mono" style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--muted2, #6b6785)", marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
                <span>ASCENT LEADERBOARD</span>
                <span>{boardLoading ? "…" : `${board.length}`}</span>
              </div>
              {board.length === 0 ? (
                <div className="mono" style={{ fontSize: 10, color: "var(--muted2, #6b6785)" }}>
                  {getOwnerToken() ? "no runs yet — set the pace" : "claim a Trainer to rank"}
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
                  A wild mind flew with you. Claim it to keep your climb — earn XP, Crowns, and a place on the board.
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
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 22px", borderRadius: 12, border: guest && onClaim ? "1px solid rgba(255,255,255,.16)" : "none", background: guest && onClaim ? "transparent" : accent, color: guest && onClaim ? "#e6e2f5" : "#0a0a12", fontWeight: 800, cursor: "pointer", fontSize: 15 }}
            >
              <RotateCcw size={16} strokeWidth={2.4} /> {phase === "done" ? "Run again" : "Try again"}
            </button>
          </div>
        </div>
      )}

      {/* Thin altitude key — Reach II needs a proven mind (one duel win). */}
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
              Your mind isn’t strong enough for this sky yet
            </div>
            <div className="mono" style={{ fontSize: 11, color: "var(--muted, #9a96b8)", marginBottom: 18, lineHeight: 1.5 }}>
              Win one duel to open Reach II. The climb asked for a stronger champion — go raise it, then return higher.
            </div>
            <button
              type="button"
              onClick={resetRun}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 22px", borderRadius: 12, border: "1px solid rgba(255,255,255,.16)", background: "transparent", color: "#e6e2f5", fontWeight: 800, cursor: "pointer", fontSize: 14, width: "100%", justifyContent: "center", marginBottom: 8 }}
            >
              <RotateCcw size={15} strokeWidth={2.4} /> Practice Reach I again
            </button>
            {onExit && (
              <button
                type="button"
                onClick={onExit}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 22px", borderRadius: 12, border: "none", background: accent, color: "#0a0a12", fontWeight: 800, cursor: "pointer", fontSize: 15, width: "100%", justifyContent: "center" }}
              >
                Raise your mind
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
