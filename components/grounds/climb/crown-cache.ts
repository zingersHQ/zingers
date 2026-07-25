// Mid-corridor Crown caches — optional pickups BETWEEN gates, never on the
// required gate path. Same gold octahedron language as wilds DiscoveryCache.
// Collect = +Crowns. Missing one never fails the sector.

import { DESKTOP_VERT_SCALE } from "./body-scale";
import { maxClimbDeltaY, maxDiveDeltaY } from "./flyer-budget";
import { FLYER_RADIUS } from "./hazards";

export const CROWN_CACHE_ODDS = 0.125;
export const CROWN_CACHE_CROWNS = 25;
/** Collect sphere — generous enough to snag on a deliberate climb/dive. */
export const CROWN_CACHE_RADIUS = 0.95;
/** Wilds / Flight shared treasure gold (DiscoveryCache). */
export const CROWN_CACHE_COLOR = "#f5d020";

export interface CrownCache {
  x: number;
  y: number;
  z: number;
  radius: number;
}

type Gate = { pos: [number, number, number]; radius: number; finish?: boolean };

/**
 * Roll at most one Crown cache for this sector, parked mid-gap off the glide
 * line. Odds match the old gold-ring rate; Gold Eye still bumps chance.
 */
export function rollCrownCache(
  checkpoints: Gate[],
  oddsMult = 1,
  cruise: number,
): CrownCache | null {
  const odds = Math.min(0.45, CROWN_CACHE_ODDS * Math.max(0.25, oddsMult));
  if (checkpoints.length < 3 || cruise <= 0.1 || Math.random() >= odds) return null;

  // Candidate gaps: between consecutive gates, skip finish→nothing.
  // Prefer gaps that are not the last approach to finish so greed isn't a
  // last-second suicide into the sector end.
  const gaps: number[] = [];
  for (let i = 0; i < checkpoints.length - 1; i++) {
    const a = checkpoints[i]!;
    const b = checkpoints[i + 1]!;
    if (b.finish && gaps.length > 0) continue; // keep finish approach clean when we can
    gaps.push(i);
  }
  if (gaps.length === 0) {
    for (let i = 0; i < checkpoints.length - 1; i++) gaps.push(i);
  }
  const gi = gaps[Math.floor(Math.random() * gaps.length)]!;
  const a = checkpoints[gi]!;
  const b = checkpoints[gi + 1]!;

  const tt = 0.42 + Math.random() * 0.16; // mid-gap, not hugging either gate
  const x = a.pos[0] + (b.pos[0] - a.pos[0]) * tt;
  const yLine = a.pos[1] + (b.pos[1] - a.pos[1]) * tt;
  const z = a.pos[2] + (b.pos[2] - a.pos[2]) * tt;

  const gapSec = Math.max(0.35, Math.abs(b.pos[2] - a.pos[2]) / cruise);
  // Half-gap time ≈ when you meet the cache; budgets are climb-canonical × scale
  // (both Flight bodies fly the desktop-scaled track).
  const half = gapSec * 0.48;
  const up = maxClimbDeltaY(half) * DESKTOP_VERT_SCALE;
  const dn = maxDiveDeltaY(half) * DESKTOP_VERT_SCALE;
  if (up < 0.55 && dn < 0.55) return null; // gap too tight for a fair detour

  // Easy / medium / hard — never maxes the full budget (headroom for late flaps).
  const roll = Math.random();
  const frac = roll < 0.34 ? 0.38 : roll < 0.72 ? 0.58 : 0.78;
  const climb = Math.random() < 0.5;
  const budget = climb ? up : dn;
  const clear = Math.max(a.radius, b.radius) * 0.7; // off the aperture so straight flight misses
  const mag = Math.min(budget * 0.9, Math.max(clear, budget * frac));
  const dy = (climb ? 1 : -1) * mag;

  return { x, y: yLine + dy, z, radius: CROWN_CACHE_RADIUS };
}

/** Crown payout (wing traits / Golden Hour can bump). */
export function crownCacheCrowns(crownsMult = 1): number {
  return Math.max(1, Math.round(CROWN_CACHE_CROWNS * Math.max(0.25, crownsMult)));
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
