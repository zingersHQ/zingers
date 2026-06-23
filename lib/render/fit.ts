import type { Champion, CreatureType } from "@/lib/types";
import { appearanceOf } from "@/lib/evolve/appearance";
import { archetypeAppearance } from "@/lib/render/archetypes";
import type { RenderPreset } from "@/lib/render/presets";

/** Scale the built mesh so the figure (incl. its archetype stature) fits the frame
 *  instead of clipping. When the Force type is known we fit to the archetype height
 *  so a tall Lattice and a squat Stillness both sit cleanly in the tile. */
export function modelScaleFor(champion: Champion, preset: RenderPreset, type?: CreatureType): number {
  const h = (type ? archetypeAppearance(champion, type) : appearanceOf(champion)).h;
  const target = preset.targetBodyH ?? 1.1;
  return (target / Math.max(h, 0.5)) * preset.scale;
}
