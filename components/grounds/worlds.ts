// A world = a skin (biome) + a game (scenario). Selecting a world now changes
// what you actually DO there, not just the palette. The old biome-only selector
// is gone; this is its replacement.
import { BIOMES, type BiomeConfig } from "./biomes";
import { SCENARIOS } from "@/lib/scenarios/registry";
import type { ScenarioDef } from "@/lib/scenarios/types";

export interface WorldDef {
  id: string;
  name: string;
  tagline: string;
  biome: BiomeConfig;
  scenario: ScenarioDef;
}

export const WORLDS: WorldDef[] = [
  {
    id: "grounds",
    name: "The Grounds",
    tagline: "open duels · the home arena",
    biome: BIOMES[0], // Obsidian Colosseum
    scenario: SCENARIOS.duel,
  },
  {
    id: "gauntlet",
    name: "Ember Gauntlet",
    tagline: "survival run · rising stakes",
    biome: BIOMES[1], // Ember Wastes
    scenario: SCENARIOS.gauntlet,
  },
  {
    id: "void",
    name: "Void Garden",
    tagline: "open duels · bioluminescent deep space",
    biome: BIOMES[2], // Void Garden
    scenario: SCENARIOS.duel,
  },
];

export const DEFAULT_WORLD = WORLDS[0];

export function worldById(id: string | null | undefined): WorldDef {
  return WORLDS.find((w) => w.id === id) ?? DEFAULT_WORLD;
}
