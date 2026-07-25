// ─────────────────────────────────────────────────────────────────────────────
// Species — authored collectible identity per mind key.
//
// Pokemon-grade variety cannot come from random part lottery on one rig. Each
// champion gets a stable SPECIES KIT: silhouette bias + which solid parts they
// wear. First Minds are hand-authored; later dex minds map onto Force BREEDS
// (4–5 distinct animals per Clan), then a light seed jitter so cousins differ.
//
// Wired from champion-mesh via identityKey. Without a key, phenotypeOf lottery
// remains the fallback.
// ─────────────────────────────────────────────────────────────────────────────
import type { CreatureType } from "@/lib/types";
import type { Headgear, Shoulders, Back, Chest, Phenotype } from "@/lib/render/phenotype";
import { DEX_MIND_KEYS, ROSTER } from "@/lib/engine/roster";
import { applyMorphBias, type MorphBias } from "@/lib/render/morph-bias";

export { applyMorphBias, type MorphBias };

export interface SpeciesKit {
  /** short designer note — not player-facing */
  tag: string;
  headgear: Headgear;
  shoulders: Shoulders;
  back: Back;
  chest: Chest;
  morph: MorphBias;
}

export interface Breed {
  id: string;
  kit: SpeciesKit;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Hand-authored First Mind looks — the reference animals for each Clan. */
export const FIRST_SPECIES: Record<string, SpeciesKit> = {
  AXIOM: {
    tag: "cold lattice scholar",
    headgear: "antenna",
    shoulders: "vent",
    back: "slab",
    chest: "diamond",
    morph: { headScale: 0.94, neckLen: 1.12, torsoGirth: 0.92, armLen: 1.08, legLen: 1.06 },
  },
  PARADOX: {
    tag: "socratic hinge",
    headgear: "crest",
    shoulders: "none",
    back: "coils",
    chest: "lattice",
    morph: { headScale: 1.05, neckLen: 1.18, torsoGirth: 0.88, shoulder: 0.85, legLen: 1.1 },
  },
  GLITCH: {
    tag: "broken static",
    headgear: "horns",
    shoulders: "spike",
    back: "thrusters",
    chest: "bars",
    morph: { h: 0.95, headScale: 0.92, torsoGirth: 0.78, shoulder: 0.88, asym: 0.55, legLen: 1.12 },
  },
  EMBER: {
    tag: "firebrand blade",
    headgear: "fin",
    shoulders: "spike",
    back: "thrusters",
    chest: "eye",
    morph: { h: 0.92, headScale: 0.88, torsoGirth: 0.85, armGirth: 0.9, asym: 0.35, legLen: 1.16 },
  },
  BASTION: {
    tag: "monolith wall",
    headgear: "dome",
    shoulders: "pauldron",
    back: "none",
    chest: "bars",
    morph: { h: 1.05, headScale: 0.58, torsoGirth: 1.08, shoulder: 0.95, legLen: 1.05, footScale: 1.1 },
  },
  VOX: {
    tag: "grand orator",
    headgear: "crest",
    shoulders: "none",
    back: "banner",
    chest: "diamond",
    morph: { h: 1.02, headScale: 0.78, neckLen: 1.55, shoulder: 0.55, footScale: 1.4, legLen: 1.08 },
  },
  WIT: {
    tag: "surgical blade",
    headgear: "helm",
    shoulders: "vent",
    back: "none",
    chest: "ring",
    morph: { h: 0.98, headScale: 0.74, neckLen: 1.35, torsoGirth: 0.9, shoulder: 0.58, armLen: 1.12 },
  },
  MUSE: {
    tag: "lateral spark",
    headgear: "antenna",
    shoulders: "none",
    back: "wings",
    chest: "diamond",
    morph: { h: 0.9, headScale: 1.22, neckLen: 0.85, torsoGirth: 0.58, shoulder: 0.62, armLen: 1.22, asym: 0.22 },
  },
};

/**
 * Force breeds — distinct animals within a Clan. Dex minds land on one breed
 * by key hash so the gallery reads like a real pokedex line, not RNG sludge.
 */
export const BREEDS: Record<CreatureType, Breed[]> = {
  LOGIC: [
    {
      id: "scholar",
      kit: {
        tag: "antenna scholar",
        headgear: "antenna",
        shoulders: "vent",
        back: "slab",
        chest: "diamond",
        morph: { headScale: 0.95, neckLen: 1.14, torsoGirth: 0.9, armLen: 1.1, legLen: 1.08 },
      },
    },
    {
      id: "proof",
      kit: {
        tag: "crest prover",
        headgear: "crest",
        shoulders: "plates",
        back: "coils",
        chest: "lattice",
        morph: { headScale: 1.02, neckLen: 1.05, torsoGirth: 0.95, shoulder: 1.05, legLen: 1.02 },
      },
    },
    {
      id: "kernel",
      kit: {
        tag: "helm kernel",
        headgear: "helm",
        shoulders: "vent",
        back: "none",
        chest: "core",
        morph: { headScale: 0.9, neckLen: 0.95, torsoGirth: 1.05, shoulder: 1.1, legLen: 0.96, footScale: 1.08 },
      },
    },
    {
      id: "measure",
      kit: {
        tag: "dome measure",
        headgear: "dome",
        shoulders: "none",
        back: "slab",
        chest: "lattice",
        morph: { headScale: 0.88, neckLen: 1.08, torsoGirth: 0.86, armLen: 1.14, legLen: 1.12 },
      },
    },
  ],
  CHAOS: [
    {
      id: "riot",
      kit: {
        tag: "horn riot",
        headgear: "horns",
        shoulders: "spike",
        back: "thrusters",
        chest: "bars",
        morph: { h: 0.94, headScale: 0.9, torsoGirth: 0.8, asym: 0.5, legLen: 1.14 },
      },
    },
    {
      id: "hex",
      kit: {
        tag: "fin hex",
        headgear: "fin",
        shoulders: "spike",
        back: "kite",
        chest: "eye",
        morph: { h: 0.9, headScale: 0.95, torsoGirth: 0.75, shoulder: 0.9, asym: 0.4, armLen: 1.1 },
      },
    },
    {
      id: "snag",
      kit: {
        tag: "quill snag",
        headgear: "quills",
        shoulders: "plates",
        back: "thrusters",
        chest: "core",
        morph: { h: 0.88, headScale: 1.0, torsoGirth: 0.82, asym: 0.45, legLen: 1.08 },
      },
    },
    {
      id: "howl",
      kit: {
        tag: "bare howl",
        headgear: "horns",
        shoulders: "vent",
        back: "none",
        chest: "bars",
        morph: { h: 0.96, headScale: 0.85, torsoGirth: 0.88, armGirth: 0.95, asym: 0.3, legLen: 1.18 },
      },
    },
  ],
  COMPOSURE: [
    {
      id: "wall",
      kit: {
        tag: "dome wall",
        headgear: "dome",
        shoulders: "pauldron",
        back: "none",
        chest: "bars",
        morph: { h: 1.06, headScale: 0.58, torsoGirth: 1.1, shoulder: 0.95, legLen: 1.04, footScale: 1.12 },
      },
    },
    {
      id: "harbor",
      kit: {
        tag: "helm harbor",
        headgear: "helm",
        shoulders: "plates",
        back: "coils",
        chest: "ring",
        morph: { h: 1.0, headScale: 0.62, torsoGirth: 1.0, shoulder: 0.88, legLen: 1.08 },
      },
    },
    {
      id: "quiet",
      kit: {
        tag: "bare quiet",
        headgear: "none",
        shoulders: "pauldron",
        back: "none",
        chest: "core",
        morph: { h: 1.02, headScale: 0.55, neckLen: 0.88, torsoGirth: 0.95, shoulder: 0.82, legLen: 1.1 },
      },
    },
    {
      id: "stone",
      kit: {
        tag: "crest stone",
        headgear: "crest",
        shoulders: "plates",
        back: "none",
        chest: "bars",
        morph: { h: 1.08, headScale: 0.6, torsoGirth: 1.12, shoulder: 1.0, legGirth: 1.05, footScale: 1.15 },
      },
    },
  ],
  RHETORIC: [
    {
      id: "stage",
      kit: {
        tag: "crest stage",
        headgear: "crest",
        shoulders: "none",
        back: "banner",
        chest: "diamond",
        morph: { h: 1.04, headScale: 0.78, neckLen: 1.55, shoulder: 0.55, footScale: 1.38, legLen: 1.1 },
      },
    },
    {
      id: "gavel",
      kit: {
        tag: "helm gavel",
        headgear: "helm",
        shoulders: "none",
        back: "none",
        chest: "ring",
        morph: { h: 1.0, headScale: 0.72, neckLen: 1.4, torsoGirth: 0.98, shoulder: 0.6, footScale: 1.3 },
      },
    },
    {
      id: "jest",
      kit: {
        tag: "antenna jest",
        headgear: "antenna",
        shoulders: "vent",
        back: "kite",
        chest: "eye",
        morph: { h: 0.96, headScale: 0.82, neckLen: 1.25, torsoGirth: 0.88, shoulder: 0.65, armLen: 1.15 },
      },
    },
    {
      id: "pulpit",
      kit: {
        tag: "crest pulpit",
        headgear: "crest",
        shoulders: "vent",
        back: "banner",
        chest: "diamond",
        morph: { h: 1.06, headScale: 0.76, neckLen: 1.48, torsoGirth: 0.94, shoulder: 0.58, footScale: 1.42 },
      },
    },
  ],
  CREATIVITY: [
    {
      id: "muse",
      kit: {
        tag: "antenna muse",
        headgear: "antenna",
        shoulders: "none",
        back: "wings",
        chest: "diamond",
        morph: { h: 0.88, headScale: 1.2, neckLen: 0.88, torsoGirth: 0.58, shoulder: 0.62, armLen: 1.2, asym: 0.2 },
      },
    },
    {
      id: "riff",
      kit: {
        tag: "fin riff",
        headgear: "fin",
        shoulders: "vent",
        back: "wings",
        chest: "lattice",
        morph: { h: 0.86, headScale: 1.1, neckLen: 0.92, torsoGirth: 0.62, shoulder: 0.7, armLen: 1.18, asym: 0.25 },
      },
    },
    {
      id: "ink",
      kit: {
        tag: "quill ink",
        headgear: "quills",
        shoulders: "none",
        back: "thrusters",
        chest: "eye",
        morph: { h: 0.9, headScale: 1.15, neckLen: 0.85, torsoGirth: 0.55, shoulder: 0.58, armLen: 1.25, asym: 0.3 },
      },
    },
    {
      id: "dream",
      kit: {
        tag: "fin dream",
        headgear: "fin",
        shoulders: "none",
        back: "wings",
        chest: "diamond",
        morph: { h: 0.84, headScale: 1.25, neckLen: 0.8, torsoGirth: 0.52, shoulder: 0.55, legLen: 1.12, asym: 0.18 },
      },
    },
  ],
};

/**
 * Hand overrides for later dex minds whose names already imply an animal.
 * Keeps the gallery honest when LEMMA / RIOT / STAGE etc. show up.
 */
export const DEX_SPECIES: Record<string, SpeciesKit> = {
  LEMMA: {
    tag: "proof lemma",
    headgear: "crest",
    shoulders: "plates",
    back: "coils",
    chest: "lattice",
    morph: { headScale: 1.04, neckLen: 1.08, torsoGirth: 0.92, armLen: 1.08 },
  },
  KERNEL: {
    tag: "helm kernel",
    headgear: "helm",
    shoulders: "vent",
    back: "none",
    chest: "core",
    morph: { headScale: 0.88, torsoGirth: 1.08, shoulder: 1.12, footScale: 1.1 },
  },
  THEOREM: {
    tag: "antenna theorem",
    headgear: "antenna",
    shoulders: "vent",
    back: "slab",
    chest: "diamond",
    morph: { headScale: 0.96, neckLen: 1.16, armLen: 1.12, legLen: 1.1 },
  },
  RIOT: {
    tag: "horn riot",
    headgear: "horns",
    shoulders: "spike",
    back: "thrusters",
    chest: "bars",
    morph: { h: 0.92, torsoGirth: 0.78, asym: 0.55, legLen: 1.16 },
  },
  HEX: {
    tag: "fin hex",
    headgear: "fin",
    shoulders: "spike",
    back: "kite",
    chest: "eye",
    morph: { h: 0.88, torsoGirth: 0.72, asym: 0.42, armLen: 1.12 },
  },
  SNAG: {
    tag: "quill snag",
    headgear: "quills",
    shoulders: "plates",
    back: "thrusters",
    chest: "core",
    morph: { h: 0.86, asym: 0.48, legLen: 1.1 },
  },
  HOWL: {
    tag: "bare howl",
    headgear: "horns",
    shoulders: "vent",
    back: "none",
    chest: "bars",
    morph: { h: 0.95, headScale: 0.84, asym: 0.32, legLen: 1.2 },
  },
  STAGE: {
    tag: "crest stage",
    headgear: "crest",
    shoulders: "none",
    back: "banner",
    chest: "diamond",
    morph: { neckLen: 1.58, shoulder: 0.52, footScale: 1.4, legLen: 1.12 },
  },
  GAVEL: {
    tag: "helm gavel",
    headgear: "helm",
    shoulders: "none",
    back: "none",
    chest: "ring",
    morph: { headScale: 0.7, neckLen: 1.42, shoulder: 0.58, footScale: 1.32 },
  },
  JEST: {
    tag: "antenna jest",
    headgear: "antenna",
    shoulders: "vent",
    back: "kite",
    chest: "eye",
    morph: { headScale: 0.84, neckLen: 1.28, armLen: 1.16 },
  },
  ORATOR: {
    tag: "crest pulpit",
    headgear: "crest",
    shoulders: "vent",
    back: "banner",
    chest: "diamond",
    morph: { h: 1.08, neckLen: 1.52, footScale: 1.44 },
  },
  PULPIT: {
    tag: "crest pulpit",
    headgear: "crest",
    shoulders: "vent",
    back: "banner",
    chest: "diamond",
    morph: { h: 1.06, neckLen: 1.5, footScale: 1.4 },
  },
  RIFF: {
    tag: "fin riff",
    headgear: "fin",
    shoulders: "vent",
    back: "wings",
    chest: "lattice",
    morph: { h: 0.84, headScale: 1.12, torsoGirth: 0.58, armLen: 1.2, asym: 0.28 },
  },
  DREAM: {
    tag: "fin dream",
    headgear: "fin",
    shoulders: "none",
    back: "wings",
    chest: "diamond",
    morph: { h: 0.82, headScale: 1.28, torsoGirth: 0.5, asym: 0.2 },
  },
  QUIET: {
    tag: "bare quiet",
    headgear: "none",
    shoulders: "pauldron",
    back: "none",
    chest: "core",
    morph: { h: 1.04, headScale: 0.52, neckLen: 0.86, shoulder: 0.8 },
  },
  STONE: {
    tag: "crest stone",
    headgear: "crest",
    shoulders: "plates",
    back: "none",
    chest: "bars",
    morph: { h: 1.1, headScale: 0.58, torsoGirth: 1.14, footScale: 1.18 },
  },
  ANCHOR: {
    tag: "dome wall",
    headgear: "dome",
    shoulders: "pauldron",
    back: "none",
    chest: "bars",
    morph: { h: 1.08, headScale: 0.55, torsoGirth: 1.12, footScale: 1.15 },
  },
  BULWARK: {
    tag: "helm harbor",
    headgear: "helm",
    shoulders: "plates",
    back: "coils",
    chest: "ring",
    morph: { h: 1.04, headScale: 0.6, torsoGirth: 1.05, shoulder: 0.9 },
  },
  WHIM: {
    tag: "quill ink",
    headgear: "quills",
    shoulders: "none",
    back: "thrusters",
    chest: "eye",
    morph: { h: 0.88, headScale: 1.18, torsoGirth: 0.54, armLen: 1.26, asym: 0.32 },
  },
  FRACTAL: {
    tag: "antenna muse",
    headgear: "antenna",
    shoulders: "none",
    back: "wings",
    chest: "diamond",
    morph: { h: 0.86, headScale: 1.22, torsoGirth: 0.56, asym: 0.24 },
  },
};

/** Resolve the stable species kit for a roster key. */
export function speciesKitFor(key: string, type?: CreatureType): SpeciesKit | null {
  const k = key.toUpperCase();
  if (FIRST_SPECIES[k]) return FIRST_SPECIES[k]!;
  if (DEX_SPECIES[k]) return DEX_SPECIES[k]!;
  const t = type ?? ROSTER[k]?.type;
  if (!t) return null;
  const breeds = BREEDS[t];
  if (!breeds?.length) return null;
  const breed = breeds[hash(k) % breeds.length]!;
  // light per-key spice on morph only — parts stay breed-pure so the animal reads
  const spice = ((hash(k + ":spice") % 1000) / 1000 - 0.5) * 0.06;
  const m = { ...breed.kit.morph };
  if (m.headScale != null) m.headScale *= 1 + spice;
  if (m.legLen != null) m.legLen *= 1 - spice * 0.5;
  if (m.torsoGirth != null) m.torsoGirth *= 1 + spice * 0.4;
  return { ...breed.kit, morph: m, tag: `${breed.id}:${breed.kit.tag}` };
}

/** Tier-gate an authored kit into a Phenotype (species mark from day one). */
export function phenotypeFromSpecies(kit: SpeciesKit, tierIdx: number): Phenotype {
  const hasShoulders = tierIdx >= 1;
  const hasChest = tierIdx >= 2;
  const hasBack = tierIdx >= 3;
  return {
    headgear: kit.headgear,
    visor: "band",
    shoulders: hasShoulders ? kit.shoulders : "none",
    chest: hasChest ? kit.chest : "none",
    back: hasBack ? kit.back : "none",
    count: 3 + (hash(kit.tag) % 3),
  };
}

/** Dev/docs helper: every dex key's breed id. */
export function breedIdFor(key: string): string | null {
  const k = key.toUpperCase();
  if (FIRST_SPECIES[k]) return `first:${k}`;
  if (DEX_SPECIES[k]) return `dex:${k}`;
  const t = ROSTER[k]?.type;
  if (!t) return null;
  const breeds = BREEDS[t];
  return breeds[hash(k) % breeds.length]?.id ?? null;
}

/** Sanity: every dex key resolves a kit. */
export function assertSpeciesCoverage(): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  for (const k of DEX_MIND_KEYS) {
    if (!speciesKitFor(k)) missing.push(k);
  }
  return { ok: missing.length === 0, missing };
}
