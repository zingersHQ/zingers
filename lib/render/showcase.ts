// Deterministic showcase careers for canon renders — legend-tier bodies that read
// as "this is what a raised mind looks like" without using player state.
import type { Champion } from "@/lib/types";
import type { CreatureType } from "@/lib/types";
import { ROSTER } from "@/lib/engine/roster";
import { KEEPERS } from "@/lib/lore/canon";

const LEGEND_XP = 18500;

/** Per–First Mind archetype stats → visible body shape at export time. */
const MIND_SHOWCASE: Record<string, Partial<Champion>> = {
  AXIOM: { aggression: 22, control: 92, resilience: 48, flair: 18, creativity: 12, wins: 44, losses: 7, battles: 51 },
  VOX: { aggression: 38, control: 55, resilience: 30, flair: 88, creativity: 42, wins: 41, losses: 9, battles: 50 },
  GLITCH: { aggression: 72, control: 18, resilience: 25, flair: 65, creativity: 58, wins: 36, losses: 14, battles: 50 },
  MUSE: { aggression: 28, control: 40, resilience: 32, flair: 70, creativity: 95, wins: 39, losses: 11, battles: 50 },
  BASTION: { aggression: 20, control: 75, resilience: 92, flair: 15, creativity: 10, wins: 42, losses: 8, battles: 50 },
  EMBER: { aggression: 85, control: 25, resilience: 55, flair: 48, creativity: 35, wins: 38, losses: 12, battles: 50 },
};

function baseShowcase(key: string, patch: Partial<Champion> = {}): Champion {
  const mind = MIND_SHOWCASE[key] ?? { aggression: 40, control: 40, resilience: 40, flair: 40, creativity: 40, wins: 30, losses: 10, battles: 40 };
  return {
    xp: LEGEND_XP,
    wins: mind.wins ?? 30,
    losses: mind.losses ?? 10,
    battles: mind.battles ?? 40,
    aggression: mind.aggression ?? 40,
    control: mind.control ?? 40,
    resilience: mind.resilience ?? 40,
    flair: mind.flair ?? 40,
    creativity: mind.creativity ?? 40,
    ...patch,
  };
}

export function showcaseChampion(key: string): { key: string; type: CreatureType; champion: Champion } {
  const k = key.toUpperCase();
  const type = (ROSTER[k]?.type ?? "LOGIC") as CreatureType;
  return { key: k, type, champion: baseShowcase(k) };
}

const FORCE_MIND: Record<string, string> = {
  lattice: "AXIOM",
  static: "GLITCH",
  stillness: "BASTION",
  chorus: "VOX",
  spark: "MUSE",
};

export function showcaseForForce(slug: string) {
  const key = FORCE_MIND[slug.toLowerCase()] ?? "AXIOM";
  return showcaseChampion(key);
}

const REGION_MIND: Record<string, string> = {
  colosseum: "VOX",
  wastes: "EMBER",
  garden: "MUSE",
};

export function showcaseForRegion(regionId: string) {
  const key = REGION_MIND[regionId.toLowerCase()] ?? "AXIOM";
  return showcaseChampion(key);
}

const KEEPER_MIND: Record<string, string> = {
  Tibble: "VOX",
  Quill: "AXIOM",
  Bastion: "BASTION",
  Vesper: "MUSE",
  Sable: "EMBER",
};

export function showcaseForKeeper(name: string) {
  const keeper = KEEPERS.find((k) => k.name.toLowerCase() === name.toLowerCase());
  const key = KEEPER_MIND[keeper?.name ?? name] ?? "BASTION";
  const hex = keeper?.hex;
  return { ...showcaseChampion(key), accentHex: hex };
}
