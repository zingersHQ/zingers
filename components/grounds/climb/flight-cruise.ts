// Forward cruise for the shared desktop-scaled Ascent track.
// Both bodies use sectorFlightCruise so authored gapSec is real time between
// rings — DESKTOP_GAP_SCALE already includes FLIGHT_WIND_SCALE (wind tunnel).

import { DESKTOP_GAP_SCALE } from "./body-scale";
import { sectorDifficulty } from "./difficulty";

/** Base forward cruise (u/s) for sector `i` on the wind-scaled track. */
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
