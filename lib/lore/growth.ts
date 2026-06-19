// ─────────────────────────────────────────────────────────────────────────────
// World growth — how built-up a region looks. The world is not static terrain;
// it ACCRETES. A region's development is a 0..1 blend of three drivers, quantised
// to a build TIER the 3D layer reads to add structures (a wild slab at tier 0, a
// full district/city at tier MAX). Pure + deterministic, no React/three, so the
// scene, the HUD, and any server snapshot all agree.
//
// The three drivers (the "combo" the design settled on):
//   • SEASON (time)      — the world matures as the Chronicle advances; the
//                          season's featured region surges ahead. "A door opens,
//                          a slab grows." Weight 0.5.
//   • RANK   (you)       — your Reader rank reveals the world you've earned; a
//                          higher Reader sees a more built-up place. Weight 0.3.
//   • WAR    (allegiance)— the Force winning the season-long war raises the
//                          districts of regions it's aligned to. Weight 0.2.
// ─────────────────────────────────────────────────────────────────────────────
import type { CreatureType } from "@/lib/types";

export const MAX_TIER = 4; // 0 = wild slab · 4 = full district/city

export interface GrowthInput {
  regionId: string;
  regionBias: CreatureType; // the Force this region rewards (canon RegionLore.bias)
  seasonNumber: number; // current season N (>= 1)
  featuredRegionId: string; // the Chronicle's spotlight region this season
  readerLevel: number; // the player's Reader rank
  warLeader: CreatureType | null; // the Force currently winning the season war (null = unknown)
}

export interface RegionGrowth {
  tier: number; // 0..MAX_TIER — the integer the scene reads
  frac: number; // 0..1 — overall development (for smooth UI like a progress bar)
  featured: boolean; // is this the season's spotlight region?
  drivers: { season: number; rank: number; war: number }; // each 0..1, for debugging/UI
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

// Weights sum to 1; tuned so a brand-new account in season 1 still sees a legible
// (tier 1) town in the featured region, and the world fills out over ~a year of
// seasons even for a casual Reader.
const W_SEASON = 0.5;
const W_RANK = 0.3;
const W_WAR = 0.2;
const SEASON_MATURE = 12; // seasons to "fully grown" from time alone
const RANK_REVEAL = 20; // Reader level at which your reveal maxes out

export function regionGrowth(i: GrowthInput): RegionGrowth {
  const featured = i.regionId === i.featuredRegionId;
  // time: the whole world rises slowly; the featured region jumps a third ahead.
  const season = clamp01((Math.max(1, i.seasonNumber) - 1) / SEASON_MATURE + (featured ? 0.35 : 0));
  // you: your climb pulls the curtain back on the world you've earned.
  const rank = clamp01(i.readerLevel / RANK_REVEAL);
  // war: a region whose Force is winning the season swells with banners & build.
  const war = i.warLeader && i.warLeader === i.regionBias ? 1 : 0;
  const frac = clamp01(season * W_SEASON + rank * W_RANK + war * W_WAR);
  return { tier: Math.round(frac * MAX_TIER), frac, featured, drivers: { season, rank, war } };
}
