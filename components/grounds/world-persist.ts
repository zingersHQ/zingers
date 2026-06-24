// Local persistence for where you are in the world — no server needed. Saves per-
// world pose so returning through a gate (or exiting a game scene) lands you
// where you left off.

export interface SavedPose {
  x: number;
  z: number;
  y: number;
  heading: number;
  at: number;
}

const POSES_KEY = "zingers_world_poses_v1";
const LAST_WORLD_KEY = "zingers_last_world_v1";

function readPoses(): Record<string, SavedPose> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(POSES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, SavedPose>) : {};
  } catch {
    return {};
  }
}

function writePoses(poses: Record<string, SavedPose>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(POSES_KEY, JSON.stringify(poses));
  } catch {
    /* quota */
  }
}

export function saveWorldPose(worldId: string, pose: Omit<SavedPose, "at">): void {
  const poses = readPoses();
  poses[worldId] = { ...pose, at: Date.now() };
  writePoses(poses);
}

export function loadWorldPose(worldId: string): SavedPose | null {
  const p = readPoses()[worldId];
  if (!p || !Number.isFinite(p.x)) return null;
  return p;
}

export function saveLastWorld(worldId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LAST_WORLD_KEY, worldId);
  } catch {
    /* ignore */
  }
}

export function loadLastWorld(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(LAST_WORLD_KEY);
  } catch {
    return null;
  }
}
