// The Climb — difficulty as a FUNCTION, not a slope (docs/climb.md §3).
//
// Every sector's feel is derived deterministically from three integers:
//   • sector index `i`  (0..99)
//   • reach `b0`        (0..9)   — which 10-sector band / sky we're in
//   • role  `k`         (1..10)  — the beat within the reach (the 10-beat bar §2)
// so the layout is identical for every player (fairness + shareability) and no
// level data is stored — `sectorDifficulty(i)` is the whole content pipeline.
//
// Feel law (2026-07): SPARSE corridors. A sector with five rings in a line is
// garbage — cap gate count, saw-tooth hazards, climb that bites late but stays
// finishable for a dedicated Trainer. Gap unit stays SECONDS OF FLIGHT.

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
  hazardBudget: number; // how many hazards this sector spends (§4)
}

// How many hazards a role spends, before the reach cap. Zero on teaching /
// breather beats so difficulty saw-tooths. Keep budgets ≤ gaps (sectors are
// sparse — never park three hazards in a four-ring corridor).
const ROLE_HAZARD_BUDGET: Record<Role, number> = {
  arrival: 0,
  teach: 1,
  combine: 1,
  rhythm: 0,
  pressure: 2,
  vista: 0,
  twist: 1,
  pressure2: 2,
  gauntlet: 2,
  trial: 2,
};

/** Reach cap — slow ramp so early Flight teaches flap, late Flight exams it. */
const REACH_HAZARD_CAP = [0, 1, 1, 2, 2, 3, 3, 3, 4, 4] as const;

export function reachHazardCap(reach: number): number {
  const i = Math.max(0, Math.min(REACH_HAZARD_CAP.length - 1, Math.floor(reach)));
  return REACH_HAZARD_CAP[i]!;
}

// Per-role modifiers: arrival/vista breathe; pressure/gauntlet/trial bite.
// gapSec is in SECONDS; 5.0 is the hard scenic cap. `gates` nudges sparse base.
const ROLE_TUNING: Record<Role, { gap: [number, number]; gates: number; vert: number; lat: number }> = {
  arrival: { gap: [1.7, 2.3], gates: 0, vert: 1.25, lat: 0 },
  teach: { gap: [1.55, 2.15], gates: 0, vert: 1.3, lat: 0 },
  combine: { gap: [1.35, 1.95], gates: 0, vert: 1.4, lat: 0 },
  rhythm: { gap: [1.05, 1.4], gates: 0, vert: 1.55, lat: 0 }, // tight equal cadence
  pressure: { gap: [1.15, 1.75], gates: 0, vert: 1.6, lat: 0 },
  vista: { gap: [2.8, 5.0], gates: 0, vert: 0.9, lat: 0 }, // scenic glide — still sparse
  twist: { gap: [1.35, 1.95], gates: 0, vert: 1.45, lat: 0 },
  pressure2: { gap: [1.05, 1.55], gates: 1, vert: 1.65, lat: 0 },
  gauntlet: { gap: [1.05, 1.6], gates: 1, vert: 1.7, lat: 0 },
  trial: { gap: [1.25, 1.9], gates: 0, vert: 1.55, lat: 0 },
};

export function sectorDifficulty(sector: number): SectorDifficulty {
  const i = clampSector(sector);
  const b0 = reachIndex(i);
  const k = roleIndex(i);
  const role = roleOf(i);
  const t = ROLE_TUNING[role];

  // speed 8.2 → ~12.2 — slightly gentler than the old 12.5 cap so late Reaches
  // bite via rhythm + hazards, not raw cruise alone.
  const speed = Math.min(12.2, 8.2 + 0.35 * b0 + 0.035 * k);

  // rings tighten with altitude; floor keeps a fair opening for the flyer.
  const gateRadius = Math.max(2.5, 4.05 - 0.14 * b0 - 0.02 * k);

  // SPARSE: 3 early → 5 deep, +1 only on surge/gauntlet. Cap 6 — never a
  // nine-ring ladder. Base = 3 + floor(reach/3) → R0–2:3, R3–5:4, R6–8:5, R9:6.
  // Arrival / Vista stay at 3 forever (short staircase / scenic breath — not a parade).
  let gates = Math.max(3, Math.min(6, 3 + Math.floor(b0 / 3) + t.gates));
  if (role === "arrival" || role === "vista") gates = 3;

  const vertStep = t.vert * (1.55 + 0.14 * b0);
  const latAmp = t.lat * (2.0 + 0.28 * b0);
  const hazardBudget = Math.min(reachHazardCap(b0), ROLE_HAZARD_BUDGET[role]);

  return { reach: b0, role, k, speed, gateRadius, gates, gapSec: t.gap, vertStep, latAmp, hazardBudget };
}
