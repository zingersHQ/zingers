export const FIRST_MIND_KEYS = ["AXIOM", "VOX", "GLITCH", "MUSE", "BASTION", "EMBER"] as const;

export type RenderAssetGroup = "minds" | "forces" | "regions" | "keepers";

/** Cached PNG from `npm run render:canon` — same genome → body as the live game. */
export function renderPortraitPath(key: string, group: RenderAssetGroup | "portrait" = "minds"): string {
  const slug = key.toLowerCase();
  if (group === "portrait" || group === "minds") return `/renders/minds/${slug}.png`;
  if (group === "forces") return `/renders/forces/force-${slug}.png`;
  if (group === "regions") return `/renders/regions/region-${slug}.png`;
  return `/renders/keepers/keeper-${slug}.png`;
}

/** Static PNG for OG cards and fallbacks. Live UI prefers ChampionPortrait when possible. */
export function portraitOf(key: string) {
  return renderPortraitPath(key, "minds");
}
