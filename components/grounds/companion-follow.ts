// Shared companion wing-slot / leash feel — Grounds OwnedCompanion, Climb, Circuit.
// Distances are world units for a WORLD_AGENT_SCALE champion beside a READER_SCALE Trainer.

import { FLIGHT_WIND_SCALE } from "./climb/body-scale";

export const COMPANION_FOLLOW = {
  slotR: 2.0,
  slotBack: 0.92, // mostly behind (idle dock, multiplied by slotR)
  slotSide: 0.38, // …with a little offset to the side
  introSec: 2.0,
  introStart: 11,
  arrived: 0.8,
  wingDrop: 0.75,
  liftThreshold: 2.0,
  approachArc: 2.4,
  catchK: 1.4, // closes lag gently — not twitchy on heading flips
  catchMax: 20,
  accel: 9, // lower = heavier follow, stacks short taps into one arc
  idleSettle: 4.5,
  velSmooth: 5.5, // smooth Handler path velocity (filters tap-spam)
  headingSmooth: 3.2, // follow heading eases toward path / Handler facing
  slotSmooth: 6, // chase target position lags — main path not micro-jitter
  rigHeadingSmooth: 5,
  minPathSpeed: 0.55, // above this: trail behind path instead of instant wing slot
  pathBack: 1.6, // world units behind on the smoothed path
  pathSide: 0.35,
} as const;

/**
 * Flight tunnel leash (Climb + Circuit FlyingFollower).
 * catchMax must sit above wind-scaled cruise or the champion is permanently
 * capped slower than the Trainer and falls behind.
 */
export const FLIGHT_COMPANION_FOLLOW = {
  ...COMPANION_FOLLOW,
  catchK: 1.9,
  // Max cruise ≈ 11.4 × 1.55 × WIND × Swift≈1.22 ≈ 38; headroom for catch-up.
  catchMax: 28 * FLIGHT_WIND_SCALE,
  accel: 14,
  velSmooth: 9, // lock onto tunnel cruise quickly
  slotSmooth: 10,
  pathBack: 1.85,
} as const;

/** Wing slot slightly behind + beside the Handler (relative to body heading). */
export function companionDockSlot(
  hx: number,
  hz: number,
  hh: number,
  r: number = COMPANION_FOLLOW.slotR,
): { tx: number; tz: number } {
  const backX = -Math.sin(hh);
  const backZ = -Math.cos(hh);
  const sideX = Math.cos(hh);
  const sideZ = -Math.sin(hh);
  const { slotBack, slotSide } = COMPANION_FOLLOW;
  return {
    tx: hx + (backX * slotBack + sideX * slotSide) * r,
    tz: hz + (backZ * slotBack + sideZ * slotSide) * r,
  };
}

/** Path-trail slot used while the Trainer is moving (flight / run). */
export function companionPathSlot(
  hx: number,
  hz: number,
  hh: number,
): { tx: number; tz: number } {
  const { pathBack, pathSide } = COMPANION_FOLLOW;
  const fx = Math.sin(hh);
  const fz = Math.cos(hh);
  const rx = fz;
  const rz = -fx;
  return {
    tx: hx - fx * pathBack + rx * pathSide,
    tz: hz - fz * pathBack + rz * pathSide,
  };
}
