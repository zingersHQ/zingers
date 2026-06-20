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
    camera: { position: [0, 1.35, 9.6], fov: 28, lookY: 1.3 },
    scale: 0.5,
    targetBodyH: 2.78,
    spin: 0,
    bg: "#0a0813",
    fog: ["#0a0813", 16, 34],
  },
  force: {
    id: "force",
    aspect: 1,
    camera: { position: [0, 1.3, 8.8], fov: 27, lookY: 1.25 },
    scale: 0.75,
    targetBodyH: 2.55,
    spin: 0,
    bg: "#0a0812",
    fog: ["#0a0812", 14, 28],
    rimBoost: 1.35,
  },
  region: {
    id: "region",
    aspect: 16 / 9,
    camera: { position: [0.4, 1.15, 11.2], fov: 30, lookY: 1.1 },
    scale: 1,
    targetBodyH: 2.0,
    spin: 0,
    bg: "#0a0812",
    fog: ["#15102a", 10, 32],
  },
  keeper: {
    id: "keeper",
    aspect: 4 / 5,
    camera: { position: [0, 1.4, 9.4], fov: 28, lookY: 1.32 },
    scale: 0.5,
    targetBodyH: 2.78,
    spin: 0,
    bg: "#0a0812",
    fog: ["#0a0812", 15, 30],
    rimBoost: 1.2,
  },
};

/** Fixed hero yaw (radians) — consistent across all exported PNGs. */
export const RENDER_YAW = 0.38;
