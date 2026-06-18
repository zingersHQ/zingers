import type { Champion } from "@/lib/types";
import { appearanceOf } from "@/lib/evolve/appearance";
import type { RenderPreset } from "@/lib/render/presets";

/** Scale the built mesh so legend-tier bodies fit the frame instead of clipping. */
export function modelScaleFor(champion: Champion, preset: RenderPreset): number {
  const h = appearanceOf(champion).h;
  const target = preset.targetBodyH ?? 1.1;
  return (target / Math.max(h, 0.5)) * preset.scale;
}
