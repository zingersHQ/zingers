/** Multipliers layered on a Force body plan / BoneMorph (1 = leave alone). */
export type MorphBias = {
  h?: number;
  headScale?: number;
  neckLen?: number;
  torsoGirth?: number;
  shoulder?: number;
  armGirth?: number;
  armLen?: number;
  legGirth?: number;
  legLen?: number;
  handScale?: number;
  footScale?: number;
  /** asymmetry strength 0..1 (CHAOS breeds use this) */
  asym?: number;
};

type MorphLike = {
  headScale: number;
  neckLen: number;
  torsoGirth: number;
  shoulder: number;
  armGirth: number;
  armLen: number;
  legGirth: number;
  legLen: number;
  handScale: number;
  footScale: number;
};

/** Apply morph bias multipliers onto a planned morph + height. */
export function applyMorphBias<T extends MorphLike>(
  morph: T,
  bias: MorphBias,
  hBase: number,
): { morph: T; h: number } {
  const mul = (v: number, m?: number) => (m == null ? v : Math.max(0.62, Math.min(2.4, v * m)));
  const out = { ...morph };
  out.headScale = mul(out.headScale, bias.headScale);
  out.neckLen = mul(out.neckLen, bias.neckLen);
  out.torsoGirth = mul(out.torsoGirth, bias.torsoGirth);
  out.shoulder = mul(out.shoulder, bias.shoulder);
  out.armGirth = mul(out.armGirth, bias.armGirth);
  out.armLen = mul(out.armLen, bias.armLen);
  out.legGirth = mul(out.legGirth, bias.legGirth);
  out.legLen = mul(out.legLen, bias.legLen);
  out.handScale = mul(out.handScale, bias.handScale);
  out.footScale = mul(out.footScale, bias.footScale);
  return { morph: out, h: mul(hBase, bias.h) };
}
