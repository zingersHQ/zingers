// One parametric world, many skins. Every "world" is just a config object —
// terrain, sky, fog, lighting, palette and props all read from here.

export interface BiomeConfig {
  id: string;
  name: string;
  tagline: string;
  // true on the daylight skin — lets the ground surfaces (terrain + plaza floor)
  // switch to a matte, near-white texture instead of their dark night base.
  daylight?: boolean;
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
    // ── topology (the SHAPE of the land, not the skin) ──────────────────────
    seed: number; // shifts the noise field → a genuinely different landscape
    rollAmp: number; // amplitude of the fine rolling layer
    ridgeAmp: number; // amplitude of the coarse ridge layer
    rollFreq: number; // frequency of the rolling layer
    ridgeFreq: number; // frequency of the ridge layer
    ridged: boolean; // true → sharp volcanic spires; false → soft hills
    // ── the great rift (optional) — a chasm carved outward from the plaza ──
    canyonAngle?: number; // bearing of the rift (kept clear of tower/train/spire)
    canyonHalfWidth?: number;
    canyonDepth?: number; // 0 / omitted → no rift in this region
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
  // ── scene composition (which structures appear and how they're arranged) ──
  scene: {
    towerAngle: number; // bearing of the Tower helix from plaza centre
    towerSteps: number; // length of the climb
    obeliskCount: number;
    platformCount: number;
    crystalCount: number;
    // bespoke built environment — each world is a different BUILDING, not a
    // recoloured copy of the same plaza.
    surround: "tiers" | "caldera"; // what rings the arena floor
    arena: "ring" | "pit"; // the form of the central combat space
    pillar: "obelisk" | "basalt"; // the ambient standing structures in the wilds
    // how the resident agents are deployed + how they roam — so the population
    // is arranged and behaves differently per world, not parked in one ring.
    roam: {
      pattern: "ring" | "arc" | "scatter";
      radius: number; // home formation radius
      spread: number; // outer wander radius
      inner: number; // keep-out radius around the arena (don't walk into the pit/ring)
      speed: number; // wander move speed
    };
    // where the satellite districts sit, as a bearing + distance from the plaza
    // centre. The Arena holds the middle (matches stage there); Train + Spire push
    // out to distinct rim sectors so they read as separate places you travel to,
    // not a huddle at spawn. Distances stay inside PLAZA_R so they're on flat ground.
    landmarks: {
      train: { angle: number; dist: number };
      spire: { angle: number; dist: number };
    };
  };
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
    terrain: { low: "#15122a", mid: "#3a2c63", high: "#8a52ff", heightScale: 1, roughness: 0.85, metalness: 0.2, colorBand: 17, seed: 0, rollAmp: 6, ridgeAmp: 12, rollFreq: 0.03, ridgeFreq: 0.012, ridged: false, canyonAngle: Math.PI * 0.55, canyonHalfWidth: 11, canyonDepth: 9 },
    plaza: { color: "#b6b6d8", emissive: "#1a1838", emissiveIntensity: 0.6 },
    scatter: { rock: "#241f3e", crystal: "#7a5cff", crystalEmissive: "#5a3cff", crystalEmissiveIntensity: 1.1, crystalRatio: 0.32, count: 220 },
    obelisk: { color: "#2a2448", emissive: "#5440c0", emissiveIntensity: 1.1 },
    floatCrystal: { color: "#6a6bff", emissive: "#4a4bff", emissiveIntensity: 1.5 },
    platform: { a: "#6a6bff", b: "#8a6bff", top: "#f0a93a" },
    lights: { hemiSky: "#9a9cff", hemiGround: "#1a1230", hemiInt: 0.85, ambient: "#3a3a58", ambientInt: 0.55, sun: "#fff0d8", sunInt: 2.4, arenaPoint: "#f0a93a", trainPoint: "#6a6bff" },
    ibl: { key: "#cdb8ff", warm: "#f0a93a", cool: "#6a6bff", fill: "#3a2a6a" },
    bloom: 0.85,
    exposure: 1.15,
    scene: { towerAngle: Math.PI * 1.15, towerSteps: 170, obeliskCount: 16, platformCount: 6, crystalCount: 26, surround: "tiers", arena: "ring", pillar: "obelisk", roam: { pattern: "ring", radius: 14, spread: 18, inner: 8, speed: 3.0 }, landmarks: { train: { angle: 0, dist: 19 }, spire: { angle: Math.PI * 1.5, dist: 19 } } },
  },
  {
    id: "ember",
    name: "Ember Wastes",
    tagline: "volcanic · ash & molten rock",
    bg: "#100503",
    sky: { top: "#7a2a14", bottom: "#1a0805" },
    nebula: { colors: ["#7a2a14", "#a8431a", "#5a1a0a", "#c2691a"], opacity: 0.6 },
    fog: { color: "#2a0e06", near: 42, far: 165 },
    terrain: { low: "#1a0d08", mid: "#5a2410", high: "#ff7a2a", heightScale: 1.3, roughness: 0.92, metalness: 0.12, colorBand: 22, seed: 53, rollAmp: 5, ridgeAmp: 14, rollFreq: 0.055, ridgeFreq: 0.02, ridged: true, canyonAngle: Math.PI * 1.45, canyonHalfWidth: 14, canyonDepth: 17 },
    plaza: { color: "#c8b0a0", emissive: "#3a1408", emissiveIntensity: 0.7 },
    scatter: { rock: "#2a1610", crystal: "#ff8a3a", crystalEmissive: "#ff5a1a", crystalEmissiveIntensity: 1.5, crystalRatio: 0.24, count: 250 },
    obelisk: { color: "#2a1208", emissive: "#ff5a1a", emissiveIntensity: 1.25 },
    floatCrystal: { color: "#ff8a3a", emissive: "#ff5a1a", emissiveIntensity: 1.8 },
    platform: { a: "#c2691a", b: "#a8431a", top: "#ffb14a" },
    lights: { hemiSky: "#ffb98a", hemiGround: "#200804", hemiInt: 0.8, ambient: "#5a2a1a", ambientInt: 0.5, sun: "#ffd9a8", sunInt: 2.6, arenaPoint: "#ff7a2a", trainPoint: "#ff5a1a" },
    ibl: { key: "#ffcaa0", warm: "#ff7a2a", cool: "#a8431a", fill: "#5a1a0a" },
    bloom: 1.0,
    exposure: 1.1,
    scene: { towerAngle: Math.PI * 0.32, towerSteps: 120, obeliskCount: 26, platformCount: 4, crystalCount: 12, surround: "caldera", arena: "pit", pillar: "basalt", roam: { pattern: "scatter", radius: 17, spread: 21, inner: 11, speed: 2.1 }, landmarks: { train: { angle: Math.PI * 1.18, dist: 19 }, spire: { angle: Math.PI * 1.68, dist: 19 } } },
  },
  {
    id: "void",
    name: "Void Garden",
    tagline: "deep space · bioluminescent crystal",
    bg: "#03060a",
    sky: { top: "#0a2e3e", bottom: "#02060a" },
    nebula: { colors: ["#0a4a5a", "#1a7a6a", "#2a3a8a", "#0a5a4a"], opacity: 0.65 },
    fog: { color: "#06141a", near: 55, far: 205 },
    terrain: { low: "#08161a", mid: "#0e3a44", high: "#34ffd0", heightScale: 1.15, roughness: 0.8, metalness: 0.28, colorBand: 19, seed: 113, rollAmp: 9, ridgeAmp: 8, rollFreq: 0.022, ridgeFreq: 0.009, ridged: false, canyonAngle: Math.PI * 1.15, canyonHalfWidth: 12, canyonDepth: 11 },
    plaza: { color: "#a0c8c0", emissive: "#08222a", emissiveIntensity: 0.6 },
    scatter: { rock: "#14242a", crystal: "#34ffd0", crystalEmissive: "#10d0b0", crystalEmissiveIntensity: 1.4, crystalRatio: 0.4, count: 250 },
    obelisk: { color: "#0a2830", emissive: "#18c0a0", emissiveIntensity: 1.1 },
    floatCrystal: { color: "#34ffd0", emissive: "#10d0b0", emissiveIntensity: 1.7 },
    platform: { a: "#18c0a0", b: "#1a7a8a", top: "#6affd8" },
    lights: { hemiSky: "#8affe0", hemiGround: "#04181a", hemiInt: 0.85, ambient: "#1a3a3a", ambientInt: 0.55, sun: "#d8fff0", sunInt: 2.3, arenaPoint: "#34ffd0", trainPoint: "#18c0a0" },
    ibl: { key: "#aef0e0", warm: "#34ffd0", cool: "#1a7a8a", fill: "#0a4a5a" },
    bloom: 0.95,
    exposure: 1.18,
    scene: { towerAngle: Math.PI * 0.7, towerSteps: 150, obeliskCount: 22, platformCount: 8, crystalCount: 34, surround: "tiers", arena: "ring", pillar: "obelisk", roam: { pattern: "arc", radius: 15, spread: 22, inner: 7, speed: 3.6 }, landmarks: { train: { angle: Math.PI * 1.55, dist: 19 }, spire: { angle: Math.PI * 0.08, dist: 19 } } },
  },
  {
    // The Concord — the hub slab (lib/lore/canon.ts › CONCORD). Neutral ground:
    // a calm slate-violet plaza lit warm gold, near-flat so it reads as a BUILT
    // place rather than wilds. Most `scene` fields go unused in hub mode (the
    // World renders the Concord scene, not an arena), but the shape stays gentle.
    id: "concord",
    name: "The Concord",
    tagline: "neutral ground · the gate-ring",
    bg: "#070611",
    sky: { top: "#2a2750", bottom: "#0a0816" },
    nebula: { colors: ["#2a2a5a", "#3a2a6a", "#2a3a6a", "#4a3a6a"], opacity: 0.45 },
    fog: { color: "#100e22", near: 60, far: 220 },
    terrain: { low: "#15131f", mid: "#2c2840", high: "#5a5480", heightScale: 0.7, roughness: 0.9, metalness: 0.15, colorBand: 16, seed: 211, rollAmp: 3, ridgeAmp: 4, rollFreq: 0.02, ridgeFreq: 0.01, ridged: false },
    plaza: { color: "#c4c2d8", emissive: "#1c1a30", emissiveIntensity: 0.5 },
    scatter: { rock: "#22202e", crystal: "#8a86c0", crystalEmissive: "#6a64b0", crystalEmissiveIntensity: 0.9, crystalRatio: 0.3, count: 150 },
    obelisk: { color: "#241f38", emissive: "#6a64c0", emissiveIntensity: 0.9 },
    floatCrystal: { color: "#8a86d0", emissive: "#6a64c0", emissiveIntensity: 1.2 },
    platform: { a: "#6a6bff", b: "#8a6bff", top: "#f5d020" },
    lights: { hemiSky: "#bcb8ff", hemiGround: "#15101f", hemiInt: 0.9, ambient: "#3a3858", ambientInt: 0.6, sun: "#fff2d8", sunInt: 2.2, arenaPoint: "#f5d020", trainPoint: "#8a86d0" },
    ibl: { key: "#d8ccff", warm: "#f5d020", cool: "#6a64c0", fill: "#2a2750" },
    bloom: 0.7,
    exposure: 1.12,
    scene: { towerAngle: Math.PI * 0.5, towerSteps: 0, obeliskCount: 10, platformCount: 0, crystalCount: 14, surround: "tiers", arena: "ring", pillar: "obelisk", roam: { pattern: "ring", radius: 14, spread: 18, inner: 8, speed: 2.4 }, landmarks: { train: { angle: 0, dist: 19 }, spire: { angle: Math.PI, dist: 19 } } },
  },
];

export const DEFAULT_BIOME = BIOMES[0];

export function biomeById(id: string | null | undefined): BiomeConfig {
  return BIOMES.find((b) => b.id === id) ?? DEFAULT_BIOME;
}

// ── daylight skin ────────────────────────────────────────────────────────────
// A generic "turn on the sun" transform: same world, same hues, just lit like a
// bright day instead of a moody night. Drives the 3D world when the UI is in
// light mode. We keep every SHAPE/scene field untouched (topology, layout,
// counts) and only lift the colours + lighting toward daylight, so a world reads
// as the same place — just at noon.

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: RGB): string {
  const c = (x: number) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

// mix `hex` toward `target` by amount t (0 = unchanged, 1 = fully target)
function mix(hex: string, target: string, t: number): string {
  const a = hexToRgb(hex);
  const b = hexToRgb(target);
  return rgbToHex([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
}

const SKY_HI = "#bcd6f4"; // pale blue zenith
const SKY_LO = "#eef4fb"; // bright horizon haze
const DAY_FOG = "#dde7f4";
const SUNLIGHT = "#fff6e6";

// brighten a surface albedo toward white so day-lit faces read lighter while
// keeping the world's identity hue
const lift = (hex: string, t = 0.32) => mix(hex, "#ffffff", t);
// the ground is a calm, matte PALE GREY — light enough to read as daytime, but
// muted so the colourful props/champions keep strong contrast against it (a
// near-white floor just blew out under the sun).
const GROUND_GRAY = "#9c9eac";
const ground = (hex: string, t = 0.85) => mix(hex, GROUND_GRAY, t);

export function daylightBiome(biome: BiomeConfig): BiomeConfig {
  return {
    ...biome,
    daylight: true,
    bg: mix(biome.bg, SKY_HI, 0.82),
    sky: { top: mix(biome.sky.top, SKY_HI, 0.7), bottom: mix(biome.sky.bottom, SKY_LO, 0.8) },
    // the nebula is a night-sky flourish — fade it right back under daylight
    nebula: { colors: biome.nebula.colors, opacity: biome.nebula.opacity * 0.18 },
    fog: { color: mix(biome.fog.color, DAY_FOG, 0.8), near: biome.fog.near * 1.35, far: biome.fog.far * 1.5 },
    terrain: {
      ...biome.terrain,
      low: ground(biome.terrain.low, 0.88),
      mid: ground(biome.terrain.mid, 0.85),
      high: ground(biome.terrain.high, 0.8),
      // matte: kill the metallic sheen so daylight ground is flat, not glossy
      metalness: 0,
      roughness: 1,
    },
    plaza: { ...biome.plaza, color: mix(biome.plaza.color, "#aaacb8", 0.9), emissiveIntensity: 0 },
    scatter: { ...biome.scatter, rock: lift(biome.scatter.rock, 0.3), crystalEmissiveIntensity: biome.scatter.crystalEmissiveIntensity * 0.6 },
    obelisk: { ...biome.obelisk, color: lift(biome.obelisk.color, 0.28), emissiveIntensity: biome.obelisk.emissiveIntensity * 0.5 },
    floatCrystal: { ...biome.floatCrystal, emissiveIntensity: biome.floatCrystal.emissiveIntensity * 0.65 },
    platform: { a: lift(biome.platform.a, 0.18), b: lift(biome.platform.b, 0.18), top: biome.platform.top },
    lights: {
      ...biome.lights,
      hemiSky: mix(biome.lights.hemiSky, "#ffffff", 0.4),
      hemiGround: lift(biome.lights.hemiGround, 0.45),
      hemiInt: Math.max(biome.lights.hemiInt, 1.0),
      ambient: mix(biome.lights.ambient, "#ffffff", 0.5),
      ambientInt: Math.max(biome.lights.ambientInt, 0.7),
      sun: mix(biome.lights.sun, SUNLIGHT, 0.55),
      sunInt: biome.lights.sunInt,
    },
    ibl: {
      key: mix(biome.ibl.key, "#ffffff", 0.45),
      warm: mix(biome.ibl.warm, "#fff2da", 0.4),
      cool: mix(biome.ibl.cool, "#dbe7f7", 0.5),
      fill: mix(biome.ibl.fill, "#eef4fb", 0.55),
    },
    // bloom reads as a night-time glow; pull it down so daylight stays crisp
    bloom: biome.bloom * 0.4,
    exposure: biome.exposure * 0.9,
  };
}
