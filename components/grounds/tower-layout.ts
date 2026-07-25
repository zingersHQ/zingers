// Shared Tower helix layout — colliders, Peak goal, mid-climb agents, and the
// summit guardian all read the same geometry so the Peak beacon and the fight
// land on the same platform.
import { PLAZA_R, terrainHeight, type TerrainShape, type SpawnKnoll } from "./terrain";
import type { TowerAgent } from "@/lib/types";

export const TOWER_CHECKPOINT_EVERY = 12;

export interface TowerNode {
  pos: [number, number, number];
  size: [number, number, number];
  checkpoint?: boolean;
}

export interface TowerPerch {
  agent: TowerAgent;
  pos: [number, number, number];
}

/** Full helix including the wide summit pad (last node). */
export function towerLayout(shape: TerrainShape, angle: number, steps: number, knoll?: SpawnKnoll): TowerNode[] {
  const cx = Math.cos(angle) * (PLAZA_R + 9);
  const cz = Math.sin(angle) * (PLAZA_R + 9);
  const baseY = terrainHeight(cx, cz, shape, knoll);
  const out: TowerNode[] = [];
  out.push({ pos: [cx, baseY + 1.2, cz], size: [4.6, 0.5, 4.6], checkpoint: true });
  let y = baseY + 1.2;
  for (let i = 0; i < steps; i++) {
    const a = i * 0.95 + 0.5;
    const radius = 3.6 + Math.sin(i * 0.7) * 0.6;
    const step = 2.7 + (i / Math.max(1, steps)) * 0.9;
    y += step;
    const isCp = (i + 1) % TOWER_CHECKPOINT_EVERY === 0;
    const w = isCp ? 4.6 : Math.max(2.0, 3.2 - i * 0.008);
    out.push({ pos: [cx + Math.cos(a) * radius, y, cz + Math.sin(a) * radius], size: [w, 0.45, w], checkpoint: isCp });
  }
  y += 3.1;
  out.push({ pos: [cx, y, cz], size: [6.5, 0.6, 6.5], checkpoint: true });
  return out;
}

/** Walking surface center of the summit pad — Peak claim + guardian spawn. */
export function towerSummitSurface(
  shape: TerrainShape,
  angle: number,
  steps: number,
  knoll?: SpawnKnoll,
): [number, number, number] {
  const nodes = towerLayout(shape, angle, steps, knoll);
  const top = nodes[nodes.length - 1];
  return [top.pos[0], top.pos[1] + top.size[1] / 2, top.pos[2]];
}

/** Mid-climb seats only (entry + helix). Summit is reserved for the Peak guardian. */
export function assignMidPerch(nodes: TowerNode[], agents: TowerAgent[]): TowerPerch[] {
  if (!agents.length || nodes.length < 3) return [];
  const slots = nodes.slice(1, -1);
  if (!slots.length) return [];
  const sorted = [...agents].sort((a, b) => a.rating - b.rating);
  const n = Math.min(sorted.length, slots.length);
  const out: TowerPerch[] = [];
  for (let i = 0; i < n; i++) {
    const slot = n === 1 ? slots[slots.length - 1] : slots[Math.round((i * (slots.length - 1)) / (n - 1))];
    out.push({ agent: sorted[i], pos: [slot.pos[0], slot.pos[1] + slot.size[1] / 2, slot.pos[2]] });
  }
  return out;
}

/** Strongest tower agent — waits at the Peak until the summit is claimed. */
export function pickSummitAgent(agents: TowerAgent[]): TowerAgent | null {
  if (!agents.length) return null;
  return [...agents].sort((a, b) => b.rating - a.rating)[0] ?? null;
}
