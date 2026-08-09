"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { useGLTF, Environment, Lightformer, Html, PerformanceMonitor, AdaptiveDpr } from "@react-three/drei";
import { Physics, RigidBody, CapsuleCollider, CuboidCollider, type RapierRigidBody } from "@react-three/rapier";
import { Suspense, memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { ChevronsUp, ChevronsDown, Zap, Swords, Moon, Ban, type LucideIcon } from "lucide-react";
import * as THREE from "three";
import type { AgentStatus, Champion, CreatureType, TowerAgent } from "@/lib/types";
import { blank, skillLevel, TYPE_COLOR } from "@/lib/evolve/progression";
import { trainerLevel } from "@/lib/evolve/trainer";
import { readerPalette, GOLD } from "@/lib/render/palette";
import { flightAttitudePlanar } from "@/lib/render/animations";
import { ASCENT_GLIDE, ascentSessionMods } from "@/lib/ascent-rules";
import { ReaderBackSigil, ReaderRankEmblem } from "./reader-regalia";
import { ChampionMesh, buildCharacter, applyBoneMorph, WORLD_AGENT_SCALE, READER_SCALE } from "./champion-mesh";
import { pickAmbientCast } from "./ambient-cast";
import { FlyingFollower } from "./flying-cast";
import { COMPANION_FOLLOW, companionDockSlot } from "./companion-follow";
import { Jetpack } from "./jetpack";
import { Terrain, terrainHeight, shapeOf, spawnKnollFor, riftDir, hasRift, PLAZA_R, type TerrainShape, type SpawnKnoll } from "./terrain";
import {
  NatureScatter,
  NatureLandmarks,
  NatureSpawnPath,
  NatureRift,
  NaturePeaks,
  NaturePockets,
  NatureIslandDressing,
  NatureGround,
} from "./nature";
import { PlazaSurround, PitArena, PlatformsArena } from "./structures";
import { daylightBiome, type BiomeConfig } from "./biomes";
import { ConcordScene, concordClanSpots, type ConcordVenueId } from "./concord";
import { type GalleryFocus } from "./gallery";
import { Amphitheatre, AmphitheatreColliders, DAILY_HERALD_POS, AMPHI_SPAWN, AMPHI_SPAWN_HEADING } from "./amphitheatre";
import { MATCH_SPREAD } from "./match-stage";
import { RegionDistrict } from "./districts";
import { type WorldGoal, type GoalKind } from "./goals";
import { FORCES, FORCE_MOTTO } from "@/lib/lore/canon";
import { worldById, type GateDef } from "./worlds";
import { natureGroundPalette } from "@/lib/render/nature-kit";
import { bandAgents, roamerSpot, dayKey, type DiscoveryNode, type NodeKind } from "./landmarks";
import {
  towerLayout,
  assignMidPerch,
  pickSummitAgent,
  findTowerPad,
  clampToTowerPad,
  towerPadSurface,
  type TowerNode,
} from "./tower-layout";
import { RenderBoundary, WEBGL_POWER } from "./render-guard";
import { jetFallSfx, jumpBeep, setJet, stopJet, smokePoofSfx, stumbleSfx } from "@/lib/sfx";
import { getPad } from "@/lib/gamepad";
import { useSettings } from "@/store/settings";
import { useTheme } from "@/lib/theme";
import { useGraphicsTier } from "@/lib/graphics-tier";
import { CircuitScene } from "./circuit-scene";
import { CircuitGhostLeave } from "./circuit-ghost";
import { AscentSigil } from "./climb/ascent-sigil";
import { usePrefersReducedMotion } from "@/components/arena/juice";
import { ClimbDressing, ClimbDriftMotes, climbMoteScale } from "./climb/climb-dressing";
import { ClimbGhostRacer, GHOST_CAPSULE_FOOT } from "./climb/ghost-racer";
import { DESKTOP_GAP_SCALE, DESKTOP_VERT_SCALE } from "./climb/desktop-adapter";
import { sectorFlightBand } from "./climb/flight-cruise";
import { railAtZ } from "./climb/flight-rail";
import { FlightWindStreaks } from "./climb/wind-streaks";
import { HazardField } from "./climb/hazard-field";
import { hazardHits, type Hazard } from "./climb/hazards";
import { crownCacheHits, type CrownCache } from "./climb/crown-cache";
import { CrownCacheField } from "./climb/crown-cache-field";
import { liveGateCheckpoint, sectorModifier } from "./climb/modifiers";
import { circuitSector } from "./circuit-tracks";
import type { CircuitPhase, CircuitFailReason } from "./circuit-hud";
import {
  atCircuitFinishEarly,
  circuitGatePlaneCross,
  circuitGateResolveAtOrPast,
  CIRCUIT_SECTOR_INTRO,
} from "./circuit";
import type { CircuitTrackDef } from "./circuit";
import type { ClimbGhostSample } from "@/lib/climb-ghost";
import {
  REGION_RETURN_BEHIND,
  VENUE_EXIT,
  VENUES,
  circuitSpotFor,
  type VenueId,
} from "./venues";
import { VenueExitPortal, AscentPortal, AscentReturnPortal, PORTAL_OPEN_Y, type PortalTheme } from "./venue-portals";
import { reachThemeByIndex } from "./climb/reaches";
import { preloadNatureBiome } from "@/lib/render/preload-grounds";

// Warm the Trainer rig before Physics mounts so Handler's useGLTF doesn't suspend
// the outer Suspense and tear down ArrivalDeck / SafetyFloor mid-load.
useGLTF.preload("/models/RobotExpressive.glb");

export interface WorldLife {
  /** what your champion is saying in-world */
  companionLine: string | null;
  /** wordless reaction glyph your champion shows ("HEY!"/impressions) */
  companionEmote: string | null;
  /** bump to retrigger a wave when a new line lands */
  companionAct: number;
  /** owned champion drills at the train pad */
  training: boolean;
  /** pulse the train pad beacon (first-spawn coach) */
  padBeacon?: boolean;
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

// The Reader spawns on the crest of the per-world spawn knoll (see spawnKnollFor).

const keys: Record<string, boolean> = {};

// Themed central clearing — an organic, matte ground surface (sand / ash / moss /
// packed earth, per biome) that floors the plaza so the centre matches the
// natural wilds instead of reading as a sci-fi grid pad. The whole canvas maps
// ONCE across the disc (no tiling → no repeating rectangles), and its rim fades
// out so the clearing melts into the surrounding turf rather than reading as a
// hard-edged pad.
const GROUND_FLOOR_CACHE = new Map<string, THREE.CanvasTexture>();
function makeGroundFloorTexture(pal: { base: string; grain: string; patch: string; pebble: string }) {
  // cached per palette — venue enter/exit remounts PlazaFloor, and repainting a
  // 1024² canvas (90k speckles) each time is a visible hitch
  const cacheKey = `${pal.base}|${pal.grain}|${pal.patch}|${pal.pebble}`;
  const hit = GROUND_FLOOR_CACHE.get(cacheKey);
  if (hit) return hit;
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
  GROUND_FLOOR_CACHE.set(cacheKey, map);
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
  /** Season Peak already claimed — summit champion stands ready (no appear cinematic). */
  peakCleared = false,
  /** Bumped when Peak is claimed this session — plays the smoke-in reveal once. */
  summitRevealNonce = 0,
  gates = [],
  pledged = null,
  choosingClan = false,
  clanPreview = null,
  clanCeremony = false,
  clanShot = null,
  tier = 0,
  featuredWorld = null,
  guideWorld = null,
  guideUrgent = false,
  muteClanInvite = false,
  onAltitude,
  onPose,
  travelRef,
  touchBottomInset = 0,
  showcase = false,
  regionWorldId = "grounds",
  activeVenue = null,
  venueHostWorldId = "grounds",
  circuitTrack = circuitSector(0, "void"),
  circuitSectorIdx = 0,
  circuitPhase = null,
  onCircuitPass,
  onCircuitFail,
  circuitCpNextRef,
  circuitHazards = [],
  onCircuitStumble,
  onCircuitStart,
  onCircuitSample,
  circuitGhost = null,
  onCircuitGhostDone,
  circuitArriveNonce = 0,
  circuitGhostForce = null,
  circuitGhostMind = null,
  circuitGhostChampion = null,
  circuitGhostPath = null,
  circuitGhostRunStartMs = 0,
  circuitGhostSectorKey = 0,
  circuitCrownCache = null,
  onCircuitCrownCollect,
  circuitFogNearMult = 1,
  circuitMoteColor = null,
  circuitWarm = false,
  ascentReaches = 0,
  ascentSigilAccent,
  worldLife,
  trainerXp = 0,
  gpuLite = false,
  resumeSpawn = null,
  onGlReady,
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
  peakCleared?: boolean;
  summitRevealNonce?: number;
  gates?: GateDef[];
  pledged?: CreatureType | null;
  /** True while the Clan sheet is open — lowers every flag except the preview. */
  choosingClan?: boolean;
  /** Clan highlighted in the open picker — its flag stays raised. */
  clanPreview?: CreatureType | null;
  /** Pledge ceremony — masts diverge (chosen up, others down). */
  clanCeremony?: boolean;
  /** World-camera target for the clan swear shot (flag x/z). */
  clanShot?: { x: number; z: number } | null;
  tier?: number;
  featuredWorld?: string | null;
  /** First-run guide: the gate to spotlight as "START HERE" (dims all others). */
  guideWorld?: string | null;
  /** Escalate the focus gate once the player has idled near spawn. */
  guideUrgent?: boolean;
  /** Quiet first Hub land — hide clan-join Html until they walk to a flag. */
  muteClanInvite?: boolean;
  onAltitude?: (y: number) => void;
  onPose?: (x: number, z: number, heading: number) => void;
  travelRef?: React.MutableRefObject<((x: number, z: number, faceHeading?: number, y?: number) => void) | null>;
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
  /** 0..99 sector index — drives ClimbDressing role beats + Reach seed. */
  circuitSectorIdx?: number;
  circuitPhase?: CircuitPhase | null;
  onCircuitPass?: (index: number) => void;
  onCircuitFail?: (reason?: CircuitFailReason, pose?: { x: number; y: number; z: number; heading: number }) => void;
  /** Jump / first thrust while ready — starts the Ascent sector (wind, timers). */
  onCircuitStart?: () => void;
  /** Sparse Y/Z samples while running (desktop world units; caller canonicalizes). */
  onCircuitSample?: (y: number, z: number) => void;
  circuitCpNextRef?: React.MutableRefObject<number>;
  circuitHazards?: Hazard[];
  onCircuitStumble?: () => void;
  /** Mid-gap Crown cache pickup (optional) — shared with Climb. */
  circuitCrownCache?: CrownCache | null;
  onCircuitCrownCollect?: () => void;
  /** Flight sigil glyph count from campsLit (0..10). */
  ascentReaches?: number;
  /** Accent for the sigil halo (Reach theme of deepest lit camp). */
  ascentSigilAccent?: string;
  /** Life-leave ghost pose (presentation); cleared via onCircuitGhostDone. */
  circuitGhost?: ({ x: number; y: number; z: number; heading: number; id: number }) | null;
  onCircuitGhostDone?: () => void;
  /** Bumped on life-continue to re-arm the front-facing arrive cam. */
  circuitArriveNonce?: number;
  circuitGhostForce?: CreatureType | null;
  /** Challenger roster key (ghost shows this mind). */
  circuitGhostMind?: string | null;
  circuitGhostChampion?: Champion | null;
  /** Challenger ghost path for the live sector (Climb-canonical; scaled for desktop rings). */
  circuitGhostPath?: ClimbGhostSample[] | null;
  /** performance.now() when the live sector started — ghost restarts each sector. */
  circuitGhostRunStartMs?: number;
  /** Remount key so the ghost pair resets on sector change. */
  circuitGhostSectorKey?: number;
  /** Sector modifier fog pull (Duskfall) × Conditions — Climb parity. */
  circuitFogNearMult?: number;
  /** Golden Hour / Condition mote tint. */
  circuitMoteColor?: string | null;
  /** Golden Hour warm exposure bump. */
  circuitWarm?: boolean;
  worldLife?: WorldLife;
  trainerXp?: number;
  /** phone / low-power: drop shadows, IBL, bloom — the scene still runs but won't melt the GPU */
  gpuLite?: boolean;
  /** After leaving a venue, mount the Handler at this wilds pose (Ascent portal exit). */
  /** Optional y = capsule centre (Tower summit etc.). Terrain height used when omitted. */
  resumeSpawn?: { x: number; z: number; y?: number; heading?: number } | null;
  /** Fired once the WebGL renderer exists (parent can clear failure UI). */
  onGlReady?: () => void;
}) {
  const inVenue = !!activeVenue;
  const inCircuit = activeVenue === "circuit";
  const inAmphitheatre = activeVenue === "amphitheatre";
  const theme = useTheme();
  const gfxTier = useGraphicsTier();
  const prefersReduced = usePrefersReducedMotion();
  const settingsReduce = useSettings((s) => s.reduceMotion);
  const reduceMotionPref = prefersReduced || settingsReduce;
  // Desktop Circuit land = the HOST world you portal'd from (Ember chute → ember
  // hills; Void sleeve → garden). Reach biome still skins sky/rings via `biome`.
  const circuitGroundBiome = useMemo(() => {
    if (!inCircuit) return biome;
    const skin = worldById(venueHostWorldId).biome;
    return theme === "light" ? daylightBiome(skin) : skin;
  }, [inCircuit, venueHostWorldId, theme, biome]);
  const circuitDressTier = gpuLite ? "low" : gfxTier === "low" ? "mid" : gfxTier;
  const circuitFogNear = Math.max(12, 35 * Math.max(0.35, circuitFogNearMult));
  const circuitExposure = biome.exposure * (circuitWarm ? 1.08 : 1);
  const circuitMotes = circuitMoteColor || biome.lights.arenaPoint;
  // Circuit must seed heading 0 (+Z / rings). Default π faces the return portal at z=-20.
  const camCue = useRef<CamCue>({
    zoom: 0,
    heading: inCircuit ? 0 : inAmphitheatre ? AMPHI_SPAWN_HEADING : Math.PI,
    speed: 0,
    moving: false,
    reverse: false,
    flying: false,
    climb: 0,
    superrun: false,
    headingSteer: false,
    recenter: false,
    touchActive: false,
    inputLock: false,
    bodyReady: false,
  });
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
  useEffect(() => {
    preloadNatureBiome(biome.id);
  }, [biome.id]);
  useEffect(() => {
    if (!inCircuit) return;
    preloadNatureBiome(circuitGroundBiome.id);
  }, [inCircuit, circuitGroundBiome.id]);
  // Venue / resume spawns must be the RigidBody's INITIAL position — a delayed
  // travelRef teleport leaves the capsule at the host knoll for the first frames.
  const venueSpawn = inCircuit ? circuitTrack.spawn : inAmphitheatre ? AMPHI_SPAWN : null;
  // Rough wilds resume (refined with ascentFoot below once the mountain foot exists).
  const earlyResume = !inVenue && resumeSpawn
    ? ([
        resumeSpawn.x,
        typeof resumeSpawn.y === "number" && Number.isFinite(resumeSpawn.y)
          ? resumeSpawn.y
          : terrainHeight(resumeSpawn.x, resumeSpawn.z, shape, knoll) + 1.2,
        resumeSpawn.z,
      ] as [number, number, number])
    : null;
  const initialSpawn = venueSpawn ?? earlyResume;
  const spawnCam = useMemo(() => {
    if (inCircuit && venueSpawn) {
      // Behind the pad looking down-track (+Z) at the rings — not the return portal.
      return [venueSpawn[0], venueSpawn[1] + 2.8, venueSpawn[2] - 9.2] as [number, number, number];
    }
    if (inAmphitheatre && venueSpawn) {
      // behind the player looking toward the throne (−z): player at z=12 facing π
      return [venueSpawn[0], venueSpawn[1] + 3.2, venueSpawn[2] + 8.4] as [number, number, number];
    }
    if (earlyResume && resumeSpawn) {
      const h = resumeSpawn.heading ?? Math.atan2(-knoll.x, -knoll.z);
      return [
        earlyResume[0] - Math.sin(h) * 12,
        earlyResume[1] + 5,
        earlyResume[2] - Math.cos(h) * 12,
      ] as [number, number, number];
    }
    if (hasRift(shape)) {
      const { dirx, dirz } = riftDir(shape);
      // sit further out behind spawn, looking inward toward the plaza
      return [knoll.x + dirx * 14, knoll.peak + 7, knoll.z + dirz * 14] as [number, number, number];
    }
    return [knoll.x, knoll.peak + 7, knoll.z + 14] as [number, number, number];
  }, [venueSpawn, earlyResume, resumeSpawn, inCircuit, inAmphitheatre, shape, knoll]);
  const handlerPos = useRef(
    new THREE.Vector3(initialSpawn ? initialSpawn[0] : knoll.x, initialSpawn ? initialSpawn[1] : 0, initialSpawn ? initialSpawn[2] : knoll.z),
  );
  /** Live Ascent champion world pose — challenge ghost snaps onto this. */
  const circuitChampPos = useRef(
    new THREE.Vector3(
      (circuitTrack?.spawn?.[0] ?? 0) - 2.6,
      (circuitTrack?.spawn?.[1] ?? 0) - 1.35 + 1.05,
      (circuitTrack?.spawn?.[2] ?? 0) + 0.45,
    ),
  );
  // Face the ring in the Amphitheatre, down-track in the Circuit, else resume / plaza-inward.
  const handlerHeading = useRef(
    inAmphitheatre
      ? AMPHI_SPAWN_HEADING
      : inCircuit
        ? 0
        : resumeSpawn?.heading ?? Math.atan2(-knoll.x, -knoll.z),
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
        // the venue floor is flat at y≈0, NOT the host world's terrain — the herald
        // stands on the sand, so its walk-up target sits at floor level, not on the
        // (decoupled) concord/region heightfield beneath the scene.
        const [hx, , hz] = DAILY_HERALD_POS;
        return [{ venue: "daily", name: "Today's Marquee", pos: new THREE.Vector3(hx, 1, hz) }];
      }
      return [];
    },
    [inAmphitheatre, shape],
  );
  // Concord no longer exposes Amphitheatre / Circuit (Ascent) doors — those
  // access elements were removed from the hub. Region Circuit tunnels remain.
  const concordVenueTargets = useMemo(
    () => [] as { venue: VenueId; label: string; pos: THREE.Vector3 }[],
    [],
  );
  const returnTarget = useMemo(() => {
    if (!inRegion) return null;
    // Behind the spawn knoll, past the chase cam, facing the plaza — emerge from
    // it on arrival without the arch sitting between lens and Trainer.
    const r = Math.hypot(knoll.x, knoll.z) || 1;
    const x = knoll.x + (knoll.x / r) * REGION_RETURN_BEHIND;
    const z = knoll.z + (knoll.z / r) * REGION_RETURN_BEHIND;
    return new THREE.Vector3(x, terrainHeight(x, z, shape, knoll) + 1, z);
  }, [inRegion, shape, knoll]);
  const circuitTunnelTarget = useMemo(() => {
    if (!inRegion) return null;
    const spot = circuitSpotFor(regionWorldId);
    const x = Math.cos(spot.angle) * spot.dist;
    const z = Math.sin(spot.angle) * spot.dist;
    return { label: spot.label, pos: new THREE.Vector3(x, terrainHeight(x, z, shape, knoll) + 1, z) };
  }, [inRegion, regionWorldId, shape, knoll]);
  // mountain foot for walk-height / companion floor (portal pos.y is crest+1)
  const ascentFoot = useMemo<AscentFoot | null>(() => {
    if (!circuitTunnelTarget) return null;
    const x = circuitTunnelTarget.pos.x;
    const z = circuitTunnelTarget.pos.z;
    return { x, z, baseY: terrainHeight(x, z, shape, knoll) };
  }, [circuitTunnelTarget, shape, knoll]);
  // Exact wilds resume on the Ascent mountain surface (portal exit), not the knoll.
  const bodySpawn = useMemo(() => {
    if (venueSpawn) return venueSpawn;
    if (!resumeSpawn || inVenue) return null;
    const y =
      typeof resumeSpawn.y === "number" && Number.isFinite(resumeSpawn.y)
        ? resumeSpawn.y
        : worldWalkHeight(resumeSpawn.x, resumeSpawn.z, shape, knoll, ascentFoot) + 0.75;
    return [resumeSpawn.x, y, resumeSpawn.z] as [number, number, number];
  }, [venueSpawn, resumeSpawn, inVenue, shape, knoll, ascentFoot]);
  const venueExitTarget = useMemo(() => {
    if (!inVenue || !activeVenue) return null;
    const ex = VENUE_EXIT[activeVenue];
    return { label: `Exit · back to ${venueHostWorldId === "concord" ? "the Hub" : "the wilds"}`, pos: new THREE.Vector3(ex.pos[0], ex.pos[1], ex.pos[2]), radius: ex.radius };
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
  // challenges); the rest hold the Tower. Strongest waits at the Peak summit
  // until the Peak goal is claimed (smoke-in reveal), then becomes challengeable.
  const bands = useMemo(() => bandAgents(towerAgents), [towerAgents]);
  const summitAgent = useMemo(() => pickSummitAgent(bands.tower), [bands.tower]);
  const midTowerAgents = useMemo(() => {
    if (!summitAgent) return bands.tower;
    return bands.tower.filter((a) => a.id !== summitAgent.id);
  }, [bands.tower, summitAgent]);
  // shared, deterministic tower layout — colliders, perched agents and the
  // challenge proximity check all read from this same list.
  const towerNodes = useMemo(
    () => towerLayout(shape, sc.towerAngle, sc.towerSteps, knoll),
    [shape, sc.towerAngle, sc.towerSteps, knoll],
  );
  const perched = useMemo(() => assignMidPerch(towerNodes, midTowerAgents), [towerNodes, midTowerAgents]);
  const summitPos = useMemo<[number, number, number] | null>(() => {
    if (!towerNodes.length) return null;
    const top = towerNodes[towerNodes.length - 1];
    return [top.pos[0], top.pos[1] + top.size[1] / 2, top.pos[2]];
  }, [towerNodes]);
  // ground roamers stand at deterministic mid-field spots that rotate by day
  const roamers = useMemo(
    () => bands.roamers.map((a) => ({ agent: a, pos: roamerSpot(a.id, day, shape) as [number, number, number] })),
    [bands.roamers, day, shape],
  );
  const [summitChallengeReady, setSummitChallengeReady] = useState(peakCleared);
  const [summitCam, setSummitCam] = useState<{ x: number; y: number; z: number } | null>(null);
  useEffect(() => {
    if (peakCleared && summitRevealNonce === 0) setSummitChallengeReady(true);
  }, [peakCleared, summitRevealNonce]);
  useEffect(() => {
    if (summitRevealNonce <= 0 || !summitPos) return;
    setSummitChallengeReady(false);
    setSummitCam({ x: summitPos[0], y: summitPos[1] + 1.1, z: summitPos[2] });
    const t = window.setTimeout(() => setSummitCam(null), 2200);
    return () => window.clearTimeout(t);
  }, [summitRevealNonce, summitPos]);
  const challengeTargets = useMemo(() => {
    const mid = perched
      .filter((p) => p.agent.status === "awaiting" && p.agent.key !== ownedKey)
      .map((p) => ({
        key: p.agent.key,
        name: p.agent.name,
        handle: p.agent.handle,
        id: p.agent.id,
        pos: new THREE.Vector3(p.pos[0], p.pos[1] + 1.2, p.pos[2]),
      }));
    if (
      summitChallengeReady &&
      summitAgent &&
      summitPos &&
      summitAgent.status === "awaiting" &&
      summitAgent.key !== ownedKey
    ) {
      mid.push({
        key: summitAgent.key,
        name: summitAgent.name,
        handle: summitAgent.handle,
        id: summitAgent.id,
        pos: new THREE.Vector3(summitPos[0], summitPos[1] + 1.2, summitPos[2]),
      });
    }
    return mid;
  }, [perched, ownedKey, summitChallengeReady, summitAgent, summitPos]);
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
  const circuitGateDrift = useMemo(() => {
    if (!inCircuit) return null;
    const mod = sectorModifier(circuitSectorIdx);
    if (mod?.kind !== "driftingGates" || mod.driftAmp <= 0) return null;
    return { amp: mod.driftAmp, cycle: mod.driftCycle };
  }, [inCircuit, circuitSectorIdx]);
  return (
    <>
    <Canvas
      shadows={gpuLite ? false : { type: THREE.PCFSoftShadowMap }}
      camera={{ position: spawnCam, fov: 52, near: 0.1, far: gpuLite ? 320 : 600 }}
      dpr={gpuLite ? [0.75, 1] : [1, 1.5]}
      gl={{ antialias: !gpuLite, powerPreference: WEBGL_POWER, failIfMajorPerformanceCaveat: false }}
      onCreated={({ gl, camera }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = biome.exposure;
        // R3F default look is −Z. Circuit spawnCam sits behind the pad on −Z, so
        // frame 0 would stare at the return portal until CameraController runs.
        if (inCircuit && venueSpawn) {
          camera.lookAt(venueSpawn[0], venueSpawn[1] + 1.4, venueSpawn[2] + 6);
        } else if (inAmphitheatre && venueSpawn) {
          camera.lookAt(venueSpawn[0], venueSpawn[1] + 1.2, venueSpawn[2] - 4);
        }
        onGlReady?.();
        const canvas = gl.domElement;
        // calling preventDefault() is what tells the browser we want the context
        // back — without it the loss is permanent and the canvas stays blank.
        canvas.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          setGlLost(true);
        });
        canvas.addEventListener("webglcontextrestored", () => {
          setGlLost(false);
          onGlReady?.();
        });
      }}
    >
      <ExposureSync exposure={inCircuit ? circuitExposure : biome.exposure} />
      {/* auto-scale render resolution when the GPU can't keep up, so frame drops
          (which read as movement stutter) self-correct instead of compounding */}
      <PerformanceMonitor />
      <AdaptiveDpr pixelated={false} />
      <color attach="background" args={[biome.bg]} />
      <fog attach="fog" args={[biome.fog.color, inCircuit ? circuitFogNear : biome.fog.near, inCircuit ? 200 : biome.fog.far]} />
      <AltitudeAdaptive baseFogFar={inCircuit ? 200 : biome.fog.far} />

      <SkyDome biome={biome} />
      {!gpuLite && <Nebula biome={biome} />}
      {!gpuLite && <Starfield />}

      {!gpuLite && (
        <Environment resolution={256} frames={1} key={`${biome.id}:${biome.bg}`}>
          <Lightformer intensity={1.4} color={biome.ibl.key} position={[0, 8, 0]} scale={[20, 20, 1]} target={[0, 0, 0]} />
          <Lightformer intensity={1.0} color={biome.ibl.warm} position={[14, 4, 0]} scale={[10, 10, 1]} target={[0, 0, 0]} />
          <Lightformer intensity={0.8} color={biome.ibl.cool} position={[-14, 4, 6]} scale={[10, 10, 1]} target={[0, 0, 0]} />
          <Lightformer intensity={0.6} color={biome.ibl.fill} position={[0, 2, -16]} scale={[24, 8, 1]} target={[0, 0, 0]} />
        </Environment>
      )}

      <hemisphereLight args={[biome.lights.hemiSky, biome.lights.hemiGround, biome.lights.hemiInt]} />
      <ambientLight color={biome.lights.ambient} intensity={biome.lights.ambientInt} />
      <directionalLight
        position={[34, 44, 22]}
        intensity={biome.lights.sunInt}
        color={biome.lights.sun}
        castShadow={!gpuLite}
        shadow-mapSize={gpuLite ? undefined : [512, 512]}
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

      <Suspense fallback={null}>
        {/* Circuit dressing is visual-only — outside Physics, own Suspense so a
            nature-kit suspend can never tear down the Handler / Rapier world. */}
        {inCircuit && !showcase && (
          <Suspense fallback={null}>
            <ClimbDressing
              key={`dress-${circuitSectorIdx}-${circuitGroundBiome.id}-${biome.id}`}
              biome={biome}
              groundBiome={circuitGroundBiome}
              track={circuitTrack}
              sector={circuitSectorIdx}
              tier={circuitDressTier}
              showSky={false}
              densityScale={1.4}
            />
            <ClimbDriftMotes
              track={circuitTrack}
              accent={circuitMotes}
              countScale={climbMoteScale(circuitSectorIdx)}
            />
          </Suspense>
        )}

        <Physics gravity={[0, -22, 0]}>
          {!inVenue && <Terrain biome={biome} nature />}
          {!inVenue && <PlazaFloor biome={biome} />}
          {!inVenue && <NatureGround biome={biome} shape={shape} />}
          {!inVenue && <NatureLandmarks biome={biome} shape={shape} count={sc.obeliskCount} pillar={sc.pillar} colliders />}
          {!inVenue && <NatureScatter biome={biome} shape={shape} colliders />}
          {!inVenue && <Crystals biome={biome} shape={shape} count={sc.crystalCount} />}

          {isHub && !inVenue && !match && (
            <ConcordScene
              gates={hubGates}
              pledged={pledged}
              featuredWorld={featuredWorld}
              guideWorld={guideWorld}
              guideUrgent={guideUrgent}
              muteClanInvite={muteClanInvite}
              daylight={!!biome.daylight}
              choosing={choosingClan}
              clanPreview={clanPreview}
              clanCeremony={clanCeremony}
            />
          )}

          {isHub && !inVenue && match && (
            <>
              <ArenaPlatform />
              <Beacon pos={ARENA} color={biome.lights.arenaPoint} />
            </>
          )}

          {inAmphitheatre && !showcase && (
            <>
              <AmphitheatreColliders />
              <Amphitheatre champions={champions} focus={galleryFocus} hideFighters={!!match} />
              <VenueExitPortal pos={VENUE_EXIT.amphitheatre.pos} label="Exit to the wilds" accent={VENUES.amphitheatre.color} />
            </>
          )}

          {inCircuit && !showcase && (
            <>
              <CircuitScene
                track={circuitTrack}
                biome={biome}
                cpNextRef={circuitCpNextRef}
                showFloor={false}
                gateDrift={circuitGateDrift}
              />
              <FlightWindStreaks
                originRef={handlerPos}
                active={circuitPhase === "running"}
                accent={biome.lights.arenaPoint}
                density={gpuLite ? "lite" : "full"}
                reduceMotion={reduceMotionPref}
              />
              {(circuitPhase === "ready" || circuitPhase === "running" || circuitPhase === "continue") && (
                <CrownCacheField cache={circuitCrownCache ?? null} />
              )}
              {circuitPhase === "running" && circuitHazards.length > 0 && <HazardField hazards={circuitHazards} />}
              {ownedKey &&
                circuitPhase !== "sector" &&
                circuitPhase !== "done" &&
                circuitPhase !== "failed" &&
                circuitPhase !== "ceiling" &&
                circuitPhase !== "ranklock" &&
                circuitPhase !== "prove" && (
                // Own Suspense: champion GLTF must not tear down ArrivalDeck / Handler.
                <Suspense fallback={null}>
                  <CircuitSpectator
                    champions={champions}
                    ownedKey={ownedKey}
                    pledged={pledged}
                    accent={biome.lights.arenaPoint}
                    phase={circuitPhase}
                    padPos={[circuitTrack.spawn[0] - 2.6, circuitTrack.spawn[1] - 1.35, circuitTrack.spawn[2] + 0.45]}
                    followPos={handlerPos}
                    poseOut={circuitChampPos}
                    ascentReaches={ascentReaches}
                    sigilAccent={ascentSigilAccent ?? biome.lights.arenaPoint}
                  />
                </Suspense>
              )}
              <AscentReturnPortal
                pos={VENUE_EXIT.circuit.pos}
                label={venueHostWorldId === "concord" ? "The Hub" : "The Wilds"}
                accent={venueHostWorldId === "concord" ? "#f5d020" : biome.lights.arenaPoint}
                theme={regionWorldId === "gauntlet" ? "gauntlet" : regionWorldId === "void" ? "void" : venueHostWorldId === "concord" ? "concord" : "grounds"}
              />
              {circuitGhost && (
                <CircuitLifeGhost
                  key={circuitGhost.id}
                  pose={circuitGhost}
                  force={circuitGhostForce}
                  onDone={onCircuitGhostDone}
                />
              )}
              {circuitGhostPath && circuitGhostPath.length >= 2 && (
                <ClimbGhostRacer
                  key={`ascent-ghost-${circuitGhostMind || circuitGhostForce}-${circuitGhostSectorKey}-${circuitGhostRunStartMs}`}
                  path={circuitGhostPath}
                  running={circuitPhase === "running"}
                  runStartMs={circuitGhostRunStartMs}
                  type={circuitGhostForce || pledged || "LOGIC"}
                  mindKey={circuitGhostMind || undefined}
                  champion={circuitGhostChampion || undefined}
                  accent={biome.lights.arenaPoint || "#8aa0ff"}
                  scaleY={DESKTOP_VERT_SCALE}
                  scaleZ={DESKTOP_GAP_SCALE}
                  spawn={circuitTrack?.spawn ?? [0, 1.1, -2.5]}
                  followPos={handlerPos}
                  champFollowPos={circuitChampPos}
                  feetBelow={GHOST_CAPSULE_FOOT}
                />
              )}
            </>
          )}

          {inRegion && (
            <>
              <PlazaSurround biome={biome} />
              <NatureSpawnPath biome={biome} shape={shape} knoll={knoll} />
              <RegionDistrict biome={biome} tier={tier} shape={shape} />
              <NatureRift biome={biome} shape={shape} colliders />
              <NaturePeaks biome={biome} shape={shape} colliders />
              {/* Scenic pockets (grove / ash thicket) — dressing only; keep-outs for
                  spawn, rift, Ascent, landmarks. Own seed → existing scatter unchanged. */}
              <NaturePockets biome={biome} shape={shape} worldId={regionWorldId} colliders />
              {biome.id === "void" && <FloatingIslands biome={biome} shape={shape} />}
              <Platforms biome={biome} shape={shape} count={sc.platformCount} />
              <Tower biome={biome} nodes={towerNodes} />
              {sc.arena === "pit" ? (
                <PitArena biome={biome} />
              ) : sc.arena === "platforms" ? (
                <PlatformsArena biome={biome} />
              ) : (
                <ArenaPlatform />
              )}

              {/* wayfinding beams over the two open-ground districts (the Tower &
                  Spire carry their own bespoke beacons) */}
              <Beacon pos={ARENA} color={biome.lights.arenaPoint} />
              <Beacon pos={trainPad} color={biome.lights.trainPoint} />

              {!match && <DiscoveryNodes nodes={nodes} />}
              {!match && <BrokerPost pos={brokerPad} biome={biome} />}
              {!match && <GoalMarkers goals={goals} />}
              {!match && perched.map((p) => <PerchedAgent key={p.agent.id} agent={p.agent} position={p.pos} />)}
              {!match && summitAgent && summitPos && (peakCleared || summitRevealNonce > 0) && (
                <SummitGuardian
                  key={`summit-${summitAgent.id}-${summitRevealNonce}`}
                  agent={summitAgent}
                  position={summitPos}
                  playReveal={summitRevealNonce > 0}
                  onReady={() => setSummitChallengeReady(true)}
                />
              )}
              {!match && roamers.map((p) => <PerchedAgent key={p.agent.id} agent={p.agent} position={p.pos} ground />)}
              {/* Back to the Concord — the monumental Return Portal standing at
                  the spawn point, facing the plaza (you emerge from it here). */}
              {returnTarget && (
                <AscentReturnPortal
                  pos={[returnTarget.x, terrainHeight(returnTarget.x, returnTarget.z, shape, knoll), returnTarget.z]}
                  label="The Hub"
                  accent="#f5d020"
                  theme={(regionWorldId === "gauntlet" ? "gauntlet" : regionWorldId === "void" ? "void" : "grounds") as PortalTheme}
                  rotationY={Math.atan2(-returnTarget.x, -returnTarget.z)}
                />
              )}
              {/* The Circuit — monumental Ascent Portal on a mountain peak,
                  set out on its own bearing away from the arena (hub has none). */}
              {circuitTunnelTarget && (() => {
                const cr = reachThemeByIndex(0);
                const gx = circuitTunnelTarget.pos.x;
                const gz = circuitTunnelTarget.pos.z;
                const groundY = terrainHeight(gx, gz, shape, knoll);
                return (
                  <>
                    <AscentMountain pos={[gx, groundY, gz]} accent={VENUES.circuit.color} />
                    <AscentPortal
                      pos={[gx, groundY + ASCENT_PEAK_H, gz]}
                      accent={VENUES.circuit.color}
                      theme={(regionWorldId === "gauntlet" ? "gauntlet" : regionWorldId === "void" ? "void" : "grounds") as PortalTheme}
                      reachRoman={cr.roman}
                      reachName={cr.name}
                    />
                  </>
                );
              })()}
            </>
          )}

          {match ? (
            <MatchStage champions={champions} match={match} />
          ) : (
            <>
              {inRegion && (
                <RegionChampions
                  champions={champions}
                  ownedKey={ownedKey}
                  worldId={regionWorldId}
                  roam={sc.roam}
                />
              )}
              {/* your champion follows you everywhere it can — hub AND regions — so
                  the companion is present from the first scene you spawn into */}
              {!inVenue && !inCircuit && !inAmphitheatre && ownedKey && (
                <OwnedCompanion
                  champions={champions}
                  ownedKey={ownedKey}
                  trainPad={trainPad}
                  arena={ARENA}
                  worldLife={worldLife}
                  pledged={pledged}
                  handlerPos={handlerPos}
                  handlerHeading={handlerHeading}
                  camCue={camCue}
                  shape={shape}
                  spawnKnoll={knoll}
                  ascentFoot={ascentFoot}
                  towerPads={towerNodes}
                />
              )}
            </>
          )}

          {!showcase && (
            // Nested Suspense: Handler's RobotExpressive useGLTF must never fall
            // through to the outer boundary and unmount Physics / the Circuit pad
            // (click-during-load used to free-fall the remounted capsule into void).
            <Suspense fallback={null}>
              <Handler
                controlsEnabled={controlsEnabled && !match}
                onNear={onNear}
                ownedKey={ownedKey}
                matchActive={!!match}
                handlerPos={handlerPos}
                handlerHeading={handlerHeading}
                camCue={camCue}
                touchMove={touchMove}
                touchBtn={touchBtn}
                isHub={isHub}
                trainerXp={trainerXp}
                force={pledged}
                inVenue={inVenue}
                inAmphitheatre={inAmphitheatre}
                circuitMode={inCircuit}
                circuitRunning={circuitPhase === "running"}
                circuitPhase={circuitPhase}
                circuitSectorIdx={circuitSectorIdx}
                circuitCheckpoints={circuitCheckpoints}
                circuitCpNextRef={circuitCpNextRef}
                circuitHazards={circuitPhase === "running" ? circuitHazards : []}
                circuitCrownCache={circuitPhase === "running" ? circuitCrownCache : null}
                onCircuitCrownCollect={onCircuitCrownCollect}
                onCircuitPass={onCircuitPass}
                onCircuitFail={onCircuitFail}
                onCircuitStart={onCircuitStart}
                onCircuitSample={onCircuitSample}
                onCircuitStumble={onCircuitStumble}
                concordVenueTargets={concordVenueTargets}
                returnTarget={returnTarget}
                circuitTunnelTarget={circuitTunnelTarget}
                ascentFoot={ascentFoot}
                venueExitTarget={venueExitTarget}
                spawnPos={bodySpawn ?? undefined}
                trainPad={trainPad}
                challengeTargets={challengeTargets}
                groundTargets={groundTargets}
                nodeTargets={nodeTargets}
                goalTargets={goalTargets}
                brokerPad={brokerPad}
                gateTargets={gateTargets}
                forceTargets={forceTargets}
                venueTargets={venueTargets}
                shape={shape}
                spawnKnoll={knoll}
                onAltitude={onAltitude}
                onPose={onPose}
                travelRef={travelRef}
                padBeacon={worldLife?.padBeacon}
              />
            </Suspense>
          )}
        </Physics>

        {!glLost && !gpuLite && (
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
        <CameraController match={match} handlerPos={handlerPos} camCue={camCue} camDrag={camDrag} shape={shape} galleryFocus={galleryFocus} inCircuit={inCircuit} circuitPhase={circuitPhase} matchWide={isTouch} clanShot={clanShot} summitShot={summitCam} circuitArriveNonce={circuitArriveNonce} />
      )}
    </Canvas>
    {isTouch && !showcase && <TouchControls active={controlsEnabled && !match && !clanShot && !summitCam} move={touchMove} btn={touchBtn} cam={camDrag} cue={camCue} bottomInset={touchBottomInset} hudLeftInset={120} />}
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

// Flight-first horizon (Spec 13). As the Reader climbs, ease the fog + camera far
// plane open so altitude REVEALS the world instead of hitting a fog wall / clip
// seam. At ground level (alt≈0) both sit at their baselines, so roaming is visually
// unchanged — only flying up opens the view. Cheap: mutates existing fog/camera.
function AltitudeAdaptive({ baseFogFar }: { baseFogFar: number }) {
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  useFrame((_, dtRaw) => {
    const dt = Math.min(0.05, dtRaw);
    const cam = camera as THREE.PerspectiveCamera;
    const fog = scene.fog as THREE.Fog | null;
    if (!fog || !(fog as THREE.Fog).isFog) return;
    const alt = Math.max(0, camera.position.y);
    const open = Math.min(alt * 4, 1000); // how much the horizon expands with height
    // ease the fog outward (and back) so it breathes rather than snaps —
    // dt-based so the breathing pace matches at 30/60/120fps
    fog.far += (baseFogFar + open - fog.far) * (1 - Math.exp(-2.4 * dt));
    // keep the far clip just beyond the fog so nothing pops in past the haze; anchored
    // at the original 600 baseline so ground rendering is untouched
    const wantCamFar = 600 + open;
    if (Math.abs(cam.far - wantCamFar) > 5) {
      cam.far = wantCamFar;
      cam.updateProjectionMatrix();
    }
  });
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

// Region minds with ambient life — world-flavored First Mind cast (see ambient-cast).
// Owned companion is OwnedCompanion (scene-level), not here.
function RegionChampions({
  champions,
  ownedKey,
  worldId,
  roam,
}: {
  champions: GroundChampion[];
  ownedKey: string | null;
  worldId: string;
  roam: BiomeConfig["scene"]["roam"];
}) {
  const cast = useMemo(
    () => pickAmbientCast(champions, worldId, ownedKey),
    [champions, worldId, ownedKey],
  );
  const [npcActs, setNpcActs] = useState<Record<string, number>>({});
  const [npcGestures, setNpcGestures] = useState<Record<string, "wave" | "punch">>({});

  useEffect(() => {
    const id = setInterval(() => {
      if (!cast.length) return;
      const a = cast[Math.floor(Math.random() * cast.length)]!;
      let b = a;
      if (cast.length > 1) {
        do {
          b = cast[Math.floor(Math.random() * cast.length)]!;
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
  }, [cast]);

  return (
    <>
      {cast.map((c) => {
        const home = roamHome(c.key, cast, roam);
        return (
          <ChampionMesh
            key={c.key}
            type={c.type}
            champion={c.champion}
            identityKey={c.key}
            label={c.name}
            position={[home[0], 0, home[2]]}
            rotation={0}
            selected={false}
            wander
            restPose="idle"
            breatheIntensity={1}
            worldRadius={roam.spread}
            wanderInner={roam.inner}
            wanderSpeed={roam.speed}
            actSignal={npcActs[c.key] ?? 0}
            actName={npcGestures[c.key] ?? "wave"}
            sceneScale={WORLD_AGENT_SCALE}
          />
        );
      })}
    </>
  );
}

// ── OwnedCompanion ───────────────────────────────────────────────────────────
// Your champion, rendered as a persistent companion that follows the Reader in
// EVERY explorable scene (the Concord hub as well as region slabs). Follow logic
// lives on an outer rig group so R3F never fights ref-driven motion inside the mesh.
// Wing slot / leash numbers live in companion-follow.ts (shared with Climb / Circuit).

function companionFeetY(
  x: number,
  z: number,
  shape: TerrainShape,
  knoll: SpawnKnoll,
  ascent: AscentFoot | null = null,
  platforms: TowerNode[] | null = null,
  preferY: number | null = null,
): number {
  // Tower pads are floating RigidBodies — terrain height under them is the floor
  // far below. Prefer the pad the Trainer is standing on (same platform beside them).
  if (platforms?.length && preferY != null) {
    const pad = findTowerPad(x, z, preferY, platforms) ?? findTowerPad(x, z, preferY, platforms, { margin: 2.4 });
    if (pad) return towerPadSurface(pad);
  }
  return worldWalkHeight(x, z, shape, knoll, ascent);
}

function OwnedCompanion({
  champions,
  ownedKey,
  trainPad,
  arena,
  worldLife,
  pledged = null,
  handlerPos,
  handlerHeading,
  camCue,
  shape,
  spawnKnoll,
  ascentFoot = null,
  towerPads = null,
}: {
  champions: GroundChampion[];
  ownedKey: string | null;
  trainPad: [number, number, number];
  arena: [number, number, number];
  worldLife?: WorldLife;
  pledged?: CreatureType | null;
  handlerPos: React.RefObject<THREE.Vector3>;
  handlerHeading: React.RefObject<number>;
  camCue: React.RefObject<CamCue>;
  shape: TerrainShape;
  spawnKnoll: SpawnKnoll;
  ascentFoot?: AscentFoot | null;
  /** Tower helix pads — companion stands on the same pad as the Trainer. */
  towerPads?: TowerNode[] | null;
}) {
  const [ownedAct, setOwnedAct] = useState(0);
  useEffect(() => {
    if (worldLife?.companionLine || worldLife?.companionEmote) setOwnedAct((n) => n + 1);
  }, [worldLife?.companionLine, worldLife?.companionEmote, worldLife?.companionAct]);

  const c = champions.find((x) => x.key === ownedKey);
  const rigRef = useRef<THREE.Group>(null);
  const wpos = useRef(new THREE.Vector3());
  const wvel = useRef(new THREE.Vector3());
  const smoothHVel = useRef(new THREE.Vector3());
  const followTarget = useRef(new THREE.Vector3());
  const followHeading = useRef(0);
  const rigHeading = useRef(0);
  const hPrev = useRef<THREE.Vector3 | null>(null);
  // previous frame's OWN position — the measured ground speed drives the gait
  const prevWpos = useRef(new THREE.Vector3());
  const prevWposInit = useRef(false);
  const companionLocoHold = useRef(0);
  const introElapsed = useRef(0);
  const introActive = useRef(true);
  const introBooted = useRef(false);
  const companionFlying = useRef(false);
  const companionMoving = useRef(false);
  const companionSpeed = useRef(0);
  const companionRun = useRef(false);
  const companionDrive = useMemo(
    () => ({
      flyingRef: companionFlying,
      movingRef: companionMoving,
      speedRef: companionSpeed,
      runRef: companionRun,
      velRef: wvel,
      headingRef: rigHeading,
    }),
    [],
  );

  useEffect(() => {
    const hp = handlerPos.current;
    const hh = handlerHeading.current;
    const feetY = hp.y - FOOT_OFF;
    const pad = towerPads?.length ? findTowerPad(hp.x, hp.z, feetY, towerPads) : null;
    const stand = pad
      ? clampToTowerPad(hp.x, hp.z, pad, 0.7)
      : { x: hp.x, z: hp.z };
    const y = companionFeetY(stand.x, stand.z, shape, spawnKnoll, ascentFoot, towerPads, feetY);
    wpos.current.set(stand.x, y, stand.z);
    wvel.current.set(0, 0, 0);
    smoothHVel.current.set(0, 0, 0);
    followTarget.current.set(stand.x, y, stand.z);
    followHeading.current = hh;
    rigHeading.current = hh;
    hPrev.current = hp.clone();
    introElapsed.current = 0;
    introActive.current = true;
    introBooted.current = false;
    prevWposInit.current = false;
    companionLocoHold.current = 0;
  }, [ownedKey, shape, spawnKnoll, ascentFoot, towerPads, handlerPos, handlerHeading]);

  useFrame((_, dtRaw) => {
    if (!rigRef.current || !c) return;
    const dt = Math.min(0.05, dtRaw);
    const hp = handlerPos.current;
    const cue = camCue.current;
    const hh = handlerHeading.current;
    const { slotR, introSec, introStart, arrived, wingDrop, liftThreshold, approachArc, catchK, catchMax, accel, idleSettle, velSmooth, headingSmooth, slotSmooth, rigHeadingSmooth, minPathSpeed, pathBack, pathSide } =
      COMPANION_FOLLOW;

    if (!hPrev.current) hPrev.current = hp.clone();
    const prev = hPrev.current;
    const hvx = dt > 0 ? (hp.x - prev.x) / dt : 0;
    const hvz = dt > 0 ? (hp.z - prev.z) / dt : 0;
    const hvy = dt > 0 ? (hp.y - prev.y) / dt : 0;
    prev.copy(hp);

    // Smooth Handler path velocity so tap-spam / quick strafe doesn't yank the slot.
    const smv = smoothHVel.current;
    const vK = 1 - Math.exp(-velSmooth * dt);
    smv.x += (hvx - smv.x) * vK;
    smv.z += (hvz - smv.z) * vK;
    const smSpeed = Math.hypot(smv.x, smv.z);

    let wantFollowH = hh;
    if (smSpeed > minPathSpeed) wantFollowH = Math.atan2(smv.x, smv.z);
    let dFollowH = wantFollowH - followHeading.current;
    dFollowH = Math.atan2(Math.sin(dFollowH), Math.cos(dFollowH));
    const hK = (1 - Math.exp(-headingSmooth * dt)) * (smSpeed > minPathSpeed ? 1 : 0.4);
    followHeading.current += dFollowH * hK;

    // Trainer feet ≈ capsule centre − FOOT_OFF. Pad under them is the companion's floor.
    const handlerFeetY = hp.y - FOOT_OFF;
    const handlerPad =
      towerPads?.length ? findTowerPad(hp.x, hp.z, handlerFeetY, towerPads) : null;

    if (!introBooted.current) {
      introBooted.current = true;
      let far = companionDockSlot(hp.x, hp.z, hh, introStart);
      if (handlerPad) {
        // Intro used to spawn ~11u away at terrain Y — on the Tower that is the void floor.
        const onPad = clampToTowerPad(far.tx, far.tz, handlerPad);
        far = { tx: onPad.x, tz: onPad.z };
      }
      const bootY = companionFeetY(far.tx, far.tz, shape, spawnKnoll, ascentFoot, towerPads, handlerFeetY);
      wpos.current.set(far.tx, bootY, far.tz);
      followTarget.current.set(far.tx, bootY, far.tz);
    }

    // Chase target: trail the main path when moving, idle wing slot when still.
    let rawTx: number;
    let rawTz: number;
    if (smSpeed > minPathSpeed) {
      const inv = 1 / smSpeed;
      const fx = smv.x * inv;
      const fz = smv.z * inv;
      const rx = fz;
      const rz = -fx;
      rawTx = hp.x - fx * pathBack + rx * pathSide;
      rawTz = hp.z - fz * pathBack + rz * pathSide;
    } else {
      const dock = companionDockSlot(hp.x, hp.z, followHeading.current, slotR);
      rawTx = dock.tx;
      rawTz = dock.tz;
    }
    // Wing slot can hang off a small pad into open air — keep it on the Trainer's pad.
    if (handlerPad) {
      const clamped = clampToTowerPad(rawTx, rawTz, handlerPad);
      rawTx = clamped.x;
      rawTz = clamped.z;
    }
    const ft = followTarget.current;
    const tK = 1 - Math.exp(-slotSmooth * dt);
    ft.x += (rawTx - ft.x) * tK;
    ft.z += (rawTz - ft.z) * tK;

    let introDock = companionDockSlot(hp.x, hp.z, hh, slotR);
    if (handlerPad) {
      const clamped = clampToTowerPad(introDock.tx, introDock.tz, handlerPad);
      introDock = { tx: clamped.x, tz: clamped.z };
    }
    let tx = introActive.current ? introDock.tx : ft.x;
    let tz = introActive.current ? introDock.tz : ft.z;
    if (handlerPad) {
      const clamped = clampToTowerPad(tx, tz, handlerPad);
      tx = clamped.x;
      tz = clamped.z;
    }
    const slotGroundY = handlerPad
      ? towerPadSurface(handlerPad)
      : companionFeetY(tx, tz, shape, spawnKnoll, ascentFoot, towerPads, handlerFeetY);
    // Absolute Y is huge on the Tower — measure lift against the standable floor
    // (pad top + capsule foot offset), not against world zero / liftThreshold alone.
    const standCenterY = handlerPad ? towerPadSurface(handlerPad) + FOOT_OFF : 0;
    const handlerFlying =
      cue?.flying ?? (handlerPad ? hp.y - standCenterY > liftThreshold : hp.y > liftThreshold);
    const dockY = handlerFlying ? Math.max(slotGroundY, hp.y - wingDrop) : slotGroundY;

    const ex = tx - wpos.current.x;
    const ez = tz - wpos.current.z;
    const slotDist = Math.hypot(ex, ez);
    const hSpeed = Math.hypot(hvx, hvz);
    const handlerMoving = smSpeed > 0.35 || hSpeed > 0.28 || !!cue?.moving;
    const vel = wvel.current;

    if (introActive.current) {
      introElapsed.current += dt;
      if (slotDist > 0.04) {
        const remaining = Math.max(0.04, introSec - introElapsed.current);
        const f = Math.min(1, dt / remaining);
        wpos.current.x += ex * f;
        wpos.current.z += ez * f;
        if (dt > 0) vel.set(ex * f / dt, 0, ez * f / dt);
      }
      const tProg = Math.min(1, introElapsed.current / introSec);
      const arcY = approachArc * Math.sin(tProg * Math.PI);
      const wantY = dockY + arcY;
      wpos.current.y += (wantY - wpos.current.y) * Math.min(1, dt * 14);
      if (slotDist < arrived && Math.abs(wpos.current.y - dockY) < 0.45 && introElapsed.current > 0.12) {
        introActive.current = false;
        vel.set(hvx, 0, hvz);
        followTarget.current.set(introDock.tx, wpos.current.y, introDock.tz);
      }
    } else if (handlerMoving) {
      // Lag behind while you move — match smoothed path velocity, close gap slowly.
      let wantVx = smv.x + ex * catchK;
      let wantVz = smv.z + ez * catchK;
      const wantPlanar = Math.hypot(wantVx, wantVz);
      if (wantPlanar > catchMax && wantPlanar > 0) {
        const k = catchMax / wantPlanar;
        wantVx *= k;
        wantVz *= k;
      }
      const kv = 1 - Math.exp(-accel * dt);
      vel.x += (wantVx - vel.x) * kv;
      vel.z += (wantVz - vel.z) * kv;
      wpos.current.x += vel.x * dt;
      wpos.current.z += vel.z * dt;

      const climb = cue?.climb ?? 0;
      const wantVy = hvy + (dockY - wpos.current.y) * 8;
      vel.y += (wantVy - vel.y) * kv;
      wpos.current.y += vel.y * dt;
      if (!handlerFlying) wpos.current.y = Math.max(slotGroundY, wpos.current.y);
    } else {
      // Handler still — settle into the dock slot beside / slightly behind.
      vel.x += (hvx - vel.x) * (1 - Math.exp(-accel * 2 * dt));
      vel.z += (hvz - vel.z) * (1 - Math.exp(-accel * 2 * dt));
      wpos.current.x += ex * Math.min(1, dt * idleSettle) + vel.x * dt;
      wpos.current.z += ez * Math.min(1, dt * idleSettle) + vel.z * dt;
      if (slotDist < 0.15) {
        // in the pocket — bleed residual drift (dt-based, ≈0.5/frame @60fps)
        const settle = Math.exp(-40 * dt);
        vel.x *= settle;
        vel.z *= settle;
      }

      const climb = cue?.climb ?? 0;
      const yRate = handlerFlying ? 14 : idleSettle;
      wpos.current.y += (dockY - wpos.current.y) * Math.min(1, dt * yRate) + climb * dt * (handlerFlying ? 0.9 : 0);
      vel.y *= Math.exp(-21 * dt); // dt-based (≈0.7/frame @60fps)
      if (!handlerFlying) wpos.current.y = Math.max(slotGroundY, wpos.current.y);
    }

    // Stay on the Trainer's pad in xz (don't drift into void and "fall" to terrain).
    if (handlerPad && !handlerFlying) {
      const onPad = clampToTowerPad(wpos.current.x, wpos.current.z, handlerPad);
      wpos.current.x = onPad.x;
      wpos.current.z = onPad.z;
      // If we were still at terrain height from a bad boot, snap up onto the pad.
      if (wpos.current.y < slotGroundY - 0.5) wpos.current.y = slotGroundY;
    }

    const chasePlanar = Math.hypot(vel.x, vel.z);
    const airborne = introActive.current || handlerFlying || wpos.current.y > slotGroundY + 0.5;
    companionFlying.current = airborne;
    // BUG-FIX (floating companion): publish the MEASURED ground speed, not
    // intent. The idle-settle branch above nudges position directly (no
    // velocity), so intent-only flags let the body glide across the dirt in its
    // rest pose. Real displacement now decides walk vs run vs idle — and the
    // stride tempo downstream — so the feet move whenever the body does.
    let realSpeed = 0;
    if (prevWposInit.current && dt > 0) {
      realSpeed = Math.hypot(wpos.current.x - prevWpos.current.x, wpos.current.z - prevWpos.current.z) / dt;
    }
    prevWpos.current.copy(wpos.current);
    prevWposInit.current = true;
    const wantsLoco = !airborne && realSpeed > 0.22;
    if (wantsLoco) companionLocoHold.current = 0.34;
    else companionLocoHold.current = Math.max(0, companionLocoHold.current - dt);
    companionMoving.current = companionLocoHold.current > 0;
    companionSpeed.current = realSpeed;
    companionRun.current = !!(cue?.superrun || realSpeed > RUN * 0.85);

    // Face travel direction when chasing; ease toward Handler facing when parked.
    let wantRigH = hh;
    if (chasePlanar > 0.28 || smSpeed > minPathSpeed) {
      wantRigH = chasePlanar > 0.12 ? Math.atan2(vel.x, vel.z) : followHeading.current;
    }
    let dRigH = wantRigH - rigHeading.current;
    dRigH = Math.atan2(Math.sin(dRigH), Math.cos(dRigH));
    rigHeading.current += dRigH * (1 - Math.exp(-rigHeadingSmooth * dt));

    rigRef.current.position.set(wpos.current.x, wpos.current.y, wpos.current.z);
    rigRef.current.rotation.y = rigHeading.current;
  }, 1);

  if (!c) return null;
  return (
    <group ref={rigRef}>
      <ChampionMesh
        key={c.key}
        type={c.type}
        champion={c.champion}
        identityKey={c.key}
        clan={pledged}
        position={[0, 0, 0]}
        rotation={0}
        selected
        restPose="standing"
        breatheIntensity={0.35}
        idlePhase={c.key.length * 0.7}
        actSignal={(worldLife?.companionAct ?? 0) + ownedAct}
        actName={worldLife?.training ? "punch" : "wave"}
        speechLine={worldLife?.companionLine}
        speechEmote={worldLife?.companionEmote}
        companionDrive={companionDrive}
        sceneScale={WORLD_AGENT_SCALE}
      />
    </group>
  );
}

// ── Ascent companion pedestal ────────────────────────────────────────────────
// Ready: waits on the launch pad. Running: flies from the pad to the Trainer's
// wing slot (no teleport). Same mind on phone Ascent / desktop Ascent.
function CircuitSpectator({
  champions,
  ownedKey,
  pledged,
  accent,
  phase,
  padPos,
  followPos,
  poseOut,
  ascentReaches = 0,
  sigilAccent,
}: {
  champions: GroundChampion[];
  ownedKey: string | null;
  pledged?: CreatureType | null;
  accent: string;
  phase?: CircuitPhase | null;
  /** pedestal at the launch pad (ready / between sectors) */
  padPos: [number, number, number];
  /** Handler world position — soft-leash target while running (climb-feel §5) */
  followPos: React.RefObject<THREE.Vector3>;
  /** Publish champion world pose for challenge-ghost overlap. */
  poseOut?: React.RefObject<THREE.Vector3 | null>;
  ascentReaches?: number;
  sigilAccent?: string;
}) {
  const c = champions.find((x) => x.key === ownedKey);
  const flying = phase === "running";
  const sigilGrp = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!sigilGrp.current || ascentReaches <= 0) return;
    const p = poseOut?.current;
    if (p) {
      sigilGrp.current.position.set(p.x, p.y, p.z);
      return;
    }
    const [px, py, pz] = padPos;
    sigilGrp.current.position.set(px, py + 1.05, pz);
  });

  if (!c) return null;
  const [px, py, pz] = padPos;
  const PED_H = 1.05;
  const PED_R_TOP = 0.52;
  const PED_R_BOT = 0.64;
  const top = py + PED_H;
  return (
    <group>
      {/* pedestal stays put — champion launches from here toward the Trainer */}
      <mesh position={[px, py + PED_H * 0.5, pz]} castShadow>
        <cylinderGeometry args={[PED_R_TOP, PED_R_BOT, PED_H, 20]} />
        <meshStandardMaterial color="#141230" emissive={accent} emissiveIntensity={0.28} metalness={0.4} roughness={0.6} />
      </mesh>
      <mesh position={[px, top + 0.02, pz]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[PED_R_TOP * 0.62, PED_R_TOP * 0.98, 28]} />
        <meshBasicMaterial color={accent} transparent opacity={0.55} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <FlyingFollower
        key={`wing-${c.key}-${px.toFixed(1)}-${pz.toFixed(1)}`}
        type={c.type}
        champion={c.champion}
        identityKey={c.key}
        clan={pledged}
        targetRef={followPos}
        scale={WORLD_AGENT_SCALE}
        renderPriority={0}
        spawnFrom={[px, top, pz]}
        chasing={flying}
        poseOut={poseOut}
      />
      {ascentReaches > 0 && (
        <group ref={sigilGrp} position={[px, top, pz]}>
          <AscentSigil reaches={ascentReaches} accent={sigilAccent ?? accent} />
        </group>
      )}
    </group>
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

// ── Ascent mountain ──────────────────────────────────────────────────────────
// The Circuit's region portal crowns a large terrained peak far out in the wilds
// (not a sad cone): shelves, ridges, and spurs from a local heightfield, with
// shining light beams so it's spottable from across the map. Solid trimesh +
// walk-height sampling so you can climb the shelves on foot or jetpack to the
// summit portal. Crossing the portal plane enters the Circuit (no E).
const ASCENT_PEAK_H = 32;       // summit height above the ground
const ASCENT_BASE_R = 44;       // mountain footprint radius
// Portal cross volume (plane at summit) — see Handler near-detect for Ascent enter

type AscentFoot = { x: number; z: number; baseY: number };

function ascentHash(x: number, z: number) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function ascentNoise(x: number, z: number) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);
  const a = ascentHash(xi, zi);
  const b = ascentHash(xi + 1, zi);
  const c = ascentHash(xi, zi + 1);
  const d = ascentHash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function ascentFbm(x: number, z: number) {
  let a = 0, amp = 0.5, f = 1;
  for (let i = 0; i < 4; i++) {
    a += amp * ascentNoise(x * f, z * f);
    amp *= 0.5;
    f *= 2.05;
  }
  return a;
}

/** Local height above the foot at (lx, lz) — terraced envelope + ridge noise. */
function ascentMountainHeight(lx: number, lz: number, baseR: number, peakH: number): number {
  const r = Math.hypot(lx, lz);
  if (r >= baseR) return 0;
  if (r < 0.4) return peakH;
  const t = 1 - r / baseR; // 1 at peak → 0 at foot
  // 5 soft shelves so it reads as a terrained mass, not a cone
  const terraces = 5;
  const stepped = Math.floor(t * terraces) / terraces;
  const within = (t * terraces) % 1;
  const shelf = stepped + Math.pow(within, 1.65) / terraces;
  const body = peakH * Math.pow(shelf, 0.9);
  // asymmetric ridges / spurs
  const n1 = ascentFbm(lx * 0.07 + 3.1, lz * 0.07 - 1.7);
  const n2 = ascentFbm(lx * 0.16 - 8.2, lz * 0.16 + 4.4);
  const ridge = (n1 * 0.7 + n2 * 0.3 - 0.38) * peakH * 0.28 * t;
  const spur = Math.cos(Math.atan2(lz, lx) * 2.5 + 0.9) * peakH * 0.08 * t * t;
  return Math.max(0, Math.min(peakH * 1.05, body + ridge + spur));
}

/** Walkable world Y — host terrain, or the Ascent mountain surface when over it. */
function worldWalkHeight(
  x: number,
  z: number,
  shape: TerrainShape,
  knoll: SpawnKnoll,
  ascent: AscentFoot | null = null,
): number {
  const ground = terrainHeight(x, z, shape, knoll);
  if (!ascent) return ground;
  const lx = x - ascent.x;
  const lz = z - ascent.z;
  if (Math.hypot(lx, lz) >= ASCENT_BASE_R) return ground;
  return Math.max(ground, ascent.baseY + ascentMountainHeight(lx, lz, ASCENT_BASE_R, ASCENT_PEAK_H));
}

function AscentMountain({
  pos,
  accent,
  peakH = ASCENT_PEAK_H,
  baseR = ASCENT_BASE_R,
}: {
  pos: [number, number, number];
  accent: string;
  peakH?: number;
  baseR?: number;
}) {
  const [x, y, z] = pos;
  const beams = useRef<THREE.Group>(null);
  const geo = useMemo(() => {
    const SEG = 64;
    const span = baseR * 2;
    const g = new THREE.PlaneGeometry(span, span, SEG, SEG);
    g.rotateX(-Math.PI / 2);
    const posAttr = g.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(posAttr.count * 3);
    const low = new THREE.Color("#1a1628");
    const mid = new THREE.Color("#2e2a42");
    const high = new THREE.Color("#4a4660");
    const crown = new THREE.Color(accent);
    const c = new THREE.Color();
    for (let i = 0; i < posAttr.count; i++) {
      const lx = posAttr.getX(i);
      const lz = posAttr.getZ(i);
      const r = Math.hypot(lx, lz);
      // Sink the square's exterior below the host terrain so the trimesh only
      // collides on the circular mountain — not a flat pad at the corners.
      const h = r >= baseR ? -2.5 : ascentMountainHeight(lx, lz, baseR, peakH);
      posAttr.setY(i, h);
      const n = Math.max(0, Math.min(1, h / peakH));
      if (n < 0.45) c.lerpColors(low, mid, n / 0.45);
      else if (n < 0.82) c.lerpColors(mid, high, (n - 0.45) / 0.37);
      else c.lerpColors(high, crown, (n - 0.82) / 0.18);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, [baseR, peakH, accent]);

  useFrame((state) => {
    if (!beams.current) return;
    const t = state.clock.elapsedTime;
    beams.current.children.forEach((b, i) => {
      const m = (b as THREE.Mesh).material as THREE.MeshBasicMaterial;
      if (m) m.opacity = 0.16 + Math.sin(t * 1.6 + i * 1.7) * 0.08;
    });
  });
  const beamH = 62;
  return (
    <group position={[x, y, z]}>
      {/* terrained mass — solid so shelves are walkable (same trimesh path as Terrain) */}
      <RigidBody type="fixed" colliders="trimesh">
        <mesh geometry={geo} castShadow receiveShadow>
          <meshStandardMaterial vertexColors roughness={0.94} metalness={0.06} flatShading />
        </mesh>
      </RigidBody>
      {/* lit crown ring at the summit where the portal sits */}
      <mesh position={[0, peakH + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.8, 4.2, 48]} />
        <meshBasicMaterial color={accent} transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* shining beams to the sky */}
      <group ref={beams} position={[0, peakH, 0]}>
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2;
          const rr = i === 0 ? 0 : 1.8;
          return (
            <mesh key={i} position={[Math.cos(a) * rr, beamH / 2, Math.sin(a) * rr]}>
              <cylinderGeometry args={[i === 0 ? 0.85 : 0.4, i === 0 ? 1.9 : 1.05, beamH, 16, 1, true]} />
              <meshBasicMaterial color={accent} transparent opacity={0.2} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} />
            </mesh>
          );
        })}
      </group>
    </group>
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
      {/* landing halo on the Tower summit pad (Peak floats ~1.55 above the surface) */}
      {goal.kind === "peak" && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.55, 0]}>
          <ringGeometry args={[2.6, 3.2, 40]} />
          <meshBasicMaterial color={col} transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
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
// static dressing below is memoised: World re-renders on every near-target /
// match-HP prop change, and none of these depend on that churn.
const SkyDome = memo(function SkyDome({ biome }: { biome: BiomeConfig }) {
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
});

const Nebula = memo(function Nebula({ biome }: { biome: BiomeConfig }) {
  const tex = useMemo(() => nebulaTexture(biome.nebula.colors), [biome]);
  return (
    <mesh renderOrder={-1}>
      <sphereGeometry args={[285, 32, 16]} />
      <meshBasicMaterial map={tex} transparent opacity={biome.nebula.opacity} blending={THREE.AdditiveBlending} side={THREE.BackSide} depthWrite={false} fog={false} />
    </mesh>
  );
});

const Starfield = memo(function Starfield() {
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
});

// thin textured visual overlay for the flat plaza (the terrain provides the collider)
const PlazaFloor = memo(function PlazaFloor({ biome }: { biome: BiomeConfig }) {
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
});

// Radius of the central combat space (the ring platform / the pit basin). Bumped
// up so the arena reads as a proper coliseum floor, not a small dais. Keep the
// biomes' roam `inner` keep-out at or above this so champions never stand in it.
const ARENA_R = 8.6;

const ArenaPlatform = memo(function ArenaPlatform() {
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
});

// The approach trail: from the outer rift lip inward to claim the Depth, then
// through the colosseum entrance to the arena.
function TrainPad({ pos, beacon = false }: { pos: [number, number, number]; beacon?: boolean }) {
  return (
    <group position={pos}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <circleGeometry args={[2.6, 48]} />
        <meshStandardMaterial color={beacon ? "#f5d020" : "#6a6bff"} transparent opacity={beacon ? 0.22 : 0.14} emissive={beacon ? "#f5d020" : "#6a6bff"} emissiveIntensity={beacon ? 0.9 : 0.5} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[2.5, beacon ? 2.72 : 2.62, 48]} />
        <meshBasicMaterial color={beacon ? "#f5d020" : "#6a6bff"} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// jumpable platforms in the wilds — solid physics colliders, placed on the terrain
function Platforms({ biome, shape, count }: { biome: BiomeConfig; shape: TerrainShape; count: number }) {
  const items = useMemo(() => {
    const out: { pos: [number, number, number]; size: [number, number, number]; color: string }[] = [];
    // the bearing of the platform staircase tracks the world's seed so each
    // world arranges them differently — but never on the rift/spawn approach
    // (Ember's seed put the flight dead on +z and hid the Trainer behind it).
    let baseA = Math.PI * 0.25 + shape.seed * 0.013;
    const canyonA = shape.canyonAngle;
    const offCanyon = Math.abs(Math.atan2(Math.sin(baseA - canyonA), Math.cos(baseA - canyonA)));
    if (offCanyon < 0.55) baseA = canyonA + 0.95;
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
// can chain hops all the way to the summit. Mid-climb agents perch on the way;
// the Peak claim at the top reveals the summit champion.
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
            <div style={{ fontSize: 11, color: biome.platform.top, letterSpacing: 1 }}>claim the Peak · challenge the summit</div>
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

/** Summit champion after Peak claim — smoke-bomb appear, then challengeable. */
function SummitGuardian({
  agent,
  position,
  playReveal,
  onReady,
}: {
  agent: TowerAgent;
  position: [number, number, number];
  playReveal: boolean;
  onReady: () => void;
}) {
  const reduce = useSettings((s) => s.reduceMotion);
  const group = useRef<THREE.Group>(null);
  const puffRefs = useRef<(THREE.Mesh | null)[]>([]);
  const puffState = useRef(
    Array.from({ length: 28 }, () => ({
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      life: 0,
      max: 1,
      size: 1,
    })),
  );
  const tRef = useRef(playReveal && !reduce ? 0 : 1);
  const readySent = useRef(false);
  const poofed = useRef(false);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    readySent.current = false;
    poofed.current = false;
    tRef.current = playReveal && !reduce ? 0 : 1;
    if (!playReveal || reduce) {
      onReadyRef.current();
      readySent.current = true;
    }
  }, [playReveal, reduce, agent.id]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(0.05, dtRaw);
    if (tRef.current < 1) {
      if (!poofed.current && tRef.current < 0.05) {
        poofed.current = true;
        smokePoofSfx();
        for (let i = 0; i < puffState.current.length; i++) {
          const p = puffState.current[i];
          const a = (i / puffState.current.length) * Math.PI * 2;
          const r = 0.2 + Math.random() * 0.55;
          p.pos.set(Math.cos(a) * r * 0.3, 0.2 + Math.random() * 0.4, Math.sin(a) * r * 0.3);
          p.vel.set(Math.cos(a) * (1.6 + Math.random() * 2.2), 1.4 + Math.random() * 2.4, Math.sin(a) * (1.6 + Math.random() * 2.2));
          p.max = 0.55 + Math.random() * 0.45;
          p.life = p.max;
          p.size = 0.35 + Math.random() * 0.45;
        }
      }
      tRef.current = Math.min(1, tRef.current + dt / 1.35);
      const u = tRef.current;
      // ease-out pop: small → overshoot → settle (PerchedAgent keeps its own scale)
      const pop = u < 0.55
        ? (u / 0.55) * (u / 0.55)
        : 1 + Math.sin(((u - 0.55) / 0.45) * Math.PI) * 0.1 * (1 - (u - 0.55) / 0.45);
      if (group.current) {
        group.current.scale.setScalar(Math.max(0.001, pop));
        group.current.visible = u > 0.08;
      }
      if (u >= 1 && !readySent.current) {
        readySent.current = true;
        onReadyRef.current();
      }
    } else if (group.current) {
      group.current.scale.setScalar(1);
      group.current.visible = true;
    }

    for (let i = 0; i < puffState.current.length; i++) {
      const p = puffState.current[i];
      const m = puffRefs.current[i];
      if (!m) continue;
      if (p.life <= 0) {
        if (m.visible) m.visible = false;
        continue;
      }
      p.life -= dt;
      p.vel.y += 1.2 * dt;
      p.vel.multiplyScalar(Math.exp(-2.8 * dt));
      p.pos.addScaledVector(p.vel, dt);
      const age = 1 - Math.max(0, p.life) / p.max;
      m.visible = true;
      m.position.copy(p.pos);
      m.scale.setScalar(p.size * (0.7 + age * 2.1));
      const mat = m.material as THREE.MeshBasicMaterial;
      const g = 0.72 - age * 0.25;
      mat.color.setRGB(g, g, g + 0.04);
      mat.opacity = (1 - age * age) * 0.85;
    }
  });

  return (
    <group position={position}>
      {puffState.current.map((_, i) => (
        <mesh key={i} ref={(el) => { puffRefs.current[i] = el; }} visible={false} renderOrder={12}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial color="#c8c8d4" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
      <group ref={group} visible={!playReveal || reduce}>
        <PerchedAgent agent={agent} position={[0, 0, 0]} summit worldAnchor={position} />
      </group>
    </group>
  );
}

function PerchedAgent({
  agent,
  position,
  ground = false,
  summit = false,
  worldAnchor,
}: {
  agent: TowerAgent;
  position: [number, number, number];
  ground?: boolean;
  /** Peak guardian on the Tower summit — label reads as the Peak fight, not another mid-climb seat. */
  summit?: boolean;
  /** World xz/y for label cull when `position` is local (nested under SummitGuardian). */
  worldAnchor?: [number, number, number];
}) {
  const champ = useMemo(() => pseudoChampion(agent), [agent]);
  const vis = STATUS_VIS[agent.status];
  const disabled = agent.status === "disabled";
  const hibernating = agent.status === "hibernating";
  const ringRef = useRef<THREE.Mesh>(null);
  const beamRef = useRef<THREE.Mesh>(null);
  const anchor = worldAnchor ?? position;
  const rot = useMemo(() => {
    if (Math.hypot(anchor[0], anchor[2]) < 0.05) return Math.PI; // face plaza from summit centre
    return Math.atan2(-anchor[0], -anchor[2]);
  }, [anchor]);
  // Distance-cull the floating name plate: drei <Html> recomputes a CSS matrix
  // every frame, and a populated Tower can hold dozens. Past reading range we
  // unmount the DOM node entirely (hysteresis so it doesn't thrash on the edge).
  const [labelOn, setLabelOn] = useState(true);
  const labelShown = useRef(true);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    if (ringRef.current) {
      const sc = 1 + Math.sin(t * (hibernating ? 0.8 : 2.2) + anchor[1]) * (disabled ? 0.02 : 0.08);
      ringRef.current.scale.set(sc, sc, sc);
    }
    if (beamRef.current) beamRef.current.rotation.y += 0.6 * dt; // dt-based spin
    const dx = state.camera.position.x - anchor[0];
    const dy = state.camera.position.y - anchor[1];
    const dz = state.camera.position.z - anchor[2];
    const d2 = dx * dx + dy * dy + dz * dz;
    const want = labelShown.current ? d2 < 56 * 56 : d2 < 48 * 48;
    if (want !== labelShown.current) {
      labelShown.current = want;
      setLabelOn(want);
    }
  });

  const role = ground ? "ROAMING AGENT" : summit ? "PEAK · SUMMIT" : "RANKED AGENT";

  return (
    <group position={position}>
      {/* holo hex pad — player agents perch on the Tower, not the Keeper spire */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.95, 1.22, 6]} />
        <meshBasicMaterial color={vis.color} transparent opacity={disabled ? 0.25 : 0.75} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      <group scale={0.92 * WORLD_AGENT_SCALE}>
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
        <Html position={[0, 1.7, 0]} center distanceFactor={12} zIndexRange={[30, 0]} style={{ pointerEvents: "none" }}>
          <div style={{ fontFamily: "var(--font-grotesk), sans-serif", textAlign: "center", whiteSpace: "nowrap", opacity: disabled ? 0.55 : 1 }}>
            <div style={{ fontSize: 9, letterSpacing: 1.4, color: summit ? "var(--gold)" : vis.color, fontWeight: 700 }}>{role}</div>
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

// WALK/RUN eased ~10% for the 2/3-scale Reader (READER_SCALE from champion-mesh)
// so the smaller body doesn't read as skating across the plaza; jump/fly speeds
// keep their world-tuned arcs — the Tower gaps depend on them.
const WALK = 7.8, RUN = 13.6, SUPERRUN = RUN * 2, JUMP = 10.4, AIR_JUMP = 9.6;
// ── Reader scale (the 2/3 resize) ────────────────────────────────────────────
// Shared with Climb / Circuit via READER_SCALE + WORLD_AGENT_SCALE. Everything
// that hangs off body height derives from FOOT_OFF so the capsule, feet sensor,
// ground snap and spawn heights move in lockstep. Battle scenes stay full scale.
const CAP_HALF = 0.55 * READER_SCALE; // capsule cylindrical half-height
const CAP_RAD = 0.45 * READER_SCALE;  // capsule radius
const FOOT_OFF = CAP_HALF + CAP_RAD;  // capsule centre → soles (≈0.67)
// acceleration rates (per second) for dt-based, frame-rate-independent smoothing —
// higher = snappier response to the stick. Ground is punchy; air is lighter; the
// jetpack gives strong horizontal authority so you can steer your flight path.
const ACCEL_GROUND = 22, ACCEL_AIR = 9, ACCEL_FLY = 16;
// how quickly the body coasts to a stop when the stick is released (per second)
const STOP_GROUND = 16, STOP_AIR = 1.4, STOP_FLY = 4.5;
// how quickly the character pivots toward the move direction (per second)
const TURN_GROUND = 22, TURN_AIR = 16;
// jetpack flight: deploys when jumps pass this threshold — reached either by HOLDING
// the jump button after the first hop (hold-to-fly, see FLY_HOLD_DEPLOY) or by a
// second tap (double-tap). Hold to thrust smoothly once aloft.
const FLY_TRIGGER = 1;     // jumps past this deploy the pack
// ── jetpack VERTICAL — the mobile Climb's acceleration model (circuit-lite.tsx) ──
// Three vertical regimes while the pack is lit (gravityScale is 0 — we own Y):
//   • thrust held  → powerful climb through gravity (timed "flap")
//   • forward cruise (W / Circuit auto-+Z), no thrust → slight descent, not a hover
//   • no forward intent, no thrust → hard fall under FLY_GRAVITY
// Scaled ~1.4× the mobile numbers for the larger world / Circuit geometry.
const FLY_GRAVITY = 30;        // downward accel (u/s²) — real weight when idle / cut
const FLY_THRUST_ACCEL = 54;   // upward accel while the jet is held (net +24 up)
const FLY_PRESS_KICK = 4.2;    // instant upward velocity pop on each new press (a flap)
const FLY_MAX_RISE = 13;       // climb clamp — a full hold rises, still aimable
const FLY_MAX_FALL = 20;       // terminal fall (sticky, never uncontrollable)
// Cruise glide: powered forward without thrusting — ease toward a gentle sink so
// W / Circuit cruise reads as "flying forward with a slight descent", not flat
// horizontal and not a stone drop. Idle (no forward) keeps full FLY_GRAVITY.
// Baseline glide — runtime wing traits override via ascentSessionMods().
const FLY_CRUISE_SINK = ASCENT_GLIDE.cruiseSink; // shared with Climb
const FLY_CRUISE_GLIDE = ASCENT_GLIDE.cruiseGlide;
const FLY_DIVE_SINK = ASCENT_GLIDE.diveSink;
const FLY_DIVE_GLIDE = ASCENT_GLIDE.diveGlide;
const FLY_SPOOL = 9;       // how fast the thrust COMMAND ramps in/out — jet-puff cadence
// Circuit Ascent runner (climb-feel §4): auto-forward along +Z so altitude is the
// skill axis and forward is the heartbeat. W surges, S brakes + soft dive; A/D = light steer.
// Fallback band when sector idx is unavailable — live Flight uses sectorFlightBand.
const CIRCUIT_CRUISE = 14;
const CIRCUIT_SURGE = 18;
const CIRCUIT_BRAKE = 8;
                           // into a uniform hover instead of a per-press sawtooth
// Hold-to-fly: after the first hop, HOLDING the jump button this many seconds while
// airborne auto-deploys the jetpack — so a new player discovers flight by just
// holding, without needing to learn the double-tap. A quick tap stays a plain hop;
// the double-tap still deploys instantly for players who know it.
const FLY_HOLD_DEPLOY = 0.16;
// Jump buffering: a tap made while FALLING just above the floor is held this long
// and fired as a crisp ground jump on the touchdown frame, instead of spending an
// air-jump (or accidentally deploying the pack) a hand's breadth off the ground.
const JUMP_BUFFER_S = 0.12;
const JUMP_BUFFER_H = 2.2;   // "just above the floor" — buffer window height (u)
const FLY_FOOT = 1.45;     // ankle tuck (rad) while airborne (jetpack thrust, jump or
                           // fall): toes hang straight down — body upright, just the feet
// while suspended the whole lower body should dangle, not hold its planted stance:
// the thighs ease slightly back toward vertical and the knees go soft so the legs
// trail loosely under the hovering body (a relaxed "lifted off the ground" hang).
const FLY_LEG_HANG = 0.55; // upper-leg relax (rad) — thighs swing toward a straight dangle
const FLY_KNEE_BEND = 0.75; // soft knee flex (rad) so the shins hang loose, not stiff

// ── flight ground-rings ──────────────────────────────────────────────────────
// The foot rings detach from the feet while airborne and sink toward the floor
// below — a floating "here's the ground" depth ladder that reads altitude. The
// smaller (inner) ring travels furthest so the pair fans out with depth. Holding
// thrust drives them to the bottom of their travel where they gently oscillate;
// releasing eases them home; descending kicks them upward. Reused for the
// companion's ring (READER-derived tuning; see OwnedCompanion). Gated by
// reduce-motion — the rings simply stay planted at the feet.
const RING_SINK_BIG = 0.85;   // max downward travel of the outer (bigger) ring (world u)
const RING_SINK_SMALL = 1.5;  // inner (smaller) ring sinks lowest
const RING_OSC_AMP = 0.16;    // hover wobble at the bottom of travel (small ring; big rides 40%)
const RING_OSC_HZ = 1.4;      // wobble frequency (Hz)
const RING_FALL_UP = 0.55;    // how far the rings ride up during a fall
const RING_FALL_REF = 8;      // fall speed (u/s) mapped to the full upward ride
const RING_EASE = 8;          // damping lambda for the ring offset (frame-rate independent)

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
  superrun: boolean;   // Shift/sprint held while moving — double speed + smoke trail
  headingSteer: boolean; // movement locked to body heading — suppress camera follow/sway
  recenter: boolean;   // one-shot request to swing the lens squarely behind the player
  touchActive: boolean; // on-screen stick is being held — freeze camera yaw auto-follow so
                        // the camera-relative steer basis stays fixed (no walk/fly-in-circles)
  /** Circuit: true while the chase cam is settling — Handler ignores move/jump. */
  inputLock: boolean;
  /** Handler capsule has settled on a collider — camera look gated until then. */
  bodyReady: boolean;
}

// on-screen touch control channels (mobile)
interface TouchMove { x: number; y: number }   // analog stick, x = strafe, y = forward (+up)
interface TouchBtn { sprint: boolean; jump: number; jumpHeld: boolean; land: number } // jump = tap counter (edge); jumpHeld = button down (hold-to-fly); land = descend/cancel-fly tap counter (touch equivalent of the X key)
interface CamDrag { dx: number; dy: number; pinch: number } // orbit + pinch deltas, drained each frame

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
    // handlerPos is the capsule centre (FOOT_OFF above feet) — spawn at foot level
    const footY = pos.y - FOOT_OFF;
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
      p.vel.multiplyScalar(Math.exp(-3.7 * dt)); // dt-based drag (0.94/frame @60fps)
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
  handlerHeading,
  camCue,
  touchMove,
  touchBtn,
  isHub,
  inVenue = false,
  inAmphitheatre = false,
  circuitMode = false,
  circuitRunning = false,
  circuitPhase = null,
  circuitSectorIdx = 0,
  circuitCheckpoints = [],
  circuitCpNextRef,
  circuitHazards = [],
  circuitCrownCache = null,
  onCircuitCrownCollect,
  onCircuitPass,
  onCircuitFail,
  onCircuitStart,
  onCircuitSample,
  onCircuitStumble,
  concordVenueTargets = [],
  returnTarget = null,
  circuitTunnelTarget = null,
  ascentFoot = null,
  venueExitTarget = null,
  spawnPos,
  trainPad,
  challengeTargets,
  groundTargets,
  nodeTargets,
  goalTargets,
  brokerPad,
  gateTargets,
  forceTargets,
  venueTargets,
  shape,
  spawnKnoll,
  onAltitude,
  onPose,
  travelRef,
  trainerXp = 0,
  force = null,
  padBeacon = false,
}: {
  controlsEnabled: boolean;
  onNear: (n: NearTarget) => void;
  ownedKey: string | null;
  matchActive: boolean;
  handlerPos: React.RefObject<THREE.Vector3>;
  handlerHeading: React.RefObject<number>;
  camCue: React.RefObject<CamCue>;
  touchMove: React.RefObject<TouchMove>;
  touchBtn: React.RefObject<TouchBtn>;
  isHub: boolean;
  trainerXp?: number;
  force?: CreatureType | null;
  padBeacon?: boolean;
  inVenue?: boolean;
  inAmphitheatre?: boolean;
  circuitMode?: boolean;
  /** Ascent runner heartbeat — auto-forward while the sector is live (climb-feel §4). */
  circuitRunning?: boolean;
  /** Ready / running / sector / failed / done — drives start lock label + vanish. */
  circuitPhase?: CircuitPhase | null;
  /** 0-based sector index — Reach sky / dressing / hazards. */
  circuitSectorIdx?: number;
  circuitCheckpoints?: { index: number; pos: THREE.Vector3; posTuple: [number, number, number]; radius: number; finish: boolean }[];
  circuitCpNextRef?: React.MutableRefObject<number>;
  circuitHazards?: Hazard[];
  circuitCrownCache?: CrownCache | null;
  onCircuitCrownCollect?: () => void;
  onCircuitPass?: (index: number) => void;
  onCircuitFail?: (reason?: CircuitFailReason, pose?: { x: number; y: number; z: number; heading: number }) => void;
  onCircuitStart?: () => void;
  onCircuitSample?: (y: number, z: number) => void;
  onCircuitStumble?: () => void;
  concordVenueTargets?: { venue: VenueId; label: string; pos: THREE.Vector3 }[];
  returnTarget?: THREE.Vector3 | null;
  circuitTunnelTarget?: { label: string; pos: THREE.Vector3 } | null;
  /** Region Ascent mountain foot — walk height + safety net over the peak. */
  ascentFoot?: AscentFoot | null;
  venueExitTarget?: { label: string; pos: THREE.Vector3; radius: number } | null;
  spawnPos?: [number, number, number];
  trainPad: [number, number, number];
  challengeTargets: { key: string; name: string; id: string; handle?: string; pos: THREE.Vector3 }[];
  groundTargets: { key: string; name: string; id: string; handle?: string; pos: THREE.Vector3 }[];
  nodeTargets: { id: string; kind: NodeKind; crowns: number; fragments: number; flight: boolean; pos: THREE.Vector3 }[];
  goalTargets: { id: string; goalKind: GoalKind; label: string; hint: string; radius: number; reward: WorldGoal["reward"]; pos: THREE.Vector3 }[];
  brokerPad: [number, number, number];
  gateTargets: { world: string; label: string; pos: THREE.Vector3 }[];
  forceTargets: { type: CreatureType; name: string; motto: string; pos: THREE.Vector3 }[];
  venueTargets: { venue: ConcordVenueId; name: string; pos: THREE.Vector3 }[];
  shape: TerrainShape;
  spawnKnoll: SpawnKnoll;
  onAltitude?: (y: number) => void;
  onPose?: (x: number, z: number, heading: number) => void;
  travelRef?: React.MutableRefObject<((x: number, z: number, faceHeading?: number, y?: number) => void) | null>;
}) {
  const { scene, animations } = useGLTF("/models/RobotExpressive.glb");
  // bind foot quats + scratch pose math (feet aren't reset by the idle mixer)
  const footBind = useRef({ l: new THREE.Quaternion(), r: new THREE.Quaternion() });
  const qFootHang = useRef(new THREE.Quaternion());
  const qThighHang = useRef(new THREE.Quaternion());
  const qKneeHang = useRef(new THREE.Quaternion());
  const eHang = useRef(new THREE.Euler());
  const readerPal = useMemo(() => readerPalette(force), [force]);
  const readerLv = trainerLevel(trainerXp).level;
  const built = useMemo(() => {
    const b = buildCharacter(scene, animations, blank(), "#cfd2e8", undefined, 0, readerPal);
    // feet aren't keyed in the idle clip — capture bind quats once so we can SET
    // the hang pose each frame instead of subtracting euler (which accumulated and
    // spun the right foot through gimbal lock).
    const fl = legBone(b.bones, "foot", "l");
    const fr = legBone(b.bones, "foot", "r");
    if (fl) footBind.current.l.copy(fl.quaternion);
    if (fr) footBind.current.r.copy(fr.quaternion);
    return b;
  }, [scene, animations, readerPal]);
  const body = useRef<RapierRigidBody>(null);
  const inner = useRef<THREE.Group>(null);
  // zero-offset child of the RigidBody. Rapier writes the INTERPOLATED transform
  // onto the body's object every frame; reading this anchor's world position (vs
  // the raw, 60Hz-stepped rb.translation()) keeps the camera locked to the body
  // the eye actually sees, killing the relative judder on >60Hz / uneven frames.
  const camAnchor = useRef<THREE.Group>(null);
  // Seed from World (circuit = 0 down-track). Math.PI would stare at the exit portal.
  const heading = useRef(handlerHeading.current);
  const ground = useRef(0);
  // spawn settle guard: pin the capsule at standing height until the floor
  // sensor confirms the ground collider is actually under us (a cold-load race
  // where the body spawns before the terrain/plaza collider is ready was letting
  // it free-fall and flash "under the ground" on refresh).
  const settled = useRef(false);
  const spawnAt = useRef(0);
  // Camera look / arrive countdown wait on bodyReady — clear on mount & unmount so
  // a remount never inherits a stale "ready" from a torn-down Handler.
  useEffect(() => {
    if (camCue.current) camCue.current.bodyReady = false;
    return () => {
      if (camCue.current) camCue.current.bodyReady = false;
    };
  }, [camCue]);
  const cur = useRef<"idle" | "walk" | "run" | "jump">("idle");
  const near = useRef<NearTarget>(null);
  const failCooldown = useRef(0);
  /** Previous flyer sample for hitch-safe gate plane tests (soft rails need XY at gz). */
  const circuitPrevPos = useRef<{ x: number; y: number; z: number } | null>(null);
  /** Left the launch pad this sector — next ground contact = fall fail (soul atom). */
  const circuitAirborne = useRef(false);
  /**
   * Sync outcome latch (parity with Climb `dead` ref). React phase flips are
   * async — without this, threading finish can still spend a life on the next
   * frames before "sector"/"done" commits (false LIFE LOST after a clear).
   */
  const circuitSettled = useRef(false);
  const jumps = useRef(0);
  const prevSpace = useRef(false);
  const prevTouchJump = useRef(0);
  // remaining seconds of a buffered pre-landing jump press (see JUMP_BUFFER_S)
  const jumpBuffer = useRef(0);
  // hold-to-fly: seconds the jump button has been held while airborne (pre-flight)
  const flyHold = useRef(0);
  // jetpack flight: deploys on a held jump after the first hop (or the 2nd tap);
  // bursts on every stroke
  const flying = useRef(false);
  const jetBurst = useRef(0);
  const jetEmit = useRef(0); // accumulator that paces continuous-thrust smoke
  // flight ground-rings — the foot rings detach + sink toward the floor while
  // aloft (see RING_* constants). Big = outer gold ring; small = inner Force ring.
  const ringBig = useRef<THREE.Mesh>(null);
  const ringSmall = useRef<THREE.Mesh>(null);
  const ringYBig = useRef(0);   // eased y offset from the ring's rest position
  const ringYSmall = useRef(0);
  const ringOscT = useRef(0);   // oscillation phase accumulator (s)
  // superrun: Shift (or touch/pad sprint) while moving → double speed + smoke trail
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
  // Circuit stumble (docs/circuit-world.md §1): a hazard hit locks thrust until
  // `stumbleLock` (clock-time) and refuses a new hit until `stumbleGrace`.
  const stumbleLock = useRef(0);
  const stumbleGrace = useRef(0);
  const wasCircuitRunning = useRef(false);
  // eased ankle-tuck amount (rad) — ramps in while flying so the toes point down
  const footTuck = useRef(0);
  // eased 0..1 leg-dangle amount — rides with the foot tuck so the thighs/knees
  // relax into a hanging pose while suspended and snap back flat on touchdown
  const legHang = useRef(0);
  // procedural body polish: a forward/banked lean while flying, and a
  // squash-&-stretch impulse that pops on launch and absorbs on landing
  const leanX = useRef(0);
  const leanZ = useRef(0);
  // previous frame's heading — its delta gives the turn rate for the ground bank.
  // Seed from the live spawn face (Circuit = 0). Math.PI made the first frame
  // bank as if we'd spun 180° from the exit portal.
  const prevHeading = useRef(handlerHeading.current);
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
    travelRef.current = (x, z, faceHeading, yOverride) => {
      const rb = body.current;
      if (!rb) return;
      // venue floors (amphitheatre sand / circuit pad) = y≈0; else host terrain / Ascent.
      // Optional yOverride keeps Tower summit / floating pads (capsule centre).
      const groundY = inAmphitheatre || circuitMode ? 0 : worldWalkHeight(x, z, shape, spawnKnoll, ascentFoot);
      const y =
        typeof yOverride === "number" && Number.isFinite(yOverride)
          ? yOverride
          : spawnPos
            ? spawnPos[1]
            : groundY + FOOT_OFF + 1.4;
      rb.setTranslation({ x, y, z }, true);
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
      jumps.current = 0;
      // optional drop-in facing: turn the body toward a target (e.g. on the first
      // Concord landing, face the spotlit Grounds gate) and ask the camera to
      // swing squarely behind so it reads as "control handed back, looking at it".
      if (typeof faceHeading === "number") {
        heading.current = faceHeading;
        if (inner.current) inner.current.rotation.set(0, faceHeading, 0);
        if (camCue.current) {
          camCue.current.heading = faceHeading;
          camCue.current.recenter = true;
        }
      }
    };
    return () => {
      if (travelRef) travelRef.current = null;
    };
  }, [travelRef, shape, spawnKnoll, spawnPos, inAmphitheatre, circuitMode, ascentFoot]);

  // Circuit / Amphitheatre / wild resume already seeded `handlerHeading` at World
  // mount. Never force wild resume to 0 — that stares at the Concord return
  // portal (Void Garden +z knoll) instead of the plaza with the portal at your back.
  // useLayoutEffect: apply mesh yaw before the first paint so settle's early-return
  // can't leave the robot at identity while the exit portal is already on screen.
  useLayoutEffect(() => {
    const face = spawnPos
      ? handlerHeading.current
      : Math.atan2(-spawnKnoll.x, -spawnKnoll.z);
    heading.current = face;
    prevHeading.current = face;
    handlerHeading.current = face;
    if (camCue.current) {
      camCue.current.heading = face;
      if (spawnPos) camCue.current.recenter = true;
    }
    if (inner.current) {
      inner.current.rotation.order = "YXZ";
      inner.current.rotation.set(0, face, 0);
    }
  }, [spawnPos, spawnKnoll, camCue, handlerHeading]);

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

  useFrame((state, dtRaw) => {
    const dt = Math.min(0.05, dtRaw);
    built.mixer.update(dt);
    applyBoneMorph(built.bones, built.boneBase, built.morph);
    const rb = body.current;

    // Publish handler position before companion reads it (same frame).
    if (rb) {
      if (camAnchor.current) {
        camAnchor.current.updateWorldMatrix(true, false);
        camAnchor.current.getWorldPosition(handlerPos.current);
      } else {
        const t = rb.translation();
        handlerPos.current.set(t.x, t.y, t.z);
      }
      handlerHeading.current = heading.current;
    }
    if (!rb) return;

    // Sector clear / fail / full clear / life-continue — freeze (no gravity drop).
    // Trainer stays visible during "continue" so the ghost leave can read.
    const circuitFrozen =
      circuitMode &&
      (circuitPhase === "sector" ||
        circuitPhase === "done" ||
        circuitPhase === "failed" ||
        circuitPhase === "continue");
    if (circuitFrozen) {
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
      rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
      rb.setGravityScale(0, false);
      flying.current = false;
      thrust.current = 0;
      setJet(0);
      if (camCue.current) {
        camCue.current.flying = false;
        camCue.current.moving = false;
        camCue.current.speed = 0;
        camCue.current.climb = 0;
      }
      return;
    }

    const t = rb.translation();
    const hp = handlerPos.current;
    const fwd = fwdV.current.set(hp.x - camera.position.x, 0, hp.z - camera.position.z);
    if (fwd.lengthSq() < 1e-4) fwd.set(0, 0, 1);
    fwd.normalize();
    const right = rightV.current.set(-fwd.z, 0, fwd.x);
    // gather input as analog axes (ax = strafe, az = forward) from keys + touch stick
    let ax = 0, az = 0;
    let touchSprint = false;
    let padSprint = false;
    // Camera settle freezes WASD so "forward" isn't mid-swing relative. Circuit
    // ready also freezes jump-to-start until the chase cam sits behind the rings;
    // once running, thrust stays live (never re-lock Space mid-flight).
    const moveLocked = !!camCue.current?.inputLock;
    if (controlsEnabled && !moveLocked) {
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
    // Venue floors (Amphitheatre sand, Circuit LaunchPad) sit at y≈0. Host
    // heightfield is gated off (!inVenue) and lives at an unrelated height —
    // using it here made restY float above/below the real pad so the capsule
    // fell through after the settle timeout (Circuit: instant "fall" fail on
    // load). Flat 0 aligns restY + spawn-settle with the actual floor collider.
    const floorY = inAmphitheatre || circuitMode ? 0 : worldWalkHeight(t.x, t.z, shape, spawnKnoll, ascentFoot);
    const restY = floorY + FOOT_OFF; // capsule half-height + radius (2/3-scale body)
    // Venue: the host-terrain safety net (below) used to force ground.current≥1
    // with no matching exit while the capsule sat below the wild heightfield. That
    // left sensorGround stuck true aloft — hold-Space kept flight (v.y>0.6 skips the
    // jump refund) but releasing thrust sank vy and refunded jumps → walk anim mid-air
    // with the pack retracting. Clear any poison once clearly above the sand/pad.
    if ((inAmphitheatre || circuitMode) && t.y > restY + 1.0) ground.current = 0;
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
      // Keep spawn yaw applied while pinned — this branch used to return before the
      // body-polish rotation write, so a cold Circuit load could show the robot
      // facing the return portal until the pad sensor fired.
      if (inner.current) {
        inner.current.rotation.order = "YXZ";
        inner.current.rotation.set(0, heading.current, 0);
      }
      if (sensorGround) {
        settled.current = true;
        if (camCue.current) camCue.current.bodyReady = true;
      } else if (performance.now() - spawnAt.current < 1200) {
        rb.setTranslation({ x: t.x, y: restY, z: t.z }, true);
        rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
        return;
      } else {
        settled.current = true;
        if (camCue.current) camCue.current.bodyReady = true;
      }
    } else if (camCue.current && !camCue.current.bodyReady) {
      camCue.current.bodyReady = true;
    }

    // Circuit ready: keep soles on the pad until Jump-to-start. Does not early-
    // return — jump edge still needs to reach onCircuitStart below.
    if (circuitMode && circuitPhase === "ready" && t.y < restY - 0.2) {
      const sx = spawnPos ? spawnPos[0] : t.x;
      const sz = spawnPos ? spawnPos[2] : t.z;
      rb.setTranslation({ x: sx, y: restY, z: sz }, true);
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
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
    // we launched), so a multi-jump isn't refunded mid-takeoff.
    // Circuit running must NOT refund — pad contact on the ignition frame used to
    // zero jumps and cut the pack, then a later void fall read as LIFE LOST.
    if (grounded && v.y <= 0.6 && !circuitRunning) jumps.current = 0;

    // Shift is sprint-only — fire superrun the moment it's held with movement
    // (no charge delay). Ends as soon as sprint or movement drops.
    const sprinting = sprint && len > 0 && !flyingMode;
    const superActive = sprinting;
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

    // ── Circuit auto-forward runner (climb-feel §4) ──
    // Once the sector is live the pack pushes +Z at cruise. Altitude (jump hold)
    // is the skill; W surges, S brakes + soft dive, A/D is a light lateral nudge.
    // Ignition on the ready→running edge deploys the jetpack so you don't have to double-tap.
    if (circuitRunning && !wasCircuitRunning.current) {
      jumps.current = FLY_TRIGGER + 1;
      jetBurst.current++;
      heading.current = 0;
      circuitAirborne.current = false;
      circuitSettled.current = false;
      circuitPrevPos.current = null; // fresh sample chain — no stale Z from last life
      if (inner.current) inner.current.rotation.set(0, 0, 0);
    }
    wasCircuitRunning.current = circuitRunning;

    if (circuitRunning) {
      const speedMult = ascentSessionMods().cruiseSpeedMult;
      // Matched to layout gapSec (same soul as mobile Climb cruise).
      const band = sectorFlightBand(circuitSectorIdx);
      const cruise =
        (az > 0.2 ? band.surge : az < -0.2 ? band.brake : band.cruise) * speedMult;
      // Soft rail settle (parity with mobile) + light A/D craft nudge around the rail.
      // Camera-relative right so D/→ still reads screen-right under the chase lens.
      const rail = railAtZ(circuitCheckpoints, t.z);
      const nudge = right.x * ax * WALK * 0.4;
      const settleVx = (rail.x + nudge - t.x) * 9.5;
      const tvx = settleVx;
      const tvz = cruise;
      const k = 1 - Math.exp(-(flyingMode ? ACCEL_FLY : ACCEL_GROUND) * dt);
      rb.setLinvel({ x: v.x + (tvx - v.x) * k, y: v.y, z: v.z + (tvz - v.z) * k }, true);
      // Ease facing down-track, soft yaw into the rail bend.
      const wantYaw = rail.yaw * 0.5;
      let d = wantYaw - heading.current;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      heading.current += d * (1 - Math.exp(-TURN_AIR * dt));
    } else if (moveLen > 0) {
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

    // jump input: held state (for hold-to-fly) + rising edge (for discrete hops).
    // Ready pad: Space must start the sector even during the arrive inputLock
    // (title card still up) — same "press to go" as mobile Climb.
    const canJump =
      controlsEnabled &&
      (circuitMode
        ? circuitRunning || !moveLocked || circuitPhase === "ready"
        : !moveLocked);
    const space = canJump && !!keys["Space"];
    const spaceEdge = space && !prevSpace.current;
    prevSpace.current = space;
    const tj = touchBtn.current ? touchBtn.current.jump : 0;
    const touchEdge = canJump && tj > prevTouchJump.current;
    prevTouchJump.current = tj;
    // gamepad A — rising-edge hop + held for hold-to-fly, mirroring Space
    const padJ = getPad();
    const padJumpEdge = canJump && padJ.jump > prevPadJump.current;
    prevPadJump.current = padJ.jump;
    const jumpEdge = spaceEdge || touchEdge || padJumpEdge;
    const jumpHeld = space || (canJump && (!!touchBtn.current?.jumpHeld || padJ.jumpHeld));

    // Ready pad: jump / first thrust starts the sector (shared with mobile Climb's first press).
    if (circuitMode && !circuitRunning && jumpEdge && onCircuitStart) {
      onCircuitStart();
    }

    // ── Circuit hazard collision → stumble (docs/circuit-world.md §1) ──
    // The SAME pure-time hazards the mobile Climb renders, tested against the
    // Handler capsule (approx sphere). A hit is never a death: it kills the
    // climb, shoves you down, and locks thrust for a beat — you can still catch
    // yourself before the fall floor. `stumbleActive` gates thrust below.
    let stumbleActive = state.clock.elapsedTime < stumbleLock.current;
    let justStumbled = false;
    if (circuitMode && circuitHazards.length > 0 && controlsEnabled && state.clock.elapsedTime >= stumbleGrace.current) {
      const tt = state.clock.elapsedTime;
      const ses = ascentSessionMods();
      for (const h of circuitHazards) {
        if (hazardHits(h, tt, t.x, t.y, t.z)) {
          stumbleLock.current = tt + ses.stumbleLockS;
          stumbleGrace.current = tt + ses.stumbleImmuneS;
          stumbleActive = true;
          justStumbled = true;
          thrust.current = 0;
          stumbleSfx();
          onCircuitStumble?.();
          break;
        }
      }
    }

    // Crown cache — optional mid-gap pickup (never required to clear).
    if (circuitMode && circuitRunning && circuitCrownCache && crownCacheHits(circuitCrownCache, t.x, t.y, t.z)) {
      onCircuitCrownCollect?.();
    }

    // ── hold-to-fly ──
    // Once airborne from the first hop (but not yet flying), keeping the jump button
    // held spools a short timer that auto-deploys the pack. This makes flight
    // discoverable by feel — press to hop, keep holding to rise — without teaching the
    // double-tap. Reset the moment the button is released, we're grounded, or we've
    // already deployed, so a quick tap stays a plain jump.
    if (jumpHeld && !grounded && jumps.current > 0 && jumps.current <= FLY_TRIGGER) {
      flyHold.current += dt;
      if (flyHold.current >= FLY_HOLD_DEPLOY) {
        jumps.current = FLY_TRIGGER + 1; // cross the threshold → pack deploys below
        jetBurst.current++;
        flyHold.current = 0;
      }
    } else if (!jumpHeld || grounded) {
      flyHold.current = 0;
    }

    // tick the pre-landing jump buffer down; a touchdown inside the window fires it
    if (jumpBuffer.current > 0) jumpBuffer.current = Math.max(0, jumpBuffer.current - dt);

    if (jumps.current > FLY_TRIGGER) {
      // ── jetpack flight — accel climb + cruise glide + idle fall ──
      // Held jet punches up through gravity (flap skill). Forward cruise without
      // thrust eases toward a slight sink. No forward intent → hard fall. We only
      // touch Y — the steering block above already wrote X/Z — and gravityScale
      // is 0 while flying (setGravityScale above), so this fully owns vertical.
      const cv = rb.linvel();
      // thrust command still spools (0..1) purely to pace the jet-puff cadence
      thrust.current += (((jumpHeld && !stumbleActive) ? 1 : 0) - thrust.current) * (1 - Math.exp(-FLY_SPOOL * dt));
      const held = jumpHeld && !stumbleActive;
      // Circuit always auto-forwards; open world needs the front stick (az > 0).
      const cruising = !stumbleActive && (circuitRunning || az > 0.2);
      // Circuit S/↓ (or open-world reverse stick): brake already slowed +Z; deepen
      // the sink so high→low gates are reachable. Space still owns climb.
      const diving = !held && !stumbleActive && az < -0.2 && (circuitRunning || cruising);
      let vy = cv.y;
      // instant kick on a NEW press (never during a stumble lock)
      if (jumpEdge && !stumbleActive) vy = Math.max(vy, 0) + FLY_PRESS_KICK;
      if (held) {
        vy = Math.max(-FLY_MAX_FALL, Math.min(FLY_MAX_RISE, vy + (FLY_THRUST_ACCEL - FLY_GRAVITY) * dt));
      } else if (diving) {
        const ses = ascentSessionMods();
        const k = 1 - Math.exp(-(ses.diveGlide || FLY_DIVE_GLIDE) * dt);
        vy = vy + ((ses.diveSink || FLY_DIVE_SINK) - vy) * k;
        vy = Math.max(-FLY_MAX_FALL, vy);
      } else if (cruising) {
        const ses = ascentSessionMods();
        const k = 1 - Math.exp(-(ses.cruiseGlide || FLY_CRUISE_GLIDE) * dt);
        vy = vy + ((ses.cruiseSink || FLY_CRUISE_SINK) - vy) * k;
      } else {
        vy = Math.max(-FLY_MAX_FALL, vy - FLY_GRAVITY * dt);
      }
      rb.setLinvel({ x: cv.x, y: vy, z: cv.z }, true);
      jetEmit.current += dt;
      const emitGap = 0.045 + (1 - thrust.current) * 0.085; // tighter puffs at full thrust
      if (jetEmit.current > emitGap) { jetEmit.current = 0; jetBurst.current++; }
    } else if (jumpEdge || (grounded && jumpBuffer.current > 0)) {
      // ── jump buffering (~120ms) ── a tap made while FALLING just above the
      // floor is held and fired the frame we land, so "jump the instant I touch
      // down" always lands a fresh ground hop instead of spending the air-jump
      // (or worse, deploying the pack) centimetres off the dirt. Rising taps
      // still chain the multi-jump / double-tap deploy unchanged.
      if (jumpEdge && !grounded && v.y < -0.5 && t.y <= restY + JUMP_BUFFER_H && jumps.current > 0) {
        jumpBuffer.current = JUMP_BUFFER_S;
      } else {
        jumpBuffer.current = 0;
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
    }
    // apply the stumble shove AFTER the flight/jump velocity write so it wins the
    // frame: kill any upward climb, punch downward, and bleed horizontal drive
    if (justStumbled) {
      const lv = rb.linvel();
      rb.setLinvel({ x: lv.x * 0.5, y: ascentSessionMods().stumbleVy, z: lv.z * 0.5 }, true);
      if (camCue.current) camCue.current.zoom = Math.min(1, camCue.current.zoom + 0.5);
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
      // stride frequency compensates the 2/3 body (stride LENGTH shrank with it)
      // so the feet keep tracking the ground instead of skating
      const strideK = 1 / READER_SCALE;
      setAnim(sprint ? "run" : "walk", { timeScale: superActive && sprint ? strideK * 1.8 : strideK });
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
    const locomoting = cur.current === "walk" || cur.current === "run";
    if (fl && fr) {
      if (footTuck.current > 0.001) {
        eHang.current.set(-FLY_FOOT * footTuck.current, 0, 0);
        qFootHang.current.setFromEuler(eHang.current);
        fl.quaternion.copy(footBind.current.l).multiply(qFootHang.current);
        fr.quaternion.copy(footBind.current.r).multiply(qFootHang.current);
      } else if (!locomoting) {
        // idle / hover only — Walking & Running keyframe the feet; resetting here
        // every grounded frame was wiping the gait and made the body slide.
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
    // Skip in the Amphitheatre: walkable floor is the venue slab at y=0, not the
    // host heightfield. Using terrainHeight here yanked the body toward wild Y and
    // poisoned ground.current (see sensor clear above) — flight collapsed to walk
    // the moment Space was released.
    if (!circuitMode && !inAmphitheatre) {
      const p = rb.translation();
      const floorYNet = worldWalkHeight(p.x, p.z, shape, spawnKnoll, ascentFoot);
      const FEET = FOOT_OFF;
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
      handlerHeading.current = heading.current;
      camCue.current.speed = Math.hypot(lv.x, lv.z);
      camCue.current.moving = len > 0;
      camCue.current.flying = flyingMode;
      // vertical velocity drives the in-flight camera tilt (climb → look up,
      // sink → look down). Zero on the ground so the tilt only applies aloft.
      camCue.current.climb = flyingMode ? lv.y : 0;
      camCue.current.superrun = superActive;
      camCue.current.headingSteer = headingSteer;
      // on-screen stick held → freeze the camera's yaw auto-follow (below) so the
      // camera-relative move basis can't rotate under the input. That feedback loop
      // (steer → camera chases heading → basis rotates → steer more) was the
      // walk/fly-in-circles. Touch stick is the only writer of touchMove, so this
      // stays false for keyboard/gamepad, which keep their adventure-cam follow.
      camCue.current.touchActive =
        !!touchMove.current && Math.hypot(touchMove.current.x, touchMove.current.y) > 0.02;
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
    // turn rate (rad/s) from this frame's applied heading change — drives the bank
    let dHead = heading.current - prevHeading.current;
    dHead = Math.atan2(Math.sin(dHead), Math.cos(dHead));
    prevHeading.current = heading.current;
    const turnRate = dt > 0 ? dHead / dt : 0;
    let tgtLeanX = 0;
    let tgtLeanZ = 0;
    if (flyingMode) {
      const att = flightAttitudePlanar(lv2.x, lv2.z, heading.current, 1);
      tgtLeanX = att.pitch;
      tgtLeanZ = att.roll;
    } else if (superActive) {
      tgtLeanX = Math.min(0.42, hspeed * 0.035);
    }
    // bank into ground turns — a small speed-scaled roll toward the inside of the
    // arc so direction changes read as carving, not a flat pivot. Heading turns
    // right as it increases, and negative Z-roll banks right, hence the minus.
    // Capped tiny (~9°) and speed-gated so idle shuffles stay upright.
    if (!flyingMode && grounded && moveLen > 0 && !useSettings.getState().reduceMotion) {
      tgtLeanZ += THREE.MathUtils.clamp(-turnRate * 0.06, -0.75, 0.75) * Math.min(1, hspeed / RUN) * 0.22;
    }
    const ls = 1 - Math.exp(-10 * dt);
    leanX.current += (tgtLeanX - leanX.current) * ls;
    leanZ.current += (tgtLeanZ - leanZ.current) * ls;
    // squash-&-stretch impulse eases back to neutral
    stretch.current += (0 - stretch.current) * (1 - Math.exp(-9 * dt));
    if (inner.current) {
      // BUG-FIX (flight pose): the default XYZ euler order applied the pitch
      // around the WORLD x-axis, so flying along +x turned the forward lean into
      // a sideways roll (and the bank into a pitch). YXZ = heading first, then
      // body-LOCAL pitch (leanX) and bank (leanZ) — the pose now tracks the
      // flight direction whatever the heading. Visual-only group, so the capsule
      // collider never tilts.
      inner.current.rotation.order = "YXZ";
      inner.current.rotation.set(leanX.current, heading.current, leanZ.current);
      const s = stretch.current;
      // squash-&-stretch rides ON TOP of the 2/3 body scale
      inner.current.scale.set(READER_SCALE * (1 - s * 0.12), READER_SCALE * (1 + s * 0.18), READER_SCALE * (1 - s * 0.12));
    }

    // ── flight ground-rings ──
    // Detach the foot rings and sink them toward the floor while aloft: thrust
    // (holding Space) drives them to the bottom of their travel where they
    // oscillate; releasing eases them home; descending rides them up. The inner
    // ring travels furthest so the pair fans out with depth.
    if (ringBig.current || ringSmall.current) {
      const reduce = useSettings.getState().reduceMotion;
      const climbV = lv2.y; // + up / − down
      const airborne = flying.current || !grounded;
      // sink tied to the eased thrust command; only meaningful while flying
      const sinkT = reduce ? 0 : (flying.current ? thrust.current : 0);
      // upward ride while actually descending in the air
      const fallT = reduce || !airborne || climbV >= 0 ? 0 : Math.min(1, -climbV / RING_FALL_REF);
      ringOscT.current += dt;
      // wobble sits at the BOTTOM of travel (0 → up to +amp), scaled by thrust
      const osc = RING_OSC_AMP * (0.5 - 0.5 * Math.cos(ringOscT.current * RING_OSC_HZ * Math.PI * 2)) * sinkT;
      const tgtBig = -RING_SINK_BIG * sinkT + RING_FALL_UP * fallT + osc * 0.4;
      const tgtSmall = -RING_SINK_SMALL * sinkT + RING_FALL_UP * fallT + osc;
      const rk = 1 - Math.exp(-RING_EASE * dt);
      ringYBig.current += (tgtBig - ringYBig.current) * rk;
      ringYSmall.current += (tgtSmall - ringYSmall.current) * rk;
      if (ringBig.current) ringBig.current.position.y = (0.04 - FOOT_OFF) + ringYBig.current;
      if (ringSmall.current) ringSmall.current.position.y = (0.045 - FOOT_OFF) + ringYSmall.current;
    }

    let next: NearTarget = null;
    // Venue exit portals (Circuit return + Amphitheatre) — proximity only; the
    // screen auto-crosses on enter (no E). Same shape for every game venue.
    if (!matchActive && inVenue && venueExitTarget) {
      const ex = venueExitTarget;
      const dh = Math.hypot(t.x - ex.pos.x, t.z - ex.pos.z);
      const dy = Math.abs(t.y - ex.pos.y);
      if (dh < ex.radius && dy < ex.radius) next = { kind: "venue-exit", label: ex.label };
    }
    if (!matchActive && circuitMode && circuitCpNextRef) {
      const pos = { x: t.x, y: t.y, z: t.z };
      // Always keep the real previous sample. A old "teleport → prev = now"
      // shortcut dropped plane-crosses on lag spikes, so the finish never cleared
      // and the void fail showed LIFE LOST / You fell after a clean run.
      const prev = circuitPrevPos.current ?? pos;
      // Shared with mobile Climb: crossing a gate's Z-plane outside the opening = miss.
      // Catch up any gates already behind us (hitch overshoot) in one frame.
      // XY is lerped onto each gate plane — end-of-hitch pose must not judge earlier rings.
      if (circuitRunning && !circuitSettled.current && onCircuitPass) {
        const mod = sectorModifier(circuitSectorIdx);
        const tSec = state.clock.elapsedTime;
        let guard = 0;
        while (guard++ < 12 && !circuitSettled.current) {
          const idx = circuitCpNextRef.current;
          const cp = circuitCheckpoints[idx];
          if (!cp) {
            // Past the last ring without a finish latch — still count as clear.
            circuitSettled.current = true;
            const last = circuitCheckpoints[circuitCheckpoints.length - 1];
            if (last) onCircuitPass(last.index);
            break;
          }
          const live = liveGateCheckpoint(
            { pos: cp.posTuple, radius: cp.radius, index: cp.index },
            mod,
            tSec,
          );
          let cross = circuitGatePlaneCross(prev, pos, live);
          // Recovery: a prior spike left us past the plane with no pass/miss event.
          if (cross == null && t.z >= live.pos[2]) {
            cross = circuitGateResolveAtOrPast(prev, pos, live);
          }
          if (cross == null) break;
          if (cross === "pass") {
            // Latch before onCircuitPass — React phase is async; finish must not
            // lose a race to fall / atCircuitFinishEarly in the same frame.
            if (cp.finish || idx >= circuitCheckpoints.length - 1) {
              circuitSettled.current = true;
            }
            onCircuitPass(cp.index);
            circuitCpNextRef.current = idx + 1;
            continue;
          }
          if (cross === "miss" && onCircuitFail) {
            const now = performance.now();
            if (now - failCooldown.current > 800) {
              failCooldown.current = now;
              circuitSettled.current = true;
              onCircuitFail("gates", { x: t.x, y: t.y, z: t.z, heading: heading.current });
            }
          }
          break;
        }
      }
      circuitPrevPos.current = { x: t.x, y: t.y, z: t.z };
      if (circuitRunning && onCircuitSample) onCircuitSample(t.y, t.z);
      const nextIdx = circuitCpNextRef.current;
      if (
        circuitRunning &&
        !circuitSettled.current &&
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
          circuitSettled.current = true;
          onCircuitFail("gates", { x: t.x, y: t.y, z: t.z, heading: heading.current });
        }
      }
      // Fall / ground hit after leaving the pad — spends a life (continue) or ends the run.
      // Ready stays safe — circuitRunning is false until the launch jump.
      // Never after settle (finish clear) — void beyond the last ring is not a death.
      if (circuitRunning && !circuitSettled.current) {
        if (!grounded && t.y > restY + 0.85) circuitAirborne.current = true;
        const fellToVoid = t.y < -6;
        const landedAfterFlight = circuitAirborne.current && grounded;
        if ((fellToVoid || landedAfterFlight) && onCircuitFail) {
          const now = performance.now();
          if (now - failCooldown.current > 800) {
            failCooldown.current = now;
            circuitSettled.current = true;
            onCircuitFail("fall", { x: t.x, y: t.y, z: t.z, heading: heading.current });
          }
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
      // Portals auto-cross on the screen (no E) — detect the plane, not a huge pad.
      if (returnTarget) {
        const planeY = returnTarget.y - 1 + PORTAL_OPEN_Y;
        const dh = Math.hypot(t.x - returnTarget.x, t.z - returnTarget.z);
        const dy = Math.abs(t.y - planeY);
        if (dh < 3.6 && dy < 3.2) next = { kind: "return" };
      }
      if (!next && circuitTunnelTarget) {
        // Ascent Portal plane at the summit crown — walk/fly through the disc
        const mx = circuitTunnelTarget.pos.x;
        const mz = circuitTunnelTarget.pos.z;
        const baseY = ascentFoot?.baseY ?? circuitTunnelTarget.pos.y - 1;
        const planeY = baseY + ASCENT_PEAK_H + PORTAL_OPEN_Y;
        const dh = Math.hypot(t.x - mx, t.z - mz);
        const dy = Math.abs(t.y - planeY);
        if (dh < 3.6 && dy < 3.2) next = { kind: "venue-enter", venue: "circuit", label: circuitTunnelTarget.label };
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
  }, 1);

  return (
    <>
      {!isHub && !inVenue && <TrainPad pos={trainPad} beacon={padBeacon} />}
      <SuperrunTrail superrunRef={superrun} posRef={handlerPos} headingRef={heading} burstRef={runBurst} h={built.h * READER_SCALE} />
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
            : [spawnKnoll.x, terrainHeight(spawnKnoll.x, spawnKnoll.z, shape, spawnKnoll) + FOOT_OFF + 0.1, spawnKnoll.z]
        }
        enabledRotations={[false, false, false]}
        canSleep={false}
        ccd
      >
        <CapsuleCollider args={[CAP_HALF, CAP_RAD]} />
        <CuboidCollider
          args={[0.3 * READER_SCALE, 0.2 * READER_SCALE, 0.3 * READER_SCALE]}
          position={[0, -0.95 * FOOT_OFF, 0]}
          sensor
          onIntersectionEnter={() => { ground.current++; }}
          onIntersectionExit={() => { ground.current = Math.max(0, ground.current - 1); }}
        />
        {/* interpolated camera anchor — origin-aligned with the body, no offset */}
        <group ref={camAnchor} />
        <group
          visible={
            !matchActive &&
            !(
              circuitMode &&
              (circuitPhase === "sector" || circuitPhase === "done" || circuitPhase === "failed")
            )
            // "continue" keeps the body visible beside the departing ghost
            // Matches hide the Trainer entirely — only the two champions stay on stage
          }
        >
          <group ref={inner} position={[0, -FOOT_OFF, 0]} scale={READER_SCALE}>
            <primitive object={built.root} />
            <ReaderRankEmblem level={readerLv} />
            {!force && <ReaderBackSigil height={built.h} />}
            <Jetpack h={built.h} flyingRef={flying} burstRef={jetBurst} />
          </group>
          {/* Reader ground rings — gold by default; pledged adds a Force outer band.
              They detach + sink toward the floor while flying (see RING_* + the
              flight ground-rings block above). Bigger outer ring rides higher; the
              smaller inner ring sinks lowest. */}
          <mesh ref={ringBig} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04 - FOOT_OFF, 0]}>
            <ringGeometry args={[0.39, 0.5, 40]} />
            <meshBasicMaterial color={force ? TYPE_COLOR[force] : GOLD} transparent opacity={0.78} side={THREE.DoubleSide} />
          </mesh>
          {force && (
            <mesh ref={ringSmall} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.045 - FOOT_OFF, 0]}>
              <ringGeometry args={[0.32, 0.38, 40]} />
              <meshBasicMaterial color={GOLD} transparent opacity={0.85} side={THREE.DoubleSide} />
            </mesh>
          )}
          {/* Sector number lives on the screen title card (CircuitHud) during ready. */}
        </group>
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
// default follow distance — pulled in closer so the champion reads bigger and
// the framing feels planted right behind them (nearer + lower was the ask)
const CAM_DIST_DEFAULT = 8.6;
// resting over-the-shoulder pitch on the ground/venue — lower than the old 0.34
// so the lens sits nearer eye-level behind the character (less top-down)
const PITCH_GROUND = 0.26;
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
    camera.position.lerp(tmp.current.set(cx, cy, cz), 1 - Math.exp(-3.7 * dt));
    camera.lookAt(ARENA[0], 2.2, ARENA[2]);
  });
  return null;
}

const CIRCUIT_INTRO_HOLD_S = 1.5;
/** Arrival + title card share CIRCUIT_SECTOR_INTRO — chase-from-behind, then settle. */
const CIRCUIT_ARRIVE_HOLD_S = CIRCUIT_SECTOR_INTRO.arriveHoldS;
const CIRCUIT_CONTINUE_ARRIVE_HOLD_S = CIRCUIT_SECTOR_INTRO.continueArriveHoldS;
const CIRCUIT_ARRIVE_SWEEP_S = CIRCUIT_SECTOR_INTRO.arriveSweepS;

function CircuitLifeGhost({
  pose,
  force,
  onDone,
}: {
  pose: { x: number; y: number; z: number; heading: number };
  force?: CreatureType | null;
  onDone?: () => void;
}) {
  const prefersReduced = usePrefersReducedMotion();
  const reduceMotion = useSettings((s) => s.reduceMotion);
  return (
    <CircuitGhostLeave
      pose={pose}
      force={force}
      reducedMotion={prefersReduced || reduceMotion}
      onDone={onDone}
    />
  );
}

function CameraController({
  match,
  handlerPos,
  camCue,
  camDrag,
  shape,
  galleryFocus,
  inCircuit = false,
  circuitPhase = null,
  matchWide = false,
  clanShot = null,
  summitShot = null,
  circuitArriveNonce = 0,
}: {
  match: MatchView | null;
  handlerPos: React.RefObject<THREE.Vector3>;
  camCue: React.RefObject<CamCue>;
  camDrag: React.RefObject<CamDrag>;
  shape: TerrainShape;
  galleryFocus?: React.RefObject<GalleryFocus | null>;
  inCircuit?: boolean;
  circuitPhase?: CircuitPhase | null;
  /** Pull the bout camera back on touch so both fighters stay in frame. */
  matchWide?: boolean;
  /** Clan swear shot — frame Trainer + rising flag; free look disabled. */
  clanShot?: { x: number; z: number } | null;
  /** Peak claim — brief look at the summit champion smoke-in. */
  summitShot?: { x: number; y: number; z: number } | null;
  /** Bumped on life-continue to re-arm the front-facing arrive hold. */
  circuitArriveNonce?: number;
}) {
  const { camera, gl } = useThree();
  // Circuit: start behind the Trainer looking down-track (yaw = heading + π).
  // Amphitheatre / wilds default yaw 0 already puts the camera behind a −Z spawn.
  const yaw = useRef(inCircuit ? Math.PI : 0);
  const pitch = useRef(PITCH_GROUND);
  const dist = useRef(CAM_DIST_DEFAULT);
  // wheel/pinch write the TARGET; `dist` eases toward it each frame so zoom is a
  // smooth dolly rather than a per-notch snap (and recenter's reset glides too)
  const distTarget = useRef(CAM_DIST_DEFAULT);
  // eased look-ahead offset in the run direction (lookAt target only — see below)
  const leadX = useRef(0);
  const leadZ = useRef(0);
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
  const recenterPitch = useRef(PITCH_GROUND);
  // Circuit race intro: brief chase settle after Jump-to-start.
  const circuitIntroHold = useRef(0);
  // Arrival: hold behind the Trainer looking at the rings, then settle into chase.
  const circuitArriveHold = useRef(0);
  // Seconds remaining of "don't steer" while the chase cam settles (enter / intro).
  // Separate from generic recenter so mid-run takeoff sweeps don't freeze controls.
  const circuitInputLock = useRef(0);
  const prevCircuitPhase = useRef<CircuitPhase | null>(null);
  // eased 0..1 weight of "frame the Scrying Gallery ring" — ramps up as the player
  // nears the live bout and decays back to free third-person on leave
  const galleryW = useRef(0);
  // clan swear: eased 0→1 progress for a slow push-in beside the flag
  const clanShotT = useRef(0);
  const clanShotActive = useRef(false);

  useEffect(() => {
    if (!inCircuit) {
      circuitIntroHold.current = 0;
      circuitArriveHold.current = 0;
      circuitInputLock.current = 0;
      prevCircuitPhase.current = null;
      if (camCue.current) camCue.current.inputLock = false;
      return;
    }
    // Arrival: lens behind the Trainer looking down-track at the rings
    // (heading + π). Never open on the return portal (z=-20). Circuit heading
    // is always 0 — don't trust a stale camCue default of π.
    // Re-arms on life-continue (circuitArriveNonce).
    const hold =
      circuitPhase === "continue" ? CIRCUIT_CONTINUE_ARRIVE_HOLD_S : CIRCUIT_ARRIVE_HOLD_S;
    const h = inCircuit ? 0 : (camCue.current?.heading ?? 0);
    if (camCue.current && inCircuit) camCue.current.heading = 0;
    yaw.current = h + Math.PI; // behind character → rings ahead
    pitch.current = PITCH_GROUND;
    distTarget.current = CAM_DIST_DEFAULT;
    recenter.current = 0; // arrive hold owns the lens — ignore spawn recenters
    circuitArriveHold.current = hold;
    circuitInputLock.current = hold + CIRCUIT_ARRIVE_SWEEP_S;
    if (camCue.current) camCue.current.inputLock = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only remount / nonce should re-arm
  }, [inCircuit, camCue, circuitArriveNonce]);

  useEffect(() => {
    if (clanShot) {
      clanShotT.current = 0;
      clanShotActive.current = true;
    } else {
      clanShotActive.current = false;
      clanShotT.current = 0;
    }
  }, [clanShot]);

  useEffect(() => {
    const el = gl.domElement;
    const onDown = (e: PointerEvent) => {
      // Ignore look input until the Trainer capsule has settled — clicks during
      // the GLB/blank window were pitching the lens into the floor/void.
      if (camCue.current && !camCue.current.bodyReady) return;
      dragging.current = true;
      last.current = { x: e.clientX, y: e.clientY };
    };
    const onUp = () => { dragging.current = false; };
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      if (camCue.current && !camCue.current.bodyReady) {
        dragging.current = false;
        return;
      }
      const st = useSettings.getState();
      const sens = st.camSensitivity;
      yaw.current -= (e.clientX - last.current.x) * 0.005 * sens;
      const dy = (e.clientY - last.current.y) * 0.004 * sens * (st.invertY ? -1 : 1);
      pitch.current = Math.min(PITCH_MAX, Math.max(PITCH_MIN, pitch.current - dy));
      last.current = { x: e.clientX, y: e.clientY };
      lastInput.current = performance.now();
    };
    const onWheel = (e: WheelEvent) => {
      if (camCue.current && !camCue.current.bodyReady) return;
      e.preventDefault();
      distTarget.current = Math.min(120, Math.max(6, distTarget.current + e.deltaY * 0.012));
      lastInput.current = performance.now();
    };
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
      recenterPitch.current = PITCH_GROUND;
      distTarget.current = CAM_DIST_DEFAULT; // eased by the per-frame zoom damp — no distance snap
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
      // dt-based orbit + exponential ease (was per-frame constants — the director
      // cam orbited twice as fast at 120fps and crawled at 30)
      dirYaw.current += (cin ? 0.108 : 0.18) * dt;
      const tx = ARENA[0], ty = cin ? 1.45 : 1.6, tz = ARENA[2];
      const orbit = matchWide ? (cin ? 14.5 : 20) : cin ? 10.5 : 14;
      const cy = matchWide ? (cin ? 5.4 : 7.4) : cin ? 4.85 : 6.2;
      const cx = tx + Math.sin(dirYaw.current) * orbit;
      const cz = tz + Math.cos(dirYaw.current) * orbit;
      camera.position.lerp(tmp.current.set(cx, cy, cz), 1 - Math.exp(-(cin ? 3.4 : 2.5) * dt));
      camera.lookAt(tx, ty, tz);
      return;
    }

    // Peak claim — short cinematic on the summit while the champion appears.
    if (summitShot) {
      const hp = handlerPos.current;
      const fx = summitShot.x - hp.x;
      const fy = summitShot.y - hp.y;
      const fz = summitShot.z - hp.z;
      const fl = Math.hypot(fx, fz) || 1;
      const nx = fx / fl;
      const nz = fz / fl;
      // Stand a few meters back from the player toward the guardian, slightly high.
      const cx = hp.x + nx * 2.4 - nz * 1.6;
      const cz = hp.z + nz * 2.4 + nx * 1.6;
      const cy = hp.y + 2.2 + Math.min(2.5, Math.max(0, fy) * 0.15);
      camera.position.lerp(tmp.current.set(cx, cy, cz), 1 - Math.exp(-4.2 * dt));
      camera.lookAt(summitShot.x, summitShot.y + 0.6, summitShot.z);
      return;
    }

    // Clan swear ceremony — three-quarter shot of Trainer + rising mast.
    // Slow push-in; look stays on the flag cloth so the raise/lower reads.
    if (clanShot && clanShotActive.current) {
      clanShotT.current = Math.min(1, clanShotT.current + dt / 8);
      const u = clanShotT.current;
      const hp = handlerPos.current;
      const fx = clanShot.x - hp.x;
      const fz = clanShot.z - hp.z;
      const fl = Math.hypot(fx, fz) || 1;
      const nx = fx / fl;
      const nz = fz / fl;
      const sx = -nz;
      const sz = nx;
      const pull = 8.4 - u * 1.6;
      const side = 3.1 - u * 0.35;
      const cy = hp.y + 2.55 + u * 0.35;
      const cx = hp.x - nx * pull + sx * side;
      const cz = hp.z - nz * pull + sz * side;
      const lookY = 3.2 + u * 1.6;
      camera.position.lerp(tmp.current.set(cx, cy, cz), 1 - Math.exp(-3.8 * dt));
      camera.lookAt(clanShot.x, lookY, clanShot.z);
      return;
    }

    const st = useSettings.getState();
    const cueEarly = camCue.current;
    const bodyReady = cueEarly?.bodyReady ?? false;
    // drain touch orbit / pinch deltas accumulated by the on-screen look pad
    const drag = camDrag.current;
    if (drag && (drag.dx || drag.dy || drag.pinch)) {
      if (!bodyReady) {
        drag.dx = 0; drag.dy = 0; drag.pinch = 0;
      } else {
        const sens = st.camSensitivity;
        yaw.current -= drag.dx * 0.005 * sens;
        const pdy = drag.dy * 0.004 * sens * (st.invertY ? -1 : 1);
        pitch.current = Math.min(PITCH_MAX, Math.max(PITCH_MIN, pitch.current - pdy));
        if (drag.pinch) distTarget.current = Math.min(120, Math.max(6, distTarget.current - drag.pinch * 0.02));
        drag.dx = 0; drag.dy = 0; drag.pinch = 0;
        lastInput.current = performance.now();
      }
    }

    // gamepad right stick — free look (rate-based, scaled by sensitivity)
    const pad = getPad();
    if (bodyReady && pad.connected && (pad.rx || pad.ry)) {
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
    // dt-based decay of the one-shot punch-in (0.9/0.86 per frame @60fps equiv)
    if (cue) cue.zoom *= Math.exp(-(flying ? 6.3 : 9) * dt);

    // one-shot programmatic recenter (e.g. the first Concord landing parks the
    // lens behind the champion, framing the Grounds gate it's been turned toward)
    if (cue?.recenter) {
      cue.recenter = false;
      // Arrival hold owns the lens — don't let Handler spawn recenter yank us to chase early.
      if (circuitArriveHold.current > 0) {
        // ignore
      } else {
        recenter.current = 0.9;
        recenterPitch.current = PITCH_GROUND;
        distTarget.current = CAM_DIST_DEFAULT; // glides in via the zoom damp below, no snap
        cue.zoom = Math.min(1.2, cue.zoom + 0.4);
        // Try-again / pad teleport on Circuit ready — lock sticks until the swing ends.
        if (inCircuit && circuitPhase === "ready") {
          circuitInputLock.current = Math.max(circuitInputLock.current, 1.0);
        }
      }
    }

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
      recenterPitch.current = flying ? PITCH_FLY_UP : PITCH_GROUND;
      if (cue) cue.zoom = Math.min(1.2, cue.zoom + 0.4);
    }
    prevFlying.current = flying;

    if (cue?.superrun && !prevSuperrun.current) {
      recenter.current = 0.55;
      recenterPitch.current = PITCH_GROUND;
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
      // Early Jump-to-start: kill arrive hold/lock so thrust + chase are live now.
      circuitArriveHold.current = 0;
      circuitInputLock.current = 0;
      if (cue) cue.inputLock = false;
      // Snap chase cam behind the flyer looking down-track + wind-tunnel FOV punch.
      circuitIntroHold.current = CIRCUIT_INTRO_HOLD_S;
      if (cue) {
        cue.heading = 0;
        yaw.current = Math.PI;
        if (!st.reduceMotion) cue.zoom = Math.min(1.35, cue.zoom + 0.55);
      }
    }
    if (inCircuit) prevCircuitPhase.current = circuitPhase;
    else prevCircuitPhase.current = null;

    // Arrival: hold behind the Trainer looking at the rings, ease distance in,
    // then soft settle into chase. Keep yaw correct even before the capsule settles
    // (stale heading π used to open on the return portal).
    const circuitArriveActive = inCircuit && circuitArriveHold.current > 0;
    if (circuitArriveActive) {
      const trackH = 0; // Circuit faces +Z / rings
      if (cue) cue.heading = trackH;
      if (!bodyReady) {
        yaw.current = trackH + Math.PI;
        pitch.current = PITCH_GROUND;
        dragging.current = false;
      } else {
        const holdBefore = circuitArriveHold.current;
        circuitArriveHold.current = Math.max(0, circuitArriveHold.current - dt);
        const holdSpan =
          circuitPhase === "continue" ? CIRCUIT_CONTINUE_ARRIVE_HOLD_S : CIRCUIT_ARRIVE_HOLD_S;
        const u = 1 - circuitArriveHold.current / holdSpan; // 0→1
        // Stay behind (+π); tiny lateral drift so it isn't locked-still.
        const drift = Math.sin(u * Math.PI) * 0.08;
        yaw.current = trackH + Math.PI + drift;
        pitch.current = PITCH_GROUND - 0.04 * (1 - u);
        distTarget.current = CAM_DIST_DEFAULT * (1.1 - 0.1 * u);
        if (holdBefore > 0 && circuitArriveHold.current === 0) {
          recenter.current = CIRCUIT_ARRIVE_SWEEP_S;
          recenterPitch.current = PITCH_GROUND;
          distTarget.current = CAM_DIST_DEFAULT;
          if (cue) cue.zoom = Math.min(1.2, cue.zoom + 0.28);
        }
      }
    }

    const circuitIntroActive = inCircuit && circuitIntroHold.current > 0;
    if (circuitIntroActive) {
      const holdBefore = circuitIntroHold.current;
      circuitIntroHold.current = Math.max(0, circuitIntroHold.current - dt);
      if (holdBefore > 0 && circuitIntroHold.current === 0) {
        recenter.current = 0.9;
        recenterPitch.current = PITCH_GROUND;
      }
    }
    const circuitFrontLock = inCircuit && (circuitPhase === "ready" || circuitIntroActive || circuitArriveActive);

    const recentering = recenter.current > 0 && !dragging.current && !circuitArriveActive;
    if (recenter.current > 0) recenter.current = Math.max(0, recenter.current - dt);
    // Keep input locked while the body isn't ready so Jump-to-start can't fire
    // into a half-loaded pad, and don't burn the settle timer during the blank.
    if (!bodyReady && inCircuit) {
      circuitInputLock.current = Math.max(circuitInputLock.current, 0.05);
    } else if (circuitInputLock.current > 0) {
      circuitInputLock.current = Math.max(0, circuitInputLock.current - dt);
    }

    // Freeze move/jump only during Circuit enter/intro settle — not mid-run takeoff recenters.
    if (cue) cue.inputLock = circuitInputLock.current > 0;

    if (recentering && cue) {
      // deliberate, eased swing to directly behind the character + pitch reset —
      // overrides the mouse-input cooldown so the companion always re-frames
      let d = cue.heading + Math.PI - yaw.current;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      const r = Math.min(1, dt * 5);
      yaw.current += d * r;
      pitch.current += (recenterPitch.current - pitch.current) * r;
    } else if (flying && cue && !cue.touchActive && st.camAssist && performance.now() - lastInput.current > 600) {
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
        const up = Math.min(1, climb / FLY_MAX_RISE);
        pitchTarget = PITCH_FLY_HOVER + up * (PITCH_FLY_UP - PITCH_FLY_HOVER);
      } else if (climb < -0.15) {
        const dn = Math.min(1, -climb / FLY_MAX_FALL);
        pitchTarget = PITCH_FLY_HOVER + dn * (PITCH_FLY_DOWN - PITCH_FLY_HOVER);
      }
      pitch.current += (pitchTarget - pitch.current) * Math.min(1, dt * 2.6);
    } else if (cue && moving && !cue.touchActive && st.camAssist && !cue.reverse && !cue.headingSteer && !circuitFrontLock && performance.now() - lastInput.current > 900) {
      let d = cue.heading + Math.PI - yaw.current;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      yaw.current += d * Math.min(1, dt * (1.4 + speed01 * 2.4));
    }

    // smooth zoom: ease the actual distance toward the wheel/pinch target so each
    // notch is a short dolly move instead of a step (dt-based, fps-independent)
    dist.current += (distTarget.current - dist.current) * (1 - Math.exp(-8 * dt));
    followDist.current += (speed01 * 6 - followDist.current) * Math.min(1, dt * 4);
    const flyZoom = flying ? 0 : zoom;
    const eff = Math.max(5, dist.current + followDist.current - flyZoom * 6);

    // Sway reads nice in a cutscene but shifts the camera-relative steer basis —
    // keep the rig steady on foot so W walks in a straight line.
    const swayX = 0;
    const swayY = 0;

    // pivot rides at ~chest height: the capsule centre sits lower on the 2/3
    // body, so the old +0.4 aimed over the head — +0.27 keeps the same fraction
    let tx = hp.x, ty = hp.y + 0.27 + flyZoom * 0.3, tz = hp.z;
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

    // ── camera lead ── ease the LOOK target a step ahead of the run so the
    // character yields frame space toward where they're going. Look-target only:
    // the orbit stays anchored on the player, so the camera-relative steer basis
    // (camera→player) is untouched and W still walks a straight line.
    const leadAmt = !st.reduceMotion && moving && !cue?.reverse ? speed01 * (cue?.superrun ? 2.2 : 1.2) : 0;
    const lk = 1 - Math.exp(-3 * dt);
    leadX.current += (Math.sin(cue?.heading ?? 0) * leadAmt - leadX.current) * lk;
    leadZ.current += (Math.cos(cue?.heading ?? 0) * leadAmt - leadZ.current) * lk;
    // gallery framing wins over the lead as it blends in
    camera.lookAt(tx + leadX.current * (1 - gw), ty, tz + leadZ.current * (1 - gw));

    const cam = camera as THREE.PerspectiveCamera;
    // reduced motion: hold a steady FOV (no speed swell / action-cam punch).
    // Circuit wind tunnel: swell while flying. Open-world flight stays flat (no fisheye).
    // On foot, speed swell + optional superrun kick.
    const targetFov = st.reduceMotion
      ? 52
      : inCircuit && flying
        ? 58 + flyZoom * 5
        : flying
          ? 52
          : 52 + speed01 * 10 + (cue?.superrun ? 4 : 0) + flyZoom * 6;
    if (Math.abs(cam.fov - targetFov) > 0.01) {
      cam.fov += (targetFov - cam.fov) * (1 - Math.exp(-3 * dt));
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
  const DEAD = 0.18; // inner deadzone (fraction of R) — swallows thumb drift so a
                     // resting/settling thumb reads as zero input, not a slow curve
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
    setKnob({ x: dx, y: dy }); // knob visual always tracks the finger
    if (!move.current) return;
    // Map finger distance → throttle with an inner deadzone and a gentle expo.
    // The deadzone kills drift; the expo gives a large fine-control zone near
    // centre (small tilt = slow, deliberate steer) that ramps to full at the rim.
    const nm = Math.min(1, d / R);
    if (nm <= DEAD) { move.current.x = 0; move.current.y = 0; return; }
    const t = (nm - DEAD) / (1 - DEAD); // 0..1 past the deadzone
    const mag = t * (0.55 + 0.45 * t);  // eased response (≈ smooth ramp to 1)
    const ux = dx / d, uy = dy / d;     // unit direction (d > 0 here)
    move.current.x = ux * mag;
    move.current.y = -uy * mag;
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
