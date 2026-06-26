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
  /** uniform hand scale (default 1) — multiplies the genome's hand size */
  handScale?: number;
  /** uniform foot scale (default 1) — bigger boots / planted stance */
  footScale?: number;
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
  // The Lattice — the CANONICAL build (e.g. PARADOX). A clean, balanced humanoid
  // that every other Force is read against: even proportions, a precise head, no
  // exaggeration. The reference "1.0" silhouette.
  LOGIC: {
    type: "LOGIC",
    featureSet: "lattice",
    body: { h: 1.0, headScale: 0.96, neckLen: 1.05, torsoGirth: 0.96, shoulder: 0.9, armGirth: 0.94, armLen: 1.06, legGirth: 0.96, legLen: 1.1, asym: 0 },
    material: { metalness: 0.28, roughness: -0.32, emissive: 1.0 },
    idleSpeed: 0.95,
    lean: 0,
  },
  // The Static — slighter than canonical (e.g. EMBER): a touch shorter, a narrow
  // waist and shoulders, longer legs, and only a hint of the old lopsided jitter.
  // Reads lighter and more lithe against the Lattice's even build.
  CHAOS: {
    type: "CHAOS",
    featureSet: "static",
    body: { h: 0.9, headScale: 0.9, neckLen: 1.08, torsoGirth: 0.8, shoulder: 0.82, armGirth: 0.8, armLen: 1.04, legGirth: 0.82, legLen: 1.14, asym: 0.45 },
    material: { metalness: -0.05, roughness: 0.22, emissive: 1.25 },
    idleSpeed: 1.2,
    lean: 0.03,
  },
  // The Stillness — a TOWERING long-LEGGED guard (e.g. BASTION): roughly double the
  // canonical height, standing tall on long stilt legs with reaching (but not
  // floor-dragging) arms, neat small hands, a moderate torso, and a small head on a
  // short neck. Height and reach, not bulk — you crane up at it.
  COMPOSURE: {
    type: "COMPOSURE",
    featureSet: "monolith",
    body: { h: 2.0, headScale: 0.62, neckLen: 0.92, torsoGirth: 0.95, shoulder: 0.8, armGirth: 0.78, armLen: 0.95, legGirth: 0.9, legLen: 2.0, handScale: 0.45, asym: 0 },
    material: { metalness: -0.12, roughness: 0.36, emissive: 0.7 },
    idleSpeed: 0.65,
    lean: 0.0,
  },
  // The Chorus — tall and regal (e.g. WIT): a poised orator on a long neck and long
  // legs, with a SMALLER head (so the big side eye-pods read as a neat face, not
  // ears), SLIGHT shoulders (no big pauldron pads), and noticeably bigger feet for a
  // planted, grounded stance. Bearing over bulk.
  RHETORIC: {
    type: "RHETORIC",
    featureSet: "chorus",
    body: { h: 1.55, headScale: 0.8, neckLen: 1.5, torsoGirth: 0.94, shoulder: 0.6, armGirth: 0.86, armLen: 1.14, legGirth: 0.98, legLen: 1.42, footScale: 1.34, asym: 0 },
    material: { metalness: 0.08, roughness: -0.1, emissive: 1.18 },
    idleSpeed: 1.05,
    lean: -0.04,
  },
  // The Spark — a light, floaty body under a head that is a little bigger than
  // canonical (e.g. MUSE): "ideas-heavy" but no longer a giant bobblehead saucer.
  // Wispy limbs, a small frame.
  CREATIVITY: {
    type: "CREATIVITY",
    featureSet: "spark",
    body: { h: 0.84, headScale: 1.15, neckLen: 0.9, torsoGirth: 0.62, shoulder: 0.66, armGirth: 0.58, armLen: 1.18, legGirth: 0.64, legLen: 1.14, asym: 0.28 },
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
    handScale: cl(base.handScale * (plan.handScale ?? 1), 0.3, 0.95),
    footScale: cl(base.footScale * (plan.footScale ?? 1), 0.6, 1.8),
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
