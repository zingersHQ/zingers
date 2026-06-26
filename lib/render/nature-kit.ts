// Quaternius Stylized Nature MegaKit (CC0) — curated subset for the Grounds.
// glTF assets live in public/models/nature/ (textures co-located per file).

export const NATURE_BASE = "/models/nature";

export interface NaturePreset {
  /** Large boulders — instanced on hills. */
  rocks: string[];
  /** Small ground scatter — instanced. */
  pebbles: string[];
  /** Landmark trees — placed individually (Obelisk / basalt reinterpretation). */
  trees: string[];
  /** Understory — ferns, bushes, flowers. */
  plants: string[];
  /** Camino segments — spawn path + rift floor. */
  paths: string[];
  /** Bioluminescent accents — mushrooms / flowers at old crystal scatter sites. */
  accents: string[];
  /** Instanced turf — short cards + clover ground cover. */
  grass: string[];
}

const DEFAULT: NaturePreset = {
  rocks: ["Rock_Medium_1", "Rock_Medium_2", "Rock_Medium_3"],
  pebbles: ["Pebble_Round_1", "Pebble_Round_3", "Pebble_Square_2"],
  trees: ["CommonTree_1", "CommonTree_3", "TwistedTree_2"],
  plants: ["Fern_1", "Bush_Common", "Flower_3_Single"],
  paths: ["RockPath_Round_Small_1", "RockPath_Round_Small_2", "RockPath_Round_Wide"],
  accents: ["Mushroom_Common", "Flower_4_Single"],
  grass: ["Grass_Common_Short", "Grass_Wispy_Short", "Clover_1"],
};

/** Per-biome kit — same topology, different flora silhouette. */
export const NATURE_BY_BIOME: Record<string, NaturePreset> = {
  colosseum: {
    rocks: ["Rock_Medium_1", "Rock_Medium_2", "Rock_Medium_3"],
    pebbles: ["Pebble_Round_1", "Pebble_Round_3", "Pebble_Square_2"],
    trees: ["CommonTree_1", "CommonTree_3", "TwistedTree_2", "CommonTree_5"],
    plants: ["Fern_1", "Bush_Common", "Flower_3_Single", "Plant_7"],
    paths: ["RockPath_Round_Small_1", "RockPath_Round_Small_2", "RockPath_Round_Wide"],
    accents: ["Mushroom_Common", "Flower_4_Single"],
    grass: ["Grass_Common_Short", "Grass_Common_Tall", "Grass_Wispy_Short", "Clover_1"],
  },
  ember: {
    rocks: ["Rock_Medium_2", "Rock_Medium_3", "Rock_Medium_1"],
    pebbles: ["Pebble_Square_3", "Pebble_Round_4", "Pebble_Round_5"],
    trees: ["DeadTree_1", "DeadTree_3", "DeadTree_5", "TwistedTree_5"],
    plants: ["Fern_1", "Plant_7", "Plant_7_Big"],
    paths: ["RockPath_Square_Small_1", "RockPath_Square_Small_2", "RockPath_Square_Wide"],
    accents: ["Mushroom_Laetiporus"],
    grass: ["Grass_Wispy_Short", "Grass_Wispy_Tall", "Clover_2"],
  },
  void: {
    rocks: ["Rock_Medium_1", "Rock_Medium_3", "Rock_Medium_2"],
    pebbles: ["Pebble_Round_2", "Pebble_Square_1", "Pebble_Square_4"],
    trees: ["CommonTree_4", "TwistedTree_1", "Pine_3", "Pine_5"],
    plants: ["Bush_Common_Flowers", "Flower_4_Group", "Fern_1", "Plant_1_Big"],
    paths: ["RockPath_Round_Small_3", "RockPath_Round_Thin", "RockPath_Round_Wide"],
    accents: ["Mushroom_Common", "Flower_3_Group"],
    grass: ["Grass_Common_Short", "Grass_Wispy_Short", "Grass_Wispy_Tall", "Clover_1"],
  },
  concord: {
    rocks: ["Rock_Medium_1", "Rock_Medium_2"],
    pebbles: ["Pebble_Round_2", "Pebble_Square_1"],
    trees: ["CommonTree_2", "CommonTree_4", "Pine_2"],
    plants: ["Bush_Common", "Clover_1", "Flower_3_Single"],
    paths: ["RockPath_Round_Small_1", "RockPath_Round_Small_3"],
    accents: ["Flower_4_Single"],
    grass: ["Grass_Common_Short", "Grass_Wispy_Short", "Clover_1", "Clover_2"],
  },
  amphitheatre: {
    rocks: ["Rock_Medium_2", "Rock_Medium_3"],
    pebbles: ["Pebble_Square_2", "Pebble_Round_1"],
    trees: ["CommonTree_1", "DeadTree_2"],
    plants: ["Fern_1", "Bush_Common"],
    paths: ["RockPath_Square_Small_1", "RockPath_Square_Thin"],
    accents: ["Flower_3_Single"],
    grass: ["Grass_Common_Short", "Grass_Wispy_Short", "Clover_1"],
  },
};

/** Earthy terrain vertex colours when the nature kit dresses the wilds. */
export const NATURE_TERRAIN: Record<string, { low: string; mid: string; high: string }> = {
  colosseum: { low: "#243a22", mid: "#4a6e38", high: "#6a8e48" },
  ember: { low: "#2a1810", mid: "#4a3420", high: "#6a5030" },
  void: { low: "#1a3228", mid: "#2a5848", high: "#3a7860" },
  concord: { low: "#2a3028", mid: "#4a5a40", high: "#6a7a58" },
  amphitheatre: { low: "#2a2818", mid: "#4a4830", high: "#6a6848" },
};

export function natureTerrainPalette(biomeId: string): { low: string; mid: string; high: string } {
  return NATURE_TERRAIN[biomeId] ?? NATURE_TERRAIN.colosseum;
}

// Central clearing — the trodden ground that floors the plaza/arena. Reads as a
// natural surface (sand, ash, moss, packed earth) that matches each theme rather
// than a sci-fi grid. `base` fills it, `grain` is the fine speckle, `patch` is
// soft organic blotching, `pebble` is scattered grit. Kept a touch barer/lighter
// than the surrounding turf so the centre reads as a worn clearing.
export interface GroundPalette {
  base: string;
  grain: string;
  patch: string;
  pebble: string;
}

export const NATURE_GROUND: Record<string, GroundPalette> = {
  colosseum: { base: "#6b6440", grain: "#534c30", patch: "#7c7a4a", pebble: "#8c8458" }, // worn meadow earth
  ember: { base: "#473527", grain: "#291b11", patch: "#5c4533", pebble: "#6e564a" }, // charred ash & cinder sand
  void: { base: "#2f5d4b", grain: "#1c3c2e", patch: "#3c7160", pebble: "#4c8070" }, // damp bioluminescent moss
  concord: { base: "#b3aa8c", grain: "#948a6a", patch: "#c3bc9f", pebble: "#d0c9ae" }, // pale flagstone sand
  amphitheatre: { base: "#c4a777", grain: "#a78a58", patch: "#d5bc8d", pebble: "#e0cd9f" }, // raked arena sand
};

export function natureGroundPalette(biomeId: string): GroundPalette {
  return NATURE_GROUND[biomeId] ?? NATURE_GROUND.colosseum;
}

export function naturePreset(biomeId: string): NaturePreset {
  return NATURE_BY_BIOME[biomeId] ?? DEFAULT;
}

export function natureUrl(modelId: string): string {
  return `${NATURE_BASE}/${modelId}.gltf`;
}

/** Every glTF the nature layer may load — for preload. */
export const ALL_NATURE_MODELS: string[] = Array.from(
  new Set(
    Object.values(NATURE_BY_BIOME).flatMap((p) => [
      ...p.rocks,
      ...p.pebbles,
      ...p.trees,
      ...p.plants,
      ...p.paths,
      ...p.accents,
      ...p.grass,
    ]),
  ),
);
