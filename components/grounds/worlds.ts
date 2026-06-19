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
  // "hub" = the Concord (a built settlement you spawn into, travel out from via
  // gates; no arena/tower of its own). "region" = a playable slab with an arena.
  kind: "hub" | "region";
}

export const WORLDS: WorldDef[] = [
  {
    id: "concord",
    name: "The Concord",
    tagline: "neutral ground · the gate-ring",
    biome: BIOMES[3], // The Concord (hub)
    scenario: SCENARIOS.duel, // unused in hub mode; kept for type/HUD compatibility
    kind: "hub",
  },
  {
    id: "grounds",
    name: "The Grounds",
    tagline: "open duels · the home arena",
    biome: BIOMES[0], // Obsidian Colosseum
    scenario: SCENARIOS.duel,
    kind: "region",
  },
  {
    id: "gauntlet",
    name: "Ember Gauntlet",
    tagline: "survival run · rising stakes",
    biome: BIOMES[1], // Ember Wastes
    scenario: SCENARIOS.gauntlet,
    kind: "region",
  },
  {
    id: "void",
    name: "Void Garden",
    tagline: "open duels · bioluminescent deep space",
    biome: BIOMES[2], // Void Garden
    scenario: SCENARIOS.duel,
    kind: "region",
  },
];

// The Concord spawns you in — the hub-first design (docs/bible/01-cosmology.md).
export const DEFAULT_WORLD = WORLDS[0];

export function worldById(id: string | null | undefined): WorldDef {
  return WORLDS.find((w) => w.id === id) ?? DEFAULT_WORLD;
}

export const REGION_WORLDS = WORLDS.filter((w) => w.kind === "region");

// ── The Concord's Vaultgates ─────────────────────────────────────────────────
// One gate per region, evenly ringed around the seal. Pure layout (angle/dist +
// destination + accent); the 3D scene turns these into portal arches and the
// Handler turns them into walk-up travel targets.
export interface GateDef {
  world: string; // destination world id
  label: string; // region name shown on the gate
  color: string; // destination accent (its arena light)
  angle: number; // bearing from the Concord centre
  dist: number; // radius from centre
}

export const GATE_DIST = 17;
export const CONCORD_GATES: GateDef[] = REGION_WORLDS.map((w, i, arr) => ({
  world: w.id,
  label: w.biome.name,
  color: w.biome.lights.arenaPoint,
  angle: (i / arr.length) * Math.PI * 2 - Math.PI / 2,
  dist: GATE_DIST,
}));
