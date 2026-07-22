// The Climb — the ten Reaches (docs/climb.md §2).
//
// A Reach is a band of ten sectors sharing one sky. The mirror law (§1, §9):
// the Climb renders the SAME worlds the desktop Grounds roam — every Reach skin
// is an existing BiomeConfig (night skin, or its daylightBiome() day skin), so
// there is never a parallel art set. Ten distinct looks from five biomes, free.

import { biomeById, daylightBiome, type BiomeConfig } from "../biomes";
import { reachIndex } from "./difficulty";

export interface ReachTheme {
  index: number; // 0..9
  roman: string; // "I".."X"
  name: string; // "The Launch"
  tagline: string; // one-line fantasy beat (shown on the entry title card)
  biome: BiomeConfig; // the world skin this Reach wears
  accent: string; // the ring / mote / HUD accent for this Reach
  /** nature-kit biome id for ClimbDressing props (same as biome.id base skin) */
  propBiomeId: string;
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

// [biomeId, useDay, name, tagline] per reach 0..9. Day skins reuse the existing
// daylightBiome() transform (same world, lit like noon) so VI–IX read as the
// climb breaking above the clouds into daylight.
const RECIPE: Array<[string, boolean, string, string]> = [
  ["concord", false, "The Launch", "the Concord falls away — first rings ahead"],
  ["colosseum", false, "Colosseum Rise", "the cosmic-violet nebula over the home grounds"],
  ["void", false, "Garden Drift", "bioluminescent spores drift up from the Void Garden"],
  ["ember", false, "Ember Thermals", "ash and heat rising off the Wastes"],
  ["amphitheatre", false, "The Amphitheatre", "torchlit stone — the world watches you pass"],
  ["concord", true, "Concord Dawn", "above the clouds, and the sky turns to morning"],
  ["colosseum", true, "High Colosseum", "thin bright air over the arena, faster winds"],
  ["void", true, "Garden Zenith", "crystal fields blazing in full sun"],
  ["ember", true, "Ember Corona", "white-hot haze — the hardest air of the climb"],
  ["void", false, "The Hum", "above everything — starlight, and what the Long Vault hums beneath"],
];

const THEMES: ReachTheme[] = RECIPE.map(([id, day, name, tagline], i) => {
  const base = biomeById(id);
  const biome = day ? daylightBiome(base) : base;
  return {
    index: i,
    roman: ROMAN[i]!,
    name,
    tagline,
    biome,
    accent: biome.lights.arenaPoint,
    propBiomeId: id,
  };
});

export function reachTheme(sector: number): ReachTheme {
  return THEMES[reachIndex(sector)]!;
}

export function reachThemeByIndex(index: number): ReachTheme {
  return THEMES[Math.max(0, Math.min(THEMES.length - 1, index))]!;
}

export const REACH_THEMES: readonly ReachTheme[] = THEMES;
