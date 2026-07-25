// Forward cruise for the shared desktop-scaled Ascent track.
// Both bodies must use this so authored gapSec is the real time between rings.

import { DESKTOP_GAP_SCALE } from "./body-scale";
import { sectorDifficulty } from "./difficulty";

/** Base forward cruise (u/s) for sector `i` on the desktop-scaled track. */
export function sectorFlightCruise(sector: number): number {
  return sectorDifficulty(sector).speed * DESKTOP_GAP_SCALE;
}

/** Desktop surge / brake around the sector cruise (pitch authority). */
export function sectorFlightBand(sector: number): { cruise: number; surge: number; brake: number } {
  const cruise = sectorFlightCruise(sector);
  return {
    cruise,
    surge: cruise * 1.22,
    brake: cruise * 0.58,
  };
}
