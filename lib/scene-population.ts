// Scene population budgets — shared by Grounds client + /api/grounds.
// The collectible dex can grow; ChampionMesh instances must not.

import { FIRST_MIND_KEYS } from "@/lib/engine/roster";

/** Plaza ambient NPCs (RegionChampions). */
export const SCENE_AMBIENT_CAP = 6;
/** Ground roamers with full meshes. */
export const SCENE_ROAMER_CAP = 3;
/** Tower perch meshes. */
export const SCENE_TOWER_MESH_CAP = 8;
/** /api/grounds agent list (HUD + mesh pool). */
export const SCENE_GROUNDS_AGENT_LIMIT = 16;

const FIRST_MIND_SET = new Set<string>(FIRST_MIND_KEYS);

/** House bots allowed on the scene ladder: First Minds only. Player claims always OK. */
export function isSceneLadderAgent(c: { house: boolean; key: string }): boolean {
  return !c.house || FIRST_MIND_SET.has(c.key);
}

/** Practice / Tribunal pickers — First Minds, never the full dex. */
export function practiceOpponentKeys(ownedKey: string | null = null): string[] {
  return FIRST_MIND_KEYS.filter((k) => k !== ownedKey);
}
