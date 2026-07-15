// The Climb — difficulty as a FUNCTION, not a slope (docs/climb.md §3).
//
// Every sector's feel is derived deterministically from three integers:
//   • sector index `i`  (0..99)
//   • reach `b0`        (0..9)   — which 10-sector band / sky we're in
//   • role  `k`         (1..10)  — the beat within the reach (the 10-beat bar §2)
// so the layout is identical for every player (fairness + shareability) and no
// level data is stored — `sectorDifficulty(i)` is the whole content pipeline.
//
// The one honest unit for gate spacing is SECONDS OF FLIGHT: a gap in seconds ×
// the sector's forward speed = the world-Z distance between rings. That keeps
// the "no dead air beyond a 5s glide" law (§3) meaningful regardless of speed.

export const CLIMB_SECTOR_COUNT = 100;
export const REACH_SIZE = 10;
export const REACH_COUNT = CLIMB_SECTOR_COUNT / REACH_SIZE; // 10

/** 0-based reach band for a 0-based sector (0..9). */
export function reachIndex(sector: number): number {
  return Math.floor(clampSector(sector) / REACH_SIZE);
}

/** 1-based role/beat within the reach (1..10) — the 10-beat bar. */
export function roleIndex(sector: number): number {
  return (clampSector(sector) % REACH_SIZE) + 1;
}

function clampSector(sector: number): number {
  return Math.max(0, Math.min(CLIMB_SECTOR_COUNT - 1, Math.floor(sector)));
}

export type Role =
  | "arrival"
  | "teach"
  | "combine"
  | "rhythm"
  | "pressure"
  | "vista"
  | "twist"
  | "pressure2"
  | "gauntlet"
  | "trial";

const ROLE_BY_K: Role[] = [
  "arrival", // k1
  "teach", // k2
  "combine", // k3
  "rhythm", // k4
  "pressure", // k5
  "vista", // k6
  "twist", // k7
  "pressure2", // k8
  "gauntlet", // k9
  "trial", // k10
];

export function roleOf(sector: number): Role {
  return ROLE_BY_K[roleIndex(sector) - 1]!;
}

export interface SectorDifficulty {
  reach: number; // 0..9
  role: Role;
  k: number; // 1..10
  speed: number; // forward u/s (the flyer's cruise for this sector)
  gateRadius: number; // ring opening radius
  gates: number; // number of rings to thread (excludes the start pad)
  gapSec: [number, number]; // seconds-of-flight between consecutive rings [min,max]
  vertStep: number; // typical vertical delta between rings (world units)
  latAmp: number; // lateral weave amplitude (auto-threaded, affects readability)
}

// Per-role modifiers to the base spacing/rhythm so difficulty saw-tooths inside
// a reach (arrival/vista breathe; pressure/gauntlet/trial bite) instead of
// climbing monotonically. gapSec is in SECONDS; 5.0 is the hard scenic cap.
const ROLE_TUNING: Record<Role, { gap: [number, number]; gates: number; vert: number; lat: number }> = {
  arrival: { gap: [1.7, 2.4], gates: 0, vert: 0.8, lat: 0.7 },
  teach: { gap: [1.7, 2.3], gates: 0, vert: 0.85, lat: 0.8 },
  combine: { gap: [1.4, 2.1], gates: 0, vert: 1.0, lat: 1.0 },
  rhythm: { gap: [1.0, 1.5], gates: 0, vert: 0.9, lat: 1.15 }, // tight cadence, pure flow
  pressure: { gap: [1.2, 1.8], gates: 0, vert: 1.1, lat: 1.15 },
  vista: { gap: [2.8, 5.0], gates: -1, vert: 0.7, lat: 0.6 }, // the screenshot sector: wide, scenic
  twist: { gap: [1.4, 2.1], gates: 0, vert: 1.05, lat: 1.2 },
  pressure2: { gap: [1.1, 1.6], gates: 1, vert: 1.15, lat: 1.2 },
  gauntlet: { gap: [1.1, 1.7], gates: 1, vert: 1.2, lat: 1.25 },
  trial: { gap: [1.3, 2.0], gates: 0, vert: 1.15, lat: 1.0 }, // the reach boss-sector
};

export function sectorDifficulty(sector: number): SectorDifficulty {
  const i = clampSector(sector);
  const b0 = reachIndex(i);
  const k = roleIndex(i);
  const role = roleOf(i);
  const t = ROLE_TUNING[role];

  // speed 8.2 → ~12.5 across the climb; the reach dominates, the beat nudges.
  const speed = Math.min(12.5, 8.2 + 0.38 * b0 + 0.04 * k);

  // rings tighten with altitude, floored so the ~0.7-scale champion always has
  // ≥ ~1.8 body-heights of opening.
  const gateRadius = Math.max(2.55, 4.0 - 0.13 * b0 - 0.02 * k);

  // 4 rings early → 9 deep; pressure/gauntlet beats add one; vista removes one.
  const gates = Math.max(3, Math.min(9, 4 + Math.floor((b0 + 1) / 2) + t.gates));

  const vertStep = t.vert * (1.4 + 0.16 * b0);
  const latAmp = t.lat * (2.0 + 0.28 * b0);

  return { reach: b0, role, k, speed, gateRadius, gates, gapSec: t.gap, vertStep, latAmp };
}
