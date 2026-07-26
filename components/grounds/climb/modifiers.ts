// The Climb — sector modifiers (docs/climb.md §5): the "3% spice", assigned
// deterministically (a modifier is part of a sector's identity, not a roll).
// Drifting gates bob on Y (collision + ring mesh agree via liveGateY).

export type ModifierKind = "swift" | "duskfall" | "goldenHour" | "silentSky" | "driftingGates";

export interface Modifier {
  kind: ModifierKind;
  label: string; // shown on the sector entry banner
  speedMult: number; // forward-speed multiplier
  crownMult: number; // Crowns payout multiplier for the sector
  fogNearMult: number; // pull fog nearer (duskfall)
  moteColor: string | null; // recolour drift motes (golden hour)
  warm: boolean; // warm cosmetic grade (golden hour)
  ambience: number | null; // override music intensity (silent sky)
  /** Drifting gates — vertical bob amplitude (world units on the live track). */
  driftAmp: number;
  /** Drifting gates — bob rate (rad/s). */
  driftCycle: number;
}

function make(kind: ModifierKind, label: string, over: Partial<Modifier>): Modifier {
  return {
    kind,
    label,
    speedMult: 1,
    crownMult: 1,
    fogNearMult: 1,
    moteColor: null,
    warm: false,
    ambience: null,
    driftAmp: 0,
    driftCycle: 0,
    ...over,
  };
}

// 0-based sector index → modifier. Placed per §5: Swift never lands on a hazard
// peak; golden hour rides the Vista (k6) breather sectors; silent sky sits just
// before the two big ceremonies (s50, s100); drifting gates land on Twist (k7)
// from Reach III up.
const BY_INDEX: Record<number, Modifier> = {
  22: make("swift", "SWIFT · the wind has your back", { speedMult: 1.22, crownMult: 1.5 }), // s23
  56: make("swift", "SWIFT · the wind has your back", { speedMult: 1.22, crownMult: 1.5 }), // s57
  85: make("swift", "SWIFT · the wind has your back", { speedMult: 1.22, crownMult: 1.5 }), // s86
  15: make("goldenHour", "GOLDEN HOUR", { moteColor: "#ffcf6a", warm: true, crownMult: 1.15 }), // s16 vista
  55: make("goldenHour", "GOLDEN HOUR", { moteColor: "#ffcf6a", warm: true, crownMult: 1.15 }), // s56 vista
  95: make("goldenHour", "GOLDEN HOUR", { moteColor: "#ffcf6a", warm: true, crownMult: 1.15 }), // s96 vista
  13: make("duskfall", "DUSKFALL · the fog draws in", { fogNearMult: 0.6 }), // Reach II
  44: make("duskfall", "DUSKFALL · the fog draws in", { fogNearMult: 0.6 }), // Reach V
  83: make("duskfall", "DUSKFALL · the fog draws in", { fogNearMult: 0.6 }), // Reach IX
  94: make("duskfall", "DUSKFALL · the fog draws in", { fogNearMult: 0.6 }), // Reach X
  48: make("silentSky", "SILENT SKY", { ambience: 0.05 }), // s49 — before the Amphitheatre roof
  98: make("silentSky", "SILENT SKY", { ambience: 0.05 }), // s99 — before the Hum
  // Twist (k7) drifting gates — Reach III–X (skip when another mod already owns the slot)
  26: make("driftingGates", "DRIFTING GATES · the rings breathe", { driftAmp: 1.15, driftCycle: 1.35 }), // s27
  36: make("driftingGates", "DRIFTING GATES · the rings breathe", { driftAmp: 1.25, driftCycle: 1.45 }), // s37
  66: make("driftingGates", "DRIFTING GATES · the rings breathe", { driftAmp: 1.35, driftCycle: 1.55 }), // s67
  76: make("driftingGates", "DRIFTING GATES · the rings breathe", { driftAmp: 1.4, driftCycle: 1.6 }), // s77
  86: make("driftingGates", "DRIFTING GATES · the rings breathe", { driftAmp: 1.5, driftCycle: 1.7 }), // s87
};

export function sectorModifier(sector: number): Modifier | null {
  return BY_INDEX[Math.floor(sector)] ?? null;
}

/** Live vertical offset for a gate under the drifting-gates modifier. Pure. */
export function driftingGateDy(mod: Modifier | null | undefined, tSec: number, gateIndex: number): number {
  if (!mod || mod.kind !== "driftingGates" || mod.driftAmp <= 0) return 0;
  return Math.sin(tSec * mod.driftCycle + gateIndex * 0.85) * mod.driftAmp;
}

/** Checkpoint with live Y for collision tests (rings bob; opening test must match). */
export function liveGateCheckpoint<T extends { pos: [number, number, number]; radius: number; index?: number }>(
  cp: T,
  mod: Modifier | null | undefined,
  tSec: number,
): Pick<T, "pos" | "radius"> {
  const dy = driftingGateDy(mod, tSec, cp.index ?? 0);
  if (dy === 0) return cp;
  return {
    pos: [cp.pos[0], cp.pos[1] + dy, cp.pos[2]],
    radius: cp.radius,
  };
}
