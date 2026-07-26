// Forward cruise for the shared desktop-scaled Ascent track.
// Desktop uses sectorFlightCruise so authored gapSec is real time between rings.
// Mobile applies MOBILE_CRUISE_MULT (body-only) for a stronger wind-rush feel;
// boards stay split per device, and flyer vertical headroom keeps rings flappable.

import { DESKTOP_GAP_SCALE } from "./body-scale";
import { sectorDifficulty } from "./difficulty";

/** Base forward cruise (u/s) for sector `i` on the desktop-scaled track. */
export function sectorFlightCruise(sector: number): number {
  return sectorDifficulty(sector).speed * DESKTOP_GAP_SCALE;
}

/**
 * Mobile Climb always-on wind (body-only). Desktop stays at par for its board.
 * Peak with hold boost stays inside climb budget headroom (~8%+ on rhythm gaps).
 */
export const MOBILE_CRUISE_MULT = 1.16;

/** Desktop surge / brake around the sector cruise (pitch authority). */
export function sectorFlightBand(sector: number): { cruise: number; surge: number; brake: number } {
  const cruise = sectorFlightCruise(sector);
  return {
    cruise,
    surge: cruise * 1.22,
    brake: cruise * 0.58,
  };
}
