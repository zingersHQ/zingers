// ─────────────────────────────────────────────────────────────────────────────
// World goals — the few, legible objectives that give a reason to leave the
// plaza. Each region offers exactly three, on a template every player reads at a
// glance: a PEAK (reach the summit — teaches flight), a DEPTH (descend the rift —
// teaches risk traversal), and a SECRET (find a hidden Keeper echo — drops lore).
//
// Goals are deterministic and SEASON-AWARE: their bearings reseed every season,
// so the spotlight rotates and there's always a fresh hunt. The featured region's
// goals pay a premium. Pure (no React/three state) so the scene, the compass and
// the store all agree on where a goal is and what it's worth.
// ─────────────────────────────────────────────────────────────────────────────
import type { BiomeConfig } from "./biomes";
import { PLAZA_R, TERRAIN_HALF, terrainHeight, shapeOf, spawnKnollFor, riftDepthEnd, type TerrainShape, type SpawnKnoll } from "./terrain";
import { hash01 } from "./landmarks";

const TWO_PI = Math.PI * 2;

export type GoalKind = "peak" | "depth" | "secret";

export interface GoalReward {
  crowns: number;
  fragments: number;
  trainerXp: number;
  seasonPoints: number; // contribution to your pledged Force's season war
}

export interface WorldGoal {
  id: string; // `${biome}:s${season}:${kind}` — per-season, so it resets each turn
  kind: GoalKind;
  label: string; // ≤ 3 words, readable from an icon
  hint: string; // one short line
  color: string;
  pos: [number, number, number];
  radius: number; // completion proximity (3D)
  flight: boolean; // true → you must get to altitude to reach it
  reward: GoalReward;
  featured: boolean;
}

// Sweep a coarse polar grid of the wilds and return the highest / lowest sampled
// point. Cheap (runs once per region per season, memoised by the caller) and
// robust — the peak naturally avoids the rift, the depth naturally finds it.
function extreme(shape: TerrainShape, want: "high" | "low", knoll: SpawnKnoll): [number, number, number] {
  let bestY = want === "high" ? -Infinity : Infinity;
  let best: [number, number, number] = [0, 0, 0];
  const ANGLES = 36;
  const rMin = PLAZA_R + 8;
  const rMax = TERRAIN_HALF - 12;
  for (let ai = 0; ai < ANGLES; ai++) {
    const a = (ai / ANGLES) * TWO_PI;
    for (let r = rMin; r <= rMax; r += 3) {
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const y = terrainHeight(x, z, shape, knoll);
      if (want === "high" ? y > bestY : y < bestY) {
        bestY = y;
        best = [x, y, z];
      }
    }
  }
  return best;
}

function scaleReward(base: GoalReward, featured: boolean): GoalReward {
  if (!featured) return base;
  return {
    crowns: Math.round(base.crowns * 1.5),
    fragments: base.fragments,
    trainerXp: base.trainerXp,
    seasonPoints: base.seasonPoints + 1,
  };
}

const BASE: Record<GoalKind, GoalReward> = {
  peak: { crowns: 120, fragments: 1, trainerXp: 40, seasonPoints: 1 },
  depth: { crowns: 90, fragments: 2, trainerXp: 45, seasonPoints: 1 },
  secret: { crowns: 70, fragments: 1, trainerXp: 70, seasonPoints: 2 },
};

/**
 * The three standing goals for a region this season.
 * `featured` (the season's spotlight region) bumps the payout.
 */
export function worldGoals(biome: BiomeConfig, season: number, featured: boolean): WorldGoal[] {
  const shape = shapeOf(biome);
  const knoll = spawnKnollFor(biome);
  const sk = `${biome.id}:s${season}`;

  // PEAK — the highest standing point; reached by flight.
  const peak = extreme(shape, "high", knoll);

  // DEPTH — the rift floor at the far end of the chasm (on the approach route).
  const depth = shape.canyonDepth > 0 ? riftDepthEnd(shape, knoll) : extreme(shape, "low", knoll);

  // SECRET — a hidden Keeper echo on the ground, mid-field, on a seeded bearing
  // kept away from the peak so the three goals don't pile up.
  const sa = hash01(`${sk}:secret:a`) * TWO_PI;
  const sr = PLAZA_R + 8 + hash01(`${sk}:secret:r`) * 36; // out past the plaza, spread mid-field
  const sx = Math.cos(sa) * sr;
  const sz = Math.sin(sa) * sr;
  const secretPos: [number, number, number] = [sx, terrainHeight(sx, sz, shape, knoll) + 0.9, sz];

  return [
    {
      id: `${sk}:peak`,
      kind: "peak",
      label: "The Peak",
      hint: "reach the summit",
      color: biome.platform.top,
      pos: [peak[0], peak[1] + 2.2, peak[2]],
      radius: 4.5,
      flight: true,
      reward: scaleReward(BASE.peak, featured),
      featured,
    },
    {
      id: `${sk}:depth`,
      kind: "depth",
      label: "The Depth",
      hint: shape.canyonDepth > 0 ? "descend the rift" : "reach the low ground",
      color: biome.lights.arenaPoint,
      pos: [depth[0], depth[1] + 1.0, depth[2]],
      radius: 4.5,
      flight: false,
      reward: scaleReward(BASE.depth, featured),
      featured,
    },
    {
      id: `${sk}:secret`,
      kind: "secret",
      label: "The Secret",
      hint: "find what hides",
      color: "#c77dff",
      pos: secretPos,
      radius: 3.6,
      flight: false,
      reward: scaleReward(BASE.secret, featured),
      featured,
    },
  ];
}
