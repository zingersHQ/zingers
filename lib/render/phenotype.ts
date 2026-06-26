// ─────────────────────────────────────────────────────────────────────────────
// Phenotype — the seeded PART CATALOG that turns the shared rig into many
// distinct robot "models". Bone scaling (lib/evolve/appearance.ts) reshapes the
// skeleton; this layer bolts SOLID anatomy onto it — headgear, visor/face, shoulder
// rigs, a back unit, a chest core. Each individual draws a coherent set from its
// Force's biased catalog, seeded by identity so it's stable, and GATED BY TIER so
// a rookie is a bare chassis and a legend wears the full regalia — evolution you
// can see. The champion's dominant skill nudges one slot, so the body reflects how
// the mind actually fought (a brawler grows horns; a schemer grows antennae).
// ─────────────────────────────────────────────────────────────────────────────
import type { CreatureType, StyleAxis } from "@/lib/types";

export type Headgear = "none" | "crest" | "fin" | "horns" | "antenna" | "dome" | "crownRing";
export type Visor = "single" | "twin" | "triple" | "band" | "slit";
export type Shoulders = "none" | "pauldron" | "spike" | "vent";
export type Back = "none" | "thrusters" | "slab" | "wings" | "banner";
export type Chest = "none" | "diamond" | "ring" | "bars";

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

// Per-Force catalogs — weighted so a Force reads as a family (LOGIC favours clean
// geometry, CHAOS favours jagged/asymmetric, COMPOSURE favours heavy slabs,
// RHETORIC favours broadcast/ceremonial, CREATIVITY favours light/playful).
const CATALOG: Record<CreatureType, ForceCatalog> = {
  LOGIC: {
    headgear: [["crest", 3], ["antenna", 3], ["dome", 1], ["none", 1]],
    visor: [["band", 3], ["single", 2], ["twin", 1]],
    shoulders: [["vent", 3], ["pauldron", 1], ["none", 2]],
    back: [["slab", 2], ["none", 3]],
    chest: [["diamond", 3], ["ring", 1], ["none", 1]],
  },
  CHAOS: {
    headgear: [["horns", 3], ["fin", 3], ["antenna", 1], ["none", 1]],
    visor: [["triple", 3], ["slit", 3], ["single", 1]],
    shoulders: [["spike", 4], ["vent", 1], ["none", 1]],
    back: [["thrusters", 3], ["none", 2]],
    chest: [["bars", 3], ["diamond", 1], ["none", 1]],
  },
  COMPOSURE: {
    headgear: [["dome", 3], ["none", 3], ["crest", 1]],
    visor: [["band", 3], ["slit", 2], ["single", 1]],
    shoulders: [["pauldron", 4], ["vent", 1]],
    // the Stillness reads as immovable from its mass + ground rings — no slab
    // bolted behind the figure (those static blocks were cut by design).
    back: [["none", 1]],
    chest: [["ring", 3], ["bars", 1], ["none", 1]],
  },
  RHETORIC: {
    headgear: [["crownRing", 3], ["crest", 3], ["antenna", 1]],
    visor: [["twin", 3], ["band", 2], ["single", 1]],
    // a speaker, not a linebacker: no big pauldron pads or "ears" on the frame —
    // either bare shoulders or slim vents only.
    shoulders: [["none", 4], ["vent", 1]],
    // keep the back clean — no wing panels or banners flaring off the silhouette.
    back: [["none", 1]],
    chest: [["ring", 3], ["diamond", 1]],
  },
  CREATIVITY: {
    headgear: [["antenna", 3], ["fin", 3], ["crownRing", 1], ["none", 1]],
    visor: [["single", 3], ["twin", 2], ["triple", 1]],
    shoulders: [["vent", 2], ["none", 3]],
    back: [["wings", 3], ["thrusters", 1], ["none", 2]],
    chest: [["diamond", 3], ["ring", 1], ["none", 1]],
  },
};

// The dominant career axis pushes the headgear toward a signature shape — the body
// shows how the mind won. Skips when the axis is unproven (the catalog decides).
const AXIS_HEADGEAR: Record<StyleAxis, Headgear> = {
  aggression: "horns",
  control: "antenna",
  resilience: "dome",
  flair: "crownRing",
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

  // tier gates which slots are "earned". A bare rookie has only a visor; each tier
  // unlocks the next layer of anatomy.
  const hasHead = tierIdx >= 1;
  const hasShoulders = tierIdx >= 2;
  const hasChest = tierIdx >= 3;
  const hasBack = tierIdx >= 4;

  let headgear: Headgear = "none";
  if (hasHead) {
    headgear = pick(rnd, cat.headgear);
    // a strongly-dominant axis stamps its signature crown on top of the catalog
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
