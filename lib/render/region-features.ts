// Localized scenic pockets in the wilds — dressing only (no heightfield changes).
// Placed clear of plaza, spawn knoll, great rift, and Ascent mountain so gameplay
// routes stay exactly as shipped. Angles are bearings from plaza centre (atan2 xz).

export type RegionPocketKind = "grove" | "thicket";

export interface RegionPocket {
  kind: RegionPocketKind;
  /** Centre bearing from plaza origin (radians). */
  angle: number;
  /** Cluster centre distance from plaza origin. */
  dist: number;
  /** Placement radius around the centre. */
  radius: number;
  /** Relative prop density 0.6..1.2. */
  density: number;
}

/**
 * Per-biome scenic pockets. Chosen opposite / offset from REGION_CIRCUIT_SPOT,
 * train/spire landmarks, and the +Z great rift (canyonAngle ≈ π/2).
 */
export const REGION_POCKETS: Record<string, RegionPocket[]> = {
  // Void Garden — bioluminescent pine/twisted grove (homepage-flight energy).
  void: [
    { kind: "grove", angle: Math.PI * 0.98, dist: 76, radius: 20, density: 1.05 },
  ],
  // Obsidian Colosseum — stone-grove of common + twisted trees.
  colosseum: [
    { kind: "grove", angle: Math.PI * 1.92, dist: 80, radius: 18, density: 1.0 },
  ],
  // Ember Gauntlet — ash thicket (dead/twisted), sparse so the caldera still reads.
  ember: [
    { kind: "thicket", angle: Math.PI * 1.85, dist: 72, radius: 16, density: 0.8 },
  ],
};

export function pocketsFor(biomeId: string): RegionPocket[] {
  return REGION_POCKETS[biomeId] ?? [];
}
