// Shared Climb → desktop Circuit scale. Both bodies fly the desktop-scaled
// track (`desktopCircuitSector`), so gapSec timing only stays honest when
// forward cruise = difficulty.speed × DESKTOP_GAP_SCALE.
//
// FLIGHT_WIND_SCALE stretches Z spacing AND cruise together — faster wind
// tunnel feel without shrinking flap time (gapSec stays real seconds).

/** Shared wind-tunnel intensity. Cruise and gap Z both × this. */
export const FLIGHT_WIND_SCALE = 1.75;

/** Forward (Z) ring spacing before wind. */
const DESKTOP_GAP_BASE = 1.55;

/** Forward (Z) ring spacing multiplier (includes wind). */
export const DESKTOP_GAP_SCALE = DESKTOP_GAP_BASE * FLIGHT_WIND_SCALE;

/** Climb (Y) multiplier. */
export const DESKTOP_VERT_SCALE = 1.35;

/** Ring opening multiplier (threading at speed). */
export const DESKTOP_RADIUS_SCALE = 1.15;
