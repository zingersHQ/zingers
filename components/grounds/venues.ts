// Games vs worlds — venues are activities you step into from a place, not peers
// on the world map. Regions link back to the Concord only; games can be reached
// from the Concord and from inside each region (thematic variant per host world).

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
    name: "The Circuit",
    shortLabel: "Circuit",
    blurb: "10-sector flying run · fall once and restart from sector 1",
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

/** Thematic circuit tunnel entrance per region world. */
export const REGION_CIRCUIT_SPOT: Record<string, { angle: number; dist: number; label: string }> = {
  grounds: { angle: Math.PI * 1.18, dist: 30, label: "The Ascent Tunnel" },
  gauntlet: { angle: Math.PI * 0.35, dist: 28, label: "Ember Chute" },
  void: { angle: Math.PI * 1.65, dist: 32, label: "Void Sleeve" },
};

export function circuitSpotFor(worldId: string) {
  return REGION_CIRCUIT_SPOT[worldId] ?? REGION_CIRCUIT_SPOT.grounds!;
}

/** Where you walk to leave an active game scene (a few metres behind the entry). */
export const VENUE_EXIT = {
  circuit: { pos: [0, 1.2, -9] as [number, number, number], radius: 3.2 },
  amphitheatre: { pos: [0, 1.0, 13] as [number, number, number], radius: 3.6 },
};

export interface GameSession {
  venue: VenueId;
  hostWorldId: string;
  returnPose: { x: number; z: number; y: number; heading: number };
}
