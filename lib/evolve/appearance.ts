// The genome → body function. A champion's silhouette is a deterministic
// function of its career. Deviation from the shared base mesh is AMPLIFIED by
// rank, so legends warp far more than rookies. Used by the 3D Grounds (bone
// scaling) and the 2D avatar (aura intensity).
import type { Champion } from "@/lib/types";
import { levelFor, tierFor, tierIndex, type Tier } from "./progression";

export interface Appearance {
  level: number;
  tier: Tier;
  ti: number;
  gain: number;
  prog: number;
  /** overall stature (world units, ~1.7 base) */
  h: number;
  /** non-uniform body width: <1 reedy/lean, >1 broad/stocky */
  width: number;
  /** head bone scale */
  headScale: number;
  /** fist (metacarpal) bone scale */
  handScale: number;
  /** energy-skin glow 0..~1.6 */
  emissive: number;
  metalness: number;
  roughness: number;
}

const cl = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function appearanceOf(p: Champion): Appearance {
  const lf = levelFor(p.xp);
  const tier = tierFor(lf.level);
  const ti = tierIndex(lf.level);
  const n = (k: keyof Champion) => Math.min(1, ((p[k] as number) || 0) / 16); // sigil-III ≈ 16
  const nAgg = n("aggression");
  const nRes = n("resilience");
  const nCtl = n("control");
  const nFlr = n("flair");
  const nCre = n("creativity");
  // progression amplifier: more complex/refined → more violent deviation
  const prog = Math.min(1.5, lf.level / 20 + ti * 0.12);
  const gain = 0.5 + prog * 2.6; // rookie ≈0.6×, legend ≈4.4×
  return {
    level: lf.level,
    tier,
    ti,
    gain,
    prog,
    h: 1.7 + Math.min(0.95, lf.level * 0.045) + (nFlr * 0.1 - nRes * 0.05) * gain,
    width: cl(1 + (nRes * 0.16 + nAgg * 0.05 - nFlr * 0.05) * gain, 0.7, 2.05),
    headScale: cl(1 + (nCre * 0.16 + nFlr * 0.06) * gain, 0.85, 2.15),
    handScale: cl(1 + (nAgg * 0.2 + nCtl * 0.04) * gain, 0.9, 2.45),
    emissive: 0.45 + ti * 0.28,
    metalness: 0.35 + ti * 0.12,
    roughness: Math.max(0.15, Math.min(0.95, 0.62 - ti * 0.06 + Math.min(0.35, p.losses * 0.045))),
  };
}
