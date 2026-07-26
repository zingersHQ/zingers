// The Climb — difficulty as a FUNCTION, not a slope (docs/climb.md §3).
//
// Every sector's feel is derived deterministically from three integers:
//   • sector index `i`  (0..99)
//   • reach `b0`        (0..9)   — which 10-sector band / sky we're in
//   • role  `k`         (1..10)  — the beat within the reach (the 10-beat bar §2)
// so the layout is identical for every player (fairness + shareability) and no
// level data is stored — `sectorDifficulty(i)` is the whole content pipeline.
//
// Feel law (2026-07): agile corridors with enough rings to feel like a run
// (not a 3-gate blink). Cap gate count, saw-tooth hazards, climb that bites
// late but stays finishable. Gap unit stays SECONDS OF FLIGHT.
//
// Feasibility law (2026-07): gapSec + vertStep stay inside the flyer's accel
// budget (see flyer-budget.ts). Harder roles bite via rhythm + hazards, not
// impossible ΔY in a short window.
//
// Balance pass (2026-07): mid-run was too soft/monotone through ~s40. Steeper
// saw-tooth, earlier hazard teeth, tighter openings after Reach I, louder
// vertical + soft lateral rail curves (latAmp live again; Reach I stays straight).

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
  latAmp: number; // lateral rail amplitude (climb-canonical; 0 on Reach I)
  hazardBudget: number; // how many hazards this sector spends (§4)
}

// How many hazards a role spends, before the reach cap. Zero on teaching /
// breather beats so difficulty saw-tooths. Keep budgets ≤ gaps (sectors are
// sparse — never park three hazards in a four-ring corridor).
const ROLE_HAZARD_BUDGET: Record<Role, number> = {
  arrival: 0,
  teach: 1,
  combine: 2,
  rhythm: 0,
  pressure: 3,
  vista: 0,
  twist: 2,
  pressure2: 3,
  gauntlet: 3,
  trial: 3,
};

/** Reach cap — teach flap in I; teeth by II–III so mid-run sweats. */
const REACH_HAZARD_CAP = [0, 1, 2, 3, 3, 4, 4, 5, 5, 5] as const;

export function reachHazardCap(reach: number): number {
  const i = Math.max(0, Math.min(REACH_HAZARD_CAP.length - 1, Math.floor(reach)));
  return REACH_HAZARD_CAP[i]!;
}

// Per-role modifiers: arrival/vista breathe; pressure/gauntlet/trial bite.
// gapSec is in SECONDS; floors raised so ΔY stays inside flyer-budget.
// lat > 0 enables soft rail curves (flight-rail.ts) from Reach II up.
const ROLE_TUNING: Record<Role, { gap: [number, number]; gates: number; vert: number; lat: number }> = {
  arrival: { gap: [1.55, 2.05], gates: 0, vert: 1.35, lat: 0.35 },
  teach: { gap: [1.4, 1.9], gates: 0, vert: 1.45, lat: 0.45 },
  combine: { gap: [1.3, 1.75], gates: 0, vert: 1.55, lat: 0.7 },
  rhythm: { gap: [1.1, 1.35], gates: 0, vert: 1.7, lat: 0.95 },
  pressure: { gap: [1.2, 1.65], gates: 1, vert: 1.75, lat: 0.85 },
  vista: { gap: [2.15, 3.3], gates: 0, vert: 1.05, lat: 1.35 },
  twist: { gap: [1.3, 1.75], gates: 0, vert: 1.6, lat: 1.15 },
  pressure2: { gap: [1.12, 1.5], gates: 1, vert: 1.8, lat: 1.05 },
  gauntlet: { gap: [1.08, 1.5], gates: 1, vert: 1.9, lat: 1.25 },
  trial: { gap: [1.2, 1.65], gates: 1, vert: 1.7, lat: 0.95 },
};

export function sectorDifficulty(sector: number): SectorDifficulty {
  const i = clampSector(sector);
  const b0 = reachIndex(i);
  const k = roleIndex(i);
  const role = roleOf(i);
  const t = ROLE_TUNING[role];

  // Canonical forward speed — bodies cruise at speed × DESKTOP_GAP_SCALE
  // (includes FLIGHT_WIND_SCALE) so gapSec stays real time in the wind tunnel.
  const speed = Math.min(12.2, 8.0 + 0.38 * b0 + 0.04 * k);

  // Rings tighten with altitude; Reach I stays fair, mid-run asks for aim.
  const gateRadius = Math.max(2.35, 4.05 - 0.16 * b0 - 0.025 * k);

  // Longer runs: 4 early → 8–9 deep, +1 on surge/gauntlet/trial.
  // Arrival / Vista hold at 4–5 (breath via gap spacing, not stub corridors).
  let gates = Math.max(4, Math.min(9, 4 + Math.floor(b0 / 2.5) + t.gates));
  if (role === "arrival") gates = Math.min(gates, b0 >= 4 ? 5 : 4);
  if (role === "vista") gates = 4;

  // Louder vert — still clamped per-gap in sectors.ts via flyer-budget.
  const vertStep = t.vert * (1.45 + 0.14 * b0);
  // Reach I: straight corridor (teach flap). Curves unlock from Reach II.
  const latAmp = b0 <= 0 ? 0 : t.lat * (2.4 + 0.38 * b0);
  const hazardBudget = Math.min(reachHazardCap(b0), ROLE_HAZARD_BUDGET[role]);

  return { reach: b0, role, k, speed, gateRadius, gates, gapSec: t.gap, vertStep, latAmp, hazardBudget };
}
