// The Circuit — a dedicated solo time-trial track. Pure layout (no React/three)
// so the scene, Handler proximity checks and HUD all agree on geometry.

/** Ranked Climb/Circuit: one continue, then run over (ghost leave on spend). */
export const CIRCUIT_LIVES = 2;

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
  /** Title card on screen (ms) — covers hold + early sweep. */
  cardMs: 2800,
  /** When the "Jump to start" cue joins the card (ms). */
  promptMs: 2000,
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

/** On the finish pad before every prior gate was cleared — a shortcut, not a clear. */
export function atCircuitFinishEarly(pos: CircuitPos, checkpoints: { pos: [number, number, number]; radius: number; finish?: boolean; index: number }[], nextIdx: number): boolean {
  const finish = checkpoints[checkpoints.length - 1];
  if (!finish?.finish || nextIdx >= finish.index) return false;
  const [fx, fy, fz] = finish.pos;
  const dh = Math.hypot(pos.x - fx, pos.z - fz);
  const dy = Math.abs(pos.y - fy);
  return dh <= finish.radius * 0.9 && dy <= finish.radius * 0.9;
}

/**
 * Shared Ascent rule (desktop Circuit + mobile Climb): when the flyer crosses the
 * next gate's Z-plane, they must be inside the opening. Outside = miss → run over.
 * Returns null when this frame did not cross the plane.
 */
export function circuitGatePlaneCross(
  prevZ: number,
  z: number,
  pos: CircuitPos,
  cp: Pick<CircuitCheckpoint, "pos" | "radius">,
): "pass" | "miss" | null {
  const gz = cp.pos[2];
  if (!(prevZ < gz && z >= gz)) return null;
  const dx = Math.abs(pos.x - cp.pos[0]);
  const dy = Math.abs(pos.y - cp.pos[1]);
  const r = cp.radius * 0.95;
  return dx <= r && dy <= r ? "pass" : "miss";
}
