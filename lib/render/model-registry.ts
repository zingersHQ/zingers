// ─────────────────────────────────────────────────────────────────────────────
// Model registry — maps a Force archetype to its base GLB. TODAY every archetype
// points at the shared RobotExpressive rig, so the live game is unchanged; the
// per-Force IDENTITY comes from lib/render/archetypes.ts (silhouette + material +
// signature feature kit) layered on top.
//
// PHASE 1b: when a distinct, idle/walk/punch-rigged GLB exists for a Force, drop
// it in public/models/ and point the entry here. ChampionMesh reads exclusively
// through modelFor(), so swapping a mesh is a one-line change with zero callsite
// churn. Keep the new rigs' clip names aligned (idle / walk / run / jump / punch /
// wave) so the existing animation wiring keeps working.
// ─────────────────────────────────────────────────────────────────────────────
import type { CreatureType } from "@/lib/types";

export const SHARED_RIG = "/models/RobotExpressive.glb";

const MODEL_BY_TYPE: Record<CreatureType, string> = {
  LOGIC: SHARED_RIG,
  CHAOS: SHARED_RIG,
  COMPOSURE: SHARED_RIG,
  RHETORIC: SHARED_RIG,
  CREATIVITY: SHARED_RIG,
};

/** Every GLB the game might load — preload set, deduped. */
export const ALL_MODELS: string[] = Array.from(new Set(Object.values(MODEL_BY_TYPE)));

export function modelFor(type: CreatureType): string {
  return MODEL_BY_TYPE[type] ?? SHARED_RIG;
}
