// Pure world-layout helpers — kept free of React/three so they stay testable and
// shared between the 3D scene (world.tsx) and the HUD (compass / grounds-screen).
//
// Three jobs:
//   1. landmarksOf    — where each district sits in a world (arena/train/spire/tower)
//   2. bandAgents     — split the ladder population into ground roamers vs the climb
//   3. discoveryNodes — deterministic loot caches scattered through the wilds
import type { TowerAgent } from "@/lib/types";
import type { BiomeConfig } from "./biomes";
import { PLAZA_R, TERRAIN_HALF, terrainHeight, shapeOf, spawnKnollFor, type TerrainShape } from "./terrain";

const TWO_PI = Math.PI * 2;

// stable 0..1 hash from a string (FNV-1a) — deterministic placement seeds
export function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 100000) / 100000;
}

// the UTC day index — rotates daily content (roamer spots, loot) without RNG noise
export function dayKey(now = Date.now()): number {
  return Math.floor(now / 86_400_000);
}

// ── Districts ────────────────────────────────────────────────────────────────
export type LandmarkKind = "arena" | "train" | "spire" | "tower";

export interface Landmark {
  kind: LandmarkKind;
  label: string;
  sub: string;
  color: string;
  pos: [number, number, number]; // ground-level world position
}

// Arena stays the central hub (matches stage there); train + spire spread to
// distinct rim sectors per biome; the tower sits out on the hills.
export function landmarksOf(biome: BiomeConfig): Landmark[] {
  const shape = shapeOf(biome);
  const knoll = spawnKnollFor(biome);
  const lm = biome.scene.landmarks;
  const train: [number, number, number] = [Math.cos(lm.train.angle) * lm.train.dist, 0, Math.sin(lm.train.angle) * lm.train.dist];
  // The Keepers are now scattered, each atop its own staircase. The landmark
  // points at the entry Keeper (Tibble, rank 1) — the closest, lowest climb on the
  // spire bearing; the other four are found by their beacons further out. (Must
  // match keeperSites() in world.tsx: i=0 → spire angle, rBase PLAZA_R.)
  const keeperEntry: [number, number, number] = [Math.cos(lm.spire.angle) * PLAZA_R, terrainHeight(Math.cos(lm.spire.angle) * PLAZA_R, Math.sin(lm.spire.angle) * PLAZA_R, shape, knoll), Math.sin(lm.spire.angle) * PLAZA_R];
  const tcx = Math.cos(biome.scene.towerAngle) * (PLAZA_R + 9);
  const tcz = Math.sin(biome.scene.towerAngle) * (PLAZA_R + 9);
  const tower: [number, number, number] = [tcx, terrainHeight(tcx, tcz, shape, knoll), tcz];
  return [
    { kind: "arena", label: "The Arena", sub: "duels & gauntlet", color: biome.lights.arenaPoint, pos: [0, 0, 0] },
    { kind: "train", label: "Training Pad", sub: "raise your champion", color: biome.lights.trainPoint, pos: train },
    { kind: "spire", label: "The Keepers", sub: "five climbs in the wilds", color: "#c77dff", pos: keeperEntry },
    { kind: "tower", label: "The Tower", sub: "ranked ladder climb", color: biome.platform.top, pos: tower },
  ];
}

export function landmarkOf(biome: BiomeConfig, kind: LandmarkKind): Landmark {
  return landmarksOf(biome).find((l) => l.kind === kind)!;
}

// ── Agent bands ──────────────────────────────────────────────────────────────
// The lowest-rated slice roams the open ground (easy, walk-up challenges); the
// rest hold the Tower, weakest near the base and the strongest at the summit —
// so altitude reads as difficulty.
export interface AgentBands {
  roamers: TowerAgent[];
  tower: TowerAgent[];
}

export function bandAgents(agents: TowerAgent[]): AgentBands {
  const sorted = [...agents].sort((a, b) => a.rating - b.rating);
  // up to a third of the board (capped) becomes ground roamers
  const roamN = Math.min(6, Math.floor(sorted.length * 0.35));
  return { roamers: sorted.slice(0, roamN), tower: sorted.slice(roamN) };
}

// where a roaming agent stands — a deterministic mid-field spot that rotates by
// day so the open ground feels alive without being random noise.
export function roamerSpot(id: string, day: number, shape: TerrainShape): [number, number, number] {
  const a = hash01(`${id}@${day}`) * TWO_PI;
  const r = 18 + hash01(`${id}#${day}`) * 16; // 18..34 — out of the arena, spread across the plaza
  const x = Math.cos(a) * r;
  const z = Math.sin(a) * r;
  return [x, terrainHeight(x, z, shape), z];
}

// ── Discovery nodes ──────────────────────────────────────────────────────────
export type NodeKind = "crown" | "fragment";

export interface DiscoveryNode {
  id: string;
  kind: NodeKind;
  pos: [number, number, number];
  flight: boolean; // perched high — reachable only by jetpack
  crowns: number;
  fragments: number;
}

// A fixed handful of caches per world per day, seeded by the biome + day so every
// player on a given day shares the same hunt and it refreshes at the UTC rollover.
export function discoveryNodes(biome: BiomeConfig, day: number): DiscoveryNode[] {
  const shape = shapeOf(biome);
  const knoll = spawnKnollFor(biome);
  const COUNT = 9;
  const out: DiscoveryNode[] = [];
  for (let i = 0; i < COUNT; i++) {
    const id = `${biome.id}-${day}-${i}`;
    const a = hash01(`${id}:a`) * TWO_PI;
    const rr = hash01(`${id}:r`);
    const r = PLAZA_R + 8 + rr * (TERRAIN_HALF - PLAZA_R - 30); // out in the wilds, spread to the far rim
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const flight = hash01(`${id}:f`) < 0.4; // ~40% perched high — flight-gated
    const ground = terrainHeight(x, z, shape, knoll);
    const y = flight ? ground + 15 + hash01(`${id}:h`) * 12 : ground + 1.1;
    // fragments are rarer & worth more reach; crowns are the common find
    const kind: NodeKind = hash01(`${id}:k`) < (flight ? 0.6 : 0.35) ? "fragment" : "crown";
    const crowns = kind === "crown" ? 60 + Math.round(hash01(`${id}:c`) * 90) : 0;
    const fragments = kind === "fragment" ? 1 + (flight ? 1 : 0) : 0;
    out.push({ id, kind, pos: [x, y, z], flight, crowns, fragments });
  }
  return out;
}
