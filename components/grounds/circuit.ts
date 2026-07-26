// The Circuit — a dedicated solo time-trial track. Pure layout (no React/three)
// so the scene, Handler proximity checks and HUD all agree on geometry.

/**
 * Ranked Climb/Circuit starting lives. Spend down to continue on the same
 * sector (ghost leave); at 0 the run is over → sector 1. Clearing a Reach
 * restores one life (see `lifeRestoreOnReachClear`) so deep Flight stays fair
 * without mid-run camp warps.
 */
export const CIRCUIT_LIVES = 3;

/**
 * Sector-open cinematic — one clock for title card + arrive camera (Wii Sports
 * energy: short, bold, then hand control back). Keep these in sync across HUD
 * and CameraController.
 */
export const CIRCUIT_SECTOR_INTRO = {
  /** Face-on hold before the chase sweep (seconds). */
  arriveHoldS: 1.55,
  /** Q-sweep from face-on to chase (seconds). */
  arriveSweepS: 1.15,
  /** Life-continue face-on hold (seconds) — longer for the ghost leave. */
  continueArriveHoldS: 2.05,
  /** Title card on screen (ms) — covers hold + early sweep. Jump cue follows. */
  cardMs: 2800,
  /** @deprecated Jump cue now appears only after the card leaves. */
  promptMs: 2800,
} as const;

export interface CircuitPlatform {
  pos: [number, number, number];
  size: [number, number, number];
  accent?: "a" | "b" | "top";
}

export interface CircuitCheckpoint {
  index: number;
  label: string;
  pos: [number, number, number];
  radius: number;
  finish?: boolean;
}

export interface CircuitTrackDef {
  id: string;
  name: string;
  /** Handler capsule centre at rest on the (invisible) launch pad. */
  spawn: [number, number, number];
  /** Legacy field — Ascent is jetpack-only; keep empty. Launch pad is scene-local. */
  platforms: CircuitPlatform[];
  checkpoints: CircuitCheckpoint[];
}

// Legacy single-track export — jetpack-only rings. Live Ascent uses climb/sectors
// + desktop-adapter (100 sectors). platforms stay empty (launch pad is scene-local).
export const THE_CIRCUIT: CircuitTrackDef = {
  id: "circuit-v1",
  name: "The Ascent",
  spawn: [0, 1.1, -2],
  platforms: [],
  checkpoints: [
    { index: 0, label: "Start", pos: [0, 2.2, 10], radius: 3.8 },
    { index: 1, label: "Gate 1", pos: [0, 4.8, 38], radius: 3.2 },
    { index: 2, label: "Gate 2", pos: [0, 9.4, 62], radius: 3.2 },
    { index: 3, label: "Gate 3", pos: [0, 14, 86], radius: 3.2 },
    { index: 4, label: "Finish", pos: [0, 20.8, 120], radius: 4.2, finish: true },
  ],
};

export function formatCircuitMs(ms: number): string {
  const s = ms / 1000;
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return m > 0 ? `${m}:${r.toFixed(2).padStart(5, "0")}` : r.toFixed(2);
}

type CircuitPos = { x: number; y: number; z: number };

/** True when the player threads the gate opening (flies through the disc, not the rim). */
export function crossedCircuitGate(pos: CircuitPos, cp: CircuitCheckpoint, opts?: { start?: boolean }): boolean {
  const [cx, cy, cz] = cp.pos;
  if (opts?.start) {
    // start pad: a loose cylinder over the launch — easy to trigger as you leave
    const dh = Math.hypot(pos.x - cx, pos.z - cz);
    const dy = Math.abs(pos.y - cy);
    return dh <= cp.radius && dy <= cp.radius;
  }
  // rings face the track (+Z): a pass is being at the gate's Z-plane WHILE inside
  // the opening (hypot of lateral + vertical offset ≤ radius). The old check
  // required horiz ≈ radius — i.e. skimming the torus RIM — so only the start
  // pad ever counted; flying cleanly through the centre never registered.
  if (Math.abs(pos.z - cz) > 1.5) return false;
  const r = Math.hypot(pos.x - cx, pos.y - cy);
  return r <= cp.radius * 0.95;
}

/**
 * On the finish pad before every prior gate was cleared — a shortcut, not a clear.
 * Only fires when the flyer is still *short* of a skipped gate's Z (true skip).
 * If they're already past owed gates (hitch soft-lock), catch-up resolve handles it —
 * punishing the finish volume here was "LIFE LOST the moment I crossed the last ring".
 */
export function atCircuitFinishEarly(
  pos: CircuitPos,
  checkpoints: { pos: [number, number, number]; radius: number; finish?: boolean; index: number }[],
  nextIdx: number,
): boolean {
  const finish = checkpoints[checkpoints.length - 1];
  if (!finish?.finish || nextIdx >= finish.index) return false;
  const owed = checkpoints[nextIdx];
  if (owed && pos.z >= owed.pos[2]) return false;
  const [fx, fy, fz] = finish.pos;
  const dh = Math.hypot(pos.x - fx, pos.z - fz);
  const dy = Math.abs(pos.y - fy);
  return dh <= finish.radius * 0.9 && dy <= finish.radius * 0.9;
}

/** Flyer XY on the gate's Z-plane between two samples (hitch-safe). */
function posOnGatePlane(prev: CircuitPos, pos: CircuitPos, gz: number): CircuitPos {
  const span = pos.z - prev.z;
  if (!(span > 1e-8)) return { x: pos.x, y: pos.y, z: gz };
  const u = (gz - prev.z) / span;
  const t = u < 0 ? 0 : u > 1 ? 1 : u;
  return {
    x: prev.x + (pos.x - prev.x) * t,
    y: prev.y + (pos.y - prev.y) * t,
    z: gz,
  };
}

function openingTest(x: number, y: number, cp: Pick<CircuitCheckpoint, "pos" | "radius">): "pass" | "miss" {
  const dx = Math.abs(x - cp.pos[0]);
  const dy = Math.abs(y - cp.pos[1]);
  const r = cp.radius * 0.95;
  return dx <= r && dy <= r ? "pass" : "miss";
}

/**
 * Shared Ascent rule (desktop Circuit + mobile Climb): when the flyer crosses the
 * next gate's Z-plane, they must be inside the opening. Outside = miss → life.
 * Returns null when this frame did not cross the plane.
 *
 * XY is sampled **on the gate plane** (lerped from prev→pos). Testing the
 * post-frame pose after a tab/GC hitch was fine when rings sat at x=0; with soft
 * rails the flyer is already on the next bend, so end-of-frame XY false-missed
 * clean threads ("Missed a gate" / LIFE LOST after a clean sector).
 *
 * Large Δz still counts — `prev.z < gz && pos.z >= gz` holds across a jump.
 * Callers must keep a real previous sample (never snap prev to pos on spikes).
 */
export function circuitGatePlaneCross(
  prev: CircuitPos,
  pos: CircuitPos,
  cp: Pick<CircuitCheckpoint, "pos" | "radius">,
): "pass" | "miss" | null {
  const gz = cp.pos[2];
  if (!(prev.z < gz && pos.z >= gz)) return null;
  const r = cp.radius * 0.95;
  const span = pos.z - prev.z;
  // Soft rails bend X/Y between gates. A fat Δz hitch's linear chord is not the
  // flown path — crediting the gate beats inventing "Missed a gate" after clean
  // flight. Tight frames still use the interpolated opening test.
  if (span > r * 3) return "pass";
  const at = posOnGatePlane(prev, pos, gz);
  if (openingTest(at.x, at.y, cp) === "pass") return "pass";
  // Approach grace (desktop finish false-death): if the flyer was already inside
  // the opening on the approach side, a same-frame dip/nudge past the plane must
  // not invent "Missed a gate" / LIFE LOST after threading the last ring.
  if (openingTest(prev.x, prev.y, cp) === "pass") return "pass";
  return "miss";
}

/**
 * Resolve the next gate when the flyer is already at/past its Z (lag overshoot or
 * a prior frame that dropped the plane-cross).
 * Null = still short of the gate.
 *
 * If this frame still spans the plane, use the interpolated opening test.
 * If both samples are already past (dropped event), **credit a pass** — soft-rail
 * XY at a later Z is not evidence you missed the earlier opening.
 */
export function circuitGateResolveAtOrPast(
  prev: CircuitPos | null,
  pos: CircuitPos,
  cp: Pick<CircuitCheckpoint, "pos" | "radius">,
): "pass" | "miss" | null {
  const gz = cp.pos[2];
  if (pos.z < gz) return null;
  if (prev && prev.z < gz) {
    return circuitGatePlaneCross(prev, pos, cp);
  }
  return "pass";
}
