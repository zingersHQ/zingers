// Vertical reach the flyer can cover in a gap — used to keep generated
// layouts physically finishable (docs/climb-feel: altitude is the skill axis).
//
// Layout budgets stay conservative (below live thrust). FLIGHT_WIND_SCALE
// stretches cruise AND gap Z together so gapSec (and these budgets) stay honest.
// Do NOT raise these when wind scale changes — that would place harder rings.

import { DESKTOP_VERT_SCALE } from "./body-scale";

// Conservative layout envelope (deliberately below live Climb thrust).
const KICK = 4;
const NET_UP = 22;
const MAX_RISE = 12;
const GRAVITY = 28;
const MAX_FALL = 18;

/** World-space climb (positive Y) from a controlled approach (vy≈0 + press kick). */
function worldClimb(t: number): number {
  const tt = Math.max(0.2, t);
  const vy0 = KICK;
  const tCap = Math.max(0, (MAX_RISE - vy0) / NET_UP);
  if (tt <= tCap) return vy0 * tt + 0.5 * NET_UP * tt * tt;
  const yCap = vy0 * tCap + 0.5 * NET_UP * tCap * tCap;
  return yCap + MAX_RISE * (tt - tCap);
}

/** World-space fall distance (positive) from a controlled release (vy≈0). */
function worldDive(t: number): number {
  const tt = Math.max(0.2, t);
  const tCap = MAX_FALL / GRAVITY;
  if (tt <= tCap) return 0.5 * GRAVITY * tt * tt;
  const yCap = 0.5 * GRAVITY * tCap * tCap;
  return yCap + MAX_FALL * (tt - tCap);
}

/**
 * Max |ΔY| in climb-canonical units for a gap lasting `gapSec` at matched cruise.
 * Safety < 1 leaves headroom for late flaps / mild incoming sink.
 */
export function maxClimbDeltaY(gapSec: number, safety = 0.78): number {
  return (worldClimb(gapSec) * safety) / DESKTOP_VERT_SCALE;
}

export function maxDiveDeltaY(gapSec: number, safety = 0.78): number {
  return (worldDive(gapSec) * safety) / DESKTOP_VERT_SCALE;
}

/** Clamp a planned height delta to what the flyer can actually do in this gap. */
export function clampDeltaToBudget(dy: number, gapSec: number): number {
  const up = maxClimbDeltaY(gapSec);
  const dn = maxDiveDeltaY(gapSec);
  if (dy > up) return up;
  if (dy < -dn) return -dn;
  return dy;
}
