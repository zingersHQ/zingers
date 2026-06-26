// The Circuit — a dedicated solo time-trial track. Pure layout (no React/three)
// so the scene, Handler proximity checks and HUD all agree on geometry.

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
  /** Handler capsule centre at rest on the start pad. */
  spawn: [number, number, number];
  platforms: CircuitPlatform[];
  checkpoints: CircuitCheckpoint[];
}

// A ~75s zig-zag climb: ground hops → jetpack gaps → summit finish. Gaps stay
// inside the Handler's jump arc + jetpack thrust (see world.tsx tower tuning).
// Legacy single-track export — the run mode uses CIRCUIT_SECTORS in circuit-tracks.ts.
export const THE_CIRCUIT: CircuitTrackDef = {
  id: "circuit-v1",
  name: "The Circuit",
  spawn: [0, 1.1, -2],
  platforms: [
    { pos: [0, -0.25, 0], size: [14, 0.5, 12], accent: "top" },
    { pos: [0, -0.25, 14], size: [4.2, 0.5, 4.2], accent: "a" },
    { pos: [2.5, 1.05, 26], size: [3.6, 0.5, 3.6], accent: "b" },
    { pos: [-1.5, 3.35, 38], size: [3.6, 0.5, 3.6], accent: "a" },
    { pos: [3, 5.65, 50], size: [3.2, 0.5, 3.2], accent: "b" },
    { pos: [0, 7.95, 62], size: [3.6, 0.5, 3.6], accent: "a" },
    { pos: [-3.5, 10.25, 74], size: [3.2, 0.5, 3.2], accent: "b" },
    { pos: [0, 12.55, 86], size: [4, 0.5, 4], accent: "a" },
    { pos: [4, 14.85, 98], size: [3.2, 0.5, 3.2], accent: "b" },
    { pos: [0, 17.15, 110], size: [3.6, 0.5, 3.6], accent: "a" },
    { pos: [0, 19.45, 122], size: [7, 0.6, 7], accent: "top" },
  ],
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

/** True when the player passes through the ring hoop (not just the loose volume around it). */
export function crossedCircuitGate(pos: CircuitPos, cp: CircuitCheckpoint, opts?: { start?: boolean }): boolean {
  const [cx, cy, cz] = cp.pos;
  if (opts?.start) {
    const dh = Math.hypot(pos.x - cx, pos.z - cz);
    const dy = Math.abs(pos.y - cy);
    return dh <= cp.radius && dy <= cp.radius;
  }
  const horiz = Math.hypot(pos.x - cx, pos.z - cz);
  if (Math.abs(horiz - cp.radius) > 0.85) return false;
  if (Math.abs(pos.y - cy) > 1.05) return false;
  // must be at the gate plane, not just somewhere on the ring's circumference far away
  if (Math.abs(pos.z - cz) > 1.35) return false;
  return true;
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
