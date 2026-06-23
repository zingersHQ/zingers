// ─────────────────────────────────────────────────────────────────────────────
// Archetypes — the per-Force IDENTITY KIT that turns one shared base mesh into
// five visibly distinct beings. Each Force gets:
//   • a BODY PLAN (per-bone proportion multipliers layered on the genome morph)
//   • a MATERIAL LANGUAGE (finish bias: crystalline gloss vs matte stone vs glow)
//   • a SIGNATURE FEATURE SET (energy constructs around the body)
//   • a PHENOTYPE BIAS (which solid parts the seeded part-catalog favours)
//   • IDLE flavour (clip timescale + posture lean)
//
// The body plan reshapes the skeleton (lanky vs tank vs bobblehead), the part
// catalog (lib/render/phenotype.ts) bolts on solid headgear/shoulders/back/chest,
// and a per-individual seed jitters both — so within one Force, no two minds share
// a silhouette. When real per-archetype GLBs land (see model-registry.ts) the body
// plan + feature kit still ride on top, so the upgrade is additive, never a rewrite.
// ─────────────────────────────────────────────────────────────────────────────
import type { Champion, CreatureType } from "@/lib/types";
import { appearanceOf, jitterMorph, type Appearance, type BoneMorph } from "@/lib/evolve/appearance";

export type FeatureSet = "lattice" | "static" | "monolith" | "chorus" | "spark";

/** Per-Force multipliers on each genome morph axis. 1 = leave the career alone;
 *  >1 / <1 push the species toward its archetypal build. */
export interface BodyPlan {
  h: number;
  headScale: number;
  neckLen: number;
  torsoGirth: number;
  shoulder: number;
  armGirth: number;
  armLen: number;
  legGirth: number;
  legLen: number;
  /** 0..1 amount of left/right asymmetry baked into the silhouette */
  asym: number;
}

export interface MaterialLang {
  metalness: number; // additive bias on the genome material
  roughness: number; // additive bias
  emissive: number; // multiplier on the genome emissive
}

export interface ArchetypeKit {
  type: CreatureType;
  featureSet: FeatureSet;
  body: BodyPlan;
  material: MaterialLang;
  /** idle clip speed (1 = base); lower = heavier/calmer, higher = jittery/lively */
  idleSpeed: number;
  /** forward/back lean of the whole figure (radians) — posture identity */
  lean: number;
}

// One kit per Force. Numbers are tuned to read as five different SPECIES at a
// glance while staying inside the existing neon-on-void aesthetic.
export const ARCHETYPES: Record<CreatureType, ArchetypeKit> = {
  // The Lattice — a TOWERING spindle: long thin neck, narrow waist, stretched
  // arms, and near-double-length stilt legs under a small precise head. Tallest of
  // the five by far. A walking proof, all reach.
  LOGIC: {
    type: "LOGIC",
    featureSet: "lattice",
    body: { h: 2.0, headScale: 0.8, neckLen: 1.5, torsoGirth: 0.7, shoulder: 0.84, armGirth: 0.7, armLen: 1.6, legGirth: 0.74, legLen: 1.95, asym: 0 },
    material: { metalness: 0.28, roughness: -0.32, emissive: 1.0 },
    idleSpeed: 0.85,
    lean: -0.02,
  },
  // The Static — restless, lopsided: a big head on a sunk neck, mismatched limbs,
  // a stocky uneven build. Noise made flesh.
  CHAOS: {
    type: "CHAOS",
    featureSet: "static",
    body: { h: 0.92, headScale: 1.34, neckLen: 0.68, torsoGirth: 1.14, shoulder: 1.14, armGirth: 1.2, armLen: 1.08, legGirth: 0.9, legLen: 0.86, asym: 1.0 },
    material: { metalness: -0.05, roughness: 0.22, emissive: 1.25 },
    idleSpeed: 1.35,
    lean: 0.05,
  },
  // The Stillness — squat, monumental: an enormous barrel torso on thick stubby
  // legs, massive shoulders, a tiny head sunk into the mass. The SHORTEST of the
  // five — an immovable boulder you have to outlast.
  COMPOSURE: {
    type: "COMPOSURE",
    featureSet: "monolith",
    body: { h: 0.52, headScale: 0.56, neckLen: 0.38, torsoGirth: 2.3, shoulder: 2.0, armGirth: 1.6, armLen: 0.66, legGirth: 2.0, legLen: 0.62, asym: 0 },
    material: { metalness: -0.12, roughness: 0.36, emissive: 0.7 },
    idleSpeed: 0.6,
    lean: 0.0,
  },
  // The Chorus — tall, regal, upright; a poised orator on a very long neck with a
  // narrow waist and long legs. Bearing, not bulk — shoulders stay modest so it
  // reads as a speaker, not a linebacker, and never collides with the Spark.
  RHETORIC: {
    type: "RHETORIC",
    featureSet: "chorus",
    body: { h: 1.62, headScale: 1.04, neckLen: 1.85, torsoGirth: 0.84, shoulder: 1.18, armGirth: 0.86, armLen: 1.2, legGirth: 0.98, legLen: 1.5, asym: 0 },
    material: { metalness: 0.08, roughness: -0.1, emissive: 1.18 },
    idleSpeed: 1.05,
    lean: -0.04,
  },
  // The Spark — a tiny floaty body slung under an ENORMOUS head, wispy limbs. All
  // idea, no ballast. A bobblehead sprite, second-smallest after the Stillness.
  CREATIVITY: {
    type: "CREATIVITY",
    featureSet: "spark",
    body: { h: 0.66, headScale: 2.15, neckLen: 0.82, torsoGirth: 0.52, shoulder: 0.64, armGirth: 0.54, armLen: 1.24, legGirth: 0.58, legLen: 1.1, asym: 0.32 },
    material: { metalness: 0.0, roughness: -0.05, emissive: 1.22 },
    idleSpeed: 1.1,
    lean: 0.02,
  },
};

export function kitFor(type: CreatureType): ArchetypeKit {
  return ARCHETYPES[type] ?? ARCHETYPES.LOGIC;
}

const cl = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function planMorph(base: BoneMorph, plan: BodyPlan): BoneMorph {
  return {
    headScale: cl(base.headScale * plan.headScale, 0.5, 2.5),
    neckLen: cl(base.neckLen * plan.neckLen, 0.36, 2.1),
    torsoGirth: cl(base.torsoGirth * plan.torsoGirth, 0.42, 2.6),
    torsoLen: cl(base.torsoLen, 0.86, 1.24),
    shoulder: cl(base.shoulder * plan.shoulder, 0.55, 2.5),
    armGirth: cl(base.armGirth * plan.armGirth, 0.5, 2.1),
    armLen: cl(base.armLen * plan.armLen, 0.55, 2.05),
    legGirth: cl(base.legGirth * plan.legGirth, 0.52, 2.3),
    legLen: cl(base.legLen * plan.legLen, 0.55, 2.35),
    handScale: cl(base.handScale, 0.35, 0.95),
    asymL: 1,
    asymR: 1,
  };
}

/** Layer a Force archetype's body plan + material language onto the genome
 *  appearance, then apply the per-individual seed jitter (+ asymmetry). The
 *  genome (career) still drives the *range*; the archetype sets the species; the
 *  seed makes each one an individual. */
export function archetypeAppearance(champion: Champion, type: CreatureType, seed = 0): Appearance {
  const base = appearanceOf(champion);
  const k = kitFor(type);
  const planned = planMorph(base.morph, k.body);
  const morph = seed ? jitterMorph(planned, seed, k.body.asym) : planned;
  return {
    ...base,
    h: cl(base.h * k.body.h, 0.7, 5.2),
    width: morph.torsoGirth,
    headScale: morph.headScale,
    handScale: morph.handScale,
    morph,
    metalness: cl(base.metalness + k.material.metalness, 0, 1),
    roughness: cl(base.roughness + k.material.roughness, 0.05, 1),
    emissive: cl(base.emissive * k.material.emissive, 0, 2.2),
  };
}
