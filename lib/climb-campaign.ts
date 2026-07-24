// Flight campaign — camps, first-light chests, scout starts (docs/climb-p2.md).
// Pure helpers so store, server sanitize, and circuit-lite agree.

import { CLIMB_SECTOR_COUNT, REACH_SIZE } from "@/components/grounds/climb/difficulty";

export interface ClimbProgress {
  /** Best ranked depth ever (soul fact, cross-device). */
  bestSectors: number;
  /** Highest camp index lit (0..10). Camp n ≈ Reach n boundary. */
  campsLit: number;
  /** Cleared all 100 ranked at least once. */
  hundred?: boolean;
  /** Camp index → ms epoch first lit (one-time chests + de-dupe). */
  firstLit?: Record<number, number>;
  /** UTC day index for scout Crown cap. */
  scoutDay?: number;
  /** Crowns already paid from scout today. */
  scoutCrownsToday?: number;
}

export const EMPTY_CLIMB: ClimbProgress = {
  bestSectors: 0,
  campsLit: 0,
  firstLit: {},
};

/** Soft daily craft cap so scout never out-farms ranked Crowns/min. */
export const SCOUT_CROWNS_DAY_CAP = 120;
export const SCOUT_XP_MULT = 0.5;
export const SCOUT_CROWN_MULT = 0.25;

/** First-light chest Crowns for camp index 1..10 (100 → 1000). */
export function firstLightChestCrowns(camp: number): number {
  const n = Math.max(1, Math.min(10, Math.floor(camp)));
  return n * 100;
}

/** One-time purse for clearing the Hundred ranked. */
export const HUNDRED_CHEST_CROWNS = 2500;

/** 0-based sector index where a scout from Camp n (1-based) begins. */
export function scoutStartSector(camp: number): number {
  const n = Math.max(1, Math.min(10, Math.floor(camp)));
  return (n - 1) * REACH_SIZE;
}

/** How many Reaches a depth has touched (ceil sectors/10, cap 10). */
export function reachesFromSectors(sectors: number): number {
  if (sectors <= 0) return 0;
  return Math.min(10, Math.ceil(Math.min(CLIMB_SECTOR_COUNT, sectors) / REACH_SIZE));
}

export interface LightCampResult {
  climb: ClimbProgress;
  /** Newly lit camp indices (1..10), for chests + saga events. */
  newlyLit: number[];
  /** True when this run first set `hundred`. */
  hundredJustCleared: boolean;
}

/**
 * Apply a ranked run's depth to the campaign spine.
 * Scout runs must NOT call this — camps are ranked-only.
 * `silent` stamps camps/firstLit without reporting newlyLit (migrate local PB).
 */
export function lightCamp(
  prev: ClimbProgress | null | undefined,
  sectors: number,
  clearedAll = false,
  now = Date.now(),
  opts?: { silent?: boolean },
): LightCampResult {
  const base: ClimbProgress = {
    bestSectors: Math.max(0, Math.min(CLIMB_SECTOR_COUNT, Math.floor(prev?.bestSectors ?? 0))),
    campsLit: Math.max(0, Math.min(10, Math.floor(prev?.campsLit ?? 0))),
    hundred: !!prev?.hundred,
    firstLit: { ...(prev?.firstLit ?? {}) },
    scoutDay: prev?.scoutDay,
    scoutCrownsToday: prev?.scoutCrownsToday,
  };
  const depth = Math.max(0, Math.min(CLIMB_SECTOR_COUNT, Math.floor(sectors)));
  const reaches = reachesFromSectors(depth);
  const newlyLit: number[] = [];
  const firstLit = { ...base.firstLit };
  for (let n = base.campsLit + 1; n <= reaches; n++) {
    if (firstLit[n] == null) firstLit[n] = now;
    newlyLit.push(n);
  }
  const hundredJustCleared = clearedAll && !base.hundred;
  const silent = !!opts?.silent;
  return {
    climb: {
      ...base,
      bestSectors: Math.max(base.bestSectors, depth),
      campsLit: Math.max(base.campsLit, reaches),
      firstLit,
      hundred: base.hundred || clearedAll || undefined,
    },
    newlyLit: silent ? [] : newlyLit,
    hundredJustCleared: silent ? false : hundredJustCleared,
  };
}

/** Clamp a climb blob from save / server (never throws). */
export function sanitizeClimb(raw: unknown): ClimbProgress {
  if (!raw || typeof raw !== "object") return { ...EMPTY_CLIMB, firstLit: {} };
  const c = raw as Partial<ClimbProgress>;
  const firstLit: Record<number, number> = {};
  if (c.firstLit && typeof c.firstLit === "object") {
    for (const [k, v] of Object.entries(c.firstLit)) {
      const n = Number(k);
      if (!Number.isFinite(n) || n < 1 || n > 10) continue;
      if (typeof v === "number" && Number.isFinite(v) && v > 0) firstLit[Math.floor(n)] = Math.floor(v);
    }
  }
  return {
    bestSectors: Math.max(0, Math.min(CLIMB_SECTOR_COUNT, Math.floor(Number(c.bestSectors) || 0))),
    campsLit: Math.max(0, Math.min(10, Math.floor(Number(c.campsLit) || 0))),
    hundred: c.hundred ? true : undefined,
    firstLit,
    scoutDay: typeof c.scoutDay === "number" && Number.isFinite(c.scoutDay) ? Math.floor(c.scoutDay) : undefined,
    scoutCrownsToday:
      typeof c.scoutCrownsToday === "number" && Number.isFinite(c.scoutCrownsToday)
        ? Math.max(0, Math.floor(c.scoutCrownsToday))
        : undefined,
  };
}
