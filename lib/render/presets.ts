// House render presets — camera, lighting, and backdrop for canon PNG exports.
// Palette matches docs/bible/art-direction.md and lib/lore/canon.ts force hexes.

export type RenderPresetId = "portrait" | "force" | "region" | "keeper";

export interface RenderPreset {
  id: RenderPresetId;
  /** canvas aspect width / height */
  aspect: number;
  camera: { position: [number, number, number]; fov: number; lookY: number };
  /** extra multiplier after height-fit */
  scale: number;
  /** target body height in world units once fitted */
  targetBodyH: number;
  /** slow Y spin (rad/s) — living idle turn */
  spin: number;
  bg: string;
  fog?: [string, number, number];
  rimBoost?: number;
}

export const RENDER_PRESETS: Record<RenderPresetId, RenderPreset> = {
  portrait: {
    id: "portrait",
    aspect: 4 / 5,
    camera: { position: [0, 1.15, 11.2], fov: 26, lookY: 0.92 },
    scale: 1,
    targetBodyH: 1.05,
    spin: 0.09,
    bg: "#0a0813",
    fog: ["#0a0813", 12, 28],
  },
  force: {
    id: "force",
    aspect: 1,
    camera: { position: [0, 1.05, 10.4], fov: 24, lookY: 0.88 },
    scale: 1,
    targetBodyH: 0.96,
    spin: 0.11,
    bg: "#0a0812",
    fog: ["#0a0812", 10, 22],
    rimBoost: 1.35,
  },
  region: {
    id: "region",
    aspect: 16 / 9,
    camera: { position: [0.5, 1.0, 12.8], fov: 30, lookY: 0.85 },
    scale: 1,
    targetBodyH: 0.88,
    spin: 0.07,
    bg: "#0a0812",
    fog: ["#15102a", 8, 28],
  },
  keeper: {
    id: "keeper",
    aspect: 4 / 5,
    camera: { position: [0, 1.2, 10.8], fov: 26, lookY: 0.94 },
    scale: 1,
    targetBodyH: 1.0,
    spin: 0.08,
    bg: "#0a0812",
    fog: ["#0a0812", 11, 24],
    rimBoost: 1.2,
  },
};

/** Fixed hero yaw (radians) — consistent across all exported PNGs. */
export const RENDER_YAW = 0.38;
