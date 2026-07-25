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

/**
 * Mid-climb seats only (entry + helix). Summit is reserved for the Peak guardian.
 * Leave the last few helix pads empty so the platform under the Peak doesn't host
 * a different champion (reads as "why is Golden Badger here instead of Deep Willow?").
 */
const SUMMIT_CLEAR_PADS = 2;

export function assignMidPerch(nodes: TowerNode[], agents: TowerAgent[]): TowerPerch[] {
  if (!agents.length || nodes.length < 3) return [];
  // Drop entry (0), summit (last), and the pads just under the Peak.
  const end = Math.max(1, nodes.length - 1 - SUMMIT_CLEAR_PADS);
  const slots = nodes.slice(1, end);
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

/** Top walking surface of a Tower pad (center Y of the collider top face). */
export function towerPadSurface(node: TowerNode): number {
  return node.pos[1] + node.size[1] / 2;
}

/**
 * Pad under (x,z) whose top is near `nearY` (Trainer/companion feet).
 * Used so the owned champion stands on the same floating pad, not terrain far below.
 */
export function findTowerPad(
  x: number,
  z: number,
  nearY: number,
  nodes: TowerNode[],
  opts?: { margin?: number; maxBelow?: number; maxAbove?: number },
): TowerNode | null {
  if (!nodes.length) return null;
  const margin = opts?.margin ?? 0.9;
  const maxBelow = opts?.maxBelow ?? 2.8;
  const maxAbove = opts?.maxAbove ?? 6;
  let best: TowerNode | null = null;
  let bestScore = Infinity;
  for (const n of nodes) {
    const half = Math.max(n.size[0], n.size[2]) / 2 + margin;
    if (Math.abs(x - n.pos[0]) > half || Math.abs(z - n.pos[2]) > half) continue;
    const top = towerPadSurface(n);
    const dy = nearY - top;
    if (dy < -maxBelow || dy > maxAbove) continue;
    const score = Math.abs(dy) + Math.hypot(x - n.pos[0], z - n.pos[2]) * 0.04;
    if (score < bestScore) {
      bestScore = score;
      best = n;
    }
  }
  return best;
}

/** Keep a dock point on the pad so a behind/side wing slot never hangs in open air. */
export function clampToTowerPad(
  x: number,
  z: number,
  pad: TowerNode,
  inset = 0.55,
): { x: number; z: number } {
  const halfX = Math.max(0.35, pad.size[0] / 2 - inset);
  const halfZ = Math.max(0.35, pad.size[2] / 2 - inset);
  return {
    x: Math.min(pad.pos[0] + halfX, Math.max(pad.pos[0] - halfX, x)),
    z: Math.min(pad.pos[2] + halfZ, Math.max(pad.pos[2] - halfZ, z)),
  };
}
