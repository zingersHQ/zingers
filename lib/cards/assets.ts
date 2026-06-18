export const FIRST_MIND_KEYS = ["AXIOM", "VOX", "GLITCH", "MUSE", "BASTION", "EMBER"] as const;

export function portraitOf(key: string) {
  return `/img/bible/minds/mind-${key.toLowerCase()}.png`;
}
