// Shared match-stage layout — kept out of world.tsx to avoid a circular import
// (world ↔ amphitheatre both need fighter spacing).

/** Horizontal spacing between fighters in the match stage. */
export const MATCH_SPREAD = 4.5;

export const PODIUM_A: [number, number, number] = [-MATCH_SPREAD, 0, 0];
export const PODIUM_B: [number, number, number] = [MATCH_SPREAD, 0, 0];
