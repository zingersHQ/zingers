// Mid-corridor Crown caches — optional pickups BETWEEN gates, never on the
// required gate path. Same gold octahedron language as wilds DiscoveryCache.
//
// Placement is part of sector identity (docs/climb.md §7b): same sector + seed
// → same cache (or none), same gap, same height tier. Presence follows an
// authored role × Reach curve so early Flight teaches greed without spam, and
// pressure beats stay clean. Gold Eye / Conditions bump the presence threshold
// (still deterministic for a given oddsMult).

import { hash01 } from "../landmarks";
import { DESKTOP_VERT_SCALE } from "./body-scale";
import { reachIndex, roleOf, type Role } from "./difficulty";
import { maxClimbDeltaY, maxDiveDeltaY } from "./flyer-budget";
import { FLYER_RADIUS } from "./hazards";

/** Typical mid-ascent payout (Reach VI). Prefer `cache.crowns` / reach table. */
export const CROWN_CACHE_CROWNS = 25;
/** @deprecated Presence is role×Reach authored; kept for wing-trait gloss parity. */
export const CROWN_CACHE_ODDS = 0.125;
/** Collect sphere — generous enough to snag on a deliberate climb/dive. */
export const CROWN_CACHE_RADIUS = 0.95;
/** Wilds / Flight shared treasure gold (DiscoveryCache). */
export const CROWN_CACHE_COLOR = "#f5d020";

export interface CrownCache {
  x: number;
  y: number;
  z: number;
  radius: number;
  /** Base Crowns before wing / Condition mult. */
  crowns: number;
}

type Gate = { pos: [number, number, number]; radius: number; finish?: boolean };

/**
 * Soft presence — how often a non-forced beat still hosts a cache (× Reach mul).
 * Pressure / gauntlet stay lean so greed never crowds the exam.
 */
const ROLE_CACHE_PRESENCE: Record<Role, number> = {
  arrival: 0.45,
  teach: 0.55,
  combine: 0.5,
  rhythm: 0.35,
  pressure: 0.16,
  vista: 0.55,
  twist: 0.4,
  pressure2: 0.12,
  gauntlet: 0.08,
  trial: 0.35,
};

/** Reach density — denser early; taper so late isn't gold spam. */
const REACH_CACHE_MUL = [1, 0.85, 0.72, 0.6, 0.52, 0.48, 0.45, 0.42, 0.4, 0.38] as const;

/** Base Crowns by Reach (0..9). Small early prizes; grow with altitude. */
const REACH_CACHE_CROWNS = [10, 12, 15, 18, 20, 22, 25, 28, 32, 35] as const;

function makeRng(sector: number, seed = ""): () => number {
  const key = seed ? `climb:cache:${seed}:${sector}` : `climb:cache:${sector}`;
  let s = Math.floor(hash01(key) * 2147483646) + 1;
  return () => ((s = (s * 16807) % 2147483647), s / 2147483647);
}

/**
 * Authored beats that always host a cache (when the gap is fair).
 * Vista everywhere; Arrival / Teach / Trial stamp Reach I so early Flight
 * teaches greed without relying on a coin flip.
 */
export function sectorCacheForced(sector: number): boolean {
  const role = roleOf(sector);
  const reach = reachIndex(sector);
  if (role === "vista") return true;
  if (reach === 0 && (role === "arrival" || role === "teach" || role === "trial")) return true;
  if (reach === 1 && role === "teach") return true;
  return false;
}

/** Authored soft presence rate for a sector (before Gold Eye / Condition oddsMult). */
export function sectorCachePresence(sector: number): number {
  if (sectorCacheForced(sector)) return 1;
  const role = roleOf(sector);
  const reach = reachIndex(sector);
  const mul = REACH_CACHE_MUL[Math.max(0, Math.min(REACH_CACHE_MUL.length - 1, reach))] ?? 0.4;
  return ROLE_CACHE_PRESENCE[role] * mul;
}

/** Base Crowns for a sector's Reach band. */
export function sectorCacheCrowns(sector: number): number {
  const reach = reachIndex(sector);
  return REACH_CACHE_CROWNS[Math.max(0, Math.min(REACH_CACHE_CROWNS.length - 1, reach))] ?? CROWN_CACHE_CROWNS;
}

/** Off-line difficulty fraction — easier early, greedier late. */
function difficultyFrac(reach: number, rnd: () => number): number {
  const r = rnd();
  if (reach <= 1) {
    return r < 0.7 ? 0.32 : r < 0.95 ? 0.48 : 0.62;
  }
  if (reach <= 4) {
    return r < 0.34 ? 0.38 : r < 0.72 ? 0.58 : 0.78;
  }
  return r < 0.2 ? 0.42 : r < 0.55 ? 0.62 : 0.85;
}

export interface RollCrownCacheOpts {
  /** Gold Eye / Conditions — widens presence threshold; layout still seeded. */
  oddsMult?: number;
  /** Expedition week seed; "" = frozen Hundred. */
  seed?: string;
}

/**
 * Place at most one Crown cache for this sector, parked mid-gap off the glide
 * line. Deterministic for (sector, seed, oddsMult).
 */
export function rollCrownCache(
  sector: number,
  checkpoints: Gate[],
  cruise: number,
  opts: RollCrownCacheOpts = {},
): CrownCache | null {
  const oddsMult = opts.oddsMult ?? 1;
  const seed = opts.seed ?? "";
  if (checkpoints.length < 3 || cruise <= 0.1) return null;

  const rnd = makeRng(sector, seed);
  const forced = sectorCacheForced(sector);
  if (!forced) {
    const presence = sectorCachePresence(sector);
    const odds = Math.min(0.95, presence * Math.max(0.25, oddsMult));
    if (rnd() >= odds) return null;
  } else {
    rnd(); // consume one draw so forced/soft layouts share the same stream shape
  }

  // Candidate gaps: between consecutive gates, skip finish→nothing.
  // Prefer gaps that are not the last approach to finish so greed isn't a
  // last-second suicide into the sector end.
  const gaps: number[] = [];
  for (let i = 0; i < checkpoints.length - 1; i++) {
    const a = checkpoints[i]!;
    const b = checkpoints[i + 1]!;
    if (b.finish && gaps.length > 0) continue;
    gaps.push(i);
  }
  if (gaps.length === 0) {
    for (let i = 0; i < checkpoints.length - 1; i++) gaps.push(i);
  }
  const gi = gaps[Math.floor(rnd() * gaps.length)]!;
  const a = checkpoints[gi]!;
  const b = checkpoints[gi + 1]!;

  const tt = 0.42 + rnd() * 0.16; // mid-gap, not hugging either gate
  const x = a.pos[0] + (b.pos[0] - a.pos[0]) * tt;
  const yLine = a.pos[1] + (b.pos[1] - a.pos[1]) * tt;
  const z = a.pos[2] + (b.pos[2] - a.pos[2]) * tt;

  const gapSec = Math.max(0.35, Math.abs(b.pos[2] - a.pos[2]) / cruise);
  const half = gapSec * 0.48;
  const up = maxClimbDeltaY(half) * DESKTOP_VERT_SCALE;
  const dn = maxDiveDeltaY(half) * DESKTOP_VERT_SCALE;
  if (up < 0.55 && dn < 0.55) return null; // gap too tight for a fair detour

  const reach = reachIndex(sector);
  const frac = difficultyFrac(reach, rnd);
  const climb = rnd() < 0.5;
  const budget = climb ? up : dn;
  const clear = Math.max(a.radius, b.radius) * 0.7; // off the aperture so straight flight misses
  const mag = Math.min(budget * 0.9, Math.max(clear, budget * frac));
  const dy = (climb ? 1 : -1) * mag;

  return {
    x,
    y: yLine + dy,
    z,
    radius: CROWN_CACHE_RADIUS,
    crowns: sectorCacheCrowns(sector),
  };
}

/** Crown payout from a placed cache (wing traits / Golden Hour can bump). */
export function crownCacheCrowns(baseCrowns: number, crownsMult = 1): number {
  return Math.max(1, Math.round(baseCrowns * Math.max(0.25, crownsMult)));
}

/** Sphere collect test against the flyer. */
export function crownCacheHits(cache: CrownCache, px: number, py: number, pz: number): boolean {
  const dx = px - cache.x;
  const dy = py - cache.y;
  const dz = pz - cache.z;
  const r = cache.radius + FLYER_RADIUS;
  return dx * dx + dy * dy + dz * dz < r * r;
}

// ── Aliases (wing trait / condition ids still say "gold") ───────────────────
export const GOLD_RING_ODDS = CROWN_CACHE_ODDS;
export const GOLD_RING_CROWNS = CROWN_CACHE_CROWNS;
export const goldRingCrowns = crownCacheCrowns;
export const rollGoldRing = rollCrownCache;
