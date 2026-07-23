// Shared Ascent rules — both Climb (thumb) and Circuit (flight).
// Layout/lives/gates already share modules; this holds the remaining pure
// contracts so bodies can't drift. Forward cruise, jet tables, camera, and
// Rapier vs kinematic loops stay body-local on purpose.
import { CLIMB_SECTOR_COUNT, REACH_SIZE } from "@/components/grounds/climb/difficulty";

export { CLIMB_SECTOR_COUNT, REACH_SIZE };

/** Reach II gate — first altitude key (needs a claimed win to continue). */
export const ALTITUDE_KEY_SECTOR = 10;

/** Shared vertical glide (both bodies). Forward speed stays body-local. */
export const ASCENT_GLIDE = {
  cruiseSink: -2.8,
  cruiseGlide: 7,
  diveSink: -7.6,
  diveGlide: 9,
} as const;

/** Hazard stumble — shove + lock + grace (not a death). */
export const ASCENT_STUMBLE = {
  vy: -6,
  lockS: 0.4,
  immuneS: 1.6,
} as const;

/** Deeper sectors win; same depth → faster time. */
export function isClimbChallengeBeat(
  run: { sectors: number; totalMs: number },
  challenge: { sectors: number; totalMs: number },
): boolean {
  if (run.sectors > challenge.sectors) return true;
  if (
    run.sectors === challenge.sectors &&
    run.totalMs > 0 &&
    (challenge.totalMs <= 0 || run.totalMs < challenge.totalMs)
  ) {
    return true;
  }
  return false;
}

export function needsAltitudeProve(wins: number | null | undefined): boolean {
  return (wins ?? 0) < 1;
}

/** Soul XP for a deeper owned Ascent (or guest conversion — omit clear bonus). */
export function ascentDepthXp(sectors: number, clearedAll = false): number {
  if (sectors <= 0) return 0;
  const reaches = Math.ceil(sectors / REACH_SIZE);
  return sectors * 20 + reaches * 12 + (clearedAll ? 100 : 0);
}

/** Craft Crowns for a personal-best Ascent time-at-depth. */
export function ascentCraftCrowns(sectors: number, clearedAll = false): number {
  if (sectors <= 0) return 0;
  const reaches = Math.ceil(sectors / REACH_SIZE);
  return Math.round(sectors * 3 + reaches * 15 + (clearedAll ? 50 : 0));
}
