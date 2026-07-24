// Golden-ring altitude detour — shared roll for Climb + desktop Flight.
// A mid-sector gate pulled off the glide line; threading it pays Crowns.

export const GOLD_RING_ODDS = 0.125;
export const GOLD_RING_CROWNS = 25;

export interface GoldGeom {
  idx: number;
  dy: number;
}

/** Pick a non-finish mid gate and offset it vertically, or null. */
export function rollGoldRing(
  checkpoints: { index: number; radius: number }[],
  /** Multiplier from wing traits (Gold Eye). Clamped so it can't guarantee every sector. */
  oddsMult = 1,
): GoldGeom | null {
  const gc = checkpoints.length - 1; // gates incl. finish
  const odds = Math.min(0.45, GOLD_RING_ODDS * Math.max(0.25, oddsMult));
  if (gc < 3 || Math.random() >= odds) return null;
  const idx = 1 + Math.floor(Math.random() * (gc - 1));
  const r = checkpoints[idx]?.radius ?? 3;
  const dy = (Math.random() < 0.5 ? 1 : -1) * (r * 1.55 + 0.9);
  return { idx, dy };
}

/** Crown payout for threading a gold ring (wing traits can bump). */
export function goldRingCrowns(crownsMult = 1): number {
  return Math.max(1, Math.round(GOLD_RING_CROWNS * Math.max(0.25, crownsMult)));
}

/** Apply a gold Y offset to a track's checkpoints (immutable). */
export function withGoldDetour<T extends { checkpoints: { index: number; pos: [number, number, number]; radius: number }[] }>(
  track: T,
  geom: GoldGeom | null,
): T {
  if (!geom) return track;
  return {
    ...track,
    checkpoints: track.checkpoints.map((cp) => {
      if (cp.index !== geom.idx) return cp;
      return {
        ...cp,
        pos: [cp.pos[0], cp.pos[1] + geom.dy, cp.pos[2]] as [number, number, number],
      };
    }),
  };
}
