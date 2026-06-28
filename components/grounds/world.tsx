"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { useGLTF, Environment, Lightformer, Html, PerformanceMonitor, AdaptiveDpr } from "@react-three/drei";
import { Physics, RigidBody, CapsuleCollider, CuboidCollider, type RapierRigidBody } from "@react-three/rapier";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { ChevronsUp, ChevronsDown, Zap, Swords, Moon, Ban, type LucideIcon } from "lucide-react";
import * as THREE from "three";
import type { AgentStatus, Champion, CreatureType, TowerAgent } from "@/lib/types";
import { blank, skillLevel } from "@/lib/evolve/progression";
import { ChampionMesh, buildCharacter, applyBoneMorph } from "./champion-mesh";
import { keeperKindForName } from "./keeper-regalia";
import { Terrain, terrainHeight, shapeOf, spawnKnollFor, riftDir, hasRift, PLAZA_R, type TerrainShape, type SpawnKnoll } from "./terrain";
import {
  NatureScatter,
  NatureLandmarks,
  NatureSpawnPath,
  NatureRift,
  NaturePeaks,
  NatureIslandDressing,
  NatureGround,
} from "./nature";
import { PlazaSurround, PitArena } from "./structures";
import type { BiomeConfig } from "./biomes";
import { ConcordScene, concordClanSpots, type ConcordVenueId } from "./concord";
import { type GalleryFocus } from "./gallery";
import { Amphitheatre, DAILY_HERALD_POS } from "./amphitheatre";
import { MATCH_SPREAD } from "./match-stage";
import { RegionDistrict } from "./districts";
import { type WorldGoal, type GoalKind } from "./goals";
import { FORCES, FORCE_MOTTO } from "@/lib/lore/canon";
import { worldById, type GateDef } from "./worlds";
import { natureGroundPalette } from "@/lib/render/nature-kit";
import { bandAgents, roamerSpot, dayKey, type DiscoveryNode, type NodeKind } from "./landmarks";
import { RenderBoundary } from "./render-guard";
import { jetFallSfx, jumpBeep, setJet, stopJet } from "@/lib/sfx";
import { getPad } from "@/lib/gamepad";
import { useSettings } from "@/store/settings";
import { CircuitScene } from "./circuit-scene";
import { circuitSector } from "./circuit-tracks";
import type { CircuitPhase, CircuitFailReason } from "./circuit-hud";
import { atCircuitFinishEarly, crossedCircuitGate } from "./circuit";
import type { CircuitTrackDef } from "./circuit";
import {
  CONCORD_VENUE_SPOTS,
  REGION_RETURN_SPOT,
  VENUE_EXIT,
  VENUES,
  circuitSpotFor,
  type VenueId,
} from "./venues";
import { ConcordVenuePortal, ReturnPortal, CircuitTunnelPortal, VenueExitPortal } from "./venue-portals";

export interface WorldLife {
  /** what your champion is saying in-world */
  companionLine: string | null;
  /** wordless reaction glyph your champion shows ("HEY!"/impressions) */
  companionEmote: string | null;
  /** bump to retrigger a wave when a new line lands */
  companionAct: number;
  /** owned champion drills at the train pad */
  training: boolean;
}

export interface GroundChampion {
  key: string;
  type: CreatureType;
  name: string;
  champion: Champion;
}

export interface MatchView {
  aKey: string;
  bKey: string;
  hpA: number;
  hpB: number;
  actor: string | null;
  punchA: number;
  punchB: number;
  hitA: number;
  hitB: number;
  /** Tighter director camera — first journey and spotlight fights. */
  cinematic?: boolean;
}

export type NearTarget =
  | { kind: "train"; key: string }
  | { kind: "arena" }
  | { kind: "challenge"; key: string; name: string; id: string; handle?: string }
  | { kind: "keeper"; level: number; name: string; title: string }
  | { kind: "node"; id: string; nodeKind: NodeKind; crowns: number; fragments: number; flight: boolean }
  | { kind: "goal"; id: string; goalKind: GoalKind; label: string; hint: string; crowns: number; fragments: number; trainerXp: number; seasonPoints: number }
  | { kind: "broker" }
  | { kind: "gate"; world: string; label: string }
  | { kind: "return" }
  | { kind: "venue-enter"; venue: VenueId; label: string }
  | { kind: "venue-exit"; label: string }
  | { kind: "force"; type: CreatureType; name: string; motto: string }
  | { kind: "venue"; venue: ConcordVenueId; name: string }
  | null;

// the Arena holds the central hub — matches stage here, so it stays at origin.
// Train + Spire positions are per-world (biome.scene.landmarks), threaded through
// as props so each world lays its districts out differently.
const ARENA: [number, number, number] = [0, 0, 0];

// Horizontal spacing between fighters — see match-stage.ts (shared with amphitheatre).
const PODIUM_A: [number, number, number] = [ARENA[0] - MATCH_SPREAD, 0, 0];
const PODIUM_B: [number, number, number] = [ARENA[0] + MATCH_SPREAD, 0, 0];

function landmarkPos(l: { angle: number; dist: number }): [number, number, number] {
  return [Math.cos(l.angle) * l.dist, 0, Math.sin(l.angle) * l.dist];
}

// Client-safe visual roster for the guardians embodied at the shrine. Mirrors the
// display fields of lib/server/guardian.ts GUARDIANS (names/titles/colours only —
// secrets never leave the server). `xp` is chosen so each guardian stands at an
// escalating evolution tier: the intern reads as a rookie, the dark mage a crowned
// legend. `type` only seeds incidental body variety since the colour is overridden.
const GUARDIAN_ROSTER: { level: number; name: string; title: string; color: string; xp: number; type: CreatureType }[] = [
  { level: 1, name: "Tibble", title: "The Greeter", color: "#f0a93a", xp: 40, type: "RHETORIC" },
  { level: 2, name: "Quill", title: "The Archivist", color: "#6a6bff", xp: 320, type: "LOGIC" },
  { level: 3, name: "Bastion", title: "The Warden", color: "#36d39a", xp: 1100, type: "COMPOSURE" },
  { level: 4, name: "Vesper", title: "The Diviner", color: "#c77dff", xp: 4200, type: "CREATIVITY" },
  { level: 5, name: "Sable", title: "The Vaultheart", color: "#ff5a6a", xp: 19500, type: "CHAOS" },
];
// The Reader spawns on the crest of the per-world spawn knoll (see spawnKnollFor).

const keys: Record<string, boolean> = {};

// Themed central clearing — an organic, matte ground surface (sand / ash / moss /
// packed earth, per biome) that floors the plaza so the centre matches the
// natural wilds instead of reading as a sci-fi grid pad. The whole canvas maps
// ONCE across the disc (no tiling → no repeating rectangles), and its rim fades
// out so the clearing melts into the surrounding turf rather than reading as a
// hard-edged pad.
function makeGroundFloorTexture(pal: { base: string; grain: string; patch: string; pebble: string }) {
  const S = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const x = c.getContext("2d")!;
  x.fillStyle = pal.base;
  x.fillRect(0, 0, S, S);

  // large-scale organic blotches — uneven earth, lighter (patch) and darker (grain)
  for (let i = 0; i < 90; i++) {
    const cx = Math.random() * S, cy = Math.random() * S, r = 60 + Math.random() * 220;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, i % 2 ? pal.patch : pal.grain);
    g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g;
    x.globalAlpha = 0.1 + Math.random() * 0.16;
    x.beginPath(); x.arc(cx, cy, r, 0, 6.28); x.fill();
  }
  x.globalAlpha = 1;

  // fine grain — dense speckle in the darker grain tone + lighter flecks
  for (let i = 0; i < 90000; i++) {
    x.fillStyle = i % 3 === 0 ? pal.pebble : pal.grain;
    x.globalAlpha = Math.random() * 0.16;
    const s = Math.random() < 0.92 ? 1 : 2;
    x.fillRect(Math.random() * S, Math.random() * S, s, s);
  }
  x.globalAlpha = 1;

  // scattered grit — small pebbles with a faint shadow for a touch of relief
  for (let i = 0; i < 520; i++) {
    const px = Math.random() * S, py = Math.random() * S, r = 1.4 + Math.random() * 3.2;
    x.fillStyle = "rgba(0,0,0,0.16)";
    x.beginPath(); x.arc(px + 1.0, py + 1.0, r, 0, 6.28); x.fill();
    x.fillStyle = pal.pebble;
    x.globalAlpha = 0.45 + Math.random() * 0.4;
    x.beginPath(); x.arc(px, py, r, 0, 6.28); x.fill();
    x.globalAlpha = 1;
  }

  // soft rim fade — punch the alpha out toward the edge so the clearing blends
  // into the grass/terrain beneath instead of ending on a hard circle.
  x.globalCompositeOperation = "destination-out";
  const fade = x.createRadialGradient(S / 2, S / 2, S * 0.34, S / 2, S / 2, S * 0.5);
  fade.addColorStop(0, "rgba(0,0,0,0)");
  fade.addColorStop(1, "rgba(0,0,0,1)");
  x.fillStyle = fade;
  x.fillRect(0, 0, S, S);
  x.globalCompositeOperation = "source-over";

  const map = new THREE.CanvasTexture(c);
  // clamp + single repeat: the texture covers the disc exactly once, so there
  // are no seams or repeating tiles.
  map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
  map.repeat.set(1, 1);
  map.anisotropy = 8;
  return map;
}

function arenaTexture() {
  const S = 512;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const x = c.getContext("2d")!;
  x.fillStyle = "#0b0816";
  x.fillRect(0, 0, S, S);
  x.translate(S / 2, S / 2);
  x.strokeStyle = "#f0a93a";
  for (let r = 36; r < S / 2; r += 36) {
    x.lineWidth = r % 72 < 36 ? 4 : 1.5;
    x.globalAlpha = r % 72 < 36 ? 0.95 : 0.45;
    x.beginPath(); x.arc(0, 0, r, 0, 6.28); x.stroke();
  }
  x.globalAlpha = 0.75;
  x.lineWidth = 2;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * 6.28;
    x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(a) * S / 2, Math.sin(a) * S / 2); x.stroke();
  }
  return new THREE.CanvasTexture(c);
}

function nebulaTexture(cols: string[]) {
  const S = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const x = c.getContext("2d")!;
  for (let i = 0; i < 8; i++) {
    const cx = Math.random() * S, cy = Math.random() * S * 0.6, r = 120 + Math.random() * 240;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, cols[i % cols.length]);
    g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g;
    x.globalAlpha = 0.5;
    x.beginPath(); x.arc(cx, cy, r, 0, 6.28); x.fill();
  }
  return new THREE.CanvasTexture(c);
}

export default function World({
  champions,
  ownedKey,
  onNear,
  match,
  controlsEnabled,
  biome,
  towerAgents = [],
  nodes = [],
  goals = [],
  gates = [],
  pledged = null,
  choosingClan = false,
  clanPreview = null,
  tier = 0,
  featured = false,
  featuredWorld = null,
  guideWorld = null,
  guideUrgent = false,
  onAltitude,
  onPose,
  travelRef,
  touchBottomInset = 0,
  showcase = false,
  regionWorldId = "grounds",
  activeVenue = null,
  venueHostWorldId = "grounds",
  circuitTrack = circuitSector(0, "void"),
  circuitPhase = null,
  onCircuitPass,
  onCircuitFail,
  circuitCpNextRef,
  onVenueExit,
  worldLife,
}: {
  champions: GroundChampion[];
  ownedKey: string | null;
  onNear: (n: NearTarget) => void;
  match: MatchView | null;
  controlsEnabled: boolean;
  biome: BiomeConfig;
  towerAgents?: TowerAgent[];
  nodes?: DiscoveryNode[];
  goals?: WorldGoal[];
  gates?: GateDef[];
  pledged?: CreatureType | null;
  /** True while the Clan sheet is open — lowers every flag except the preview. */
  choosingClan?: boolean;
  /** Clan highlighted in the open picker — its flag stays raised. */
  clanPreview?: CreatureType | null;
  tier?: number;
  featured?: boolean;
  featuredWorld?: string | null;
  /** First-run guide: the gate to spotlight as "START HERE" (dims all others). */
  guideWorld?: string | null;
  /** Escalate the focus gate once the player has idled near spawn. */
  guideUrgent?: boolean;
  onAltitude?: (y: number) => void;
  onPose?: (x: number, z: number, heading: number) => void;
  travelRef?: React.MutableRefObject<((x: number, z: number) => void) | null>;
  touchBottomInset?: number;
  /** Passive postcard mode: no player avatar, no input — an auto-orbit camera
      drifts over the region. Used for the docs/org region figures. */
  showcase?: boolean;
  /** Current region world id — drives in-world portal layout. */
  regionWorldId?: string;
  /** Active game scene overlay (stepped into from a portal). */
  activeVenue?: VenueId | null;
  /** Which world you entered the venue from — selects the circuit variant. */
  venueHostWorldId?: string;
  circuitTrack?: CircuitTrackDef;
  circuitPhase?: CircuitPhase | null;
  onCircuitPass?: (index: number) => void;
  onCircuitFail?: (reason?: CircuitFailReason) => void;
  circuitCpNextRef?: React.MutableRefObject<number>;
  onVenueExit?: () => void;
  worldLife?: WorldLife;
}) {
  const inVenue = !!activeVenue;
  const inCircuit = activeVenue === "circuit";
  const inAmphitheatre = activeVenue === "amphitheatre";
  const camCue = useRef<CamCue>({ zoom: 0, heading: Math.PI, speed: 0, moving: false, reverse: false, flying: false, climb: 0, superrun: false, headingSteer: false });
  // the Scrying Gallery flags when its bout is live + where the ring sits, so the
  // camera can ease onto the fight while the player stands close (released on leave)
  const galleryFocus = useRef<GalleryFocus | null>(null);
  // touch input channels, mutated by the on-screen controls and read each frame
  const touchMove = useRef<TouchMove>({ x: 0, y: 0 });
  const touchBtn = useRef<TouchBtn>({ sprint: false, jump: 0, jumpHeld: false, land: 0 });
  const camDrag = useRef<CamDrag>({ dx: 0, dy: 0, pinch: 0 });
  const [isTouch, setIsTouch] = useState(false);
  // True while the WebGL context is lost (e.g. the GPU dropped the context after
  // a heavy frame — like zooming all the way out and pulling the whole scene into
  // view). We tear the post-processing chain down while it's gone, otherwise the
  // EffectComposer reconstructs against a dead context and throws on
  // getContextAttributes().alpha, which reads to the player as a hard crash.
  const [glLost, setGlLost] = useState(false);
  useEffect(() => {
    const coarse =
      typeof window !== "undefined" &&
      (window.matchMedia?.("(pointer: coarse)").matches || "ontouchstart" in window || navigator.maxTouchPoints > 0);
    if (coarse) setIsTouch(true);
    const onFirstTouch = () => setIsTouch(true);
    window.addEventListener("touchstart", onFirstTouch, { once: true, passive: true });
    return () => window.removeEventListener("touchstart", onFirstTouch);
  }, []);
  // the SHAPE of the land + the per-world scene composition. Switching world
  // changes the geometry you walk through, not just its colour.
  const shape = useMemo(() => shapeOf(biome), [biome]);
  const knoll = useMemo(() => spawnKnollFor(biome), [biome]);
  const circuitSpawn = inCircuit ? circuitTrack.spawn : null;
  const spawnCam = useMemo(() => {
    if (circuitSpawn) {
      return [circuitSpawn[0], circuitSpawn[1] + 4, circuitSpawn[2] - 12] as [number, number, number];
    }
    if (hasRift(shape)) {
      const { dirx, dirz } = riftDir(shape);
      // sit further out behind spawn, looking inward toward the plaza
      return [knoll.x + dirx * 14, knoll.peak + 7, knoll.z + dirz * 14] as [number, number, number];
    }
    return [knoll.x, knoll.peak + 7, knoll.z + 14] as [number, number, number];
  }, [circuitSpawn, shape, knoll]);
  const handlerPos = useRef(
    new THREE.Vector3(circuitSpawn ? circuitSpawn[0] : knoll.x, circuitSpawn ? circuitSpawn[1] : 0, circuitSpawn ? circuitSpawn[2] : knoll.z),
  );
  const sc = biome.scene;
  // Hub mode: the Concord renders a built settlement (gates/clan flags/seal) instead
  // of an arena + tower + spire. Driven by the presence of gates from the world.
  const isHub = gates.length > 0;
  const inRegion = !isHub && !inVenue;
  const hubGates = useMemo<{ world: string; label: string; color: string; pos: [number, number, number] }[]>(
    () =>
      gates.map((g) => {
        const x = Math.cos(g.angle) * g.dist;
        const z = Math.sin(g.angle) * g.dist;
        return { world: g.world, label: worldById(g.world).name, color: g.color, pos: [x, terrainHeight(x, z, shape), z] };
      }),
    [gates, shape],
  );
  const gateTargets = useMemo(
    () => hubGates.map((g) => ({ world: g.world, label: g.label, pos: new THREE.Vector3(g.pos[0], g.pos[1] + 1.0, g.pos[2]) })),
    [hubGates],
  );
  // the five Clan flags in the Concord — walk up to one to swear allegiance.
  // Same layout the ConcordScene draws, so the flag you stand under is the house
  // you pledge.
  const forceTargets = useMemo(
    () =>
      isHub
        ? concordClanSpots().map((b) => ({
            type: b.type,
            name: FORCES[b.type].name,
            motto: FORCE_MOTTO[b.type],
            pos: new THREE.Vector3(b.x, terrainHeight(b.x, b.z, shape), b.z),
          }))
        : [],
    [isHub, shape],
  );
  // The Concord venues (Daily Tribunal, Scrying Gallery) — same spots the
  // ConcordScene draws, so the shrine you stand under is the game you open.
  // The Concord no longer holds meta-game shrines; the only walk-up "venue" left
  // is the Daily herald, relocated into the Amphitheatre as today's marquee case.
  const venueTargets = useMemo<{ venue: ConcordVenueId; name: string; pos: THREE.Vector3 }[]>(
    () => {
      if (inAmphitheatre) {
        const [hx, , hz] = DAILY_HERALD_POS;
        return [{ venue: "daily", name: "Today's Marquee", pos: new THREE.Vector3(hx, terrainHeight(hx, hz, shape) + 1, hz) }];
      }
      return [];
    },
    [inAmphitheatre, shape],
  );
  const concordVenueTargets = useMemo(
    () =>
      isHub && !inVenue
        ? CONCORD_VENUE_SPOTS.map((s) => {
            const x = Math.cos(s.angle) * s.dist;
            const z = Math.sin(s.angle) * s.dist;
            const def = VENUES[s.venue];
            return {
              venue: s.venue,
              label: def.name,
              pos: new THREE.Vector3(x, terrainHeight(x, z, shape) + 1, z),
            };
          })
        : [],
    [isHub, inVenue, shape],
  );
  const returnTarget = useMemo(() => {
    if (!inRegion) return null;
    const { angle, dist } = REGION_RETURN_SPOT;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    return new THREE.Vector3(x, terrainHeight(x, z, shape, knoll) + 1, z);
  }, [inRegion, shape, knoll]);
  const circuitTunnelTarget = useMemo(() => {
    if (!inRegion) return null;
    const spot = circuitSpotFor(regionWorldId);
    const x = Math.cos(spot.angle) * spot.dist;
    const z = Math.sin(spot.angle) * spot.dist;
    return { label: spot.label, pos: new THREE.Vector3(x, terrainHeight(x, z, shape, knoll) + 1, z) };
  }, [inRegion, regionWorldId, shape, knoll]);
  const venueExitTarget = useMemo(() => {
    if (!inVenue || !activeVenue) return null;
    const ex = VENUE_EXIT[activeVenue];
    return { label: `Exit · back to ${venueHostWorldId === "concord" ? "the Concord" : "the wilds"}`, pos: new THREE.Vector3(ex.pos[0], ex.pos[1], ex.pos[2]), radius: ex.radius };
  }, [inVenue, activeVenue, venueHostWorldId]);
  const trainPad = useMemo(() => landmarkPos(sc.landmarks.train), [sc.landmarks.train]);
  // the Broker stands on flat ground on a free bearing (offset from the Tower),
  // an easy walk from spawn — a mind that deals in fragments.
  const brokerPad = useMemo<[number, number, number]>(() => {
    const a = sc.towerAngle + 2.4;
    return [Math.cos(a) * 24, 0, Math.sin(a) * 24];
  }, [sc.towerAngle]);
  const day = useMemo(() => dayKey(), []);
  // split the ladder population: the weakest roam the open ground (walk-up
  // challenges); the rest hold the Tower, strongest at the summit.
  const bands = useMemo(() => bandAgents(towerAgents), [towerAgents]);
  // shared, deterministic tower layout — colliders, perched agents and the
  // challenge proximity check all read from this same list.
  const towerNodes = useMemo(() => towerLayout(shape, sc.towerAngle, sc.towerSteps), [shape, sc.towerAngle, sc.towerSteps]);
  const perched = useMemo(() => assignPerch(towerNodes, bands.tower), [towerNodes, bands.tower]);
  // ground roamers stand at deterministic mid-field spots that rotate by day
  const roamers = useMemo(
    () => bands.roamers.map((a) => ({ agent: a, pos: roamerSpot(a.id, day, shape) as [number, number, number] })),
    [bands.roamers, day, shape],
  );
  const challengeTargets = useMemo(
    () =>
      perched
        .filter((p) => p.agent.status === "awaiting" && p.agent.key !== ownedKey)
        .map((p) => ({
          key: p.agent.key,
          name: p.agent.name,
          handle: p.agent.handle,
          id: p.agent.id,
          pos: new THREE.Vector3(p.pos[0], p.pos[1] + 1.2, p.pos[2]),
        })),
    [perched, ownedKey],
  );
  const groundTargets = useMemo(
    () =>
      roamers
        .filter((p) => p.agent.status === "awaiting" && p.agent.key !== ownedKey)
        .map((p) => ({
          key: p.agent.key,
          name: p.agent.name,
          handle: p.agent.handle,
          id: p.agent.id,
          pos: new THREE.Vector3(p.pos[0], p.pos[1] + 1.0, p.pos[2]),
        })),
    [roamers, ownedKey],
  );
  const nodeTargets = useMemo(
    () => nodes.map((n) => ({ id: n.id, kind: n.kind, crowns: n.crowns, fragments: n.fragments, flight: n.flight, pos: new THREE.Vector3(n.pos[0], n.pos[1], n.pos[2]) })),
    [nodes],
  );
  const goalTargets = useMemo(
    () => goals.map((g) => ({ id: g.id, goalKind: g.kind, label: g.label, hint: g.hint, radius: g.radius, reward: g.reward, pos: new THREE.Vector3(g.pos[0], g.pos[1], g.pos[2]) })),
    [goals],
  );
  const circuitCheckpoints = useMemo(
    () =>
      inCircuit
        ? circuitTrack.checkpoints.map((cp) => ({
            index: cp.index,
            pos: new THREE.Vector3(cp.pos[0], cp.pos[1], cp.pos[2]),
            posTuple: cp.pos,
            radius: cp.radius,
            finish: !!cp.finish,
          }))
        : [],
    [inCircuit, circuitTrack.checkpoints],
  );
  const keeperTargets = useMemo(() => keeperTargetsFrom(keeperSites(shape, sc.landmarks.spire.angle)), [shape, sc.landmarks.spire.angle]);
  return (
    <>
    <Canvas
      shadows={{ type: THREE.PCFSoftShadowMap }}
      camera={{ position: spawnCam, fov: 52, near: 0.1, far: 600 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = biome.exposure;
        const canvas = gl.domElement;
        // calling preventDefault() is what tells the browser we want the context
        // back — without it the loss is permanent and the canvas stays blank.
        canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); setGlLost(true); });
        canvas.addEventListener("webglcontextrestored", () => { setGlLost(false); });
      }}
    >
      <ExposureSync exposure={biome.exposure} />
      {/* auto-scale render resolution when the GPU can't keep up, so frame drops
          (which read as movement stutter) self-correct instead of compounding */}
      <PerformanceMonitor />
      <AdaptiveDpr pixelated={false} />
      <color attach="background" args={[biome.bg]} />
      <fog attach="fog" args={[biome.fog.color, inCircuit ? 35 : biome.fog.near, inCircuit ? 200 : biome.fog.far]} />

      <SkyDome biome={biome} />
      <Nebula biome={biome} />
      <Starfield />

      <Environment resolution={256} frames={1} key={`${biome.id}:${biome.bg}`}>
        <Lightformer intensity={1.4} color={biome.ibl.key} position={[0, 8, 0]} scale={[20, 20, 1]} target={[0, 0, 0]} />
        <Lightformer intensity={1.0} color={biome.ibl.warm} position={[14, 4, 0]} scale={[10, 10, 1]} target={[0, 0, 0]} />
        <Lightformer intensity={0.8} color={biome.ibl.cool} position={[-14, 4, 6]} scale={[10, 10, 1]} target={[0, 0, 0]} />
        <Lightformer intensity={0.6} color={biome.ibl.fill} position={[0, 2, -16]} scale={[24, 8, 1]} target={[0, 0, 0]} />
      </Environment>

      <hemisphereLight args={[biome.lights.hemiSky, biome.lights.hemiGround, biome.lights.hemiInt]} />
      <ambientLight color={biome.lights.ambient} intensity={biome.lights.ambientInt} />
      <directionalLight
        position={[34, 44, 22]}
        intensity={biome.lights.sunInt}
        color={biome.lights.sun}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={1}
        shadow-camera-far={160}
        shadow-camera-left={-44}
        shadow-camera-right={44}
        shadow-camera-top={44}
        shadow-camera-bottom={-44}
        shadow-bias={-0.0004}
      />
      <pointLight position={[ARENA[0], 7, ARENA[2]]} intensity={140} color={biome.lights.arenaPoint} distance={48} />
      {!inRegion && !inAmphitheatre && <pointLight position={[trainPad[0], 6, trainPad[2]]} intensity={80} color={biome.lights.trainPoint} distance={36} />}

      <Suspense
        fallback={
          <Html center className="mono" style={{ color: "var(--muted)", fontSize: 12, whiteSpace: "nowrap" }}>
            loading the grounds…
          </Html>
        }
      >
        <Physics gravity={[0, -22, 0]}>
          {!inVenue && <Terrain biome={biome} nature />}
          {!inVenue && <PlazaFloor biome={biome} />}
          {!inVenue && <NatureGround biome={biome} shape={shape} />}
          {!inVenue && <NatureLandmarks biome={biome} shape={shape} count={sc.obeliskCount} pillar={sc.pillar} />}
          {!inVenue && <NatureScatter biome={biome} shape={shape} />}
          {!inVenue && <Crystals biome={biome} shape={shape} count={sc.crystalCount} />}

          {isHub && !inVenue && !match && (
            <>
              <ConcordScene gates={hubGates} pledged={pledged} featuredWorld={featuredWorld} guideWorld={guideWorld} guideUrgent={guideUrgent} daylight={!!biome.daylight} choosing={choosingClan} clanPreview={clanPreview} />
              {CONCORD_VENUE_SPOTS.map((s) => {
                const x = Math.cos(s.angle) * s.dist;
                const z = Math.sin(s.angle) * s.dist;
                return <ConcordVenuePortal key={s.venue} venue={s.venue} pos={[x, terrainHeight(x, z, shape), z]} />;
              })}
            </>
          )}

          {isHub && !inVenue && match && (
            <>
              <ArenaPlatform />
              <Beacon pos={ARENA} color={biome.lights.arenaPoint} />
            </>
          )}

          {inAmphitheatre && !showcase && (
            <>
              <Amphitheatre champions={champions} focus={galleryFocus} />
              <VenueExitPortal pos={VENUE_EXIT.amphitheatre.pos} label="Exit to the wilds" accent={VENUES.amphitheatre.color} />
            </>
          )}

          {inCircuit && !showcase && (
            <>
              <CircuitScene track={circuitTrack} biome={biome} />
              <VenueExitPortal pos={VENUE_EXIT.circuit.pos} label="Exit the tunnel" accent={VENUES.circuit.color} />
            </>
          )}

          {inRegion && (
            <>
              <PlazaSurround biome={biome} />
              <NatureSpawnPath biome={biome} shape={shape} knoll={knoll} />
              <RegionDistrict biome={biome} tier={tier} featured={featured} shape={shape} />
              <NatureRift biome={biome} shape={shape} />
              <NaturePeaks biome={biome} shape={shape} />
              {biome.id === "void" && <FloatingIslands biome={biome} shape={shape} />}
              <Platforms biome={biome} shape={shape} count={sc.platformCount} />
              <Tower biome={biome} nodes={towerNodes} />
              {sc.arena === "pit" ? <PitArena biome={biome} /> : <ArenaPlatform />}
              <KeeperGrounds shape={shape} baseAngle={sc.landmarks.spire.angle} />

              {/* wayfinding beams over the two open-ground districts (the Tower &
                  Spire carry their own bespoke beacons) */}
              <Beacon pos={ARENA} color={biome.lights.arenaPoint} />
              <Beacon pos={trainPad} color={biome.lights.trainPoint} />

              {!match && <DiscoveryNodes nodes={nodes} />}
              {!match && <BrokerPost pos={brokerPad} biome={biome} />}
              {!match && <GoalMarkers goals={goals} />}
              {!match && perched.map((p) => <PerchedAgent key={p.agent.id} agent={p.agent} position={p.pos} />)}
              {!match && roamers.map((p) => <PerchedAgent key={p.agent.id} agent={p.agent} position={p.pos} ground />)}
              {returnTarget && <ReturnPortal pos={[returnTarget.x, terrainHeight(returnTarget.x, returnTarget.z, shape, knoll), returnTarget.z]} />}
              {circuitTunnelTarget && (
                <CircuitTunnelPortal
                  pos={[circuitTunnelTarget.pos.x, terrainHeight(circuitTunnelTarget.pos.x, circuitTunnelTarget.pos.z, shape, knoll), circuitTunnelTarget.pos.z]}
                  label={circuitTunnelTarget.label}
                  accent={biome.lights.arenaPoint}
                  variant={regionWorldId === "gauntlet" ? "gauntlet" : regionWorldId === "void" ? "void" : "grounds"}
                />
              )}
            </>
          )}

          {match ? (
            <MatchStage champions={champions} match={match} />
          ) : (
            inRegion && (
              <RegionChampions
                champions={champions}
                ownedKey={ownedKey}
                trainPad={trainPad}
                arena={ARENA}
                roam={sc.roam}
                worldLife={worldLife}
                pledged={pledged}
              />
            )
          )}

          {!showcase && (
            <Handler
              controlsEnabled={controlsEnabled && !match}
              onNear={onNear}
              ownedKey={ownedKey}
              matchActive={!!match}
              handlerPos={handlerPos}
              camCue={camCue}
              touchMove={touchMove}
              touchBtn={touchBtn}
              isHub={isHub}
              inVenue={inVenue}
              inAmphitheatre={inAmphitheatre}
              circuitMode={inCircuit}
              circuitCheckpoints={circuitCheckpoints}
              circuitCpNextRef={circuitCpNextRef}
              onCircuitPass={onCircuitPass}
              onCircuitFail={onCircuitFail}
              concordVenueTargets={concordVenueTargets}
              returnTarget={returnTarget}
              circuitTunnelTarget={circuitTunnelTarget}
              venueExitTarget={venueExitTarget}
              onVenueExit={onVenueExit}
              spawnPos={circuitSpawn ?? undefined}
              trainPad={trainPad}
              challengeTargets={challengeTargets}
              groundTargets={groundTargets}
              nodeTargets={nodeTargets}
              goalTargets={goalTargets}
              brokerPad={brokerPad}
              keeperTargets={keeperTargets}
              gateTargets={gateTargets}
              forceTargets={forceTargets}
              venueTargets={venueTargets}
              shape={shape}
              spawnKnoll={knoll}
              onAltitude={onAltitude}
              onPose={onPose}
              travelRef={travelRef}
            />
          )}
        </Physics>

        {!glLost && (
          <RenderBoundary fallback={null}>
            <EffectComposer enableNormalPass={false}>
              <Bloom intensity={biome.bloom} luminanceThreshold={0.62} luminanceSmoothing={0.28} mipmapBlur radius={0.7} />
              <Vignette eskil={false} offset={0.22} darkness={0.6} />
            </EffectComposer>
          </RenderBoundary>
        )}
      </Suspense>

      {showcase ? (
        <ShowcaseCamera shape={shape} />
      ) : (
        <CameraController match={match} handlerPos={handlerPos} camCue={camCue} camDrag={camDrag} shape={shape} galleryFocus={galleryFocus} inCircuit={inCircuit} circuitPhase={circuitPhase} />
      )}
    </Canvas>
    {isTouch && !showcase && <TouchControls active={controlsEnabled && !match} move={touchMove} btn={touchBtn} cam={camDrag} cue={camCue} bottomInset={touchBottomInset} hudLeftInset={120} />}
    </>
  );
}

function ExposureSync({ exposure }: { exposure: number }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.toneMappingExposure = exposure;
  }, [gl, exposure]);
  return null;
}

// stable 0..1 hash from a key, for deterministic per-world scatter placement
function keyHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

// where an idle agent stands — its formation depends on the world, so the
// population is laid out differently in each scene.
function roamHome(key: string, champions: GroundChampion[], roam: BiomeConfig["scene"]["roam"]): [number, number, number] {
  const list = champions.map((c) => c.key);
  const idx = list.indexOf(key);
  const n = Math.max(1, list.length);
  if (roam.pattern === "scatter") {
    const a = keyHash(key) * Math.PI * 2;
    const r = roam.inner + keyHash(key + "r") * (roam.spread - roam.inner);
    return [Math.cos(a) * r, 0, Math.sin(a) * r];
  }
  if (roam.pattern === "arc") {
    // fan the agents across a wide arc rather than a full ring
    const t = n === 1 ? 0.5 : idx / (n - 1);
    const a = Math.PI / 2 - Math.PI * 0.9 + t * Math.PI * 1.8;
    return [Math.cos(a) * roam.radius, 0, Math.sin(a) * roam.radius];
  }
  const a = (idx / n) * Math.PI * 2;
  return [Math.cos(a) * roam.radius, 0, Math.sin(a) * roam.radius];
}

// Region minds with ambient life — your companion drills at the train pad, others
// occasionally spar / gesture so the plaza doesn't read as eight identical props.
function RegionChampions({
  champions,
  ownedKey,
  trainPad,
  arena,
  roam,
  worldLife,
  pledged = null,
}: {
  champions: GroundChampion[];
  ownedKey: string | null;
  trainPad: [number, number, number];
  arena: [number, number, number];
  roam: BiomeConfig["scene"]["roam"];
  worldLife?: WorldLife;
  pledged?: CreatureType | null;
}) {
  const [npcActs, setNpcActs] = useState<Record<string, number>>({});
  const [npcGestures, setNpcGestures] = useState<Record<string, "wave" | "punch">>({});
  const [ownedAct, setOwnedAct] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      const npcs = champions.filter((c) => c.key !== ownedKey);
      if (!npcs.length) return;
      const a = npcs[Math.floor(Math.random() * npcs.length)]!;
      let b = a;
      if (npcs.length > 1) {
        do {
          b = npcs[Math.floor(Math.random() * npcs.length)]!;
        } while (b.key === a.key);
      }
      const gesture = (): "wave" | "punch" => (Math.random() < 0.55 ? "punch" : "wave");
      setNpcActs((prev) => ({
        ...prev,
        [a.key]: (prev[a.key] ?? 0) + 1,
        ...(b.key !== a.key ? { [b.key]: (prev[b.key] ?? 0) + 1 } : {}),
      }));
      setNpcGestures((prev) => ({
        ...prev,
        [a.key]: gesture(),
        ...(b.key !== a.key ? { [b.key]: gesture() } : {}),
      }));
    }, 5200);
    return () => clearInterval(id);
  }, [champions, ownedKey]);

  useEffect(() => {
    if (!worldLife?.training) return;
    const id = setInterval(() => setOwnedAct((n) => n + 1), 2000);
    return () => clearInterval(id);
  }, [worldLife?.training]);

  useEffect(() => {
    if (worldLife?.companionLine || worldLife?.companionEmote) setOwnedAct((n) => n + 1);
  }, [worldLife?.companionLine, worldLife?.companionEmote, worldLife?.companionAct]);

  return (
    <>
      {champions.map((c) => {
        const owned = c.key === ownedKey;
        const home = owned ? trainPad : roamHome(c.key, champions, roam);
        const actSig = owned ? (worldLife?.companionAct ?? 0) + ownedAct : (npcActs[c.key] ?? 0);
        const actName = owned ? (worldLife?.training ? "punch" : "wave") : (npcGestures[c.key] ?? "wave");
        return (
          <ChampionMesh
            key={c.key}
            type={c.type}
            champion={c.champion}
            identityKey={c.key}
            label={c.name + (owned ? "  ◆ YOURS" : "")}
            showForce={!owned}
            clan={owned ? pledged : null}
            position={[home[0], 0, home[2]]}
            rotation={owned ? Math.atan2(arena[0] - home[0], arena[2] - home[2]) : 0}
            selected={owned}
            wander={!owned}
            worldRadius={roam.spread}
            wanderInner={roam.inner}
            wanderSpeed={roam.speed}
            actSignal={actSig}
            actName={actName}
            speechLine={owned ? worldLife?.companionLine : null}
            speechEmote={owned ? worldLife?.companionEmote : null}
          />
        );
      })}
    </>
  );
}

// ── Beacon ───────────────────────────────────────────────────────────────────
// A soft sky-beam that marks a district so it's spottable from across the map.
// Reused for every landmark; the Tower & Spire layer their own richer beacons.
function Beacon({ pos, color, h = 30 }: { pos: [number, number, number]; color: string; h?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.07 + Math.sin(state.clock.elapsedTime * 1.4) * 0.025;
  });
  return (
    <mesh ref={ref} position={[pos[0], pos[1] + h / 2, pos[2]]}>
      <cylinderGeometry args={[0.4, 1.2, h, 14, 1, true]} />
      <meshBasicMaterial color={color} transparent opacity={0.08} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} />
    </mesh>
  );
}

// ── Discovery caches ─────────────────────────────────────────────────────────
// Loot scattered through the wilds: gold crown caches on the ground, cyan
// fragment caches often perched high (reachable only by jetpack). Walk/fly into
// one and press E to claim. Refresh daily.
function DiscoveryNodes({ nodes }: { nodes: DiscoveryNode[] }) {
  return (
    <>
      {nodes.map((n) => (
        <DiscoveryCache key={n.id} node={n} />
      ))}
    </>
  );
}

function DiscoveryCache({ node }: { node: DiscoveryNode }) {
  const spin = useRef<THREE.Group>(null);
  const col = node.kind === "fragment" ? "#39e0ff" : "#f5d020";
  useFrame((state, dt) => {
    if (spin.current) {
      spin.current.rotation.y += dt * 0.8;
      spin.current.position.y = Math.sin(state.clock.elapsedTime * 1.5) * 0.22;
    }
  });
  return (
    <group position={node.pos}>
      <mesh position={[0, 14, 0]}>
        <cylinderGeometry args={[0.14, 0.5, 28, 10, 1, true]} />
        <meshBasicMaterial color={col} transparent opacity={0.12} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} />
      </mesh>
      <group ref={spin}>
        <mesh castShadow>
          <octahedronGeometry args={[node.kind === "fragment" ? 0.55 : 0.72, 0]} />
          <meshStandardMaterial color={col} emissive={col} emissiveIntensity={1.6} metalness={0.5} roughness={0.25} transparent opacity={0.92} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.78, 0]}>
          <ringGeometry args={[0.9, 1.12, 32]} />
          <meshBasicMaterial color={col} transparent opacity={0.7} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>
      <pointLight position={[0, 0.6, 0]} intensity={node.flight ? 18 : 10} color={col} distance={11} />
      <Html position={[0, 1.9, 0]} center distanceFactor={16} zIndexRange={[18, 0]} style={{ pointerEvents: "none" }}>
        <div style={{ fontFamily: "var(--font-grotesk), sans-serif", textAlign: "center", whiteSpace: "nowrap" }}>
          <div style={{ fontSize: 9, letterSpacing: 1.4, color: col, fontWeight: 700 }}>{node.kind === "fragment" ? "◆ FRAGMENT" : "CROWN CACHE"}</div>
          {node.flight && <div style={{ fontSize: 8, letterSpacing: 1, color: "#9a96b8" }}>fly up to claim</div>}
        </div>
      </Html>
    </group>
  );
}

// ── The great rift ───────────────────────────────────────────────────────────
// A glowing seam running along the canyon floor, themed per region: the Ember
// Wastes run with LAVA (a hazard you fly across), the Void Garden with a luminous
// RIVER OF LIGHT, the Colosseum with a violet VAULT-CRACK. Cheap: a ribbon of
// additive planes following the floor + a few molten lights. Renders only where a
// region actually has a rift (shape.canyonDepth > 0).
// ── Floating islands (Void Garden) ───────────────────────────────────────────
// The Void's signature: a constellation of solid sky-islands you platform across
// by flight, so its peak/secret play happens UP in the air, not on the ground.
function FloatingIslands({ biome, shape }: { biome: BiomeConfig; shape: TerrainShape }) {
  const items = useMemo(() => {
    const out: { pos: [number, number, number]; r: number }[] = [];
    const N = 6;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + shape.seed * 0.02;
      const rad = PLAZA_R + 14 + (i % 3) * 12;
      const x = Math.cos(a) * rad;
      const z = Math.sin(a) * rad;
      const y = terrainHeight(x, z, shape) + 12 + (i % 3) * 7;
      out.push({ pos: [x, y, z], r: 3.2 + (i % 2) * 1.4 });
    }
    return out;
  }, [shape]);
  const islandTops = useMemo(() => items.map((it) => [it.pos[0], it.pos[1] + 0.75, it.pos[2]] as [number, number, number]), [items]);
  return (
    <>
      {items.map((it, i) => (
        <group key={i} position={it.pos}>
          <RigidBody type="fixed" colliders="hull">
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[it.r, it.r * 0.45, 1.5, 9]} />
              <meshStandardMaterial color={biome.platform.a} emissive={biome.floatCrystal.emissive} emissiveIntensity={0.4} metalness={0.4} roughness={0.5} flatShading />
            </mesh>
          </RigidBody>
          <mesh position={[0, 1.4, 0]}>
            <octahedronGeometry args={[0.7, 0]} />
            <meshStandardMaterial color={biome.floatCrystal.color} emissive={biome.floatCrystal.emissive} emissiveIntensity={1.6} metalness={0.4} roughness={0.25} />
          </mesh>
        </group>
      ))}
      <NatureIslandDressing biome={biome} positions={islandTops} />
    </>
  );
}

// ── The Broker ───────────────────────────────────────────────────────────────
// A standing mind that deals in fragments: a dark kiosk crowned by a slowly
// turning fragment, marked by a cyan beacon. Walk up + press E to open the
// exchange (buy/sell fragments for Crowns).
const BROKER_COL = "#39e0ff";
function BrokerPost({ pos, biome }: { pos: [number, number, number]; biome: BiomeConfig }) {
  const gem = useRef<THREE.Group>(null);
  useFrame((state, dt) => {
    if (gem.current) {
      gem.current.rotation.y += dt * 0.9;
      gem.current.position.y = 2.7 + Math.sin(state.clock.elapsedTime * 1.3) * 0.16;
    }
  });
  return (
    <group position={pos}>
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, 1.0, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.9, 1.15, 2.0, 8]} />
          <meshStandardMaterial color={biome.obelisk.color} emissive={BROKER_COL} emissiveIntensity={0.3} metalness={0.5} roughness={0.45} flatShading />
        </mesh>
      </RigidBody>
      <mesh position={[0, 2.15, 0]}>
        <torusGeometry args={[0.95, 0.06, 10, 32]} />
        <meshStandardMaterial color={BROKER_COL} emissive={BROKER_COL} emissiveIntensity={1.4} metalness={0.4} roughness={0.3} />
      </mesh>
      <group ref={gem}>
        <mesh castShadow>
          <octahedronGeometry args={[0.55, 0]} />
          <meshStandardMaterial color={BROKER_COL} emissive={BROKER_COL} emissiveIntensity={1.8} metalness={0.5} roughness={0.25} />
        </mesh>
      </group>
      <Beacon pos={[0, 0, 0]} color={BROKER_COL} h={24} />
      <pointLight position={[0, 2.4, 0]} intensity={18} color={BROKER_COL} distance={14} />
      <Html position={[0, 3.7, 0]} center distanceFactor={16} zIndexRange={[18, 0]} style={{ pointerEvents: "none" }}>
        <div style={{ fontFamily: "var(--font-grotesk), sans-serif", textAlign: "center", whiteSpace: "nowrap" }}>
          <div style={{ fontSize: 11, letterSpacing: 1.4, color: "#fff", fontWeight: 800, textShadow: "0 2px 8px #000" }}>THE BROKER</div>
          <div style={{ fontSize: 8, letterSpacing: 1, color: BROKER_COL }}>trade fragments &amp; crowns</div>
        </div>
      </Html>
    </group>
  );
}

// ── World goals ──────────────────────────────────────────────────────────────
// The three standing objectives (peak / depth / secret). Peak & depth carry a
// tall sky-beam so they're spottable from across the map; the secret is a faint,
// low-key shimmer you have to get close to. Reach one and press E to claim.
function GoalMarkers({ goals }: { goals: WorldGoal[] }) {
  return (
    <>
      {goals.map((g) => (
        <GoalBeacon key={g.id} goal={g} />
      ))}
    </>
  );
}

function GoalBeacon({ goal }: { goal: WorldGoal }) {
  const spin = useRef<THREE.Group>(null);
  const beam = useRef<THREE.Mesh>(null);
  const col = goal.color;
  const secret = goal.kind === "secret";
  useFrame((state, dt) => {
    if (spin.current) {
      spin.current.rotation.y += dt * (secret ? 1.4 : 0.7);
      spin.current.position.y = Math.sin(state.clock.elapsedTime * 1.4) * 0.2;
    }
    if (beam.current) (beam.current.material as THREE.MeshBasicMaterial).opacity = (secret ? 0.04 : 0.1) + Math.sin(state.clock.elapsedTime * 1.6) * 0.025;
  });
  const beamH = 64;
  const icon = goal.kind === "peak" ? "▲" : goal.kind === "depth" ? "▼" : "◆";
  return (
    <group position={goal.pos}>
      <mesh ref={beam} position={[0, beamH / 2 - 2, 0]}>
        <cylinderGeometry args={[secret ? 0.1 : 0.32, secret ? 0.4 : 1.0, beamH, 14, 1, true]} />
        <meshBasicMaterial color={col} transparent opacity={0.08} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} />
      </mesh>
      <group ref={spin}>
        <mesh castShadow>
          <octahedronGeometry args={[secret ? 0.5 : 0.82, 0]} />
          <meshStandardMaterial color={col} emissive={col} emissiveIntensity={1.8} metalness={0.5} roughness={0.25} transparent opacity={secret ? 0.85 : 0.95} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.95, 0]}>
          <ringGeometry args={[1.0, 1.26, 36]} />
          <meshBasicMaterial color={col} transparent opacity={0.6} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>
      {/* a summit landing halo so the flight-gated peak reads as a place to reach */}
      {goal.kind === "peak" && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.0, 0]}>
          <ringGeometry args={[3.0, 3.5, 40]} />
          <meshBasicMaterial color={col} transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
        </mesh>
      )}
      <pointLight position={[0, 0.9, 0]} intensity={secret ? 12 : 24} color={col} distance={15} />
      <Html position={[0, 2.2, 0]} center distanceFactor={18} zIndexRange={[18, 0]} style={{ pointerEvents: "none" }}>
        <div style={{ fontFamily: "var(--font-grotesk), sans-serif", textAlign: "center", whiteSpace: "nowrap" }}>
          <div style={{ fontSize: 10, letterSpacing: 1.4, color: col, fontWeight: 800 }}>
            {icon} {goal.label.toUpperCase()}
          </div>
          <div style={{ fontSize: 8, letterSpacing: 1, color: "#cfcbe8" }}>{goal.hint}</div>
        </div>
      </Html>
    </group>
  );
}

// ---------- environment ----------
function SkyDome({ biome }: { biome: BiomeConfig }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: { top: { value: new THREE.Color(biome.sky.top) }, bot: { value: new THREE.Color(biome.sky.bottom) } },
        vertexShader: "varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
        fragmentShader: "varying vec3 v;uniform vec3 top;uniform vec3 bot;void main(){float h=normalize(v).y*0.5+0.5;gl_FragColor=vec4(mix(bot,top,pow(h,0.7)),1.0);}",
      }),
    [biome],
  );
  return (
    <mesh material={mat}>
      <sphereGeometry args={[320, 32, 16]} />
    </mesh>
  );
}

function Nebula({ biome }: { biome: BiomeConfig }) {
  const tex = useMemo(() => nebulaTexture(biome.nebula.colors), [biome]);
  return (
    <mesh renderOrder={-1}>
      <sphereGeometry args={[285, 32, 16]} />
      <meshBasicMaterial map={tex} transparent opacity={biome.nebula.opacity} blending={THREE.AdditiveBlending} side={THREE.BackSide} depthWrite={false} fog={false} />
    </mesh>
  );
}

function Starfield() {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = 800;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 150 + Math.random() * 150, t = Math.random() * 6.28, p = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(p) * Math.cos(t);
      pos[i * 3 + 1] = Math.abs(r * Math.cos(p));
      pos[i * 3 + 2] = r * Math.sin(p) * Math.sin(t);
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  return (
    <points geometry={geo}>
      <pointsMaterial color="#c8c2ff" size={1.1} sizeAttenuation transparent opacity={0.95} fog={false} />
    </points>
  );
}

// thin textured visual overlay for the flat plaza (the terrain provides the collider)
function PlazaFloor({ biome }: { biome: BiomeConfig }) {
  const day = !!biome.daylight;
  // Themed natural clearing (sand/ash/moss/earth) so the centre matches the
  // surrounding wilds. The texture carries the colour, so the material albedo is
  // left near-white and matte — no grid, no glow.
  const pal = useMemo(() => natureGroundPalette(biome.id), [biome.id]);
  const map = useMemo(() => makeGroundFloorTexture(pal), [pal]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
      <circleGeometry args={[PLAZA_R + 1, 128]} />
      <meshStandardMaterial map={map} color="#ffffff" transparent depthWrite={false} metalness={0.02} roughness={0.97} envMapIntensity={day ? 0.04 : 0.15} />
    </mesh>
  );
}

// Radius of the central combat space (the ring platform / the pit basin). Bumped
// up so the arena reads as a proper coliseum floor, not a small dais. Keep the
// biomes' roam `inner` keep-out at or above this so champions never stand in it.
const ARENA_R = 8.6;

function ArenaPlatform() {
  const tex = useMemo(() => arenaTexture(), []);
  const R = ARENA_R;
  const posts = 18;
  return (
    <group position={ARENA}>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
        <torusGeometry args={[R, 0.22, 16, 180]} />
        <meshStandardMaterial color="#f0a93a" emissive="#f0a93a" emissiveIntensity={2.6} metalness={0.3} roughness={0.4} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} receiveShadow>
        <circleGeometry args={[R, 96]} />
        <meshStandardMaterial color="#16112a" emissive="#f0a93a" emissiveMap={tex} emissiveIntensity={1.15} metalness={0.45} roughness={0.5} envMapIntensity={0.9} />
      </mesh>
      {Array.from({ length: posts }).map((_, i) => {
        const a = (i / posts) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * R, 0.85, Math.sin(a) * R]} castShadow>
            <boxGeometry args={[0.16, 1.7, 0.16]} />
            <meshStandardMaterial color="#f0a93a" emissive="#f0a93a" emissiveIntensity={1.1} />
          </mesh>
        );
      })}
    </group>
  );
}

// ── The Keepers' Climbs ──────────────────────────────────────────────────────
// The five Keepers no longer share one spire — each stands ALONE atop its own
// staircase, scattered across the wilds on its own bearing. The step count rises
// with rank (Tibble: 2 steps … Sable the Vaultheart: 6), and the higher Keepers
// sit deeper out and higher up, so spotting and reaching them is the climb. Walk
// (or fly) to the top tread and you're face-to-face to open the extraction game.
const GUARDIAN_COL = "#c77dff";
const KEEPER_RISER = 0.62; // height gained per step
const KEEPER_GOING = 1.55; // tread depth — how far the climb advances per step
const KEEPER_WIDTH = 3.4; // step width

interface KeeperSite {
  g: (typeof GUARDIAN_ROSTER)[number];
  steps: number;
  dirx: number;
  dirz: number;
  bx: number; // foot-of-stairs ground point
  bz: number;
  groundY: number;
  topX: number; // centre of the top tread (where the Keeper stands)
  topZ: number;
  topY: number; // walkable height of the top tread
}

// Disperse the roster: each Keeper takes a distinct bearing (evenly spaced off the
// region's spire angle) and a radius that grows with rank, so the boss is the
// furthest, highest climb.
function keeperSites(shape: TerrainShape, baseAngle: number): KeeperSite[] {
  return GUARDIAN_ROSTER.map((g, i) => {
    const steps = g.level + 1; // 2, 3, 4, 5, 6 in rank order
    const ang = baseAngle + i * ((Math.PI * 2) / GUARDIAN_ROSTER.length);
    const rBase = PLAZA_R + i * 8; // each Keeper deeper into the wilds (i=0 sits on the plaza rim)
    const dirx = Math.cos(ang);
    const dirz = Math.sin(ang);
    const bx = dirx * rBase;
    const bz = dirz * rBase;
    const groundY = terrainHeight(bx, bz, shape);
    const topOff = (steps - 0.5) * KEEPER_GOING; // centre of the top step
    const topX = dirx * (rBase + topOff);
    const topZ = dirz * (rBase + topOff);
    const topY = groundY + steps * KEEPER_RISER;
    return { g, steps, dirx, dirz, bx, bz, groundY, topX, topZ, topY };
  });
}

function keeperTargetsFrom(sites: KeeperSite[]) {
  return sites.map((s) => ({ level: s.g.level, name: s.g.name, title: s.g.title, pos: new THREE.Vector3(s.topX, s.topY + 1.0, s.topZ) }));
}

function KeeperGrounds({ shape, baseAngle }: { shape: TerrainShape; baseAngle: number }) {
  const sites = useMemo(() => keeperSites(shape, baseAngle), [shape, baseAngle]);
  return (
    <>
      {sites.map((s, i) => (
        <KeeperStair key={s.g.level} site={s} top={i === sites.length - 1} />
      ))}
    </>
  );
}

// One Keeper's climb: a flight of solid risers (count = rank + 1) ascending to the
// Keeper waiting on the top tread. Each riser is its own physics collider you can
// hop up; the whole flight reads as a private little ziggurat in the wilds.
function KeeperStair({ site, top }: { site: KeeperSite; top: boolean }) {
  const { g, steps, dirx, dirz, bx, bz, groundY, topX, topZ, topY } = site;
  const climbYaw = useMemo(() => Math.atan2(dirx, dirz), [dirx, dirz]);
  // the Keeper faces back down its own stairs, toward the plaza
  const faceIn = useMemo(() => Math.atan2(-topX, -topZ), [topX, topZ]);
  const champ = useMemo(() => {
    const c = blank();
    c.xp = g.xp;
    return c;
  }, [g.xp]);

  const stepBoxes = useMemo(() => {
    const out: { pos: [number, number, number]; size: [number, number, number] }[] = [];
    const EMBED = 2.6; // bury each riser so the flight never floats on a slope
    for (let i = 0; i < steps; i++) {
      const off = (i + 0.5) * KEEPER_GOING;
      const cx = bx + dirx * off;
      const cz = bz + dirz * off;
      const treadTop = groundY + (i + 1) * KEEPER_RISER;
      const h = (i + 1) * KEEPER_RISER + EMBED;
      out.push({ pos: [cx, treadTop - h / 2, cz], size: [KEEPER_WIDTH, h, KEEPER_GOING] });
    }
    return out;
  }, [steps, bx, bz, dirx, dirz, groundY]);

  return (
    <group>
      {stepBoxes.map((st, i) => (
        <RigidBody key={i} type="fixed" colliders="cuboid" position={st.pos} rotation={[0, climbYaw, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={st.size} />
            <meshStandardMaterial color="#221836" emissive={g.color} emissiveIntensity={0.16 + (i / steps) * 0.28} metalness={0.5} roughness={0.45} flatShading />
          </mesh>
        </RigidBody>
      ))}

      <group position={[topX, topY, topZ]}>
        {/* dais crowning the top step */}
        <mesh position={[0, 0.06, 0]} receiveShadow>
          <cylinderGeometry args={[1.3, 1.1, 0.22, 28]} />
          <meshStandardMaterial color="#15102a" emissive={g.color} emissiveIntensity={0.6} metalness={0.5} roughness={0.4} />
        </mesh>
        <KeeperFigure g={g} champ={champ} rot={faceIn} top={top} />
      </group>
    </group>
  );
}

// The Keeper itself: a hovering, aura-wrapped boss on its dais, with a vault-door
// halo, a dedicated light, a tall wayfinding beacon (so each scattered climb is
// spottable from across the wilds), and a floating name/level plate.
function KeeperFigure({
  g,
  champ,
  rot,
  top,
}: {
  g: (typeof GUARDIAN_ROSTER)[number];
  champ: Champion;
  rot: number;
  top: boolean;
}) {
  const bobRef = useRef<THREE.Group>(null);
  const auraRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const beaconRef = useRef<THREE.Mesh>(null);
  const phase = useMemo(() => Math.random() * 6.28, []);
  // distance-cull the Keeper name plate (same rationale as the ladder agents)
  const [labelOn, setLabelOn] = useState(true);
  const labelShown = useRef(true);
  const lodPos = useRef(new THREE.Vector3());

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (bobRef.current) bobRef.current.position.y = 0.5 + Math.sin(t * 1.1 + phase) * 0.12;
    if (auraRef.current) auraRef.current.scale.setScalar(1 + Math.sin(t * 1.7 + phase) * 0.07);
    if (ringRef.current) ringRef.current.rotation.z += 0.01;
    if (beaconRef.current) (beaconRef.current.material as THREE.MeshBasicMaterial).opacity = 0.06 + Math.sin(t * 1.4) * 0.02;
    if (bobRef.current) {
      bobRef.current.getWorldPosition(lodPos.current);
      const d2 = lodPos.current.distanceToSquared(state.camera.position);
      const want = labelShown.current ? d2 < 72 * 72 : d2 < 62 * 62;
      if (want !== labelShown.current) {
        labelShown.current = want;
        setLabelOn(want);
      }
    }
  });

  const auraR = top ? 1.7 : 1.35;
  // "behind" the Keeper relative to its facing, for the vault-door halo
  const back: [number, number, number] = [Math.sin(rot) * -0.55, 1.05, Math.cos(rot) * -0.55];

  return (
    <>
      {/* tall wayfinding beacon — spot each Keeper from across the wilds */}
      <mesh ref={beaconRef} position={[0, 15, 0]}>
        <cylinderGeometry args={[0.4, 1.2, 30, 14, 1, true]} />
        <meshBasicMaterial color={g.color} transparent opacity={0.07} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} />
      </mesh>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.18, 0]}>
        <ringGeometry args={[1.32, 1.5, 40]} />
        <meshBasicMaterial color={g.color} transparent opacity={0.9} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      <group ref={bobRef} position={[0, 0.5, 0]}>
        {/* boss scale: each Keeper towers a little more than the last */}
        <group position={[0, 0.1, 0]} scale={1.12 + g.level * 0.07}>
          <ChampionMesh type={g.type} champion={champ} identityKey={g.name} position={[0, 0, 0]} rotation={rot} baseColorOverride={g.color} showLabel={false} keeper={keeperKindForName(g.name)} />
        </group>

        {/* vault-door halo — Keepers read as campaign bosses, not ladder agents */}
        <mesh rotation={[0, rot, 0]} position={back}>
          <torusGeometry args={[0.72, 0.06, 8, 48]} />
          <meshStandardMaterial color="#f5d020" emissive="#f5d020" emissiveIntensity={2.2} metalness={0.85} roughness={0.2} />
        </mesh>

        <mesh ref={auraRef} position={[0, 0.9, 0]}>
          <sphereGeometry args={[auraR, 16, 12]} />
          <meshBasicMaterial color={g.color} transparent opacity={top ? 0.16 : 0.12} blending={THREE.AdditiveBlending} side={THREE.BackSide} depthWrite={false} fog={false} />
        </mesh>
      </group>

      <pointLight position={[0, 1.6, 0]} intensity={top ? 32 : 22} color={g.color} distance={13} />

      {labelOn && (
        <Html position={[0, 3.0, 0]} center distanceFactor={12} zIndexRange={[25, 0]} style={{ pointerEvents: "none" }}>
          <div style={{ fontFamily: "var(--font-grotesk), sans-serif", textAlign: "center", whiteSpace: "nowrap" }}>
            <div style={{ fontSize: 9, letterSpacing: 1.5, color: "#f5d020", fontWeight: 700 }}>{top ? "★ KEEPER · BOSS" : "KEEPER"}</div>
            <div style={{ fontSize: 9, letterSpacing: 1.5, color: g.color, fontWeight: 700 }}>LEVEL {g.level}</div>
            <div style={{ fontWeight: 700, color: "#fff", fontSize: 16, textShadow: "0 2px 8px #000" }}>{g.name}</div>
            <div style={{ fontSize: 10, color: g.color, letterSpacing: 0.5 }}>{g.title}</div>
          </div>
        </Html>
      )}
    </>
  );
}

// The approach trail: from the outer rift lip inward to claim the Depth, then
// through the colosseum entrance to the arena.
function TrainPad({ pos }: { pos: [number, number, number] }) {
  return (
    <group position={pos}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <circleGeometry args={[2.6, 48]} />
        <meshStandardMaterial color="#6a6bff" transparent opacity={0.14} emissive="#6a6bff" emissiveIntensity={0.5} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[2.5, 2.62, 48]} />
        <meshBasicMaterial color="#6a6bff" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// jumpable platforms in the wilds — solid physics colliders, placed on the terrain
function Platforms({ biome, shape, count }: { biome: BiomeConfig; shape: TerrainShape; count: number }) {
  const items = useMemo(() => {
    const out: { pos: [number, number, number]; size: [number, number, number]; color: string }[] = [];
    // the bearing of the platform staircase tracks the world's seed so each
    // world arranges them differently
    const baseA = Math.PI * 0.25 + shape.seed * 0.013;
    for (let i = 0; i < count; i++) {
      const r = PLAZA_R + 5 + i * 3.4;
      const a = baseA + i * 0.16;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const top = terrainHeight(x, z, shape) + 1.4 + i * 1.5;
      out.push({ pos: [x, top, z], size: [3.4, 0.5, 3.4], color: i % 2 ? biome.platform.a : biome.platform.b });
    }
    const lx = Math.cos(baseA + 1.1) * (PLAZA_R + 26);
    const lz = Math.sin(baseA + 1.1) * (PLAZA_R + 26);
    out.push({ pos: [lx, terrainHeight(lx, lz, shape) + 12, lz], size: [6, 0.6, 6], color: biome.platform.top });
    return out;
  }, [biome, shape, count]);
  return (
    <>
      {items.map((it, i) => (
        <RigidBody key={i} type="fixed" colliders="cuboid">
          <mesh position={it.pos} castShadow receiveShadow>
            <boxGeometry args={it.size} />
            <meshStandardMaterial color={it.color} emissive={it.color} emissiveIntensity={0.35} metalness={0.4} roughness={0.5} />
          </mesh>
        </RigidBody>
      ))}
    </>
  );
}

// ── The Tower ────────────────────────────────────────────────────────────────
// A climbable helix of small floating platforms spiralling toward the sky. The
// gaps are tuned to the Handler's jump arc + multi-jump so a confident player
// can chain hops all the way to the summit. Other agents perch on the platforms.
const CHECKPOINT_EVERY = 12;         // a generous landing pad (and respawn anchor) every ~12 hops

interface TowerNode {
  pos: [number, number, number];
  size: [number, number, number];
  checkpoint?: boolean; // wide rest pad that also catches a fall
}

interface Perch {
  agent: TowerAgent;
  pos: [number, number, number];
}

function towerLayout(shape: TerrainShape, angle: number, steps: number): TowerNode[] {
  const cx = Math.cos(angle) * (PLAZA_R + 9);
  const cz = Math.sin(angle) * (PLAZA_R + 9);
  const baseY = terrainHeight(cx, cz, shape);
  const out: TowerNode[] = [];
  // a low entry step you can hop onto straight off the ground — the first checkpoint
  out.push({ pos: [cx, baseY + 1.2, cz], size: [4.6, 0.5, 4.6], checkpoint: true });
  let y = baseY + 1.2;
  for (let i = 0; i < steps; i++) {
    const a = i * 0.95 + 0.5;
    const radius = 3.6 + Math.sin(i * 0.7) * 0.6;
    // gaps stay inside the jump arc the whole way up (normalised by step count)
    const step = 2.7 + (i / steps) * 0.9;
    y += step;
    const isCp = (i + 1) % CHECKPOINT_EVERY === 0;
    // platforms taper gently as you ascend; checkpoints are wide, safe landing pads
    const w = isCp ? 4.6 : Math.max(2.0, 3.2 - i * 0.008);
    out.push({ pos: [cx + Math.cos(a) * radius, y, cz + Math.sin(a) * radius], size: [w, 0.45, w], checkpoint: isCp });
  }
  // the summit — a wide platform, the prize at the top
  y += 3.1;
  out.push({ pos: [cx, y, cz], size: [6.5, 0.6, 6.5], checkpoint: true });
  return out;
}

// Spread agents across the tower with rating rising as you climb — weakest near
// the base, the strongest perched on the summit.
function assignPerch(nodes: TowerNode[], agents: TowerAgent[]): Perch[] {
  if (!agents.length) return [];
  const slots = nodes.slice(1); // leave the entry step clear
  const sorted = [...agents].sort((a, b) => a.rating - b.rating);
  const n = Math.min(sorted.length, slots.length);
  const out: Perch[] = [];
  for (let i = 0; i < n; i++) {
    const slot = n === 1 ? slots[slots.length - 1] : slots[Math.round((i * (slots.length - 1)) / (n - 1))];
    out.push({ agent: sorted[i], pos: [slot.pos[0], slot.pos[1] + slot.size[1] / 2, slot.pos[2]] });
  }
  return out;
}

function Tower({ biome, nodes }: { biome: BiomeConfig; nodes: TowerNode[] }) {
  const beamRef = useRef<THREE.Mesh>(null);
  const base = nodes[0];
  const top = nodes[nodes.length - 1];
  // a tall light column rising from the entry platform — a wayfinder you can
  // spot from anywhere on the plaza so the climb is discoverable.
  const beamH = top.pos[1] - base.pos[1] + 8;
  useFrame((state) => {
    if (beamRef.current) {
      const m = beamRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.08 + Math.sin(state.clock.elapsedTime * 1.4) * 0.03;
    }
  });
  return (
    <>
      {/* wayfinding beacon */}
      <group position={[base.pos[0], base.pos[1], base.pos[2]]}>
        <mesh ref={beamRef} position={[0, beamH / 2, 0]}>
          <cylinderGeometry args={[0.5, 1.4, beamH, 14, 1, true]} />
          <meshBasicMaterial color={biome.platform.top} transparent opacity={0.1} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} />
        </mesh>
        <pointLight position={[0, 3, 0]} intensity={40} color={biome.platform.top} distance={26} />
        <Html position={[0, beamH + 1.5, 0]} center distanceFactor={26} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
          <div style={{ fontFamily: "var(--font-grotesk), sans-serif", textAlign: "center", whiteSpace: "nowrap" }}>
            <div style={{ fontWeight: 700, color: "#fff", fontSize: 22, letterSpacing: 2, textShadow: "0 2px 10px #000" }}>↑ THE TOWER</div>
            <div style={{ fontSize: 11, color: biome.platform.top, letterSpacing: 1 }}>climb to challenge the agents above</div>
          </div>
        </Html>
      </group>
      {nodes.map((n, i) => {
        const top = i === nodes.length - 1;
        const cp = !!n.checkpoint;
        const color = top || cp ? biome.platform.top : i % 2 ? biome.platform.a : biome.platform.b;
        const topY = n.pos[1] + n.size[1] / 2;
        return (
          <RigidBody key={i} type="fixed" colliders="cuboid">
            <mesh position={n.pos} receiveShadow>
              <boxGeometry args={n.size} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={top ? 0.6 : cp ? 0.5 : 0.32} metalness={0.4} roughness={0.5} />
            </mesh>
            <mesh position={[n.pos[0], topY + 0.012, n.pos[2]]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[n.size[0] / 2 - 0.16, n.size[0] / 2, 44]} />
              <meshBasicMaterial color={color} transparent opacity={cp ? 0.85 : 0.5} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
            {cp && !top && (
              /* a glowing landing halo so checkpoints read from a distance (no
                 dynamic light — additive emissive keeps it cheap across ~14 pads) */
              <mesh position={[n.pos[0], topY + 0.05, n.pos[2]]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[n.size[0] / 2 + 0.25, n.size[0] / 2 + 0.55, 48]} />
                <meshBasicMaterial color={biome.platform.top} transparent opacity={0.6} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
              </mesh>
            )}
          </RigidBody>
        );
      })}
    </>
  );
}

const STATUS_VIS: Record<AgentStatus, { color: string; badge: LucideIcon; label: string }> = {
  awaiting: { color: "#36d39a", badge: Swords, label: "AWAITING" },
  hibernating: { color: "#6a6bff", badge: Moon, label: "HIBERNATING" },
  disabled: { color: "#7b7b88", badge: Ban, label: "OFFLINE" },
};

function pseudoChampion(a: TowerAgent): Champion {
  const c = blank();
  c.battles = a.battles;
  c.wins = Math.round(a.battles * 0.5);
  c.losses = a.battles - c.wins;
  c.xp = a.battles * 60;
  c.rating = a.rating;
  return c;
}

function PerchedAgent({ agent, position, ground = false }: { agent: TowerAgent; position: [number, number, number]; ground?: boolean }) {
  const champ = useMemo(() => pseudoChampion(agent), [agent]);
  const vis = STATUS_VIS[agent.status];
  const disabled = agent.status === "disabled";
  const hibernating = agent.status === "hibernating";
  const ringRef = useRef<THREE.Mesh>(null);
  const beamRef = useRef<THREE.Mesh>(null);
  const rot = useMemo(() => Math.atan2(-position[0], -position[2]), [position]);
  // Distance-cull the floating name plate: drei <Html> recomputes a CSS matrix
  // every frame, and a populated Tower can hold dozens. Past reading range we
  // unmount the DOM node entirely (hysteresis so it doesn't thrash on the edge).
  const [labelOn, setLabelOn] = useState(true);
  const labelShown = useRef(true);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ringRef.current) {
      const sc = 1 + Math.sin(t * (hibernating ? 0.8 : 2.2) + position[1]) * (disabled ? 0.02 : 0.08);
      ringRef.current.scale.set(sc, sc, sc);
    }
    if (beamRef.current) beamRef.current.rotation.y += 0.01;
    const dx = state.camera.position.x - position[0];
    const dy = state.camera.position.y - position[1];
    const dz = state.camera.position.z - position[2];
    const d2 = dx * dx + dy * dy + dz * dz;
    const want = labelShown.current ? d2 < 56 * 56 : d2 < 48 * 48;
    if (want !== labelShown.current) {
      labelShown.current = want;
      setLabelOn(want);
    }
  });

  return (
    <group position={position}>
      {/* holo hex pad — player agents perch on the Tower, not the Keeper spire */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.95, 1.22, 6]} />
        <meshBasicMaterial color={vis.color} transparent opacity={disabled ? 0.25 : 0.75} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      <group scale={0.92}>
        <ChampionMesh
          type={agent.type}
          champion={champ}
          identityKey={agent.key}
          position={[0, 0, 0]}
          rotation={rot}
          showLabel={false}
          baseColorOverride={disabled ? "#3a3a44" : undefined}
        />
      </group>

      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
        <ringGeometry args={[0.85, 1.08, 48]} />
        <meshBasicMaterial color={vis.color} transparent opacity={disabled ? 0.35 : 0.9} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {agent.status === "awaiting" && (
        <mesh ref={beamRef} position={[0, 3, 0]}>
          <cylinderGeometry args={[0.06, 0.5, 6, 8, 1, true]} />
          <meshBasicMaterial color={vis.color} transparent opacity={0.12} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} />
        </mesh>
      )}

      {labelOn && (
        <Html position={[0, 2.4, 0]} center distanceFactor={12} zIndexRange={[30, 0]} style={{ pointerEvents: "none" }}>
          <div style={{ fontFamily: "var(--font-grotesk), sans-serif", textAlign: "center", whiteSpace: "nowrap", opacity: disabled ? 0.55 : 1 }}>
            <div style={{ fontSize: 9, letterSpacing: 1.4, color: vis.color, fontWeight: 700 }}>{ground ? "ROAMING AGENT" : "LADDER AGENT"}</div>
            <div style={{ fontWeight: 700, color: "#fff", fontSize: 18, textShadow: "0 2px 8px #000" }}>
              {agent.name}
              {agent.handle && agent.handle.toUpperCase() !== "HOUSE" ? (
                <span style={{ color: "#9a96b8", fontWeight: 500 }}> @{agent.handle}</span>
              ) : (
                <span style={{ color: "#7a7690", fontWeight: 600, fontSize: 12 }}> · League</span>
              )}
            </div>
            <div style={{ fontSize: 10, letterSpacing: 1, color: vis.color, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
              <vis.badge size={11} strokeWidth={2.2} /> {vis.label} · SL {skillLevel(champ)}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

function Crystals({ biome, shape, count }: { biome: BiomeConfig; shape: TerrainShape; count: number }) {
  const items = useMemo(
    () =>
      Array.from({ length: count }, () => {
        const a = Math.random() * 6.28, r = 14 + Math.random() * 60;
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        return { x, z, by: terrainHeight(x, z, shape) + 2 + Math.random() * 9, s: 0.3 + Math.random() * 0.5, spin: Math.random() * 0.02 + 0.005, ph: Math.random() * 6.28 };
      }),
    [shape, count],
  );
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    for (let i = 0; i < refs.current.length; i++) {
      const m = refs.current[i];
      const it = items[i];
      if (!m) continue;
      m.rotation.y += it.spin;
      m.rotation.x += it.spin * 0.5;
      m.position.y = it.by + Math.sin(t * 0.6 + it.ph) * 0.5;
    }
  });
  return (
    <>
      {items.map((it, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el; }} position={[it.x, it.by, it.z]} scale={it.s}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={biome.floatCrystal.color} emissive={biome.floatCrystal.emissive} emissiveIntensity={biome.floatCrystal.emissiveIntensity} metalness={0.4} roughness={0.3} transparent opacity={0.9} />
        </mesh>
      ))}
    </>
  );
}

function MatchStage({ champions, match }: { champions: GroundChampion[]; match: MatchView }) {
  const a = champions.find((c) => c.key === match.aKey);
  const b = champions.find((c) => c.key === match.bKey);
  if (!a || !b) return null;
  return (
    <>
      <ChampionMesh type={a.type} champion={a.champion} identityKey={a.key} label={a.name} position={PODIUM_A} rotation={Math.PI / 2} punchSignal={match.punchA} hitSignal={match.hitA} hpFrac={match.hpA / 100} selected={match.actor === a.key} />
      <ChampionMesh type={b.type} champion={b.champion} identityKey={b.key} label={b.name} position={PODIUM_B} rotation={-Math.PI / 2} punchSignal={match.punchB} hitSignal={match.hitB} hpFrac={match.hpB / 100} selected={match.actor === b.key} />
    </>
  );
}

const WALK = 8.6, RUN = 15.2, SUPERRUN = RUN * 2, SUPERRUN_DELAY = 3, JUMP = 10.4, AIR_JUMP = 9.6;
// acceleration rates (per second) for dt-based, frame-rate-independent smoothing —
// higher = snappier response to the stick. Ground is punchy; air is lighter; the
// jetpack gives strong horizontal authority so you can steer your flight path.
const ACCEL_GROUND = 22, ACCEL_AIR = 9, ACCEL_FLY = 16;
// how quickly the body coasts to a stop when the stick is released (per second)
const STOP_GROUND = 16, STOP_AIR = 1.4, STOP_FLY = 4.5;
// how quickly the character pivots toward the move direction (per second)
const TURN_GROUND = 22, TURN_AIR = 16;
// jetpack flight (unlocked on the 2nd jump): hold to thrust smoothly
const FLY_TRIGGER = 1;     // jumps past this deploy the pack (so 2 jumps → fly)
const FLY_CLIMB = 9.0;     // target upward velocity while thrusting
const FLY_SINK = -2.6;     // gentle hover descent when not thrusting (instead of full gravity)
const FLY_THRUST = 16;     // ease rate toward climb velocity (frame-rate independent)
const FLY_GLIDE = 6;       // ease rate toward sink velocity when thrust is released
const FLY_SPOOL = 9;       // how fast the thrust COMMAND ramps in/out — smooths taps
                           // into a uniform hover instead of a per-press sawtooth
const FLY_FOOT = 1.45;     // ankle tuck (rad) while airborne (jetpack thrust, jump or
                           // fall): toes hang straight down — body upright, just the feet
// while suspended the whole lower body should dangle, not hold its planted stance:
// the thighs ease slightly back toward vertical and the knees go soft so the legs
// trail loosely under the hovering body (a relaxed "lifted off the ground" hang).
const FLY_LEG_HANG = 0.55; // upper-leg relax (rad) — thighs swing toward a straight dangle
const FLY_KNEE_BEND = 0.75; // soft knee flex (rad) so the shins hang loose, not stiff

// RobotExpressive bones are FootL/FootR (→ footl/footr); other rigs may use foot.l
function legBone(bones: Record<string, THREE.Bone>, part: "foot" | "upperleg" | "lowerleg", side: "l" | "r") {
  return bones[`${part}.${side}`] ?? bones[`${part}${side}`];
}

// shared channel from Handler → CameraController for action-cam cues +
// the live movement state the smart-follow camera steers from
interface CamCue {
  zoom: number;        // one-shot punch-in impulse (decays each frame)
  heading: number;     // player facing / move heading (radians)
  speed: number;       // planar speed magnitude
  moving: boolean;     // actively pressing movement keys this frame
  reverse: boolean;    // moving back toward the camera — suppress auto-follow (else it spins)
  flying: boolean;     // jetpack hover — camera eases off sway / zoom dolly
  climb: number;       // vertical velocity while flying (+up / −down) → camera tilt
  superrun: boolean;   // sustained sprint past SUPERRUN_DELAY — double speed + smoke trail
  headingSteer: boolean; // movement locked to body heading — suppress camera follow/sway
}

// on-screen touch control channels (mobile)
interface TouchMove { x: number; y: number }   // analog stick, x = strafe, y = forward (+up)
interface TouchBtn { sprint: boolean; jump: number; jumpHeld: boolean; land: number } // jump = tap counter (edge); jumpHeld = button down (hold-to-fly); land = descend/cancel-fly tap counter (touch equivalent of the X key)
interface CamDrag { dx: number; dy: number; pinch: number } // orbit + pinch deltas, drained each frame

// Jetpack worn during sustained flight (from the 2nd jump on). The pack springs
// out of the character's back; every jump stroke fires a downward smoke burst.
// Driven entirely by refs (no re-renders): `flyingRef` toggles the pack in/out,
// `burstRef` is a counter the Handler bumps on each flight stroke.
function Jetpack({ h, flyingRef, burstRef }: { h: number; flyingRef: React.RefObject<boolean>; burstRef: React.RefObject<number> }) {
  const grp = useRef<THREE.Group>(null);
  const flameL = useRef<THREE.Mesh>(null);
  const flameR = useRef<THREE.Mesh>(null);
  const scale = useRef(0);
  const lastBurst = useRef(0);

  const PUFFS = 22;
  const puffRefs = useRef<(THREE.Mesh | null)[]>([]);
  const puffState = useRef(
    Array.from({ length: PUFFS }, () => ({
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      life: 0,
      max: 1,
      size: 1,
    })),
  );
  const cursor = useRef(0);
  // scratch reused while orienting each flame tongue along its velocity
  const flameUp = useRef(new THREE.Vector3(0, 1, 0));
  const flameDir = useRef(new THREE.Vector3());
  const flameQuat = useRef(new THREE.Quaternion());

  // deposit (fuel tank) + two rocket cylinders on its left/right sides (visual only).
  // Exhaust/smoke stays at the original ports on the deposit — unchanged height.
  const depositW = h * 0.22;
  const depositH = h * 0.32;
  const depositD = h * 0.13;
  const depositY = h * 0.56;
  const depositZ = -h * 0.18;
  const depositTop = depositY + depositH * 0.5;
  const rocketH = depositH * 0.25;
  const rocketR = h * 0.038;
  // sit OUTSIDE the deposit faces — not at ±depositW/2 (that buried them in the box)
  const rocketX = depositW * 0.5 + rocketR * 0.92;
  // upper side of the tank: rocket top flush with deposit top, hanging down the flank
  const rocketY = depositTop - rocketH * 0.5;

  // original exhaust ports on the deposit — smoke + flames emit here, not from the rockets
  const exhaust = useMemo(
    () => [new THREE.Vector3(-h * 0.09, h * 0.36, -h * 0.2), new THREE.Vector3(h * 0.09, h * 0.36, -h * 0.2)],
    [h],
  );

  function emitBurst(n = 4) {
    // a tight jet, alternating nozzles, fired straight down + slightly back —
    // narrow spread so the tongues read as a flame plume, not a scatter of puffs
    for (let i = 0; i < n; i++) {
      const p = puffState.current[cursor.current % PUFFS];
      cursor.current++;
      const noz = exhaust[i % 2];
      p.pos.set(noz.x + (Math.random() - 0.5) * h * 0.03, noz.y, noz.z);
      p.vel.set((Math.random() - 0.5) * 0.22, -4.2 - Math.random() * 1.6, -0.25 - Math.random() * 0.35);
      p.max = 0.22 + Math.random() * 0.12;
      p.life = p.max;
      p.size = h * (0.09 + Math.random() * 0.06);
    }
  }

  useFrame((_, dtRaw) => {
    const dt = Math.min(0.05, dtRaw);
    const flying = !!flyingRef.current;
    // fast spring so the pack snaps out / retracts quickly
    scale.current += ((flying ? 1 : 0) - scale.current) * Math.min(1, dt * 16);
    if (grp.current) {
      grp.current.visible = scale.current > 0.02;
      grp.current.scale.setScalar(scale.current);
    }

    // flame flicker while thrusting — sine, not random, so the mesh doesn't jitter
    const flick = 0.72 + Math.sin(performance.now() * 0.022) * 0.28;
    if (flameL.current) { flameL.current.scale.y = flick; (flameL.current.material as THREE.MeshBasicMaterial).opacity = flying ? 0.85 * flick : 0; }
    if (flameR.current) { flameR.current.scale.y = flick * 0.92; (flameR.current.material as THREE.MeshBasicMaterial).opacity = flying ? 0.85 * flick : 0; }

    // counter bumped by the Handler (per stroke, or paced while thrusting) → smoke
    const b = burstRef.current || 0;
    if (b > lastBurst.current) { lastBurst.current = b; emitBurst(3); }

    // advance live flame tongues
    for (let i = 0; i < PUFFS; i++) {
      const p = puffState.current[i];
      const m = puffRefs.current[i];
      if (!m) continue;
      if (p.life <= 0) { if (m.visible) m.visible = false; continue; }
      p.life -= dt;
      p.vel.multiplyScalar(0.86); // exhaust slows fast as it leaves the nozzle
      p.pos.addScaledVector(p.vel, dt);
      const age = 1 - Math.max(0, p.life) / p.max; // 0 = ignition, 1 = gone
      m.visible = true;
      m.position.copy(p.pos);
      // point the cone's long axis (+Y) along the exhaust velocity, so each
      // tongue licks downward/back from the nozzle instead of puffing outward
      const dir = flameDir.current.copy(p.vel);
      if (dir.lengthSq() > 1e-6) {
        dir.normalize();
        m.quaternion.copy(flameQuat.current.setFromUnitVectors(flameUp.current, dir));
      }
      // a long, thin tongue at ignition that shortens + slims as it burns out
      const len = p.size * (3.4 - age * 2.2);
      const wid = p.size * (0.85 - age * 0.5);
      m.scale.set(wid, len, wid);
      const mat = m.material as THREE.MeshBasicMaterial;
      // white-hot core → cyan → deep blue as it cools (additive, so it glows)
      mat.color.setRGB(0.55 + (1 - age) * 0.45, 0.95 - age * 0.45, 1.0);
      mat.opacity = (1 - age) * 0.92;
    }
  });

  return (
    <group>
      {/* pack body — springs in/out of the back */}
      <group ref={grp} visible={false}>
        {/* deposit / fuel tank */}
        <mesh position={[0, depositY, depositZ]} castShadow>
          <boxGeometry args={[depositW, depositH, depositD]} />
          <meshStandardMaterial color="#20242e" metalness={0.7} roughness={0.35} emissive="#39e0ff" emissiveIntensity={0.3} />
        </mesh>
        {/* rocket bodies — vertical cylinders on the deposit flanks (left + right) */}
        <mesh position={[-rocketX, rocketY, depositZ]} castShadow>
          <cylinderGeometry args={[rocketR, rocketR * 1.12, rocketH, 12]} />
          <meshStandardMaterial color="#3a3f4a" metalness={0.85} roughness={0.3} emissive="#39e0ff" emissiveIntensity={0.15} />
        </mesh>
        <mesh position={[rocketX, rocketY, depositZ]} castShadow>
          <cylinderGeometry args={[rocketR, rocketR * 1.12, rocketH, 12]} />
          <meshStandardMaterial color="#3a3f4a" metalness={0.85} roughness={0.3} emissive="#39e0ff" emissiveIntensity={0.15} />
        </mesh>
        {/* thruster flames — original deposit exhaust ports (below the rockets) */}
        <mesh ref={flameL} position={[exhaust[0].x, exhaust[0].y - h * 0.1, exhaust[0].z]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[h * 0.04, h * 0.17, 10]} />
          <meshBasicMaterial color="#8ff3ff" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        <mesh ref={flameR} position={[exhaust[1].x, exhaust[1].y - h * 0.1, exhaust[1].z]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[h * 0.04, h * 0.17, 10]} />
          <meshBasicMaterial color="#8ff3ff" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>

      {/* exhaust flame tongues — pooled cones (apex points down the velocity),
          oriented + stretched per-frame so the jet reads as fire, not bubbles */}
      {puffState.current.map((_, i) => (
        <mesh key={i} ref={(el) => { puffRefs.current[i] = el; }} visible={false}>
          <coneGeometry args={[1, 1, 9]} />
          <meshBasicMaterial color="#aeefff" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

// Ground smoke left behind during superrun — puffs spawn in world space so they
// linger as the character blasts past. `superrunRef` gates emission; `burstRef`
// is bumped by the Handler for paced spawns while superrun is active.
function SuperrunTrail({
  superrunRef,
  posRef,
  headingRef,
  burstRef,
  h,
}: {
  superrunRef: React.RefObject<boolean>;
  posRef: React.RefObject<THREE.Vector3>;
  headingRef: React.RefObject<number>;
  burstRef: React.RefObject<number>;
  h: number;
}) {
  const PUFFS = 48;
  const puffRefs = useRef<(THREE.Mesh | null)[]>([]);
  const puffState = useRef(
    Array.from({ length: PUFFS }, () => ({
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      life: 0,
      max: 1,
      size: 1,
    })),
  );
  const cursor = useRef(0);
  const lastBurst = useRef(0);

  function emitPuffs(n = 2) {
    const pos = posRef.current;
    if (!pos) return;
    const hd = headingRef.current;
    const backX = -Math.sin(hd);
    const backZ = -Math.cos(hd);
    // handlerPos is the capsule centre (~1 u above feet) — spawn at foot level
    const footY = pos.y - 1.0;
    for (let i = 0; i < n; i++) {
      const p = puffState.current[cursor.current % PUFFS];
      cursor.current++;
      const lateral = (Math.random() - 0.5) * h * 0.22;
      const rightX = Math.cos(hd);
      const rightZ = -Math.sin(hd);
      p.pos.set(
        pos.x + backX * h * 0.28 + rightX * lateral,
        footY + 0.12 + Math.random() * h * 0.08,
        pos.z + backZ * h * 0.28 + rightZ * lateral,
      );
      p.vel.set(
        backX * (0.25 + Math.random() * 0.35) + (Math.random() - 0.5) * 0.25,
        0.55 + Math.random() * 0.85,
        backZ * (0.25 + Math.random() * 0.35) + (Math.random() - 0.5) * 0.25,
      );
      p.max = 0.75 + Math.random() * 0.45;
      p.life = p.max;
      p.size = h * (0.2 + Math.random() * 0.14);
    }
  }

  useFrame((_, dtRaw) => {
    const dt = Math.min(0.05, dtRaw);
    const b = burstRef.current || 0;
    if (b > lastBurst.current) {
      lastBurst.current = b;
      if (superrunRef.current) emitPuffs(5);
    }

    for (let i = 0; i < PUFFS; i++) {
      const p = puffState.current[i];
      const m = puffRefs.current[i];
      if (!m) continue;
      if (p.life <= 0) {
        if (m.visible) m.visible = false;
        continue;
      }
      p.life -= dt;
      p.vel.multiplyScalar(0.94);
      p.pos.addScaledVector(p.vel, dt);
      const age = 1 - Math.max(0, p.life) / p.max;
      m.visible = true;
      m.position.copy(p.pos);
      const s = p.size * (0.65 + age * 1.85);
      m.scale.setScalar(s);
      const mat = m.material as THREE.MeshBasicMaterial;
      const g = 0.88 - age * 0.18;
      mat.color.setRGB(g, g, g + 0.06);
      mat.opacity = (1 - age * age) * 0.92;
    }
  });

  return (
    <>
      {puffState.current.map((_, i) => (
        <mesh key={i} ref={(el) => { puffRefs.current[i] = el; }} visible={false} renderOrder={10}>
          <sphereGeometry args={[1, 10, 10]} />
          <meshBasicMaterial color="#e8e8f0" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}

// physics-driven Handler: dynamic capsule + feet sensor for grounding
function Handler({
  controlsEnabled,
  onNear,
  ownedKey,
  matchActive,
  handlerPos,
  camCue,
  touchMove,
  touchBtn,
  isHub,
  inVenue = false,
  inAmphitheatre = false,
  circuitMode = false,
  circuitCheckpoints = [],
  circuitCpNextRef,
  onCircuitPass,
  onCircuitFail,
  concordVenueTargets = [],
  returnTarget = null,
  circuitTunnelTarget = null,
  venueExitTarget = null,
  onVenueExit,
  spawnPos,
  trainPad,
  challengeTargets,
  groundTargets,
  nodeTargets,
  goalTargets,
  brokerPad,
  keeperTargets,
  gateTargets,
  forceTargets,
  venueTargets,
  shape,
  spawnKnoll,
  onAltitude,
  onPose,
  travelRef,
}: {
  controlsEnabled: boolean;
  onNear: (n: NearTarget) => void;
  ownedKey: string | null;
  matchActive: boolean;
  handlerPos: React.RefObject<THREE.Vector3>;
  camCue: React.RefObject<CamCue>;
  touchMove: React.RefObject<TouchMove>;
  touchBtn: React.RefObject<TouchBtn>;
  isHub: boolean;
  inVenue?: boolean;
  inAmphitheatre?: boolean;
  circuitMode?: boolean;
  circuitCheckpoints?: { index: number; pos: THREE.Vector3; posTuple: [number, number, number]; radius: number; finish: boolean }[];
  circuitCpNextRef?: React.MutableRefObject<number>;
  onCircuitPass?: (index: number) => void;
  onCircuitFail?: (reason?: CircuitFailReason) => void;
  concordVenueTargets?: { venue: VenueId; label: string; pos: THREE.Vector3 }[];
  returnTarget?: THREE.Vector3 | null;
  circuitTunnelTarget?: { label: string; pos: THREE.Vector3 } | null;
  venueExitTarget?: { label: string; pos: THREE.Vector3; radius: number } | null;
  onVenueExit?: () => void;
  spawnPos?: [number, number, number];
  trainPad: [number, number, number];
  challengeTargets: { key: string; name: string; id: string; handle?: string; pos: THREE.Vector3 }[];
  groundTargets: { key: string; name: string; id: string; handle?: string; pos: THREE.Vector3 }[];
  nodeTargets: { id: string; kind: NodeKind; crowns: number; fragments: number; flight: boolean; pos: THREE.Vector3 }[];
  goalTargets: { id: string; goalKind: GoalKind; label: string; hint: string; radius: number; reward: WorldGoal["reward"]; pos: THREE.Vector3 }[];
  brokerPad: [number, number, number];
  keeperTargets: { level: number; name: string; title: string; pos: THREE.Vector3 }[];
  gateTargets: { world: string; label: string; pos: THREE.Vector3 }[];
  forceTargets: { type: CreatureType; name: string; motto: string; pos: THREE.Vector3 }[];
  venueTargets: { venue: ConcordVenueId; name: string; pos: THREE.Vector3 }[];
  shape: TerrainShape;
  spawnKnoll: SpawnKnoll;
  onAltitude?: (y: number) => void;
  onPose?: (x: number, z: number, heading: number) => void;
  travelRef?: React.MutableRefObject<((x: number, z: number) => void) | null>;
}) {
  const { scene, animations } = useGLTF("/models/RobotExpressive.glb");
  // bind foot quats + scratch pose math (feet aren't reset by the idle mixer)
  const footBind = useRef({ l: new THREE.Quaternion(), r: new THREE.Quaternion() });
  const qFootHang = useRef(new THREE.Quaternion());
  const qThighHang = useRef(new THREE.Quaternion());
  const qKneeHang = useRef(new THREE.Quaternion());
  const eHang = useRef(new THREE.Euler());
  const built = useMemo(() => {
    const b = buildCharacter(scene, animations, blank(), "#cfd2e8");
    // feet aren't keyed in the idle clip — capture bind quats once so we can SET
    // the hang pose each frame instead of subtracting euler (which accumulated and
    // spun the right foot through gimbal lock).
    const fl = legBone(b.bones, "foot", "l");
    const fr = legBone(b.bones, "foot", "r");
    if (fl) footBind.current.l.copy(fl.quaternion);
    if (fr) footBind.current.r.copy(fr.quaternion);
    return b;
  }, [scene, animations]);
  const body = useRef<RapierRigidBody>(null);
  const inner = useRef<THREE.Group>(null);
  // zero-offset child of the RigidBody. Rapier writes the INTERPOLATED transform
  // onto the body's object every frame; reading this anchor's world position (vs
  // the raw, 60Hz-stepped rb.translation()) keeps the camera locked to the body
  // the eye actually sees, killing the relative judder on >60Hz / uneven frames.
  const camAnchor = useRef<THREE.Group>(null);
  const heading = useRef(Math.PI);
  const ground = useRef(0);
  // spawn settle guard: pin the capsule at standing height until the floor
  // sensor confirms the ground collider is actually under us (a cold-load race
  // where the body spawns before the terrain/plaza collider is ready was letting
  // it free-fall and flash "under the ground" on refresh).
  const settled = useRef(false);
  const spawnAt = useRef(0);
  const cur = useRef<"idle" | "walk" | "run" | "jump">("idle");
  const near = useRef<NearTarget>(null);
  const failCooldown = useRef(0);
  const venueExitCooldown = useRef(0);
  const jumps = useRef(0);
  const prevSpace = useRef(false);
  const prevTouchJump = useRef(0);
  // jetpack flight: kicks in on the 2nd jump; bursts on every stroke
  const flying = useRef(false);
  const jetBurst = useRef(0);
  const jetEmit = useRef(0); // accumulator that paces continuous-thrust smoke
  // superrun: sustained ground sprint past SUPERRUN_DELAY → double speed + smoke trail
  const sprintTime = useRef(0);
  const superrunArmed = useRef(false);
  const superrun = useRef(false);
  const wasSuperrun = useRef(false);
  const wasHeadingSteer = useRef(false);
  const runBurst = useRef(0);
  const runEmit = useRef(0);
  // X taps the pack off (drop into a normal gravity fall); idleFly counts seconds
  // aloft with NO control input — past 3s the pack cuts out on its own.
  const prevX = useRef(false);
  const prevTouchLand = useRef(0);
  const prevPadJump = useRef(0);
  const prevPadLand = useRef(0);
  const idleFly = useRef(0);
  // smoothed 0..1 thrust command — eases toward 1 while the jump key is held and
  // back to 0 when released, so tapping doesn't snap the climb target each frame
  const thrust = useRef(0);
  // eased ankle-tuck amount (rad) — ramps in while flying so the toes point down
  const footTuck = useRef(0);
  // eased 0..1 leg-dangle amount — rides with the foot tuck so the thighs/knees
  // relax into a hanging pose while suspended and snap back flat on touchdown
  const legHang = useRef(0);
  // procedural body polish: a forward/banked lean while flying, and a
  // squash-&-stretch impulse that pops on launch and absorbs on landing
  const leanX = useRef(0);
  const leanZ = useRef(0);
  const stretch = useRef(0); // +1 = stretch up (launch), -1 = squash down (land)
  const wasGrounded = useRef(true);
  const wasFlying = useRef(false);
  const altAccum = useRef(0);
  const altLast = useRef(-999);
  const poseAccum = useRef(0);
  // scratch vectors reused each frame so the movement loop allocates nothing
  const fwdV = useRef(new THREE.Vector3());
  const rightV = useRef(new THREE.Vector3());
  const { camera } = useThree();

  // expose a fast-travel hook: drop the Handler onto a district (used by the
  // compass). Reads the live body each call, so it survives remounts.
  useEffect(() => {
    if (!travelRef) return;
    travelRef.current = (x, z) => {
      const rb = body.current;
      if (!rb) return;
      const y = spawnPos ? spawnPos[1] : terrainHeight(x, z, shape, spawnKnoll) + 2.4;
      rb.setTranslation({ x, y, z }, true);
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
      jumps.current = 0;
    };
    return () => {
      if (travelRef) travelRef.current = null;
    };
  }, [travelRef, shape, spawnKnoll, spawnPos]);

  // circuit spawn faces down the track (+z); default heading is −z (toward tunnel).
  useEffect(() => {
    if (!spawnPos) return;
    heading.current = 0;
    if (camCue.current) camCue.current.heading = 0;
  }, [spawnPos, camCue]);

  // Single entry point for body animation. Always fades out whatever `cur`
  // points at and fades in the new clip, so the `cur` ref can never desync from
  // what's actually playing on the mixer (that desync is what kept the walk
  // cycle running while idle or flying). `force` re-pops a clip already current
  // (used so each multi-jump re-triggers the leap).
  function setAnim(
    name: "idle" | "walk" | "run" | "jump",
    opts?: { force?: boolean; fade?: number; timeScale?: number },
  ) {
    const ts = opts?.timeScale ?? 1;
    if (cur.current === name && !opts?.force) {
      built.actions[name]?.setEffectiveTimeScale(ts);
      return;
    }
    const fade = opts?.fade ?? 0.18;
    const prev = built.actions[cur.current];
    const next = built.actions[name] || built.actions.idle;
    if (prev && prev !== next) prev.fadeOut(fade);
    if (next) {
      next.setEffectiveTimeScale(ts);
      next.reset().setEffectiveWeight(1).fadeIn(fade).play();
    }
    cur.current = name;
  }

  useEffect(() => {
    // don't hijack keys while the player is typing in a field (e.g. the Guardian
    // chat overlay) — otherwise Space/arrows get preventDefault'd and never reach
    // the input, so you can't type spaces.
    const isTyping = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
    };
    const down = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const code = e.code;
      if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "ShiftLeft", "ShiftRight", "KeyX"].includes(code)) {
        keys[code] = true;
        if (code === "Space" || code.startsWith("Arrow")) e.preventDefault();
      }
      if (e.shiftKey) { keys["ShiftLeft"] = true; keys["ShiftRight"] = true; }
    };
    const up = (e: KeyboardEvent) => {
      keys[e.code] = false;
      if (e.code === "ShiftLeft" || e.code === "ShiftRight" || e.shiftKey) {
        keys["ShiftLeft"] = e.shiftKey;
        keys["ShiftRight"] = e.shiftKey;
      }
    };
    // when the window loses focus (alt-tab, switching apps/tabs, an overlay
    // grabbing focus) the matching keyup never reaches us, so a held movement
    // key would stay `true` and the character walks forever. Drop every key the
    // moment we lose focus / the page is hidden so we never get stuck moving.
    const clearKeys = () => { for (const k in keys) keys[k] = false; };
    const onVisibility = () => { if (document.hidden) clearKeys(); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clearKeys);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clearKeys);
      document.removeEventListener("visibilitychange", onVisibility);
      for (const k in keys) keys[k] = false;
      stopJet(); // never leave the thruster roaring after we unmount
    };
  }, []);

  useFrame((_, dtRaw) => {
    const dt = Math.min(0.05, dtRaw);
    built.mixer.update(dt);
    applyBoneMorph(built.bones, built.boneBase, built.morph);
    const rb = body.current;
    if (!rb) return;

    const t = rb.translation();
    // feed the camera the INTERPOLATED body position (matches the rendered mesh),
    // not the raw stepped physics translation — that mismatch was the judder.
    // Everything else below keeps using `t` (physics truth) on purpose.
    if (camAnchor.current) {
      camAnchor.current.updateWorldMatrix(true, false);
      camAnchor.current.getWorldPosition(handlerPos.current);
    } else {
      handlerPos.current.set(t.x, t.y, t.z);
    }

    const hp = handlerPos.current;
    const fwd = fwdV.current.set(hp.x - camera.position.x, 0, hp.z - camera.position.z);
    if (fwd.lengthSq() < 1e-4) fwd.set(0, 0, 1);
    fwd.normalize();
    const right = rightV.current.set(-fwd.z, 0, fwd.x);
    // gather input as analog axes (ax = strafe, az = forward) from keys + touch stick
    let ax = 0, az = 0;
    let touchSprint = false;
    let padSprint = false;
    if (controlsEnabled) {
      if (keys["KeyW"] || keys["ArrowUp"]) az += 1;
      if (keys["KeyS"] || keys["ArrowDown"]) az -= 1;
      if (keys["KeyD"] || keys["ArrowRight"]) ax += 1;
      if (keys["KeyA"] || keys["ArrowLeft"]) ax -= 1;
      const tm = touchMove.current;
      if (tm) { ax += tm.x; az += tm.y; }
      touchSprint = !!touchBtn.current?.sprint;
      // gamepad left stick (up = forward = negative axis) and RB/LT sprint
      const pad = getPad();
      if (pad.connected) {
        ax += pad.lx;
        az += -pad.ly;
        padSprint = pad.sprintHeld;
      }
    }
    // clamp the combined stick to the unit circle so diagonals aren't faster
    let mag = Math.hypot(ax, az);
    if (mag > 1) { ax /= mag; az /= mag; mag = 1; }
    // camera-relative move vector; its length is the analog throttle (0..1)
    const mx = fwd.x * az + right.x * ax;
    const mz = fwd.z * az + right.z * ax;
    const len = Math.hypot(mx, mz);
    const sprint = keys["ShiftLeft"] || keys["ShiftRight"] || touchSprint || padSprint;
    // Robust ground test. The intersection-sensor counter (`ground.current`)
    // can desync during the jetpack's violent up/down motion (a hard climb then
    // a sink) — a matching exit/enter event gets dropped, leaving the counter
    // stuck at 0 even while we're resting on the surface. When that happened the
    // refund below never fired, so `jumps` stayed above FLY_TRIGGER and the
    // character was locked in flight forever: space just re-thrusts instead of
    // jumping and you can't walk. So also treat "settled near the terrain
    // surface" as grounded, independent of the sensor.
    const floorY = terrainHeight(t.x, t.z, shape, spawnKnoll);
    const restY = floorY + 1.0; // capsule half-height (0.55) + radius (0.45)
    const sensorGround = ground.current > 0;

    // ── spawn settle guard ──
    // Hold the capsule at standing height until the ground sensor fires (collider
    // confirmed beneath us). Without this, on some refreshes the body spawns a
    // frame or two before the plaza/terrain collider mounts, free-falls, and the
    // heightfield safety net only catches it once fully submerged — a visible
    // "spawned under the floor" flash. Bails out after 1.2s so a missed sensor
    // can never pin the player forever.
    if (!settled.current) {
      if (spawnAt.current === 0) spawnAt.current = performance.now();
      if (sensorGround) {
        settled.current = true;
      } else if (performance.now() - spawnAt.current < 1200) {
        rb.setTranslation({ x: t.x, y: restY, z: t.z }, true);
        rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
        return;
      } else {
        settled.current = true;
      }
    }
    // ── jetpack cut-out ──
    // Three ways to drop out of flight back into a plain gravity fall (identical
    // speed/accel to a normal jump, since killing the pack just restores gravity
    // scale): pressing X (desktop), tapping the on-screen LAND button (touch), or
    // 3 seconds aloft without touching any control. We reset `jumps` to 0 so
    // `flyingMode` below reads false and gravity resumes.
    {
      const flyingNow = jumps.current > FLY_TRIGGER;
      const xNow = controlsEnabled && !!keys["KeyX"];
      const xEdge = xNow && !prevX.current;
      prevX.current = xNow;
      // touch LAND button — rising-edge on its tap counter, mirroring the X key
      const tl = touchBtn.current ? touchBtn.current.land : 0;
      const landEdge = controlsEnabled && tl > prevTouchLand.current;
      prevTouchLand.current = tl;
      // gamepad B (land) — same rising-edge land as touch / X
      const pad = getPad();
      const padLandEdge = controlsEnabled && pad.land > prevPadLand.current;
      prevPadLand.current = pad.land;
      const jumpActive = controlsEnabled && (!!keys["Space"] || !!touchBtn.current?.jumpHeld || pad.jumpHeld);
      const anyInput = len > 0 || sprint || jumpActive || xNow;
      if (flyingNow) {
        idleFly.current = anyInput ? 0 : idleFly.current + dt;
        if (xEdge || landEdge || padLandEdge || idleFly.current >= 3) {
          jumps.current = 0;
          flying.current = false;
          thrust.current = 0;
          idleFly.current = 0;
          jetFallSfx();
        }
      } else {
        idleFly.current = 0;
      }
    }

    // height fallback only before jetpack deploy — while flying it flickers over
    // hills and was resetting jumps mid-air, yanking between thrust and gravity
    const grounded = sensorGround || (jumps.current <= FLY_TRIGGER && t.y <= restY + 0.2);
    // jetpack flight is active past the trigger — while flying we hold a still
    // hover pose, so the ground walk/run/idle animation must not drive the body
    const flyingMode = jumps.current > FLY_TRIGGER;
    rb.setGravityScale(flyingMode ? 0 : 1, false);
    const v = rb.linvel();
    // refund the air-jump budget only once settled on the ground (not the frame
    // we launched), so a multi-jump isn't refunded mid-takeoff
    if (grounded && v.y <= 0.6) jumps.current = 0;

    // sustained sprint on the ground → superrun (double speed + smoke trail).
    // Once armed, superrun LATCHES until sprint/movement stops — brief ground-
    // sensor flicker at high speed was resetting the timer and halving velocity.
    const sprinting = sprint && len > 0 && !flyingMode;
    if (sprinting) {
      if (grounded) sprintTime.current += dt;
      if (sprintTime.current >= SUPERRUN_DELAY) superrunArmed.current = true;
    } else {
      sprintTime.current = 0;
      superrunArmed.current = false;
    }
    const superActive = superrunArmed.current && sprinting;
    superrun.current = superActive;
    if (superActive) {
      runEmit.current += dt;
      if (runEmit.current > 0.028) {
        runEmit.current = 0;
        runBurst.current++;
      }
    } else {
      runEmit.current = 0;
    }
    if (superActive && !wasSuperrun.current && camCue.current) {
      camCue.current.zoom = Math.min(1, camCue.current.zoom + 0.3);
    }
    const superrunStart = superActive && !wasSuperrun.current;
    wasSuperrun.current = superActive;

    // Lock movement to body heading when going straight FORWARD on the ground
    // (W only) or superrunning — camera sway / auto-follow can't pull
    // camera-relative steer into a side-to-side weave. Backward (S) is EXCLUDED:
    // the heading-lock steers the body toward its locked heading, but back-pedalling
    // travels opposite the facing, so `want` sat a constant 180° from `heading`
    // every frame and the champion spun on the spot forever instead of moving. With
    // the lock off, S falls through to plain camera-relative steering, so the body
    // turns to face the camera and walks toward it.
    const forwardInput = az > 0.15;
    const forwardOnly = grounded && !flyingMode && len > 0 && forwardInput && Math.abs(ax) < 0.15;
    const headingSteer = (superActive && forwardInput) || forwardOnly;
    let moveX = mx;
    let moveZ = mz;
    let moveLen = len;
    if (headingSteer && len > 0) {
      const steerStart = superrunStart || (forwardOnly && !wasHeadingSteer.current);
      if (steerStart) heading.current = Math.atan2(mx, mz);
      const hf = Math.sin(heading.current);
      const hb = Math.cos(heading.current);
      moveX = hf * az - hb * ax;
      moveZ = hb * az + hf * ax;
      moveLen = Math.hypot(moveX, moveZ);
    }
    wasHeadingSteer.current = headingSteer;

    if (moveLen > 0) {
      const sp = superActive ? SUPERRUN : sprint ? RUN : WALK;
      // moveX/moveZ carry the analog throttle (their length is 0..1)
      const tvx = moveX * sp, tvz = moveZ * sp;
      // exponential smoothing toward the target velocity, frame-rate independent.
      // ground is punchy; flying keeps strong authority so you can steer the pack;
      // a plain jump keeps lighter air control
      const accel = superActive
        ? (grounded ? ACCEL_GROUND * 1.45 : ACCEL_AIR * 1.6)
        : grounded ? ACCEL_GROUND : flyingMode ? ACCEL_FLY : ACCEL_AIR;
      const k = 1 - Math.exp(-accel * dt);
      rb.setLinvel({ x: v.x + (tvx - v.x) * k, y: v.y, z: v.z + (tvz - v.z) * k }, true);
      const want = Math.atan2(moveX, moveZ);
      let d = want - heading.current;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      const turn = headingSteer ? TURN_GROUND * 0.55 : grounded ? TURN_GROUND : TURN_AIR;
      heading.current += d * (1 - Math.exp(-turn * dt));
    } else {
      // stickier stop on the ground, a gentle brake while flying, long glide mid-jump
      const stop = grounded ? STOP_GROUND : flyingMode ? STOP_FLY : STOP_AIR;
      const damp = Math.exp(-stop * dt);
      rb.setLinvel({ x: v.x * damp, y: v.y, z: v.z * damp }, true);
    }

    // jump input: held state (for hold-to-fly) + rising edge (for discrete hops)
    const space = controlsEnabled && !!keys["Space"];
    const spaceEdge = space && !prevSpace.current;
    prevSpace.current = space;
    const tj = touchBtn.current ? touchBtn.current.jump : 0;
    const touchEdge = controlsEnabled && tj > prevTouchJump.current;
    prevTouchJump.current = tj;
    // gamepad A — rising-edge hop + held for hold-to-fly, mirroring Space
    const padJ = getPad();
    const padJumpEdge = controlsEnabled && padJ.jump > prevPadJump.current;
    prevPadJump.current = padJ.jump;
    const jumpEdge = spaceEdge || touchEdge || padJumpEdge;
    const jumpHeld = space || (controlsEnabled && (!!touchBtn.current?.jumpHeld || padJ.jumpHeld));

    if (jumps.current > FLY_TRIGGER) {
      // ── jetpack flight ── a fully controlled hover so vertical motion stays
      // fluid. The key trick: we smooth the THRUST COMMAND (0..1), not just the
      // resulting velocity. Snapping the climb target between full-up and sink on
      // every keypress was the bobbing/shaking — to stay aloft you machine-gun the
      // spacebar, and each tap yanked the target the other way. With the command
      // eased, a held key spools up to a steady climb and rapid taps average into a
      // smooth, uniform hover, like holding W gives a uniform walk. Read the LIVE
      // velocity (the steering block above just wrote x/z) and only touch y, so
      // thrust never fights your WASD steering.
      const cv = rb.linvel();
      thrust.current += ((jumpHeld ? 1 : 0) - thrust.current) * (1 - Math.exp(-FLY_SPOOL * dt));
      // blend the vertical target + ease rate by the smoothed thrust: full press →
      // strong, snappy climb; released → a slow, floaty sink
      const targetY = FLY_SINK + (FLY_CLIMB - FLY_SINK) * thrust.current;
      const rate = FLY_GLIDE + (FLY_THRUST - FLY_GLIDE) * thrust.current;
      const ky = 1 - Math.exp(-rate * dt);
      rb.setLinvel({ x: cv.x, y: cv.y + (targetY - cv.y) * ky, z: cv.z }, true);
      jetEmit.current += dt;
      const emitGap = 0.045 + (1 - thrust.current) * 0.085; // tighter puffs at full thrust
      if (jetEmit.current > emitGap) { jetEmit.current = 0; jetBurst.current++; }
    } else if (jumpEdge) {
      // ── discrete multi-jump ── edge-triggered so a held key/tap can't spam it
      const air = jumps.current > 0;
      jumps.current++;
      // keep the steered horizontal velocity (don't snap back to pre-frame inertia)
      const cv = rb.linvel();
      rb.setLinvel({ x: cv.x, y: air ? AIR_JUMP : JUMP, z: cv.z }, true);
      jumpBeep(jumps.current - 1);
      // launch pop — the body stretches upward as it leaps (idle + leg hang sell the arc)
      stretch.current = 1;
      // action-cam: punch the camera in toward the character on every air jump
      if (air && camCue.current) camCue.current.zoom = Math.min(1, camCue.current.zoom + 0.85);
      // the stroke that crosses the threshold kicks off the jetpack with a burst
      if (jumps.current > FLY_TRIGGER) jetBurst.current++;
    }
    // touchdown absorb — squash on the frame we regain the ground with downward speed
    if (grounded && !wasGrounded.current && v.y < -2) stretch.current = -1;
    wasGrounded.current = grounded;
    // pack deploys once we're flying (past the trigger), retracts on landing
    flying.current = jumps.current > FLY_TRIGGER;
    if (flying.current && !wasFlying.current && camCue.current) {
      // one-shot punch on deploy — not every frame while thrusting (that pulsed zoom/FOV)
      camCue.current.zoom = Math.min(1, camCue.current.zoom + 0.35);
    }
    wasFlying.current = flying.current;
    // drop the thrust command when not airborne so the next takeoff spools from 0
    if (!flying.current) thrust.current = 0;
    // thruster roar: silent on the ground, a low idle while hovering, full while
    // actively thrusting — spooled smoothly inside the sfx engine
    setJet(flying.current && controlsEnabled ? (jumpHeld ? 1 : 0.4) : 0);

    // ── resolve the body animation from the REAL locomotion state ──
    // One place, every frame, so the playing clip always matches the state:
    //  • flying / airborne → still hover pose (legs dangle, feet point down)
    //  • grounded + moving → walk / run
    //  • grounded + still → idle
    // `endVy > 1.5` treats the launch frame (ground sensor may still read true)
    // as airborne so the hang pose isn't instantly overwritten by walk.
    const endVy = rb.linvel().y;
    if (flying.current || !grounded || endVy > 1.5) {
      setAnim("idle");
    } else if (len > 0) {
      setAnim(sprint ? "run" : "walk", { timeScale: superActive && sprint ? 2 : 1 });
    } else {
      setAnim("idle");
    }

    // ── feet: ankle tuck while airborne ──
    // Feet aren't keyed in the idle clip, so the mixer never resets them — we SET
    // bind × hang offset each frame (not subtract euler, which accumulated and
    // made the right foot spin through gimbal lock at z ≈ π).
    const wantFootTuck = flying.current || !grounded || endVy > 1.5;
    footTuck.current += ((wantFootTuck ? FLY_FOOT : 0) - footTuck.current) * (1 - Math.exp(-12 * dt));
    legHang.current += ((wantFootTuck ? 1 : 0) - legHang.current) * (1 - Math.exp(-10 * dt));

    const fl = legBone(built.bones, "foot", "l");
    const fr = legBone(built.bones, "foot", "r");
    if (fl && fr) {
      if (footTuck.current > 0.001) {
        eHang.current.set(-FLY_FOOT * footTuck.current, 0, 0);
        qFootHang.current.setFromEuler(eHang.current);
        fl.quaternion.copy(footBind.current.l).multiply(qFootHang.current);
        fr.quaternion.copy(footBind.current.r).multiply(qFootHang.current);
      } else {
        fl.quaternion.copy(footBind.current.l);
        fr.quaternion.copy(footBind.current.r);
      }
    }

    // ── legs: relaxed dangle while suspended ──
    // Layered on the clip the mixer wrote this frame via a local quat multiply.
    if (legHang.current > 0.001) {
      const ul = legBone(built.bones, "upperleg", "l");
      const ur = legBone(built.bones, "upperleg", "r");
      const ll = legBone(built.bones, "lowerleg", "l");
      const lr = legBone(built.bones, "lowerleg", "r");
      const thigh = FLY_LEG_HANG * legHang.current;
      const knee = FLY_KNEE_BEND * legHang.current;
      if (ul) { eHang.current.set(-thigh, 0, 0); qThighHang.current.setFromEuler(eHang.current); ul.quaternion.multiply(qThighHang.current); }
      if (ur) { eHang.current.set(-thigh, 0, 0); qThighHang.current.setFromEuler(eHang.current); ur.quaternion.multiply(qThighHang.current); }
      if (ll) { eHang.current.set(knee, 0, 0); qKneeHang.current.setFromEuler(eHang.current); ll.quaternion.multiply(qKneeHang.current); }
      if (lr) { eHang.current.set(knee, 0, 0); qKneeHang.current.setFromEuler(eHang.current); lr.quaternion.multiply(qKneeHang.current); }
    }

    // ── under-terrain safety net ──
    // a trimesh ground collider can let a fast/steep capsule tunnel through and
    // drop "under-earth" (worst on Ember's spires). If our centre ever ends up
    // below the surface height at our (x,z), lift back onto it. Read a fresh
    // translation so this doesn't double-fire after a checkpoint rescue above.
    if (!circuitMode) {
      const p = rb.translation();
      const floorYNet = terrainHeight(p.x, p.z, shape, spawnKnoll);
      const FEET = 1.0;
      if (p.y < floorYNet - 0.1) {
        rb.setTranslation({ x: p.x, y: floorYNet + FEET + 0.05, z: p.z }, true);
        const lv = rb.linvel();
        rb.setLinvel({ x: lv.x, y: Math.max(0, lv.y), z: lv.z }, true);
        ground.current = Math.max(ground.current, 1);
      }
    }

    // hand the camera the live movement state so it can smart-follow the player
    if (camCue.current) {
      const lv = rb.linvel();
      camCue.current.heading = heading.current;
      camCue.current.speed = Math.hypot(lv.x, lv.z);
      camCue.current.moving = len > 0;
      camCue.current.flying = flyingMode;
      // vertical velocity drives the in-flight camera tilt (climb → look up,
      // sink → look down). Zero on the ground so the tilt only applies aloft.
      camCue.current.climb = flyingMode ? lv.y : 0;
      camCue.current.superrun = superActive;
      camCue.current.headingSteer = headingSteer;
      // `az` is exactly the move's forward component (fwd ⟂ right): negative means
      // we're heading back toward the camera. Flag it so the auto-follow stands
      // down — chasing "behind" a player who's facing the camera spins endlessly.
      camCue.current.reverse = az < -0.1;
    }

    // ── procedural body polish ──
    // forward lean + bank while flying so steering reads visually (the legs stay
    // still in the hover pose); decays to upright the instant we touch down
    const lv2 = rb.linvel();
    const hspeed = Math.hypot(lv2.x, lv2.z);
    const tgtLeanX = flyingMode ? Math.min(0.5, hspeed * 0.03) : superActive ? Math.min(0.42, hspeed * 0.035) : 0;
    const tgtLeanZ = flyingMode ? Math.max(-0.35, Math.min(0.35, -ax * 0.35)) : 0;
    const ls = 1 - Math.exp(-10 * dt);
    leanX.current += (tgtLeanX - leanX.current) * ls;
    leanZ.current += (tgtLeanZ - leanZ.current) * ls;
    // squash-&-stretch impulse eases back to neutral
    stretch.current += (0 - stretch.current) * (1 - Math.exp(-9 * dt));
    if (inner.current) {
      inner.current.rotation.set(leanX.current, heading.current, leanZ.current);
      const s = stretch.current;
      inner.current.scale.set(1 - s * 0.12, 1 + s * 0.18, 1 - s * 0.12);
    }

    let next: NearTarget = null;
    if (!matchActive && circuitMode && inVenue && venueExitTarget && onVenueExit) {
      const ex = venueExitTarget;
      const dh = Math.hypot(t.x - ex.pos.x, t.z - ex.pos.z);
      const dy = Math.abs(t.y - ex.pos.y);
      if (dh < ex.radius && dy < ex.radius) {
        const now = performance.now();
        if (now - venueExitCooldown.current > 800) {
          venueExitCooldown.current = now;
          onVenueExit();
        }
      }
    } else if (!matchActive && inVenue && venueExitTarget && !circuitMode) {
      const ex = venueExitTarget;
      const dh = Math.hypot(t.x - ex.pos.x, t.z - ex.pos.z);
      const dy = Math.abs(t.y - ex.pos.y);
      if (dh < ex.radius && dy < ex.radius) next = { kind: "venue-exit", label: ex.label };
    }
    if (!matchActive && circuitMode && onCircuitPass && circuitCpNextRef) {
      const nextIdx = circuitCpNextRef.current;
      const cp = circuitCheckpoints[nextIdx];
      const pos = { x: t.x, y: t.y, z: t.z };
      if (cp) {
        if (crossedCircuitGate(pos, { index: cp.index, label: "", pos: cp.posTuple, radius: cp.radius, finish: cp.finish }, { start: cp.index === 0 })) {
          onCircuitPass(cp.index);
          circuitCpNextRef.current = nextIdx + 1;
        }
      }
      if (
        onCircuitFail &&
        atCircuitFinishEarly(
          pos,
          circuitCheckpoints.map((c) => ({ pos: c.posTuple, radius: c.radius, finish: c.finish, index: c.index })),
          nextIdx,
        )
      ) {
        const now = performance.now();
        if (now - failCooldown.current > 800) {
          failCooldown.current = now;
          onCircuitFail("gates");
        }
      }
      // fell off the track — one fall ends the entire run (no checkpoint respawn)
      if (t.y < -8) {
        const now = performance.now();
        if (onCircuitFail && now - failCooldown.current > 800) {
          failCooldown.current = now;
          onCircuitFail("fall");
        }
      }
    } else if (!matchActive && isHub) {
      // The Concord: walk into a Vaultgate footprint to travel to its region.
      let best: { world: string; label: string } | null = null;
      let bestD = 3.2;
      for (const gt of gateTargets) {
        const dh = Math.hypot(t.x - gt.pos.x, t.z - gt.pos.z);
        if (dh < bestD) {
          bestD = dh;
          best = { world: gt.world, label: gt.label };
        }
      }
      if (best) next = { kind: "gate", ...best };
      // no gate underfoot? check the Clan flags ringing the seal — stand on a
      // flag's footprint to swear allegiance to that house.
      if (!next) {
        let bestF: { type: CreatureType; name: string; motto: string } | null = null;
        let bestFd = 2.6;
        for (const ft of forceTargets) {
          const dh = Math.hypot(t.x - ft.pos.x, t.z - ft.pos.z);
          if (dh < bestFd) {
            bestFd = dh;
            bestF = { type: ft.type, name: ft.name, motto: ft.motto };
          }
        }
        if (bestF) next = { kind: "force", ...bestF };
      }
      // still nothing? check Concord game portals (not Vaultgates).
      if (!next) {
        let bestG: { venue: VenueId; label: string } | null = null;
        let bestGd = 2.8;
        for (const vt of concordVenueTargets) {
          const dh = Math.hypot(t.x - vt.pos.x, t.z - vt.pos.z);
          if (dh < bestGd) {
            bestGd = dh;
            bestG = { venue: vt.venue, label: vt.label };
          }
        }
        if (bestG) next = { kind: "venue-enter", ...bestG };
      }
    } else if (!matchActive && inAmphitheatre) {
      // Daily herald inside the Amphitheatre game scene.
      let bestV: { venue: ConcordVenueId; name: string } | null = null;
      let bestVd = 2.6;
      for (const vt of venueTargets) {
        const dh = Math.hypot(t.x - vt.pos.x, t.z - vt.pos.z);
        if (dh < bestVd) {
          bestVd = dh;
          bestV = { venue: vt.venue, name: vt.name };
        }
      }
      if (!next && bestV) next = { kind: "venue", ...bestV };
    } else if (!matchActive && !isHub && !inVenue) {
      if (returnTarget) {
        const dh = Math.hypot(t.x - returnTarget.x, t.z - returnTarget.z);
        if (dh < 3.2) next = { kind: "return" };
      }
      if (!next && circuitTunnelTarget) {
        const dh = Math.hypot(t.x - circuitTunnelTarget.pos.x, t.z - circuitTunnelTarget.pos.z);
        if (dh < 3.0) next = { kind: "venue-enter", venue: "circuit", label: circuitTunnelTarget.label };
      }
      const dTrain = Math.hypot(t.x - trainPad[0], t.z - trainPad[2]);
      const dArena = Math.hypot(t.x - ARENA[0], t.z - ARENA[2]);
      if (ownedKey && dTrain < 3.6) next = { kind: "train", key: ownedKey };
      else if (dArena < 6.5) next = { kind: "arena" };
      // The Broker — a walk-up exchange on flat ground near spawn.
      if (!next) {
        const db = Math.hypot(t.x - brokerPad[0], t.z - brokerPad[2]);
        if (db < 3.0 && Math.abs(t.y - brokerPad[1]) < 3.0) next = { kind: "broker" };
      }
      // Keeper talk: must climb the spire and stand on the same landing as the Keeper.
      if (!next) {
        let bestK: { level: number; name: string; title: string } | null = null;
        let bestKd = 2.4;
        for (const kt of keeperTargets) {
          const dy = Math.abs(t.y - kt.pos.y);
          const dh = Math.hypot(t.x - kt.pos.x, t.z - kt.pos.z);
          if (dy > 2.2 || dh > 2.4) continue;
          const d = Math.hypot(dh, dy);
          if (d < bestKd) {
            bestKd = d;
            bestK = { level: kt.level, name: kt.name, title: kt.title };
          }
        }
        if (bestK) next = { kind: "keeper", ...bestK };
      }
      // Ladder-agent challenge: same platform only — no sniping from the ground.
      if (!next && ownedKey) {
        let best: { key: string; name: string; id: string; handle?: string } | null = null;
        let bestD = 2.6;
        for (const ct of challengeTargets) {
          const dy = Math.abs(t.y - ct.pos.y);
          const dh = Math.hypot(t.x - ct.pos.x, t.z - ct.pos.z);
          if (dy > 2.0 || dh > 2.6) continue;
          const d = Math.hypot(dh, dy * 0.85);
          if (d < bestD) {
            bestD = d;
            best = { key: ct.key, name: ct.name, id: ct.id, handle: ct.handle };
          }
        }
        if (best) next = { kind: "challenge", ...best };
      }
      // Roaming agents on the open ground — a walk-up challenge, no climb needed.
      if (!next && ownedKey) {
        let best: { key: string; name: string; id: string; handle?: string } | null = null;
        let bestD = 4.5;
        for (const gt of groundTargets) {
          const dy = Math.abs(t.y - gt.pos.y);
          const dh = Math.hypot(t.x - gt.pos.x, t.z - gt.pos.z);
          if (dy > 3.5 || dh > 4.5) continue;
          if (dh < bestD) {
            bestD = dh;
            best = { key: gt.key, name: gt.name, id: gt.id, handle: gt.handle };
          }
        }
        if (best) next = { kind: "challenge", ...best };
      }
      // Discovery caches — walk or fly into one to grab it.
      if (!next) {
        let best: (typeof nodeTargets)[number] | null = null;
        let bestD = 2.8;
        for (const nt of nodeTargets) {
          const dy = Math.abs(t.y - nt.pos.y);
          const dh = Math.hypot(t.x - nt.pos.x, t.z - nt.pos.z);
          if (dy > 2.8 || dh > 2.8) continue;
          const d = Math.hypot(dh, dy);
          if (d < bestD) {
            bestD = d;
            best = nt;
          }
        }
        if (best) next = { kind: "node", id: best.id, nodeKind: best.kind, crowns: best.crowns, fragments: best.fragments, flight: best.flight };
      }
      // World goals — reach the summit / rift floor / hidden echo, then press E.
      if (!next) {
        let best: (typeof goalTargets)[number] | null = null;
        let bestD = Infinity;
        for (const gt of goalTargets) {
          const dy = Math.abs(t.y - gt.pos.y);
          const dh = Math.hypot(t.x - gt.pos.x, t.z - gt.pos.z);
          if (dy > gt.radius || dh > gt.radius) continue;
          const d = Math.hypot(dh, dy);
          if (d < bestD) {
            bestD = d;
            best = gt;
          }
        }
        if (best) next = { kind: "goal", id: best.id, goalKind: best.goalKind, label: best.label, hint: best.hint, crowns: best.reward.crowns, fragments: best.reward.fragments, trainerXp: best.reward.trainerXp, seasonPoints: best.reward.seasonPoints };
      }
    }
    if (JSON.stringify(next) !== JSON.stringify(near.current)) {
      near.current = next;
      onNear(next);
    }

    // report pose for the compass (throttled, runs even on flat ground)
    if (onPose) {
      poseAccum.current += dt;
      if (poseAccum.current > 0.1) {
        poseAccum.current = 0;
        onPose(t.x, t.z, heading.current);
      }
    }

    // report altitude to the HUD (throttled by time + change)
    if (onAltitude) {
      altAccum.current += dt;
      if (altAccum.current > 0.12 && Math.abs(t.y - altLast.current) > 0.2) {
        altAccum.current = 0;
        altLast.current = t.y;
        onAltitude(t.y);
      }
    }
  });

  return (
    <>
      {!isHub && !inVenue && <TrainPad pos={trainPad} />}
      <SuperrunTrail superrunRef={superrun} posRef={handlerPos} headingRef={heading} burstRef={runBurst} h={built.h} />
      <RigidBody
        ref={body}
        type="dynamic"
        colliders={false}
        // Spawn the capsule already resting on the ground (centre = floor + foot
        // offset, +0.1 clearance) instead of dropping it in from a fixed height.
        // The old 2.5 free-fall could land mid-air on the reveal — or punch
        // through before the terrain collider was ready — and read as spawning
        // under the floor. `terrainHeight` is 0 across the flat plaza, so this is
        // the standing height in every world.
        position={
          spawnPos
            ? spawnPos
            : [spawnKnoll.x, terrainHeight(spawnKnoll.x, spawnKnoll.z, shape, spawnKnoll) + 1.1, spawnKnoll.z]
        }
        enabledRotations={[false, false, false]}
        canSleep={false}
        ccd
      >
        <CapsuleCollider args={[0.55, 0.45]} />
        <CuboidCollider
          args={[0.3, 0.2, 0.3]}
          position={[0, -0.95, 0]}
          sensor
          onIntersectionEnter={() => { ground.current++; }}
          onIntersectionExit={() => { ground.current = Math.max(0, ground.current - 1); }}
        />
        {/* interpolated camera anchor — origin-aligned with the body, no offset */}
        <group ref={camAnchor} />
        <group ref={inner} position={[0, -1.0, 0]}>
          <primitive object={built.root} />
          <Jetpack h={built.h} flyingRef={flying} burstRef={jetBurst} />
        </group>
        {/* ground ring stays flat & upright — outside the leaning/squashing body group */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.96, 0]}>
          <ringGeometry args={[0.6, 0.72, 40]} />
          <meshBasicMaterial color="#39e0ff" transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
      </RigidBody>
    </>
  );
}

// camera elevation range. Negative dips the rig below the player so the view
// tilts UP past the horizon toward the sky; positive looks down from above.
const PITCH_MIN = -0.5;  // ~ -29°: look up at the sky
const PITCH_MAX = 1.25;  // ~ 72°: look steeply down
// jetpack camera tilt: while flying, the rig sits behind the character and the
// pitch rides the climb — ascending dips the lens BELOW the player so the view
// tilts up to chase the rise; sinking lifts it ABOVE to look down on the drop.
const PITCH_FLY_UP = -0.12;   // climbing → camera low, looking up ("back & slightly down")
const PITCH_FLY_HOVER = 0.14; // steady hover → near-level over-the-shoulder
const PITCH_FLY_DOWN = 0.46;  // sinking → camera high, looking down ("back & slightly up")
// orbit-drag + wheel-zoom third-person camera; cinematic director during a bout
// Passive "postcard" camera for showcase/docs embeds — a slow, high orbit around
// the plaza so the whole region (arena, tower, spire, rift) reads at a glance.
// No player to follow, no input; it just drifts.
function ShowcaseCamera({ shape }: { shape: TerrainShape }) {
  const { camera } = useThree();
  const t = useRef(Math.PI * 0.25);
  const tmp = useRef(new THREE.Vector3());
  useFrame((_, dtRaw) => {
    const dt = Math.min(0.05, dtRaw);
    t.current += dt * 0.06;
    const radius = 34;
    const cx = Math.sin(t.current) * radius;
    const cz = Math.cos(t.current) * radius;
    const cy = Math.max(15, terrainHeight(cx, cz, shape) + 13);
    camera.position.lerp(tmp.current.set(cx, cy, cz), 0.06);
    camera.lookAt(ARENA[0], 2.2, ARENA[2]);
  });
  return null;
}

const CIRCUIT_INTRO_HOLD_S = 1.5;

function CameraController({
  match,
  handlerPos,
  camCue,
  camDrag,
  shape,
  galleryFocus,
  inCircuit = false,
  circuitPhase = null,
}: {
  match: MatchView | null;
  handlerPos: React.RefObject<THREE.Vector3>;
  camCue: React.RefObject<CamCue>;
  camDrag: React.RefObject<CamDrag>;
  shape: TerrainShape;
  galleryFocus?: React.RefObject<GalleryFocus | null>;
  inCircuit?: boolean;
  circuitPhase?: CircuitPhase | null;
}) {
  const { camera, gl } = useThree();
  const yaw = useRef(0);
  const pitch = useRef(0.34);
  const dist = useRef(12);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const dirYaw = useRef(0);
  const tmp = useRef(new THREE.Vector3());
  // when the user last steered with the mouse — auto-follow stays out of the way for a beat after
  const lastInput = useRef(-9999);
  // speed-driven dolly-back, eased so the pull-out/in feels smooth
  const followDist = useRef(0);
  const smoothHp = useRef(new THREE.Vector3());
  // companion re-framing: on every takeoff / touchdown we sweep the camera to sit
  // squarely behind the character. `recenter` is the remaining seconds of an
  // active sweep; `recenterPitch` is the pitch we ease toward during it.
  const prevFlying = useRef(false);
  const prevSuperrun = useRef(false);
  const recenter = useRef(0);
  const recenterPitch = useRef(0.34);
  // Circuit race intro: hold a front-facing hero shot, then sweep behind the runner.
  const circuitIntroHold = useRef(0);
  const prevCircuitPhase = useRef<CircuitPhase | null>(null);
  // eased 0..1 weight of "frame the Scrying Gallery ring" — ramps up as the player
  // nears the live bout and decays back to free third-person on leave
  const galleryW = useRef(0);

  useEffect(() => {
    if (!inCircuit) {
      circuitIntroHold.current = 0;
      prevCircuitPhase.current = null;
      return;
    }
    if (camCue.current) yaw.current = camCue.current.heading;
  }, [inCircuit, camCue]);

  useEffect(() => {
    const el = gl.domElement;
    const onDown = (e: PointerEvent) => { dragging.current = true; last.current = { x: e.clientX, y: e.clientY }; };
    const onUp = () => { dragging.current = false; };
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const st = useSettings.getState();
      const sens = st.camSensitivity;
      yaw.current -= (e.clientX - last.current.x) * 0.005 * sens;
      const dy = (e.clientY - last.current.y) * 0.004 * sens * (st.invertY ? -1 : 1);
      pitch.current = Math.min(PITCH_MAX, Math.max(PITCH_MIN, pitch.current - dy));
      last.current = { x: e.clientX, y: e.clientY };
      lastInput.current = performance.now();
    };
    const onWheel = (e: WheelEvent) => { e.preventDefault(); dist.current = Math.min(120, Math.max(6, dist.current + e.deltaY * 0.012)); lastInput.current = performance.now(); };
    // Q — snap the camera back behind the character (classic third-person
    // recenter). Reuses the takeoff/landing sweep so it eases in cleanly: swings
    // the lens directly behind the player, resets to the over-the-shoulder pitch
    // + default distance, and punches focus in for a beat.
    const isTyping = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyQ" || e.repeat || isTyping(e.target)) return;
      recenter.current = 0.7;
      recenterPitch.current = 0.34;
      dist.current = 12;
      if (camCue.current) camCue.current.zoom = Math.min(1.2, camCue.current.zoom + 0.4);
    };
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointermove", onMove);
    el.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointermove", onMove);
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, [gl, camCue]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(0.05, dtRaw);
    if (match) {
      const cin = !!match.cinematic;
      dirYaw.current += cin ? 0.0018 : 0.003;
      const tx = ARENA[0], ty = cin ? 1.45 : 1.6, tz = ARENA[2];
      const orbit = cin ? 10.5 : 14;
      const cy = cin ? 4.85 : 6.2;
      const cx = tx + Math.sin(dirYaw.current) * orbit;
      const cz = tz + Math.cos(dirYaw.current) * orbit;
      camera.position.lerp(tmp.current.set(cx, cy, cz), cin ? 0.055 : 0.04);
      camera.lookAt(tx, ty, tz);
      return;
    }
    const st = useSettings.getState();
    // drain touch orbit / pinch deltas accumulated by the on-screen look pad
    const drag = camDrag.current;
    if (drag && (drag.dx || drag.dy || drag.pinch)) {
      const sens = st.camSensitivity;
      yaw.current -= drag.dx * 0.005 * sens;
      const pdy = drag.dy * 0.004 * sens * (st.invertY ? -1 : 1);
      pitch.current = Math.min(PITCH_MAX, Math.max(PITCH_MIN, pitch.current - pdy));
      if (drag.pinch) dist.current = Math.min(120, Math.max(6, dist.current - drag.pinch * 0.02));
      drag.dx = 0; drag.dy = 0; drag.pinch = 0;
      lastInput.current = performance.now();
    }

    // gamepad right stick — free look (rate-based, scaled by sensitivity)
    const pad = getPad();
    if (pad.connected && (pad.rx || pad.ry)) {
      const sens = st.camSensitivity;
      yaw.current -= pad.rx * 2.6 * sens * dt;
      const pdy = pad.ry * 1.8 * sens * dt * (st.invertY ? -1 : 1);
      pitch.current = Math.min(PITCH_MAX, Math.max(PITCH_MIN, pitch.current + pdy));
      lastInput.current = performance.now();
    }

    const hpRaw = handlerPos.current;
    const cue = camCue.current;
    const flying = cue?.flying ?? false;
    const zoom = cue ? cue.zoom : 0;
    if (cue) cue.zoom *= flying ? 0.9 : 0.86;

    // ── companion re-framing on takeoff / touchdown ──
    // The camera should behave like a companion that re-frames the action, not a
    // free orbit you have to fix by hand. The moment the character leaves or
    // regains the ground, kick off a smooth sweep that parks the lens squarely
    // behind them and resets the pitch (flatter in the air, classic over-the-
    // shoulder on land), plus a small focus punch-in.
    if (flying !== prevFlying.current) {
      recenter.current = 0.9;
      // deploying/retaking flight always begins with an upward stroke, so sweep
      // behind AND toward the climb pose (camera low, looking up); landing returns
      // to the classic over-the-shoulder pitch.
      recenterPitch.current = flying ? PITCH_FLY_UP : 0.34;
      if (cue) cue.zoom = Math.min(1.2, cue.zoom + 0.4);
    }
    prevFlying.current = flying;

    if (cue?.superrun && !prevSuperrun.current) {
      recenter.current = 0.55;
      recenterPitch.current = 0.34;
    }
    prevSuperrun.current = cue?.superrun ?? false;

    // Follow anchor. Drive BOTH the orbit basis and the lookAt target from this
    // one smoothed point so the framing stays glued to the character. While
    // flying, damp the VERTICAL hard: the jetpack's climb/sink bob was reaching
    // the lookAt target and pitching the view up/down every stroke — that bob was
    // the shake. Horizontal stays responsive; on foot everything is near-instant
    // so the walk follow keeps its crispness.
    if (smoothHp.current.lengthSq() < 1e-6) smoothHp.current.copy(hpRaw);
    const fxz = 1 - Math.exp(-(flying ? 12 : 30) * dt);
    const fy = 1 - Math.exp(-(flying ? 7 : 30) * dt);
    smoothHp.current.x += (hpRaw.x - smoothHp.current.x) * fxz;
    smoothHp.current.z += (hpRaw.z - smoothHp.current.z) * fxz;
    smoothHp.current.y += (hpRaw.y - smoothHp.current.y) * fy;
    const hp = smoothHp.current;

    const speed = cue ? cue.speed : 0;
    const moving = cue ? cue.moving : false;
    const speed01 = Math.min(1, speed / (cue?.superrun ? SUPERRUN : RUN));

    if (inCircuit && circuitPhase === "running" && prevCircuitPhase.current !== "running") {
      circuitIntroHold.current = CIRCUIT_INTRO_HOLD_S;
      if (cue) yaw.current = cue.heading;
    }
    if (inCircuit) prevCircuitPhase.current = circuitPhase;
    else prevCircuitPhase.current = null;

    const circuitIntroActive = inCircuit && circuitIntroHold.current > 0;
    if (circuitIntroActive) {
      const holdBefore = circuitIntroHold.current;
      circuitIntroHold.current = Math.max(0, circuitIntroHold.current - dt);
      if (holdBefore > 0 && circuitIntroHold.current === 0) {
        recenter.current = 0.9;
        recenterPitch.current = 0.34;
      }
    }
    const circuitFrontLock = inCircuit && (circuitPhase === "ready" || circuitIntroActive);

    const recentering = recenter.current > 0 && !dragging.current;
    if (recenter.current > 0) recenter.current = Math.max(0, recenter.current - dt);

    if (recentering && cue) {
      // deliberate, eased swing to directly behind the character + pitch reset —
      // overrides the mouse-input cooldown so the companion always re-frames
      let d = cue.heading + Math.PI - yaw.current;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      const r = Math.min(1, dt * 5);
      yaw.current += d * r;
      pitch.current += (recenterPitch.current - pitch.current) * r;
    } else if (flying && cue && st.camAssist && performance.now() - lastInput.current > 600) {
      // ── in-flight companion follow ──
      // While the pack is lit, keep the lens planted behind the character even
      // when hovering straight up/down (no WASD), and tilt the pitch with the
      // climb: rising → ease toward look-up (camera dips below), sinking → ease
      // toward look-down (camera lifts above). Eased so it reads as a smooth
      // camera move, not a snap, and yields to manual drags for a beat.
      if (!cue.reverse) {
        let d = cue.heading + Math.PI - yaw.current;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        yaw.current += d * Math.min(1, dt * (1.8 + speed01 * 2.0));
      }
      const climb = cue.climb;
      let pitchTarget = PITCH_FLY_HOVER;
      if (climb > 0.15) {
        const up = Math.min(1, climb / FLY_CLIMB);
        pitchTarget = PITCH_FLY_HOVER + up * (PITCH_FLY_UP - PITCH_FLY_HOVER);
      } else if (climb < -0.15) {
        const dn = Math.min(1, -climb / Math.abs(FLY_SINK));
        pitchTarget = PITCH_FLY_HOVER + dn * (PITCH_FLY_DOWN - PITCH_FLY_HOVER);
      }
      pitch.current += (pitchTarget - pitch.current) * Math.min(1, dt * 2.6);
    } else if (cue && moving && st.camAssist && !cue.reverse && !cue.headingSteer && !circuitFrontLock && performance.now() - lastInput.current > 900) {
      let d = cue.heading + Math.PI - yaw.current;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      yaw.current += d * Math.min(1, dt * (1.4 + speed01 * 2.4));
    }

    followDist.current += (speed01 * 6 - followDist.current) * Math.min(1, dt * 4);
    const flyZoom = flying ? 0 : zoom;
    const eff = Math.max(5, dist.current + followDist.current - flyZoom * 6);

    // Sway reads nice in a cutscene but shifts the camera-relative steer basis —
    // keep the rig steady on foot so W walks in a straight line.
    const swayX = 0;
    const swayY = 0;

    let tx = hp.x, ty = hp.y + 0.4 + flyZoom * 0.3, tz = hp.z;
    let cx = tx + Math.sin(yaw.current) * Math.cos(pitch.current) * eff + swayX;
    let cz = tz + Math.cos(yaw.current) * Math.cos(pitch.current) * eff;
    let cy = ty + Math.sin(pitch.current) * eff + swayY;

    // ── Scrying Gallery framing ──
    // While a league bout is live and the player is standing close, blend the
    // look target toward the ring centre and orbit a touch further out, so the
    // camera "settles in to watch" the fight, then releases as they walk away.
    const gf = galleryFocus?.current;
    const gActive = gf?.active && !flying && !recentering;
    let gTarget = 0;
    if (gf && gActive) {
      const dx = hp.x - gf.center.x, dz = hp.z - gf.center.z;
      const d = Math.hypot(dx, dz);
      gTarget = THREE.MathUtils.clamp((13 - d) / 6, 0, 1); // 0 @ ~13u → 1 @ ~7u
    }
    galleryW.current += (gTarget - galleryW.current) * Math.min(1, dt * 2.2);
    const gw = galleryW.current;
    if (gf && gw > 0.01) {
      const gtx = gf.center.x, gtz = gf.center.z, gty = 1.5;
      const gEff = Math.max(eff, 11);
      const gcx = gtx + Math.sin(yaw.current) * Math.cos(pitch.current) * gEff;
      const gcz = gtz + Math.cos(yaw.current) * Math.cos(pitch.current) * gEff;
      const gcy = gty + Math.sin(pitch.current) * gEff;
      tx += (gtx - tx) * gw; ty += (gty - ty) * gw; tz += (gtz - tz) * gw;
      cx += (gcx - cx) * gw; cy += (gcy - cy) * gw; cz += (gcz - cz) * gw;
    }

    cy = Math.max(cy, terrainHeight(cx, cz, shape) + 0.8);
    // frame-rate-independent position smoothing (the old fixed-alpha lerp was
    // stiffer at high refresh rates and let the bob through). Floaty in flight,
    // snappy on foot, snappiest during an action-cam punch.
    const posRate = flying ? 6 : flyZoom > 0.05 ? 18 : 11;
    camera.position.lerp(tmp.current.set(cx, cy, cz), 1 - Math.exp(-posRate * dt));
    camera.lookAt(tx, ty, tz);

    const cam = camera as THREE.PerspectiveCamera;
    // reduced motion: hold a steady FOV (no speed swell / action-cam punch)
    const targetFov = st.reduceMotion ? 52 : 52 + (flying ? 0 : speed01 * 10 + flyZoom * 6);
    if (Math.abs(cam.fov - targetFov) > 0.01) {
      cam.fov += (targetFov - cam.fov) * Math.min(1, dt * 3);
      cam.updateProjectionMatrix();
    }
  });
  return null;
}

// ── on-screen touch controls (mobile) ─────────────────────────────────
// left half = floating analog stick (move), right half = drag-to-look +
// two-finger pinch-to-zoom, plus jump / sprint buttons bottom-right.
const touchCapStack: CSSProperties = { display: "flex", flexDirection: "column", gap: 4, alignItems: "center", pointerEvents: "none" };
const touchCapLabel: CSSProperties = {
  fontFamily: "var(--font-mono), monospace",
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: 0.6,
  color: "rgba(242,238,251,.82)",
  textShadow: "0 1px 3px rgba(0,0,0,.7)",
  whiteSpace: "nowrap",
};

function touchBtnStyle(size: number): CSSProperties {
  return {
    width: size,
    height: size,
    borderRadius: "50%",
    border: "2px solid",
    fontFamily: "var(--font-mono), monospace",
    fontWeight: 700,
    letterSpacing: 1,
    display: "grid",
    placeItems: "center",
    touchAction: "none",
    backdropFilter: "blur(3px)",
    cursor: "pointer",
    userSelect: "none",
    WebkitUserSelect: "none",
  };
}

function TouchControls({ active, move, btn, cam, cue, bottomInset = 0, hudLeftInset = 0 }: {
  active: boolean;
  move: React.RefObject<TouchMove>;
  btn: React.RefObject<TouchBtn>;
  cam: React.RefObject<CamDrag>;
  /** live camera cue — read flight state so the jump button can re-label to
   *  CLIMB and reveal a LAND button while the jetpack is lit */
  cue?: React.RefObject<CamCue>;
  bottomInset?: number;
  /** keep the top-left HUD (world picker) tappable */
  hudLeftInset?: number;
}) {
  const R = 56; // stick radius in px
  const joyId = useRef<number | null>(null);
  const joyOrigin = useRef<{ x: number; y: number } | null>(null);
  const [base, setBase] = useState<{ x: number; y: number } | null>(null);
  const [knob, setKnob] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [sprint, setSprint] = useState(false);
  // mirror the jetpack's live flight flag into render state (only when it flips)
  const [flying, setFlying] = useState(false);
  const look = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchPrev = useRef(0);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const f = !!cue?.current?.flying;
      setFlying((prev) => (prev === f ? prev : f));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cue]);

  // fully release input when controls get disabled (overlay / match)
  useEffect(() => {
    if (active) return;
    joyId.current = null;
    joyOrigin.current = null;
    setBase(null);
    setKnob({ x: 0, y: 0 });
    setSprint(false);
    if (move.current) { move.current.x = 0; move.current.y = 0; }
    if (btn.current) { btn.current.sprint = false; btn.current.jumpHeld = false; }
    look.current.clear();
    pinchPrev.current = 0;
  }, [active, move, btn]);

  if (!active) return null;

  const joyDown = (e: ReactPointerEvent) => {
    if (joyId.current !== null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    joyId.current = e.pointerId;
    joyOrigin.current = { x: e.clientX, y: e.clientY };
    setBase({ x: e.clientX, y: e.clientY });
    setKnob({ x: 0, y: 0 });
  };
  const joyMove = (e: ReactPointerEvent) => {
    if (joyId.current !== e.pointerId || !joyOrigin.current) return;
    let dx = e.clientX - joyOrigin.current.x;
    let dy = e.clientY - joyOrigin.current.y;
    const d = Math.hypot(dx, dy);
    if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
    setKnob({ x: dx, y: dy });
    if (move.current) { move.current.x = dx / R; move.current.y = -dy / R; }
  };
  const joyEnd = (e: ReactPointerEvent) => {
    if (joyId.current !== e.pointerId) return;
    joyId.current = null;
    joyOrigin.current = null;
    setBase(null);
    setKnob({ x: 0, y: 0 });
    if (move.current) { move.current.x = 0; move.current.y = 0; }
  };

  const lookDown = (e: ReactPointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    look.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (look.current.size === 2) {
      const [a, b] = [...look.current.values()];
      pinchPrev.current = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };
  const lookMove = (e: ReactPointerEvent) => {
    const prev = look.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    if (look.current.size >= 2) {
      look.current.set(e.pointerId, cur);
      const [a, b] = [...look.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchPrev.current && cam.current) cam.current.pinch += d - pinchPrev.current;
      pinchPrev.current = d;
    } else {
      if (cam.current) { cam.current.dx += cur.x - prev.x; cam.current.dy += cur.y - prev.y; }
      look.current.set(e.pointerId, cur);
    }
  };
  const lookEnd = (e: ReactPointerEvent) => {
    look.current.delete(e.pointerId);
    if (look.current.size < 2) pinchPrev.current = 0;
  };

  const tapJump = (e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    if (btn.current) { btn.current.jump++; btn.current.jumpHeld = true; }
  };
  const releaseJump = (e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (btn.current) btn.current.jumpHeld = false;
  };
  const startSprint = (e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setSprint(true);
    if (btn.current) btn.current.sprint = true;
  };
  const stopSprint = (e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSprint(false);
    if (btn.current) btn.current.sprint = false;
  };
  // LAND — touch equivalent of the X key: drop out of jetpack flight
  const tapLand = (e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (btn.current) btn.current.land++;
  };

  const joyBottom = Math.max(100, bottomInset);
  const lookBottom = bottomInset;
  const jumpBottom = 34 + bottomInset;

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 30, pointerEvents: "none", touchAction: "none", userSelect: "none", WebkitUserSelect: "none" }}>
      <div
        onPointerDown={joyDown}
        onPointerMove={joyMove}
        onPointerUp={joyEnd}
        onPointerCancel={joyEnd}
        style={{ position: "absolute", left: 0, top: hudLeftInset, bottom: joyBottom, width: "50%", pointerEvents: "auto", touchAction: "none" }}
      />
      <div
        onPointerDown={lookDown}
        onPointerMove={lookMove}
        onPointerUp={lookEnd}
        onPointerCancel={lookEnd}
        style={{ position: "absolute", right: 0, top: 0, bottom: lookBottom, width: "50%", pointerEvents: "auto", touchAction: "none" }}
      />

      {base && (
        <div style={{ position: "fixed", left: base.x, top: base.y, width: 0, height: 0, pointerEvents: "none" }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: R * 2, height: R * 2, borderRadius: "50%", border: "2px solid rgba(255,255,255,.22)", background: "rgba(10,8,20,.28)", backdropFilter: "blur(2px)", transform: "translate(-50%,-50%)" }} />
          <div style={{ position: "absolute", left: 0, top: 0, width: 50, height: 50, borderRadius: "50%", background: "rgba(57,224,255,.55)", boxShadow: "0 0 18px rgba(57,224,255,.6)", border: "2px solid rgba(255,255,255,.5)", transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }} />
        </div>
      )}

      <div style={{ position: "absolute", right: 22, bottom: jumpBottom, display: "flex", flexDirection: "column", gap: 12, alignItems: "center", pointerEvents: "none" }}>
        <div style={touchCapStack}>
          <button onPointerDown={startSprint} onPointerUp={stopSprint} onPointerCancel={stopSprint} onPointerLeave={stopSprint} aria-label="Sprint" style={{ ...touchBtnStyle(58), pointerEvents: "auto", background: sprint ? "rgba(240,169,58,.85)" : "rgba(20,18,31,.55)", borderColor: sprint ? "#f0a93a" : "rgba(255,255,255,.28)", color: sprint ? "#0a0810" : "#f2eefb" }}>
            <Zap size={22} strokeWidth={2.2} fill={sprint ? "#0a0810" : "none"} />
          </button>
          <span style={touchCapLabel}>SPRINT</span>
        </div>
        <div style={{ display: "flex", flexDirection: "row", gap: 12, alignItems: "flex-end" }}>
          {flying && (
            <div style={touchCapStack}>
              <button onPointerDown={tapLand} aria-label="Land" style={{ ...touchBtnStyle(58), pointerEvents: "auto", background: "rgba(20,18,31,.55)", borderColor: "rgba(255,170,120,.7)", color: "#ffc7a8" }}>
                <ChevronsDown size={24} strokeWidth={2.2} />
              </button>
              <span style={touchCapLabel}>LAND</span>
            </div>
          )}
          <div style={touchCapStack}>
            <button onPointerDown={tapJump} onPointerUp={releaseJump} onPointerCancel={releaseJump} onPointerLeave={releaseJump} aria-label={flying ? "Climb" : "Jump"} style={{ ...touchBtnStyle(78), pointerEvents: "auto", background: "rgba(57,224,255,.16)", borderColor: "rgba(57,224,255,.7)", color: "#aeefff" }}>
              <ChevronsUp size={30} strokeWidth={2.2} />
            </button>
            <span style={touchCapLabel}>{flying ? "CLIMB" : "JUMP · 2× = FLY"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
