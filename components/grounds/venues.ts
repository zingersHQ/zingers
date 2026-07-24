// Games vs worlds — venues are activities you step into from a place, not peers
// on the world map. Regions link back to the Concord only; games can be reached
// from the Concord and from inside each region (thematic variant per host world).

import { spawnKnollFor } from "./terrain";
import { worldById } from "./worlds";

export type VenueId = "amphitheatre" | "circuit";

export interface VenueDef {
  id: VenueId;
  name: string;
  shortLabel: string;
  blurb: string;
  color: string;
}

export const VENUES: Record<VenueId, VenueDef> = {
  amphitheatre: {
    id: "amphitheatre",
    name: "The Amphitheatre",
    shortLabel: "Amphitheatre",
    blurb: "Watch the autonomous league fight · today's Tribunal herald",
    color: "#ffb14a",
  },
  circuit: {
    id: "circuit",
    name: "Flight",
    shortLabel: "Flight",
    blurb: "Fly the hundred-sector sky · same run on phone or desktop",
    color: "#39e0ff",
  },
};

/** Concord game portals — visually distinct from Vaultgates (regions only). */
export const CONCORD_VENUE_SPOTS: { venue: VenueId; angle: number; dist: number }[] = [
  { venue: "amphitheatre", angle: -Math.PI / 2 + 0.55, dist: 20 },
  { venue: "circuit", angle: -Math.PI / 2 - 0.55, dist: 20 },
];

/** Walk-up return arch in each region — the only way out to the Concord. */
export const REGION_RETURN_SPOT = { angle: Math.PI * 0.92, dist: 33 };

/**
 * Metres behind the spawn knoll for the Concord return portal.
 * Chase cam sits ~8.6m behind the Trainer looking plaza-ward — keep the arch
 * past that so it never wedges between lens and body on world start.
 */
export const REGION_RETURN_BEHIND = 14;

/** Metres plaza-ward of the Concord return arch — must clear the ~3.6 auto-enter
 *  and leave enough air that the door isn't wedged between camera and plaza. */
const REGION_RETURN_CLEARANCE = 16;

/** The Circuit portal per region world — set FAR OUT IN THE WILDS beyond the
 *  plaza rim (PLAZA_R = 36), on its own bearing well away from the central arena,
 *  crowning a large terrained mountain (see AscentMountain in world.tsx) with
 *  light beams to the sky — a distant destination you walk or fly up to, never
 *  hugging the colosseum. Dist is the mountain centre; keep clear of TERRAIN_HALF
 *  (165). Its own thematic name lives on the walk-up prompt. */
export const REGION_CIRCUIT_SPOT: Record<string, { angle: number; dist: number; label: string }> = {
  grounds: { angle: Math.PI * 1.18, dist: 124, label: "The Ascent Tunnel" },
  gauntlet: { angle: Math.PI * 0.35, dist: 122, label: "Ember Chute" },
  void: { angle: Math.PI * 1.65, dist: 126, label: "Void Sleeve" },
};

export function circuitSpotFor(worldId: string) {
  return REGION_CIRCUIT_SPOT[worldId] ?? REGION_CIRCUIT_SPOT.grounds!;
}

/** Metres from the Ascent portal plane — must clear the ~3.6 auto-enter radius. */
const ASCENT_RETURN_CLEARANCE = 7;

type PoseIn = { x: number; z: number; y?: number; heading?: number };
type PoseOut = { x: number; z: number; y: number; heading: number };

function regionKnoll(worldId: string) {
  const w = worldById(worldId);
  if (w.kind !== "region") return null;
  return spawnKnollFor(w.biome);
}

/** Concord return arch xz — same placement as World.returnTarget. */
export function regionReturnPortalXZ(worldId: string): { x: number; z: number } | null {
  const knoll = regionKnoll(worldId);
  if (!knoll) return null;
  const r = Math.hypot(knoll.x, knoll.z) || 1;
  return {
    x: knoll.x + (knoll.x / r) * REGION_RETURN_BEHIND,
    z: knoll.z + (knoll.z / r) * REGION_RETURN_BEHIND,
  };
}

/**
 * Plaza-side stand at a region's Concord door — just inside the return arch,
 * facing the plaza. Used when arriving through a Vaultgate from the hub.
 */
export function regionEntrancePose(worldId: string, clearance = REGION_RETURN_CLEARANCE): PoseOut | null {
  const knoll = regionKnoll(worldId);
  const portal = regionReturnPortalXZ(worldId);
  if (!knoll || !portal) return null;
  const r = Math.hypot(knoll.x, knoll.z) || 1;
  const x = portal.x - (knoll.x / r) * clearance;
  const z = portal.z - (knoll.z / r) * clearance;
  return { x, z, y: 0, heading: Math.atan2(-x, -z) };
}

/**
 * Nudge a pose off the Concord return portal toward the plaza so exit / reload
 * doesn't land on the outer (wilds) side of the arch or re-trigger auto-travel.
 * No-ops for hub worlds or when already clear on the plaza side.
 */
export function awayFromReturnPortal(
  worldId: string,
  pose: PoseIn,
  clearance = REGION_RETURN_CLEARANCE,
): PoseOut {
  const y = pose.y ?? 0;
  const knoll = regionKnoll(worldId);
  const portal = regionReturnPortalXZ(worldId);
  if (!knoll || !portal) {
    return { x: pose.x, z: pose.z, y, heading: pose.heading ?? 0 };
  }
  const r = Math.hypot(knoll.x, knoll.z) || 1;
  const ox = knoll.x / r;
  const oz = knoll.z / r;
  const poseAlong = pose.x * ox + pose.z * oz;
  const portalAlong = portal.x * ox + portal.z * oz;
  const dh = Math.hypot(pose.x - portal.x, pose.z - portal.z);
  // Inside the auto-enter volume, or on/past the outer face of the arch.
  if (dh < clearance || poseAlong >= portalAlong - 0.5) {
    const x = portal.x - ox * clearance;
    const z = portal.z - oz * clearance;
    // Always plaza-ward — never keep a saved heading that stares at the door.
    return { x, z, y, heading: Math.atan2(-x, -z) };
  }
  // Heal legacy saves near the door that kept heading 0 (portal-facing).
  const nearDoor = dh < clearance + 10;
  return {
    x: pose.x,
    z: pose.z,
    y,
    heading: nearDoor ? Math.atan2(-pose.x, -pose.z) : (pose.heading ?? Math.atan2(-pose.x, -pose.z)),
  };
}

/**
 * Nudge a pose off the Ascent portal toward the plaza so exit / reload doesn't
 * immediately re-trigger venue-enter. Faces the portal. No-ops when already clear
 * or when the world has no region Ascent spot (e.g. Concord).
 */
export function awayFromCircuitPortal(
  worldId: string,
  pose: PoseIn,
  clearance = ASCENT_RETURN_CLEARANCE,
): PoseOut {
  const y = pose.y ?? 0;
  if (!REGION_CIRCUIT_SPOT[worldId]) {
    return { x: pose.x, z: pose.z, y, heading: pose.heading ?? 0 };
  }
  const spot = circuitSpotFor(worldId);
  const mx = Math.cos(spot.angle) * spot.dist;
  const mz = Math.sin(spot.angle) * spot.dist;
  const dh = Math.hypot(pose.x - mx, pose.z - mz);
  if (dh >= clearance) {
    return { x: pose.x, z: pose.z, y, heading: pose.heading ?? Math.atan2(mx - pose.x, mz - pose.z) };
  }
  const r = Math.hypot(mx, mz) || 1;
  // Toward plaza (origin) from the mountain portal.
  const x = mx - (mx / r) * clearance;
  const z = mz - (mz / r) * clearance;
  return { x, z, y, heading: Math.atan2(mx - x, mz - z) };
}

/** Apply both region portal clearances (Concord return, then Ascent). */
export function safeWildPose(worldId: string, pose: PoseIn): PoseOut {
  return awayFromCircuitPortal(worldId, awayFromReturnPortal(worldId, pose));
}

/** Where you walk to leave an active game scene (a few metres behind the entry). */
export const VENUE_EXIT = {
  // Behind the spawn on the arrival deck (y=0 = deck top). Must sit BEHIND the
  // chase camera (spawn ≈ z=-2.5, cam dist ≈ 8.6 → lens near z=-11): keep portal
  // ≤ z=-18 so it never wedges between camera and Trainer. Arch feet plant on
  // the pad — never float (arrive framing: portal → character → track).
  circuit: { pos: [0, 0, -20] as [number, number, number], radius: 3.4 },
  // Spawn ≈ z=12 facing −z; chase cam ~8.6m behind → lens near z≈20.5. Keep the
  // exit arch past the lens (same wedge bug as region Concord returns).
  amphitheatre: { pos: [0, 1.0, 24] as [number, number, number], radius: 3.6 },
};

export interface GameSession {
  venue: VenueId;
  hostWorldId: string;
  returnPose: { x: number; z: number; y: number; heading: number };
}
