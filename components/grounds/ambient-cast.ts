// World-flavored ambient casts for the Grounds plaza / Amphitheatre.
// Budgets live in lib/scene-population.ts (shared with /api/grounds).

import type { CreatureType } from "@/lib/types";
import { FOUNDING_REGIONS } from "@/lib/lore/canon";
import { FIRST_MIND_KEYS, ROSTER } from "@/lib/engine/roster";
import { SCENE_AMBIENT_CAP } from "@/lib/scene-population";
import { worldById } from "./worlds";

export {
  SCENE_AMBIENT_CAP,
  SCENE_ROAMER_CAP,
  SCENE_TOWER_MESH_CAP,
  SCENE_GROUNDS_AGENT_LIMIT,
  practiceOpponentKeys,
} from "@/lib/scene-population";

export type CastMind = { key: string; type: CreatureType };

/** Region Force bias for a playable world (null on Hub). */
export function worldForceBias(worldId: string): CreatureType | null {
  const w = worldById(worldId);
  if (!w.region) return null;
  return FOUNDING_REGIONS.find((r) => r.id === w.region)?.bias ?? null;
}

/**
 * Ordered First Mind keys for a world's plaza cast.
 * Prefer the region's bias Force, then the rest of the Eight.
 */
export function ambientKeysForWorld(worldId: string, ownedKey: string | null = null): string[] {
  const bias = worldForceBias(worldId);
  const first = FIRST_MIND_KEYS.filter((k) => k !== ownedKey);
  if (!bias) return first.slice(0, SCENE_AMBIENT_CAP);

  const favored = first.filter((k) => ROSTER[k]?.type === bias);
  const rest = first.filter((k) => ROSTER[k]?.type !== bias);
  const lead = favored.slice(0, Math.min(3, favored.length));
  const out = [...lead, ...rest.filter((k) => !lead.includes(k)), ...favored.filter((k) => !lead.includes(k))];
  return out.slice(0, SCENE_AMBIENT_CAP);
}

/** Pick ambient rows for a world (owned mind excluded from plaza props). */
export function pickAmbientCast<T extends CastMind>(
  champions: T[],
  worldId: string,
  ownedKey: string | null = null,
): T[] {
  const byKey = new Map(champions.map((c) => [c.key, c] as const));
  const out: T[] = [];
  for (const k of ambientKeysForWorld(worldId, ownedKey)) {
    const c = byKey.get(k);
    if (c) out.push(c);
  }
  return out;
}

/** Amphitheatre exhibition — First Minds only (neutral venue). */
export function pickVenueCast<T extends CastMind>(champions: T[], ownedKey: string | null = null): T[] {
  const byKey = new Map(champions.map((c) => [c.key, c] as const));
  const out: T[] = [];
  for (const k of FIRST_MIND_KEYS) {
    const c = byKey.get(k);
    if (c) out.push(c);
  }
  if (out.length >= 2) return out;
  return champions.filter((c) => c.key !== ownedKey).slice(0, 8);
}
