// The genome → body function. A champion's silhouette is a deterministic
// function of its career. Deviation from the shared base mesh is AMPLIFIED by
// rank, so legends warp far more than rookies. Used by the 3D Grounds (bone
// scaling) and the 2D avatar (aura intensity).
//
// The body is reshaped per BONE, not by squashing the whole mesh. Earlier builds
// applied girth as a non-uniform scale on the entire model, which flattened the
// head + limbs into a pancake and made every trained mind read as the same squat
// blob. Instead we drive a full skeletal genome — head, neck, chest, shoulders,
// arms, legs, hands each scale independently — so career + Force + a per-individual
// seed produce genuinely different builds (lanky vs barrel vs bobblehead vs tank).
import type { Champion } from "@/lib/types";
import { levelFor, tierFor, tierIndex, type Tier } from "./progression";

/** Per-bone-group scale targets, relative to the rig's bind pose. Consumed by
 *  applyBoneMorph() in champion-mesh. Length scales the bone's long axis; girth
 *  scales its cross-section. The head/torso girth coupling is corrected at apply
 *  time (the head is counter-scaled so a barrel chest never widens the skull). */
export interface BoneMorph {
  /** uniform head bone scale */
  headScale: number;
  /** neck length (Y) — long = elegant/projecting, short = hunched/sunken */
  neckLen: number;
  /** torso cross-section (X/Z), split across abdomen + chest bones */
  torsoGirth: number;
  /** torso length (Y) */
  torsoLen: number;
  /** shoulder bone scale (breadth of the upper frame) */
  shoulder: number;
  /** arm cross-section (X/Z) */
  armGirth: number;
  /** arm length (Y, applied on the upper arm) */
  armLen: number;
  /** leg cross-section (X/Z) */
  legGirth: number;
  /** leg length (Y, applied on the upper leg) */
  legLen: number;
  /** uniform hand/finger bone scale */
  handScale: number;
  /** uniform foot bone scale (planted mass / stance read) */
  footScale: number;
  /** left/right limb girth multipliers — asymmetry (CHAOS reads as "broken") */
  asymL: number;
  asymR: number;
}

export interface Appearance {
  level: number;
  tier: Tier;
  ti: number;
  gain: number;
  prog: number;
  /** overall stature (world units, ~1.7 base) */
  h: number;
  /** legacy summary girth (≈torsoGirth) — kept for the 2D avatar + stat readouts */
  width: number;
  /** head bone scale (legacy alias of morph.headScale) */
  headScale: number;
  /** fist bone scale (legacy alias of morph.handScale) */
  handScale: number;
  /** full skeletal genome */
  morph: BoneMorph;
  /** energy-skin glow 0..~1.6 */
  emissive: number;
  metalness: number;
  roughness: number;
}

const cl = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// dependency-free deterministic PRNG (mirrors palette.ts) — used for the per
// individual jitter so two identical careers still read as different beings.
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

export function appearanceOf(p: Champion): Appearance {
  const lf = levelFor(p.xp);
  const tier = tierFor(lf.level);
  const ti = tierIndex(lf.level);
  // Wider normalisation (÷20, soft overshoot) so high stats keep separating
  // instead of all pinning to the same clamp — that flatness was a big part of
  // "no variety per type".
  const n = (k: keyof Champion) => Math.min(1.15, ((p[k] as number) || 0) / 20);
  const nAgg = n("aggression");
  const nRes = n("resilience");
  const nCtl = n("control");
  const nFlr = n("flair");
  const nCre = n("creativity");
  // progression amplifier: more complex/refined → more violent deviation. The
  // tier term (ti) is weighted heavily so CROSSING a tier produces a visible
  // silhouette jump — evolution you can read across the arena, not just a smooth
  // per-level creep (the per-win nudge is deliberately sub-pixel).
  const prog = Math.min(1.6, lf.level / 20 + ti * 0.22);
  const gain = 0.5 + prog * 2.4; // rookie ≈0.6×, legend ≈4.3×
  const g = gain * 0.5; // per-axis morph gain (kept gentle; clamps below shape it)

  const morph: BoneMorph = {
    headScale: cl(1 + (nCre * 0.34 + nFlr * 0.12 - nRes * 0.1) * g, 0.8, 1.7),
    neckLen: cl(1 + (nFlr * 0.32 - nRes * 0.26 - nAgg * 0.12) * g, 0.6, 1.6),
    torsoGirth: cl(1 + (nRes * 0.5 + nAgg * 0.18 - nFlr * 0.14 - nCre * 0.12) * g, 0.7, 1.75),
    torsoLen: cl(1 + (nRes * 0.08 - nFlr * 0.04) * g, 0.9, 1.18),
    shoulder: cl(1 + (nAgg * 0.36 + nCtl * 0.12 - nCre * 0.12) * g, 0.78, 1.7),
    armGirth: cl(1 + (nAgg * 0.36 + nRes * 0.12 - nFlr * 0.14) * g, 0.75, 1.65),
    armLen: cl(1 + (nFlr * 0.28 + nCtl * 0.1 - nRes * 0.2) * g, 0.78, 1.42),
    legGirth: cl(1 + (nRes * 0.36 + nAgg * 0.1 - nFlr * 0.1) * g, 0.78, 1.6),
    legLen: cl(1 + (nFlr * 0.26 - nRes * 0.14) * g, 0.82, 1.38),
    // the base rig's hands are already oversized — scale them DOWN by default and
    // only let an aggressive build inch them back up. (Old code scaled them up.)
    handScale: cl(0.5 + nAgg * 0.16 * g, 0.4, 0.82),
    footScale: 1,
    asymL: 1,
    asymR: 1,
  };

  return {
    level: lf.level,
    tier,
    ti,
    gain,
    prog,
    // stature grows smoothly with level, plus a discrete per-tier step so each
    // tier-up is a legible height jump in-world.
    h: 1.7 + Math.min(0.9, lf.level * 0.04) + ti * 0.09 + (nFlr * 0.1 - nRes * 0.05) * gain,
    width: morph.torsoGirth,
    headScale: morph.headScale,
    handScale: morph.handScale,
    morph,
    emissive: 0.45 + ti * 0.28,
    metalness: 0.35 + ti * 0.12,
    roughness: Math.max(0.15, Math.min(0.95, 0.62 - ti * 0.06 + Math.min(0.35, p.losses * 0.045))),
  };
}

/** Apply a stable per-individual jitter to a morph so two identical careers still
 *  read as distinct beings (and so a CHAOS mind gets its lopsided asymmetry).
 *  `spread` scales the jitter budget — authored species kits use ~0.4 so breed
 *  silhouette stays readable; lottery fallbacks keep the full 1.0 collectible spread. */
export function jitterMorph(m: BoneMorph, seed: number, asym = 0, spread = 1): BoneMorph {
  const rnd = mulberry32(seed || 1);
  const s = Math.max(0, Math.min(1.5, spread));
  const j = (v: number, amt: number, lo: number, hi: number) =>
    cl(v * (1 + (rnd() - 0.5) * amt * s), lo, hi);
  // Wider individual jitter so a dex of same-Force minds reads as different
  // animals, not palette swaps (collectible silhouette budget).
  const out: BoneMorph = {
    headScale: j(m.headScale, 0.28, 0.52, 2.25),
    neckLen: j(m.neckLen, 0.34, 0.38, 2.15),
    torsoGirth: j(m.torsoGirth, 0.28, 0.44, 2.35),
    torsoLen: j(m.torsoLen, 0.14, 0.82, 1.28),
    shoulder: j(m.shoulder, 0.3, 0.52, 2.2),
    armGirth: j(m.armGirth, 0.28, 0.5, 2.0),
    armLen: j(m.armLen, 0.26, 0.58, 1.72),
    legGirth: j(m.legGirth, 0.28, 0.54, 2.05),
    legLen: j(m.legLen, 0.24, 0.58, 1.78),
    handScale: j(m.handScale, 0.24, 0.3, 0.98),
    footScale: j(m.footScale, 0.18, 0.55, 1.95),
    asymL: 1,
    asymR: 1,
  };
  if (asym > 0) {
    // one side runs heavier than the other — the lopsided "broken" silhouette
    const side = rnd() > 0.5 ? 1 : -1;
    const amt = asym * (0.12 + rnd() * 0.14);
    out.asymL = 1 + side * amt;
    out.asymR = 1 - side * amt;
  }
  return out;
}
