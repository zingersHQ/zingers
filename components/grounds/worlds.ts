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
  // the canon region this world IS (lib/lore/canon.ts › FOUNDING_REGIONS). Drives
  // the district growth tier + whether it's the season's featured region. Absent
  // on the hub.
  region?: string;
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
    tagline: "the tribunal · assigned-stance debate",
    biome: BIOMES[0], // Obsidian Colosseum
    scenario: SCENARIOS.tribunal, // the Colosseum's canon arena (05-regions.md)
    kind: "region",
    region: "colosseum",
  },
  {
    id: "gauntlet",
    name: "Ember Gauntlet",
    tagline: "survival run · rising stakes",
    biome: BIOMES[1], // Ember Wastes
    scenario: SCENARIOS.gauntlet,
    kind: "region",
    region: "wastes",
  },
  {
    id: "void",
    name: "Void Garden",
    tagline: "open duels · bioluminescent deep space",
    biome: BIOMES[2], // Void Garden
    scenario: SCENARIOS.duel,
    kind: "region",
    region: "garden",
  },
];

// The Concord spawns you in — the hub-first design (docs/bible/01-cosmology.md).
export const DEFAULT_WORLD = WORLDS[0];

// The region a first-time player is steered toward on their first Concord landing:
// the Grounds (tribunal / Obsidian Colosseum), the canonical first arena. The
// first-run guide spotlights this gate and dims the rest until the player leaves.
export const FIRST_GUIDE_WORLD = "grounds";

export function worldById(id: string | null | undefined): WorldDef {
  return WORLDS.find((w) => w.id === id) ?? DEFAULT_WORLD;
}

export const REGION_WORLDS = WORLDS.filter((w) => w.kind === "region");

/** Hub + the three founding regions — what appears in the world picker. */
export const NAV_WORLDS = WORLDS.filter((w) => w.kind === "hub" || w.kind === "region");

// Find the playable world for a canon region id (lib/lore/canon.ts ›
// FOUNDING_REGIONS: "colosseum" | "wastes" | "garden").
export function worldByRegion(regionId: string): WorldDef | undefined {
  return WORLDS.find((w) => w.region === regionId);
}

// ── The Concord's Vaultgates ─────────────────────────────────────────────────
// One gate per region, evenly ringed around the seal. Pure layout (angle/dist +
// destination + accent); the 3D scene turns these into portal arches and the
// Handler turns them into walk-up travel targets.
export interface GateDef {
  world: string; // destination world id
  color: string; // destination accent (its arena light)
  angle: number; // bearing from the Concord centre
  dist: number; // radius from centre
}

export const GATE_DIST = 28;
// Ring the gates evenly, half-step off cardinals, then swung 60° toward the
// centre so none sit on the spawn→seal walk line (the Reader veers to a gate).
const CONCORD_GATE_SWING = Math.PI / 3; // 60° inward from the ring bearing
export const CONCORD_GATES: GateDef[] = REGION_WORLDS.map((w, i, arr) => ({
  world: w.id,
  color: w.biome.lights.arenaPoint,
  angle: (i / arr.length) * Math.PI * 2 - Math.PI / 2 + Math.PI / arr.length + CONCORD_GATE_SWING,
  dist: GATE_DIST,
}));
