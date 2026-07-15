// The Climb — hazards (docs/climb.md §4): themed, telegraphed, never cheap.
//
// Every hazard is a PURE FUNCTION of time, so the render component and the
// flyer's collision test agree without any shared mutable state — call
// hazardState(h, t) in both. Collision is one sphere / column / rotor check in
// the existing kinematic loop (no physics engine). A hit is a STUMBLE, not a
// death (the soul atom keeps its two fail states): see the Flyer for the
// vy shove + control lockout + grace window.

import type { CircuitTrackDef } from "../circuit";
import { hash01 } from "../landmarks";
import { reachIndex, sectorDifficulty } from "./difficulty";

const TAU = Math.PI * 2;
export const FLYER_RADIUS = 0.55; // the champion's collision sphere at CHAMP_SCALE

export type HazardKind = "driftCrystal" | "cinderArc" | "ringRotor" | "plume" | "wardenWisp";

export interface Hazard {
  id: number;
  kind: HazardKind;
  x: number;
  y: number;
  z: number;
  radius: number; // collision radius (sphere kinds) / column radius (plume)
  amp: number; // motion amplitude
  cycle: number; // cycle rate (rad/s for oscillators, hz for on/off)
  phase: number; // 0..1 cycle offset
  height: number; // plume column height / cinder arc height
  gate: { x: number; y: number; z: number; r: number } | null; // rotor: the ring it guards
}

export interface HazardState {
  x: number;
  y: number;
  z: number;
  active: boolean; // currently able to hit (plume off-beat = false)
  telegraph: number; // 0..1 — 1 = fully "armed", <1 = warming up (glow ramp)
  angle: number; // rotor bar angle (rad); 0 for others
}

// which hazard kinds each Reach fields (index 0..9). Reach I stays empty (pure
// flight tutorial). §4 native assignments, widened in the upper Reaches.
const REACH_KINDS: HazardKind[][] = [
  [],
  ["driftCrystal"],
  ["driftCrystal", "wardenWisp"],
  ["cinderArc", "plume"],
  ["plume", "ringRotor"],
  ["driftCrystal", "wardenWisp"],
  ["driftCrystal", "cinderArc", "wardenWisp"],
  ["driftCrystal", "wardenWisp", "ringRotor"],
  ["cinderArc", "plume", "wardenWisp", "ringRotor"],
  ["wardenWisp", "cinderArc", "ringRotor"],
];

function makeRng(sector: number): () => number {
  let s = Math.floor(hash01(`climb:haz:${sector}`) * 2147483646) + 1;
  return () => ((s = (s * 16807) % 2147483647), s / 2147483647);
}

/** Deterministic hazard layout for a sector, placed in the gaps between rings. */
export function sectorHazards(sector: number, track: CircuitTrackDef): Hazard[] {
  const d = sectorDifficulty(sector);
  if (d.hazardBudget <= 0) return [];
  const kinds = REACH_KINDS[reachIndex(sector)] ?? [];
  if (kinds.length === 0) return [];

  const rnd = makeRng(sector);
  const gates = track.checkpoints; // [start, gate1..finish]
  const out: Hazard[] = [];

  // candidate gaps: between gate g and g+1 for g >= 1 (skip the launch approach)
  const gapStart = Math.min(1, gates.length - 2);
  const gaps: number[] = [];
  for (let g = gapStart; g < gates.length - 1; g++) gaps.push(g);
  if (gaps.length === 0) return [];

  for (let n = 0; n < d.hazardBudget; n++) {
    const g = gaps[Math.floor(rnd() * gaps.length)]!;
    const a = gates[g]!;
    const b = gates[g + 1]!;
    const kind = kinds[Math.floor(rnd() * kinds.length)]!;
    const tt = 0.38 + rnd() * 0.24; // sit mid-gap so the ring lines stay clean
    const z = a.pos[2] + (b.pos[2] - a.pos[2]) * tt;
    const yLine = a.pos[1] + (b.pos[1] - a.pos[1]) * tt;
    const xLine = a.pos[0] + (b.pos[0] - a.pos[0]) * tt;
    const phase = rnd();
    const id = n;

    if (kind === "ringRotor") {
      // guards the NEXT ring — a bar rotating inside its opening
      out.push({ id, kind, x: b.pos[0], y: b.pos[1], z: b.pos[2], radius: 0.42, amp: 0, cycle: 1.1 + rnd() * 0.5, phase, height: 0, gate: { x: b.pos[0], y: b.pos[1], z: b.pos[2], r: b.radius } });
    } else if (kind === "plume") {
      out.push({ id, kind, x: xLine + (rnd() - 0.5) * 1.5, y: yLine - 3.2, z, radius: 0.8, amp: 0, cycle: 0.42 + rnd() * 0.12, phase, height: 6.2, gate: null });
    } else if (kind === "cinderArc") {
      out.push({ id, kind, x: xLine, y: yLine + 0.4, z, radius: 0.78, amp: 3.4 + rnd() * 1.2, cycle: 0.5 + rnd() * 0.25, phase, height: 2.6 + rnd() * 1.0, gate: null });
    } else if (kind === "driftCrystal") {
      out.push({ id, kind, x: xLine, y: yLine + (rnd() - 0.5), z, radius: 1.05, amp: 3.0 + rnd() * 1.4, cycle: 0.7 + rnd() * 0.4, phase, height: 0, gate: null });
    } else {
      // wardenWisp — the attacker: sweeps up/down through the corridor
      out.push({ id, kind, x: xLine, y: yLine, z, radius: 0.6, amp: 2.4 + rnd() * 1.0, cycle: 1.2 + rnd() * 0.6, phase, height: 0, gate: null });
    }
  }
  return out;
}

/** Live position + arming state of a hazard at time `t` (seconds). Pure. */
export function hazardState(h: Hazard, t: number): HazardState {
  switch (h.kind) {
    case "driftCrystal": {
      return { x: h.x + Math.sin(t * h.cycle + h.phase * TAU) * h.amp, y: h.y, z: h.z, active: true, telegraph: 1, angle: 0 };
    }
    case "wardenWisp": {
      const s = Math.sin(t * h.cycle + h.phase * TAU);
      return { x: h.x + Math.cos(t * h.cycle * 0.5) * 0.4, y: h.y + s * h.amp, z: h.z, active: true, telegraph: 1, angle: 0 };
    }
    case "cinderArc": {
      const u = (t * h.cycle + h.phase) % 1;
      return { x: h.x + (u - 0.5) * 2 * h.amp, y: h.y + Math.sin(u * Math.PI) * h.height, z: h.z, active: u > 0.04 && u < 0.96, telegraph: 1, angle: 0 };
    }
    case "plume": {
      const u = (t * h.cycle + h.phase) % 1;
      const on = u < 0.5;
      // warm up in the last 0.14 of the off-beat so ignition is telegraphed
      const warming = !on && u > 0.86 ? (u - 0.86) / 0.14 : on ? 1 : 0;
      return { x: h.x, y: h.y, z: h.z, active: on, telegraph: warming, angle: 0 };
    }
    case "ringRotor": {
      return { x: h.x, y: h.y, z: h.z, active: true, telegraph: 1, angle: t * h.cycle + h.phase * TAU };
    }
  }
}

function wrapPi(a: number): number {
  while (a > Math.PI) a -= TAU;
  while (a < -Math.PI) a += TAU;
  return a;
}

/** True when the flyer sphere is currently intersecting hazard `h` at time `t`. */
export function hazardHits(h: Hazard, t: number, px: number, py: number, pz: number): boolean {
  const s = hazardState(h, t);
  if (!s.active) return false;

  if (h.kind === "plume") {
    const dh = Math.hypot(px - s.x, pz - s.z);
    return dh < h.radius + FLYER_RADIUS && py > h.y && py < h.y + h.height;
  }

  if (h.kind === "ringRotor" && h.gate) {
    if (Math.abs(pz - h.gate.z) > 1.0) return false;
    const dx = px - h.gate.x;
    const dy = py - h.gate.y;
    const rr = Math.hypot(dx, dy);
    if (rr > h.gate.r || rr < 0.15) return false; // outside the ring or dead-centre pivot
    const flyerAng = Math.atan2(dy, dx);
    // the bar is a diameter → two opposite arms; nearest-arm angular distance
    const dA = Math.min(Math.abs(wrapPi(flyerAng - s.angle)), Math.abs(wrapPi(flyerAng - s.angle - Math.PI)));
    return dA * rr < h.radius; // arc-length to the bar within its half-thickness
  }

  // sphere kinds
  const d = Math.hypot(px - s.x, py - s.y, pz - s.z);
  return d < h.radius + FLYER_RADIUS;
}
