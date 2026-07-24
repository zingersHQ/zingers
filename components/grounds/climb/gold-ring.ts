// Golden-ring altitude detour — shared roll for Climb + desktop Flight.
// A mid-sector gate pulled off the glide line; threading it pays Crowns.

export const GOLD_RING_ODDS = 0.125;
export const GOLD_RING_CROWNS = 25;

export interface GoldGeom {
  idx: number;
  dy: number;
}

/** Pick a non-finish mid gate and offset it vertically, or null. */
export function rollGoldRing(checkpoints: { index: number; radius: number }[]): GoldGeom | null {
  const gc = checkpoints.length - 1; // gates incl. finish
  if (gc < 3 || Math.random() >= GOLD_RING_ODDS) return null;
  const idx = 1 + Math.floor(Math.random() * (gc - 1));
  const r = checkpoints[idx]?.radius ?? 3;
  const dy = (Math.random() < 0.5 ? 1 : -1) * (r * 1.55 + 0.9);
  return { idx, dy };
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
