// Shared Climb → desktop Circuit scale. Both bodies fly the desktop-scaled
// track (`desktopCircuitSector`), so gapSec timing only stays honest when
// forward cruise = difficulty.speed × DESKTOP_GAP_SCALE.

/** Forward (Z) ring spacing multiplier. */
export const DESKTOP_GAP_SCALE = 1.55;
/** Climb (Y) multiplier. */
export const DESKTOP_VERT_SCALE = 1.35;
/** Ring opening multiplier (threading at speed). */
export const DESKTOP_RADIUS_SCALE = 1.15;
