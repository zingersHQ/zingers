// One parametric world, many skins. Every "world" is just a config object —
// terrain, sky, fog, lighting, palette and props all read from here.

export interface BiomeConfig {
  id: string;
  name: string;
  tagline: string;
  bg: string;
  sky: { top: string; bottom: string };
  nebula: { colors: string[]; opacity: number };
  fog: { color: string; near: number; far: number };
  terrain: {
    low: string;
    mid: string;
    high: string;
    heightScale: number;
    roughness: number;
    metalness: number;
    colorBand: number; // height at which "high" colour is reached
  };
  plaza: { color: string; emissive: string; emissiveIntensity: number };
  scatter: {
    rock: string;
    crystal: string;
    crystalEmissive: string;
    crystalEmissiveIntensity: number;
    crystalRatio: number;
    count: number;
  };
  obelisk: { color: string; emissive: string; emissiveIntensity: number };
  floatCrystal: { color: string; emissive: string; emissiveIntensity: number };
  platform: { a: string; b: string; top: string };
  lights: {
    hemiSky: string;
    hemiGround: string;
    hemiInt: number;
    ambient: string;
    ambientInt: number;
    sun: string;
    sunInt: number;
    arenaPoint: string;
    trainPoint: string;
  };
  ibl: { key: string; warm: string; cool: string; fill: string };
  bloom: number;
  exposure: number;
}

export const BIOMES: BiomeConfig[] = [
  {
    id: "colosseum",
    name: "Obsidian Colosseum",
    tagline: "cosmic violet · the home grounds",
    bg: "#06050b",
    sky: { top: "#3a2a66", bottom: "#0a0714" },
    nebula: { colors: ["#3a2a6a", "#5a2a7a", "#2a3a8a", "#6a2a5a"], opacity: 0.7 },
    fog: { color: "#140e2a", near: 50, far: 190 },
    terrain: { low: "#15122a", mid: "#3a2c63", high: "#8a52ff", heightScale: 1, roughness: 0.85, metalness: 0.2, colorBand: 17 },
    plaza: { color: "#b6b6d8", emissive: "#1a1838", emissiveIntensity: 0.6 },
    scatter: { rock: "#241f3e", crystal: "#7a5cff", crystalEmissive: "#5a3cff", crystalEmissiveIntensity: 1.1, crystalRatio: 0.32, count: 220 },
    obelisk: { color: "#2a2448", emissive: "#5440c0", emissiveIntensity: 1.1 },
    floatCrystal: { color: "#6a6bff", emissive: "#4a4bff", emissiveIntensity: 1.5 },
    platform: { a: "#6a6bff", b: "#8a6bff", top: "#f0a93a" },
    lights: { hemiSky: "#9a9cff", hemiGround: "#1a1230", hemiInt: 0.85, ambient: "#3a3a58", ambientInt: 0.55, sun: "#fff0d8", sunInt: 2.4, arenaPoint: "#f0a93a", trainPoint: "#6a6bff" },
    ibl: { key: "#cdb8ff", warm: "#f0a93a", cool: "#6a6bff", fill: "#3a2a6a" },
    bloom: 0.85,
    exposure: 1.15,
  },
  {
    id: "ember",
    name: "Ember Wastes",
    tagline: "volcanic · ash & molten rock",
    bg: "#100503",
    sky: { top: "#7a2a14", bottom: "#1a0805" },
    nebula: { colors: ["#7a2a14", "#a8431a", "#5a1a0a", "#c2691a"], opacity: 0.6 },
    fog: { color: "#2a0e06", near: 42, far: 165 },
    terrain: { low: "#1a0d08", mid: "#5a2410", high: "#ff7a2a", heightScale: 1.3, roughness: 0.92, metalness: 0.12, colorBand: 22 },
    plaza: { color: "#c8b0a0", emissive: "#3a1408", emissiveIntensity: 0.7 },
    scatter: { rock: "#2a1610", crystal: "#ff8a3a", crystalEmissive: "#ff5a1a", crystalEmissiveIntensity: 1.5, crystalRatio: 0.24, count: 250 },
    obelisk: { color: "#2a1208", emissive: "#ff5a1a", emissiveIntensity: 1.25 },
    floatCrystal: { color: "#ff8a3a", emissive: "#ff5a1a", emissiveIntensity: 1.8 },
    platform: { a: "#c2691a", b: "#a8431a", top: "#ffb14a" },
    lights: { hemiSky: "#ffb98a", hemiGround: "#200804", hemiInt: 0.8, ambient: "#5a2a1a", ambientInt: 0.5, sun: "#ffd9a8", sunInt: 2.6, arenaPoint: "#ff7a2a", trainPoint: "#ff5a1a" },
    ibl: { key: "#ffcaa0", warm: "#ff7a2a", cool: "#a8431a", fill: "#5a1a0a" },
    bloom: 1.0,
    exposure: 1.1,
  },
  {
    id: "void",
    name: "Void Garden",
    tagline: "deep space · bioluminescent crystal",
    bg: "#03060a",
    sky: { top: "#0a2e3e", bottom: "#02060a" },
    nebula: { colors: ["#0a4a5a", "#1a7a6a", "#2a3a8a", "#0a5a4a"], opacity: 0.65 },
    fog: { color: "#06141a", near: 55, far: 205 },
    terrain: { low: "#08161a", mid: "#0e3a44", high: "#34ffd0", heightScale: 1.15, roughness: 0.8, metalness: 0.28, colorBand: 19 },
    plaza: { color: "#a0c8c0", emissive: "#08222a", emissiveIntensity: 0.6 },
    scatter: { rock: "#14242a", crystal: "#34ffd0", crystalEmissive: "#10d0b0", crystalEmissiveIntensity: 1.4, crystalRatio: 0.4, count: 250 },
    obelisk: { color: "#0a2830", emissive: "#18c0a0", emissiveIntensity: 1.1 },
    floatCrystal: { color: "#34ffd0", emissive: "#10d0b0", emissiveIntensity: 1.7 },
    platform: { a: "#18c0a0", b: "#1a7a8a", top: "#6affd8" },
    lights: { hemiSky: "#8affe0", hemiGround: "#04181a", hemiInt: 0.85, ambient: "#1a3a3a", ambientInt: 0.55, sun: "#d8fff0", sunInt: 2.3, arenaPoint: "#34ffd0", trainPoint: "#18c0a0" },
    ibl: { key: "#aef0e0", warm: "#34ffd0", cool: "#1a7a8a", fill: "#0a4a5a" },
    bloom: 0.95,
    exposure: 1.18,
  },
];

export const DEFAULT_BIOME = BIOMES[0];

export function biomeById(id: string | null | undefined): BiomeConfig {
  return BIOMES.find((b) => b.id === id) ?? DEFAULT_BIOME;
}
