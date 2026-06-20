// ─────────────────────────────────────────────────────────────────────────────
// Archetypes — the per-Force IDENTITY KIT that turns one shared base mesh into
// five visibly distinct beings. Each Force gets:
//   • a SILHOUETTE (bold proportion multipliers layered on the genome appearance)
//   • a MATERIAL LANGUAGE (finish bias: crystalline gloss vs matte stone vs glow)
//   • a SIGNATURE FEATURE SET (primitive attachments rendered around the body)
//   • IDLE flavour (clip timescale + posture lean)
//
// This is the cheap, no-new-assets layer of the visual overhaul. When real
// per-archetype GLBs land (see lib/render/model-registry.ts) the silhouette +
// feature kit still rides on top, so the upgrade is additive, never a rewrite.
// ─────────────────────────────────────────────────────────────────────────────
import type { Champion, CreatureType } from "@/lib/types";
import { appearanceOf, type Appearance } from "@/lib/evolve/appearance";

export type FeatureSet = "lattice" | "static" | "monolith" | "chorus" | "spark";

export interface Silhouette {
  /** stature multiplier (×height) */
  h: number;
  /** girth multiplier (×width) */
  width: number;
  /** head bone multiplier (×headScale) */
  head: number;
  /** fist bone multiplier (×handScale) */
  hand: number;
}

export interface MaterialLang {
  metalness: number; // additive bias on the genome material
  roughness: number; // additive bias
  emissive: number; // multiplier on the genome emissive
}

export interface ArchetypeKit {
  type: CreatureType;
  featureSet: FeatureSet;
  silhouette: Silhouette;
  material: MaterialLang;
  /** idle clip speed (1 = base); lower = heavier/calmer, higher = jittery/lively */
  idleSpeed: number;
  /** forward/back lean of the whole figure (radians) — posture identity */
  lean: number;
}

// One kit per Force. Numbers are tuned to read as five different SPECIES at a
// glance while staying inside the existing neon-on-void aesthetic.
export const ARCHETYPES: Record<CreatureType, ArchetypeKit> = {
  // The Lattice — tall, lean, precise, crystalline. A walking proof.
  LOGIC: {
    type: "LOGIC",
    featureSet: "lattice",
    silhouette: { h: 1.1, width: 0.8, head: 0.9, hand: 0.92 },
    material: { metalness: 0.28, roughness: -0.32, emissive: 1.0 },
    idleSpeed: 0.85,
    lean: -0.02,
  },
  // The Static — fractured, restless, asymmetric. Noise made flesh.
  CHAOS: {
    type: "CHAOS",
    featureSet: "static",
    silhouette: { h: 0.95, width: 1.0, head: 1.06, hand: 1.28 },
    material: { metalness: -0.05, roughness: 0.22, emissive: 1.25 },
    idleSpeed: 1.35,
    lean: 0.05,
  },
  // The Stillness — broad, low, monolithic. An immovable slab.
  COMPOSURE: {
    type: "COMPOSURE",
    featureSet: "monolith",
    silhouette: { h: 0.84, width: 1.5, head: 0.84, hand: 1.12 },
    material: { metalness: -0.12, roughness: 0.36, emissive: 0.7 },
    idleSpeed: 0.6,
    lean: 0.0,
  },
  // The Chorus — radiant, theatrical, projecting. Built to move the room.
  RHETORIC: {
    type: "RHETORIC",
    featureSet: "chorus",
    silhouette: { h: 1.06, width: 1.04, head: 1.12, hand: 1.0 },
    material: { metalness: 0.08, roughness: -0.1, emissive: 1.18 },
    idleSpeed: 1.05,
    lean: -0.04,
  },
  // The Spark — light, big-headed, playful, near-floating. All idea, little ballast.
  CREATIVITY: {
    type: "CREATIVITY",
    featureSet: "spark",
    silhouette: { h: 1.0, width: 0.82, head: 1.26, hand: 0.88 },
    material: { metalness: 0.0, roughness: -0.05, emissive: 1.22 },
    idleSpeed: 1.1,
    lean: 0.02,
  },
};

export function kitFor(type: CreatureType): ArchetypeKit {
  return ARCHETYPES[type] ?? ARCHETYPES.LOGIC;
}

const cl = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Layer a Force archetype's silhouette + material language onto the genome
 *  appearance. The genome (career) still drives the *range*; the archetype sets
 *  the species. */
export function archetypeAppearance(champion: Champion, type: CreatureType): Appearance {
  const base = appearanceOf(champion);
  const k = kitFor(type);
  return {
    ...base,
    h: cl(base.h * k.silhouette.h, 1.0, 4.2),
    width: cl(base.width * k.silhouette.width, 0.55, 2.4),
    headScale: cl(base.headScale * k.silhouette.head, 0.7, 2.4),
    handScale: cl(base.handScale * k.silhouette.hand, 0.75, 2.8),
    metalness: cl(base.metalness + k.material.metalness, 0, 1),
    roughness: cl(base.roughness + k.material.roughness, 0.05, 1),
    emissive: cl(base.emissive * k.material.emissive, 0, 2.2),
  };
}
