// The Circuit — the DESKTOP (6-DOF flight) body of the Hundred-Sector Ascent
// (docs/circuit-world.md §1). It consumes the SAME generated layout as the
// mobile Climb — identical shape, identical per-sector seeds, so a Trainer who
// knows sector 23 on their phone meets the same sector on desktop — and only
// reinterprets SCALE: 6-DOF flight reads bigger spaces and covers ground faster
// than the one-thumb auto-scroll, so the geometry is stretched (gaps ×, climb ×,
// weave ×) and the ring openings are a touch more forgiving at cruise speed.
//
// This replaces the old bespoke `circuit-tracks.ts` generator (10 short sectors,
// fixed ~9u gaps → the "straight diagonal, too close" layout) with the real
// difficulty-function content: 100 sectors, ten themed Reaches, the saw-tooth
// role bar, and the hazard/modifier hooks the Climb already ships.

import type { CircuitCheckpoint, CircuitTrackDef } from "../circuit";
import { CLIMB_SECTOR_COUNT, climbSector } from "./sectors";
import { reachTheme, reachThemeByIndex, type ReachTheme } from "./reaches";
import { sectorDifficulty } from "./difficulty";

/** Exported so ghost samples can round-trip in canonical Climb space. */
export const DESKTOP_GAP_SCALE = 1.55; // forward (Z) ring spacing
export const DESKTOP_VERT_SCALE = 1.35; // climb (Y)
const LAT_SCALE = 1; // climb-feel §1c: rings are coplanar (x=0); no lateral stretch
const RADIUS_SCALE = 1.15; // ring openings (more forgiving threading a hoop at speed)

export const DESKTOP_CIRCUIT_COUNT = CLIMB_SECTOR_COUNT;

/** World → Climb-canonical (for challenge URLs shared with mobile). */
export function toClimbCanonical(y: number, z: number): { y: number; z: number } {
  return { y: y / DESKTOP_VERT_SCALE, z: z / DESKTOP_GAP_SCALE };
}

/** Climb-canonical → desktop world (ghost replay beside 6-DOF flight). */
export function fromClimbCanonical(y: number, z: number): { y: number; z: number } {
  return { y: y * DESKTOP_VERT_SCALE, z: z * DESKTOP_GAP_SCALE };
}

function scaleCheckpoint(cp: CircuitCheckpoint): CircuitCheckpoint {
  return {
    index: cp.index,
    label: cp.label,
    pos: [cp.pos[0] * LAT_SCALE, cp.pos[1] * DESKTOP_VERT_SCALE, cp.pos[2] * DESKTOP_GAP_SCALE],
    radius: cp.radius * RADIUS_SCALE,
    ...(cp.finish ? { finish: true } : {}),
  };
}

function buildDesktopSector(i: number, seed = ""): CircuitTrackDef {
  const src = climbSector(i, seed);
  return {
    id: seed ? `circuit-flight:${seed}:s${i + 1}` : `circuit-flight:s${i + 1}`,
    name: src.name,
    spawn: src.spawn, // keep near the Return Portal (unscaled — invisible launch pad)
    platforms: [], // jetpack-only — no stepping stones
    checkpoints: src.checkpoints.map(scaleCheckpoint),
  };
}

const DESKTOP_SECTORS: CircuitTrackDef[] = Array.from({ length: DESKTOP_CIRCUIT_COUNT }, (_, i) => buildDesktopSector(i));
const seededDesktopCache = new Map<string, CircuitTrackDef>();

/** The desktop 6-DOF sector `index` (0..99), scaled from the shared Climb layout. */
export function desktopCircuitSector(index: number, seed = ""): CircuitTrackDef {
  const i = Math.max(0, Math.min(DESKTOP_CIRCUIT_COUNT - 1, index));
  if (!seed) return DESKTOP_SECTORS[i]!;
  const key = `${seed}:${i}`;
  let t = seededDesktopCache.get(key);
  if (!t) {
    t = buildDesktopSector(i, seed);
    seededDesktopCache.set(key, t);
  }
  return t;
}

export { reachTheme, reachThemeByIndex, sectorDifficulty };
export type { ReachTheme };
