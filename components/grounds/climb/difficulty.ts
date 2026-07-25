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
//
// Feasibility law (2026-07): gapSec + vertStep stay inside the flyer's accel
// budget (see flyer-budget.ts). Harder roles bite via rhythm + hazards, not
// impossible ΔY in a short window.

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
  speed: number; // forward u/s in climb-canonical (cruise = speed × GAP_SCALE)
  gateRadius: number; // ring opening radius (climb-canonical)
  gates: number; // number of rings to thread (excludes the start pad)
  gapSec: [number, number]; // seconds-of-flight between consecutive rings [min,max]
  vertStep: number; // typical vertical delta between rings (climb-canonical)
  latAmp: number; // lateral weave amplitude (retired on coplanar Flight)
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
// gapSec is in SECONDS; floors raised so ΔY stays inside flyer-budget.
const ROLE_TUNING: Record<Role, { gap: [number, number]; gates: number; vert: number; lat: number }> = {
  arrival: { gap: [1.85, 2.45], gates: 0, vert: 1.1, lat: 0 },
  teach: { gap: [1.7, 2.25], gates: 0, vert: 1.15, lat: 0 },
  combine: { gap: [1.5, 2.05], gates: 0, vert: 1.25, lat: 0 },
  rhythm: { gap: [1.3, 1.55], gates: 0, vert: 1.3, lat: 0 }, // equal cadence, still flappable
  pressure: { gap: [1.4, 1.95], gates: 0, vert: 1.35, lat: 0 },
  vista: { gap: [2.8, 5.0], gates: 0, vert: 0.85, lat: 0 }, // scenic glide
  twist: { gap: [1.5, 2.05], gates: 0, vert: 1.25, lat: 0 },
  pressure2: { gap: [1.3, 1.8], gates: 1, vert: 1.4, lat: 0 },
  gauntlet: { gap: [1.3, 1.85], gates: 1, vert: 1.45, lat: 0 },
  trial: { gap: [1.45, 2.05], gates: 0, vert: 1.3, lat: 0 },
};

export function sectorDifficulty(sector: number): SectorDifficulty {
  const i = clampSector(sector);
  const b0 = reachIndex(i);
  const k = roleIndex(i);
  const role = roleOf(i);
  const t = ROLE_TUNING[role];

  // Canonical forward speed — bodies cruise at speed × DESKTOP_GAP_SCALE so
  // gapSec is real time. Late Reaches bite via rhythm + hazards, not raw mph.
  const speed = Math.min(11.4, 7.7 + 0.3 * b0 + 0.028 * k);

  // Rings tighten with altitude; floor keeps a fair opening for the flyer.
  const gateRadius = Math.max(2.7, 4.2 - 0.12 * b0 - 0.018 * k);

  // SPARSE: 3 early → 5 deep, +1 only on surge/gauntlet. Cap 6.
  // Arrival / Vista stay at 3 forever (short staircase / scenic breath).
  let gates = Math.max(3, Math.min(6, 3 + Math.floor(b0 / 3) + t.gates));
  if (role === "arrival" || role === "vista") gates = 3;

  // Gentler vert ramp — pressure roles still swing more via archetype amps,
  // but the base step stays inside the flyer budget after VERT_SCALE.
  const vertStep = t.vert * (1.3 + 0.1 * b0);
  const latAmp = t.lat * (2.0 + 0.28 * b0);
  const hazardBudget = Math.min(reachHazardCap(b0), ROLE_HAZARD_BUDGET[role]);

  return { reach: b0, role, k, speed, gateRadius, gates, gapSec: t.gap, vertStep, latAmp, hazardBudget };
}
