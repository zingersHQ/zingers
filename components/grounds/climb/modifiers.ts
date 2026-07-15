// The Climb — sector modifiers (docs/climb.md §5): the "3% spice", assigned
// deterministically (a modifier is part of a sector's identity, not a roll).
// This first pass ships the modifiers that don't touch the gate-collision
// contract — Swift (the faster tracks), plus three atmosphere mutators. Drifting
// gates / crosswind (which move the rings themselves) ride a later pass.

export type ModifierKind = "swift" | "duskfall" | "goldenHour" | "silentSky";

export interface Modifier {
  kind: ModifierKind;
  label: string; // shown on the sector entry banner
  speedMult: number; // forward-speed multiplier
  crownMult: number; // Crowns payout multiplier for the sector
  fogNearMult: number; // pull fog nearer (duskfall)
  moteColor: string | null; // recolour drift motes (golden hour)
  warm: boolean; // warm cosmetic grade (golden hour)
  ambience: number | null; // override music intensity (silent sky)
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
    ...over,
  };
}

// 0-based sector index → modifier. Placed per §5: Swift never lands on a hazard
// peak; golden hour rides the Vista (k6) breather sectors; silent sky sits just
// before the two big ceremonies (s50, s100).
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
};

export function sectorModifier(sector: number): Modifier | null {
  return BY_INDEX[Math.floor(sector)] ?? null;
}
