// ─────────────────────────────────────────────────────────────────────────────
// Phenotype — the seeded PART CATALOG that turns the shared rig into many
// distinct robot "models". Bone scaling (lib/evolve/appearance.ts) reshapes the
// skeleton; this layer bolts SOLID anatomy onto it — headgear, visor/face, shoulder
// rigs, a back unit, a chest core. Each individual draws a coherent set from its
// Force's biased catalog, seeded by identity so it's stable, and GATED BY TIER so
// a rookie wears a species mark and a legend wears the full regalia — evolution
// you can see. The champion's dominant skill nudges one slot, so the body reflects
// how the mind actually fought (a brawler grows horns; a schemer grows antennae).
// ─────────────────────────────────────────────────────────────────────────────
import type { CreatureType, StyleAxis } from "@/lib/types";

export type Headgear =
  | "none"
  | "crest"
  | "fin"
  | "horns"
  | "antenna"
  | "dome"
  | "crownRing"
  | "helm"
  | "mask"
  | "quills"
  | "disks";
export type Visor = "single" | "twin" | "triple" | "band" | "slit" | "hex" | "cross";
export type Shoulders = "none" | "pauldron" | "spike" | "vent" | "plates";
export type Back = "none" | "thrusters" | "slab" | "wings" | "banner" | "coils" | "kite";
export type Chest = "none" | "diamond" | "ring" | "bars" | "core" | "eye" | "lattice";

export interface Phenotype {
  headgear: Headgear;
  visor: Visor;
  shoulders: Shoulders;
  back: Back;
  chest: Chest;
  /** small count knob (spikes / thruster nozzles / banner folds) */
  count: number;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rnd: () => number, weighted: [T, number][]): T {
  const total = weighted.reduce((s, [, w]) => s + w, 0);
  let r = rnd() * total;
  for (const [v, w] of weighted) {
    r -= w;
    if (r <= 0) return v;
  }
  return weighted[0][0];
}

interface ForceCatalog {
  headgear: [Headgear, number][];
  visor: [Visor, number][];
  shoulders: [Shoulders, number][];
  back: [Back, number][];
  chest: [Chest, number][];
}

// Per-Force catalogs — weighted so a Force reads as a family while individuals
// diverge hard (Pokemon-style: same type line, different animal).
const CATALOG: Record<CreatureType, ForceCatalog> = {
  // Catalogs bias toward parts that sit ON the skull/torso (crest/fin/horns/
  // antenna/dome/helm). Face-box masks / floating disk halos stay out of the
  // lottery (species kits may still assign redesigned mask/disks meshes).
  // LOGIC backs prefer coils / spine ridge over flat boards.
  LOGIC: {
    headgear: [
      ["crest", 3],
      ["antenna", 3],
      ["dome", 2],
      ["helm", 3],
      ["none", 1],
    ],
    visor: [
      ["band", 3],
      ["single", 2],
      ["hex", 2],
      ["cross", 1],
    ],
    shoulders: [
      ["vent", 3],
      ["plates", 2],
      ["pauldron", 1],
      ["none", 2],
    ],
    back: [
      ["coils", 3],
      ["slab", 1],
      ["none", 3],
    ],
    chest: [
      ["diamond", 3],
      ["lattice", 2],
      ["core", 2],
      ["none", 1],
    ],
  },
  CHAOS: {
    headgear: [
      ["horns", 4],
      ["fin", 3],
      ["quills", 2],
      ["antenna", 1],
      ["none", 1],
    ],
    visor: [
      ["triple", 2],
      ["slit", 3],
      ["cross", 2],
      ["single", 1],
    ],
    shoulders: [
      ["spike", 4],
      ["plates", 2],
      ["vent", 1],
      ["none", 1],
    ],
    back: [
      ["thrusters", 3],
      ["kite", 1],
      ["none", 2],
    ],
    chest: [
      ["bars", 3],
      ["eye", 2],
      ["core", 2],
      ["none", 1],
    ],
  },
  COMPOSURE: {
    headgear: [
      ["dome", 4],
      ["helm", 3],
      ["none", 2],
      ["crest", 1],
    ],
    visor: [
      ["band", 3],
      ["slit", 2],
      ["hex", 2],
      ["single", 1],
    ],
    shoulders: [
      ["pauldron", 3],
      ["plates", 3],
      ["vent", 1],
    ],
    // Stillness reads as immovable from mass + ground rings — no bolted slabs.
    back: [
      ["none", 4],
      ["coils", 1],
    ],
    chest: [
      ["bars", 3],
      ["core", 3],
      ["ring", 2],
      ["none", 1],
    ],
  },
  RHETORIC: {
    headgear: [
      ["crest", 4],
      ["helm", 2],
      ["antenna", 2],
      ["none", 1],
    ],
    visor: [
      ["twin", 3],
      ["band", 2],
      ["hex", 2],
      ["single", 1],
    ],
    shoulders: [
      ["none", 4],
      ["vent", 2],
      ["plates", 1],
    ],
    back: [
      ["none", 3],
      ["banner", 2],
      ["kite", 1],
    ],
    chest: [
      ["diamond", 3],
      ["ring", 2],
      ["eye", 1],
      ["none", 1],
    ],
  },
  CREATIVITY: {
    headgear: [
      ["antenna", 3],
      ["fin", 3],
      ["quills", 2],
      ["none", 1],
    ],
    visor: [
      ["single", 2],
      ["twin", 2],
      ["hex", 2],
      ["triple", 1],
    ],
    shoulders: [
      ["vent", 2],
      ["none", 3],
      ["plates", 1],
    ],
    back: [
      ["wings", 3],
      ["thrusters", 1],
      ["none", 2],
    ],
    chest: [
      ["diamond", 3],
      ["lattice", 2],
      ["eye", 1],
      ["none", 1],
    ],
  },
};

// The dominant career axis pushes the headgear toward a signature shape — the body
// shows how the mind won. Skips when the axis is unproven (the catalog decides).
const AXIS_HEADGEAR: Record<StyleAxis, Headgear> = {
  aggression: "horns",
  control: "antenna",
  resilience: "dome",
  flair: "crest",
  creativity: "fin",
};

/** Deterministic phenotype for an individual. `tierIdx` (0..4) gates how many
 *  parts are equipped; `dominantAxis`/`dominantVal` bias the headgear. */
export function phenotypeOf(
  type: CreatureType,
  seed: number,
  tierIdx: number,
  dominantAxis?: StyleAxis,
  dominantVal = 0,
): Phenotype {
  const rnd = mulberry32((seed ^ 0x9e3779b9) >>> 0);
  const cat = CATALOG[type] ?? CATALOG.LOGIC;

  // Species mark from day one (Pokemon baby form), then layer armour as they climb.
  // Visor is unused in mesh (eyes live on the rig); kept for future/face variants.
  const hasHead = true;
  const hasShoulders = tierIdx >= 1;
  const hasChest = tierIdx >= 2;
  const hasBack = tierIdx >= 3;

  let headgear: Headgear = "none";
  if (hasHead) {
    headgear = pick(rnd, cat.headgear);
    // rookies almost always keep a tell — reroll "none" once
    if (headgear === "none" && tierIdx <= 1) headgear = pick(rnd, cat.headgear.filter(([k]) => k !== "none"));
    if (dominantAxis && dominantVal >= 8 && rnd() < 0.7) headgear = AXIS_HEADGEAR[dominantAxis];
  }

  return {
    headgear,
    visor: pick(rnd, cat.visor),
    shoulders: hasShoulders ? pick(rnd, cat.shoulders) : "none",
    chest: hasChest ? pick(rnd, cat.chest) : "none",
    back: hasBack ? pick(rnd, cat.back) : "none",
    count: 2 + Math.floor(rnd() * 4),
  };
}
