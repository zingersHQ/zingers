// ─────────────────────────────────────────────────────────────────────────────
// Species — authored collectible identity per mind key.
//
// Pokemon-grade variety cannot come from random part lottery on one rig. Each
// champion gets a stable SPECIES KIT: silhouette bias + which solid parts they
// wear. First Minds are hand-authored; later dex minds map onto Force BREEDS
// (~7 distinct animals per Clan), then a light seed jitter so cousins differ.
//
// Bodytype spectrum (push morphs into the outer half of clamps so gallery pages
// don't look like the same cousin in different hats):
//   canonical · stilts · tank · stout · wispy · orator · reach
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
    morph: { h: 1.05, headScale: 0.92, neckLen: 1.18, torsoGirth: 0.88, armLen: 1.14, legLen: 1.12 },
  },
  PARADOX: {
    tag: "socratic hinge",
    headgear: "crest",
    shoulders: "none",
    back: "coils",
    chest: "lattice",
    morph: { h: 1.0, headScale: 1.08, neckLen: 1.22, torsoGirth: 0.82, shoulder: 0.8, armLen: 1.2, legLen: 1.18 },
  },
  GLITCH: {
    tag: "broken static",
    headgear: "horns",
    shoulders: "spike",
    back: "thrusters",
    chest: "bars",
    morph: { h: 0.92, headScale: 0.9, torsoGirth: 0.82, shoulder: 0.9, armLen: 1.1, asym: 0.45, legLen: 1.35 },
  },
  EMBER: {
    tag: "firebrand blade",
    headgear: "fin",
    shoulders: "spike",
    back: "thrusters",
    chest: "eye",
    morph: { h: 0.94, headScale: 0.88, torsoGirth: 0.85, shoulder: 0.92, armGirth: 0.9, armLen: 1.12, asym: 0.35, legLen: 1.4 },
  },
  BASTION: {
    tag: "monolith wall",
    headgear: "dome",
    shoulders: "pauldron",
    back: "none",
    chest: "bars",
    // Force already stilts; push mass + planted feet so the tower reads as a wall
    morph: { h: 1.08, headScale: 0.55, torsoGirth: 1.35, shoulder: 1.1, legGirth: 1.15, legLen: 1.08, footScale: 1.25 },
  },
  VOX: {
    tag: "grand orator",
    headgear: "crest",
    shoulders: "none",
    back: "banner",
    chest: "diamond",
    morph: { h: 1.0, headScale: 0.74, neckLen: 1.75, shoulder: 0.78, torsoGirth: 0.9, footScale: 1.55, legLen: 1.45 },
  },
  WIT: {
    tag: "surgical blade",
    headgear: "helm",
    shoulders: "vent",
    back: "none",
    chest: "ring",
    morph: { h: 1.0, headScale: 0.7, neckLen: 1.45, torsoGirth: 0.88, shoulder: 0.8, armLen: 1.1, legLen: 1.35 },
  },
  MUSE: {
    tag: "lateral spark",
    headgear: "antenna",
    shoulders: "none",
    back: "wings",
    chest: "diamond",
    morph: { h: 0.88, headScale: 1.28, neckLen: 0.78, torsoGirth: 0.62, shoulder: 0.72, armLen: 1.18, legLen: 1.2, asym: 0.28 },
  },
};

/**
 * Force breeds — distinct animals within a Clan. Dex minds land on one breed
 * by key hash so the gallery reads like a real pokedex line, not RNG sludge.
 * Aim ~7 per Force; each slot owns a different bodytype axis.
 */
export const BREEDS: Record<CreatureType, Breed[]> = {
  LOGIC: [
    {
      id: "scholar",
      kit: {
        tag: "canonical scholar",
        headgear: "antenna",
        shoulders: "vent",
        back: "slab",
        chest: "diamond",
        morph: { h: 1.02, headScale: 0.94, neckLen: 1.16, torsoGirth: 0.88, armLen: 1.12, legLen: 1.1 },
      },
    },
    {
      id: "proof",
      kit: {
        tag: "broad prover",
        headgear: "crest",
        shoulders: "plates",
        back: "coils",
        chest: "lattice",
        morph: { h: 1.0, headScale: 1.0, neckLen: 1.05, torsoGirth: 1.05, shoulder: 1.2, legLen: 1.0 },
      },
    },
    {
      id: "kernel",
      kit: {
        tag: "stout kernel",
        headgear: "helm",
        shoulders: "vent",
        back: "none",
        chest: "core",
        morph: { h: 0.82, headScale: 0.95, neckLen: 0.88, torsoGirth: 1.65, shoulder: 1.35, armGirth: 1.25, legGirth: 1.3, legLen: 0.72, footScale: 1.2 },
      },
    },
    {
      id: "measure",
      kit: {
        tag: "stilts measure",
        headgear: "dome",
        shoulders: "none",
        back: "coils",
        chest: "lattice",
        morph: { h: 1.0, headScale: 0.88, neckLen: 1.1, torsoGirth: 0.85, shoulder: 0.9, armLen: 1.1, legLen: 2.05, footScale: 0.95 },
      },
    },
    {
      id: "cipher",
      kit: {
        tag: "helm cipher",
        headgear: "helm",
        shoulders: "vent",
        back: "coils",
        chest: "ring",
        morph: { h: 0.96, headScale: 1.02, neckLen: 1.25, torsoGirth: 0.78, armLen: 1.15, legLen: 1.08 },
      },
    },
    {
      id: "abacus",
      kit: {
        tag: "disk abacus",
        headgear: "disks",
        shoulders: "plates",
        back: "slab",
        chest: "core",
        morph: { h: 0.78, headScale: 0.98, neckLen: 0.92, torsoGirth: 1.45, shoulder: 1.2, legGirth: 1.2, legLen: 0.68, footScale: 1.15 },
      },
    },
    {
      id: "rule",
      kit: {
        tag: "reach rule",
        headgear: "antenna",
        shoulders: "none",
        back: "none",
        chest: "lattice",
        morph: { h: 1.0, headScale: 0.9, neckLen: 1.2, torsoGirth: 0.82, shoulder: 0.88, armLen: 1.35, legLen: 1.75 },
      },
    },
  ],
  CHAOS: [
    {
      id: "riot",
      kit: {
        tag: "lithe riot",
        headgear: "horns",
        shoulders: "spike",
        back: "thrusters",
        chest: "bars",
        morph: { h: 0.9, headScale: 0.88, torsoGirth: 0.7, shoulder: 0.85, asym: 0.55, legLen: 1.3 },
      },
    },
    {
      id: "hex",
      kit: {
        tag: "wispy hex",
        headgear: "fin",
        shoulders: "spike",
        back: "kite",
        chest: "eye",
        morph: { h: 0.86, headScale: 1.0, torsoGirth: 0.78, shoulder: 0.88, armLen: 1.1, asym: 0.4, legLen: 1.2 },
      },
    },
    {
      id: "snag",
      kit: {
        tag: "compact snag",
        headgear: "quills",
        shoulders: "plates",
        back: "thrusters",
        chest: "core",
        morph: { h: 0.75, headScale: 1.1, torsoGirth: 1.05, shoulder: 1.05, armGirth: 1.1, asym: 0.5, legLen: 0.78, legGirth: 1.15 },
      },
    },
    {
      id: "howl",
      kit: {
        tag: "stilts howl",
        headgear: "horns",
        shoulders: "vent",
        back: "none",
        chest: "bars",
        morph: { h: 1.0, headScale: 0.85, torsoGirth: 0.82, shoulder: 0.9, armGirth: 0.88, asym: 0.32, legLen: 1.95 },
      },
    },
    {
      id: "scrap",
      kit: {
        tag: "horn scrap",
        headgear: "horns",
        shoulders: "spike",
        back: "none",
        chest: "eye",
        morph: { h: 0.9, headScale: 0.95, torsoGirth: 1.35, shoulder: 1.15, armGirth: 1.15, asym: 0.35, legLen: 0.85, legGirth: 1.2 },
      },
    },
    {
      id: "spark",
      kit: {
        tag: "disk spark",
        headgear: "disks",
        shoulders: "vent",
        back: "kite",
        chest: "bars",
        morph: { h: 0.84, headScale: 1.05, torsoGirth: 0.8, shoulder: 0.9, asym: 0.35, armLen: 1.12, legLen: 1.25 },
      },
    },
    {
      id: "fang",
      kit: {
        tag: "reach fang",
        headgear: "quills",
        shoulders: "spike",
        back: "thrusters",
        chest: "eye",
        morph: { h: 0.95, headScale: 1.0, torsoGirth: 0.82, shoulder: 0.92, armLen: 1.22, asym: 0.4, legLen: 1.55 },
      },
    },
  ],
  COMPOSURE: [
    // Force plan stilts via legLen (~2×) with body-size h. Species biases diverge mass.
    {
      id: "wall",
      kit: {
        tag: "mass wall",
        headgear: "dome",
        shoulders: "pauldron",
        back: "none",
        chest: "bars",
        morph: { h: 1.1, headScale: 0.55, torsoGirth: 1.45, shoulder: 1.15, legGirth: 1.2, legLen: 1.05, footScale: 1.25 },
      },
    },
    {
      id: "harbor",
      kit: {
        tag: "balanced harbor",
        headgear: "helm",
        shoulders: "plates",
        back: "coils",
        chest: "ring",
        morph: { h: 1.0, headScale: 0.6, torsoGirth: 1.1, shoulder: 0.95, legLen: 1.0, footScale: 1.1 },
      },
    },
    {
      id: "quiet",
      kit: {
        tag: "thin quiet",
        headgear: "none",
        shoulders: "pauldron",
        back: "none",
        chest: "core",
        morph: { h: 1.05, headScale: 0.5, neckLen: 0.82, torsoGirth: 0.78, shoulder: 0.75, legLen: 1.12, armGirth: 0.7 },
      },
    },
    {
      id: "stone",
      kit: {
        tag: "stout stone",
        headgear: "crest",
        shoulders: "plates",
        back: "none",
        chest: "bars",
        morph: { h: 0.92, headScale: 0.62, torsoGirth: 1.7, shoulder: 1.25, legGirth: 1.4, legLen: 0.72, footScale: 1.35 },
      },
    },
    {
      id: "reef",
      kit: {
        tag: "dome reef",
        headgear: "dome",
        shoulders: "plates",
        back: "coils",
        chest: "core",
        morph: { h: 1.02, headScale: 0.64, torsoGirth: 1.25, shoulder: 1.05, legLen: 0.95, footScale: 1.15 },
      },
    },
    {
      id: "pillar",
      kit: {
        tag: "extreme stilts",
        headgear: "disks",
        shoulders: "pauldron",
        back: "none",
        chest: "ring",
        morph: { h: 1.0, headScale: 0.52, torsoGirth: 0.9, shoulder: 0.9, legLen: 1.25, footScale: 1.05 },
      },
    },
    {
      id: "bastion",
      kit: {
        tag: "fort bastion",
        headgear: "dome",
        shoulders: "pauldron",
        back: "slab",
        chest: "bars",
        morph: { h: 1.05, headScale: 0.52, torsoGirth: 1.5, shoulder: 1.2, legGirth: 1.25, legLen: 0.9, footScale: 1.3 },
      },
    },
  ],
  RHETORIC: [
    {
      id: "stage",
      kit: {
        tag: "orator stage",
        headgear: "crest",
        shoulders: "none",
        back: "banner",
        chest: "diamond",
        morph: { h: 1.0, headScale: 0.72, neckLen: 1.7, shoulder: 0.78, torsoGirth: 0.9, footScale: 1.5, legLen: 1.5 },
      },
    },
    {
      id: "gavel",
      kit: {
        tag: "compact gavel",
        headgear: "helm",
        shoulders: "none",
        back: "none",
        chest: "ring",
        morph: { h: 0.88, headScale: 0.78, neckLen: 1.2, torsoGirth: 1.2, shoulder: 0.7, legLen: 0.85, footScale: 1.25 },
      },
    },
    {
      id: "jest",
      kit: {
        tag: "wispy jest",
        headgear: "antenna",
        shoulders: "vent",
        back: "kite",
        chest: "eye",
        morph: { h: 0.9, headScale: 0.9, neckLen: 1.15, torsoGirth: 0.82, shoulder: 0.8, armLen: 1.12, legLen: 1.2 },
      },
    },
    {
      id: "pulpit",
      kit: {
        tag: "tall pulpit",
        headgear: "crest",
        shoulders: "vent",
        back: "banner",
        chest: "diamond",
        morph: { h: 1.0, headScale: 0.72, neckLen: 1.6, torsoGirth: 0.9, shoulder: 0.8, footScale: 1.48, legLen: 1.7 },
      },
    },
    {
      id: "chorus",
      kit: {
        tag: "reach chorus",
        headgear: "crest",
        shoulders: "vent",
        back: "kite",
        chest: "lattice",
        morph: { h: 1.0, headScale: 0.76, neckLen: 1.5, shoulder: 0.8, armLen: 1.2, footScale: 1.3, legLen: 1.45 },
      },
    },
    {
      id: "soapbox",
      kit: {
        tag: "stout soapbox",
        headgear: "disks",
        shoulders: "none",
        back: "banner",
        chest: "eye",
        morph: { h: 0.9, headScale: 0.8, neckLen: 1.35, torsoGirth: 1.45, shoulder: 0.75, legLen: 0.78, footScale: 1.4 },
      },
    },
    {
      id: "satire",
      kit: {
        tag: "crest satire",
        headgear: "crest",
        shoulders: "vent",
        back: "none",
        chest: "lattice",
        morph: { h: 1.0, headScale: 0.82, neckLen: 1.4, torsoGirth: 0.88, shoulder: 0.82, armLen: 1.15, legLen: 1.45 },
      },
    },
  ],
  CREATIVITY: [
    {
      id: "muse",
      kit: {
        tag: "bobble muse",
        headgear: "antenna",
        shoulders: "none",
        back: "wings",
        chest: "diamond",
        morph: { h: 0.88, headScale: 1.3, neckLen: 0.8, torsoGirth: 0.65, shoulder: 0.75, armLen: 1.15, legLen: 1.2, asym: 0.22 },
      },
    },
    {
      id: "riff",
      kit: {
        tag: "reach riff",
        headgear: "fin",
        shoulders: "vent",
        back: "wings",
        chest: "lattice",
        morph: { h: 0.92, headScale: 1.12, neckLen: 0.9, torsoGirth: 0.72, shoulder: 0.82, armLen: 1.28, legLen: 1.5, asym: 0.28 },
      },
    },
    {
      id: "ink",
      kit: {
        tag: "wispy ink",
        headgear: "quills",
        shoulders: "none",
        back: "thrusters",
        chest: "eye",
        morph: { h: 0.86, headScale: 1.2, neckLen: 0.82, torsoGirth: 0.65, shoulder: 0.75, armLen: 1.2, legLen: 1.3, asym: 0.3 },
      },
    },
    {
      id: "dream",
      kit: {
        tag: "tiny dream",
        headgear: "fin",
        shoulders: "none",
        back: "wings",
        chest: "diamond",
        morph: { h: 0.78, headScale: 1.35, neckLen: 0.75, torsoGirth: 0.6, shoulder: 0.7, legLen: 1.15, asym: 0.2 },
      },
    },
    {
      id: "palette",
      kit: {
        tag: "round palette",
        headgear: "disks",
        shoulders: "none",
        back: "wings",
        chest: "eye",
        morph: { h: 0.85, headScale: 1.2, neckLen: 0.85, torsoGirth: 1.15, shoulder: 0.85, armGirth: 1.05, legGirth: 1.1, legLen: 0.9, asym: 0.24 },
      },
    },
    {
      id: "draft",
      kit: {
        tag: "fin draft",
        headgear: "fin",
        shoulders: "vent",
        back: "thrusters",
        chest: "lattice",
        morph: { h: 0.88, headScale: 1.1, neckLen: 0.92, torsoGirth: 0.65, armLen: 1.25, legLen: 1.15, asym: 0.26 },
      },
    },
    {
      id: "echo",
      kit: {
        tag: "stilts echo",
        headgear: "quills",
        shoulders: "vent",
        back: "kite",
        chest: "diamond",
        morph: { h: 0.95, headScale: 1.15, neckLen: 0.85, torsoGirth: 0.7, shoulder: 0.85, armLen: 1.2, legLen: 1.95, asym: 0.28 },
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
    morph: { h: 1.02, headScale: 1.05, neckLen: 1.1, torsoGirth: 0.9, shoulder: 1.15, armLen: 1.12 },
  },
  KERNEL: {
    tag: "stout kernel",
    headgear: "helm",
    shoulders: "vent",
    back: "none",
    chest: "core",
    morph: { h: 0.8, headScale: 0.92, torsoGirth: 1.7, shoulder: 1.4, armGirth: 1.3, legGirth: 1.35, legLen: 0.7, footScale: 1.22 },
  },
  THEOREM: {
    tag: "stilts theorem",
    headgear: "antenna",
    shoulders: "vent",
    back: "slab",
    chest: "diamond",
    morph: { h: 1.0, headScale: 0.9, neckLen: 1.15, torsoGirth: 0.85, shoulder: 0.92, armLen: 1.12, legLen: 2.05 },
  },
  RIOT: {
    tag: "lithe riot",
    headgear: "horns",
    shoulders: "spike",
    back: "thrusters",
    chest: "bars",
    morph: { h: 0.88, torsoGirth: 0.68, asym: 0.6, armLen: 1.2, legLen: 1.35 },
  },
  HEX: {
    tag: "wispy hex",
    headgear: "fin",
    shoulders: "spike",
    back: "kite",
    chest: "eye",
    morph: { h: 0.86, headScale: 1.0, torsoGirth: 0.8, shoulder: 0.9, asym: 0.38, armLen: 1.1, legLen: 1.25 },
  },
  SNAG: {
    tag: "compact snag",
    headgear: "quills",
    shoulders: "plates",
    back: "thrusters",
    chest: "core",
    morph: { h: 0.74, headScale: 1.12, torsoGirth: 1.1, asym: 0.52, legLen: 0.75, legGirth: 1.2 },
  },
  HOWL: {
    tag: "stilts howl",
    headgear: "horns",
    shoulders: "vent",
    back: "none",
    chest: "bars",
    morph: { h: 1.0, headScale: 0.82, torsoGirth: 0.85, shoulder: 0.9, asym: 0.32, legLen: 1.95 },
  },
  STAGE: {
    tag: "orator stage",
    headgear: "crest",
    shoulders: "none",
    back: "banner",
    chest: "diamond",
    morph: { h: 1.0, neckLen: 1.72, shoulder: 0.78, torsoGirth: 0.9, footScale: 1.52, legLen: 1.5 },
  },
  GAVEL: {
    tag: "compact gavel",
    headgear: "helm",
    shoulders: "none",
    back: "none",
    chest: "ring",
    morph: { h: 0.86, headScale: 0.72, neckLen: 1.25, torsoGirth: 1.25, shoulder: 0.65, legLen: 0.82, footScale: 1.35 },
  },
  JEST: {
    tag: "wispy jest",
    headgear: "antenna",
    shoulders: "vent",
    back: "kite",
    chest: "eye",
    morph: { h: 0.9, headScale: 0.88, neckLen: 1.18, torsoGirth: 0.85, shoulder: 0.85, armLen: 1.12, legLen: 1.25 },
  },
  ORATOR: {
    tag: "tall pulpit",
    headgear: "crest",
    shoulders: "vent",
    back: "banner",
    chest: "diamond",
    morph: { h: 1.0, neckLen: 1.65, shoulder: 0.8, torsoGirth: 0.9, footScale: 1.52, legLen: 1.7 },
  },
  PULPIT: {
    tag: "tall pulpit",
    headgear: "crest",
    shoulders: "vent",
    back: "banner",
    chest: "diamond",
    morph: { h: 1.0, neckLen: 1.62, shoulder: 0.8, torsoGirth: 0.9, footScale: 1.48, legLen: 1.65 },
  },
  RIFF: {
    tag: "reach riff",
    headgear: "fin",
    shoulders: "vent",
    back: "wings",
    chest: "lattice",
    morph: { h: 0.92, headScale: 1.15, torsoGirth: 0.72, shoulder: 0.85, armLen: 1.25, legLen: 1.5, asym: 0.28 },
  },
  DREAM: {
    tag: "tiny dream",
    headgear: "fin",
    shoulders: "none",
    back: "wings",
    chest: "diamond",
    morph: { h: 0.78, headScale: 1.35, torsoGirth: 0.6, shoulder: 0.7, legLen: 1.12, asym: 0.22 },
  },
  QUIET: {
    tag: "thin quiet",
    headgear: "none",
    shoulders: "pauldron",
    back: "none",
    chest: "core",
    morph: { h: 1.06, headScale: 0.48, neckLen: 0.8, torsoGirth: 0.75, shoulder: 0.72, legLen: 1.1 },
  },
  STONE: {
    tag: "stout stone",
    headgear: "crest",
    shoulders: "plates",
    back: "none",
    chest: "bars",
    morph: { h: 0.9, headScale: 0.58, torsoGirth: 1.75, shoulder: 1.3, legGirth: 1.45, legLen: 0.7, footScale: 1.4 },
  },
  ANCHOR: {
    tag: "mass wall",
    headgear: "dome",
    shoulders: "pauldron",
    back: "none",
    chest: "bars",
    morph: { h: 1.1, headScale: 0.52, torsoGirth: 1.5, shoulder: 1.18, legGirth: 1.22, footScale: 1.28 },
  },
  BULWARK: {
    tag: "balanced harbor",
    headgear: "helm",
    shoulders: "plates",
    back: "coils",
    chest: "ring",
    morph: { h: 1.02, headScale: 0.58, torsoGirth: 1.2, shoulder: 1.0, footScale: 1.15 },
  },
  WHIM: {
    tag: "wispy ink",
    headgear: "quills",
    shoulders: "none",
    back: "thrusters",
    chest: "eye",
    morph: { h: 0.86, headScale: 1.22, torsoGirth: 0.65, shoulder: 0.78, armLen: 1.2, legLen: 1.28, asym: 0.3 },
  },
  FRACTAL: {
    tag: "bobble muse",
    headgear: "antenna",
    shoulders: "none",
    back: "wings",
    chest: "diamond",
    morph: { h: 0.88, headScale: 1.28, torsoGirth: 0.65, shoulder: 0.75, armLen: 1.15, asym: 0.26 },
  },
  // Extra named overrides — break leftover gallery twins that still share a breed.
  FLUX: {
    tag: "disk flux",
    headgear: "disks",
    shoulders: "spike",
    back: "thrusters",
    chest: "core",
    // Keep torso/shoulder near parity so arms root at the shoulder, not inside the chest.
    morph: { h: 0.92, headScale: 1.0, torsoGirth: 0.88, shoulder: 0.95, armGirth: 0.9, armLen: 1.08, asym: 0.28, legLen: 1.4 },
  },
  HAVOC: {
    tag: "horn havoc",
    headgear: "horns",
    shoulders: "plates",
    back: "kite",
    chest: "bars",
    morph: { h: 0.84, torsoGirth: 1.4, shoulder: 1.2, asym: 0.6, armLen: 1.15, legLen: 0.82, legGirth: 1.2 },
  },
  SCRAP: {
    tag: "horn scrap",
    headgear: "horns",
    shoulders: "spike",
    back: "none",
    chest: "eye",
    morph: { h: 0.86, asym: 0.55, torsoGirth: 1.5, shoulder: 1.28, legLen: 0.78, legGirth: 1.3 },
  },
  CANVAS: {
    tag: "round canvas",
    headgear: "disks",
    shoulders: "none",
    back: "wings",
    chest: "lattice",
    morph: { h: 0.84, headScale: 1.22, torsoGirth: 1.2, legGirth: 1.15, legLen: 0.88, asym: 0.26 },
  },
  MOSAIC: {
    tag: "antenna mosaic",
    headgear: "antenna",
    shoulders: "vent",
    back: "wings",
    chest: "eye",
    morph: { h: 0.86, headScale: 1.2, torsoGirth: 0.7, armLen: 1.3, asym: 0.34 },
  },
  BRACE: {
    tag: "fort brace",
    headgear: "disks",
    shoulders: "pauldron",
    back: "slab",
    chest: "bars",
    morph: { h: 1.08, headScale: 0.5, torsoGirth: 1.55, shoulder: 1.22, legGirth: 1.3, legLen: 0.88, footScale: 1.28 },
  },
  CADENCE: {
    tag: "crest cadence",
    headgear: "crest",
    shoulders: "none",
    back: "banner",
    chest: "ring",
    morph: { h: 1.0, neckLen: 1.55, torsoGirth: 0.88, shoulder: 0.78, armLen: 1.1, footScale: 1.38, legLen: 1.55 },
  },
  LITANY: {
    tag: "orator litany",
    headgear: "disks",
    shoulders: "vent",
    back: "banner",
    chest: "diamond",
    morph: { h: 1.0, neckLen: 1.68, shoulder: 0.82, torsoGirth: 0.92, footScale: 1.48, legLen: 1.55 },
  },
};

/** Small seeded part swaps — cousins stay in-family but don't clone 1:1. */
function spiceParts(kit: SpeciesKit, key: string): Pick<SpeciesKit, "shoulders" | "chest" | "back"> {
  const h = hash(`${key}:parts`);
  let { shoulders, chest, back } = kit;
  if (h % 5 === 0) {
    if (chest === "diamond") chest = "lattice";
    else if (chest === "lattice") chest = "diamond";
    else if (chest === "bars") chest = "core";
    else if (chest === "core") chest = "bars";
    else if (chest === "eye") chest = "ring";
    else if (chest === "ring") chest = "eye";
  }
  if (h % 7 === 1) {
    if (shoulders === "vent") shoulders = "plates";
    else if (shoulders === "plates") shoulders = "vent";
    else if (shoulders === "none") shoulders = "vent";
    else if (shoulders === "spike") shoulders = "vent";
  }
  if (h % 11 === 2) {
    if (back === "thrusters") back = "kite";
    else if (back === "kite") back = "thrusters";
    else if (back === "wings") back = "kite";
    else if (back === "none" && kit.headgear !== "dome") back = "coils";
  }
  return { shoulders, chest, back };
}

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
  // Morph spice + light part spice — breed family stays readable, gallery clones thin out.
  const spice = ((hash(k + ":spice") % 1000) / 1000 - 0.5) * 0.06;
  const m = { ...breed.kit.morph };
  if (m.headScale != null) m.headScale *= 1 + spice;
  if (m.legLen != null) m.legLen *= 1 - spice * 0.5;
  if (m.torsoGirth != null) m.torsoGirth *= 1 + spice * 0.4;
  const parts = spiceParts(breed.kit, k);
  return {
    ...breed.kit,
    ...parts,
    morph: m,
    tag: `${breed.id}:${breed.kit.tag}`,
  };
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
