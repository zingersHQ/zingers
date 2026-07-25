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

/**
 * Challenge race mark for HUD copy.
 * - beat: deeper (or same depth, faster)
 * - surpassed: died on their fail sector but flew past their furthest Z
 * - miss: still short of their mark
 */
export type ClimbChallengeMark = "beat" | "surpassed" | "miss";

export function climbChallengeMark(
  run: {
    sectors: number;
    totalMs: number;
    /** Canonical Climb Z at death (only for failed runs). */
    failZ?: number | null;
    /** Sector index where the run ended (failed, not cleared). */
    failSectorIdx?: number | null;
  },
  challenge: {
    sectors: number;
    totalMs: number;
    tipZ?: number | null;
  },
): ClimbChallengeMark {
  if (isClimbChallengeBeat(run, challenge)) return "beat";
  const tipZ = challenge.tipZ;
  const failZ = run.failZ;
  const failSector = run.failSectorIdx;
  if (
    tipZ != null &&
    Number.isFinite(tipZ) &&
    failZ != null &&
    Number.isFinite(failZ) &&
    failSector != null &&
    failSector === challenge.sectors &&
    failZ > tipZ + 0.35
  ) {
    return "surpassed";
  }
  return "miss";
}

/** True when clearing `clearedSectorIdx` finishes the sector the challenger failed on. */
export function isChallengeTipSectorClear(
  clearedSectorIdx: number,
  challengeSectors: number,
): boolean {
  return clearedSectorIdx === challengeSectors;
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

// ── Session wing mods (Stage 2) ──────────────────────────────────────────────
// Set once at run start by both bodies; Flyer / Handler read each frame so we
// don't thread props through the whole R3F tree. Cleared when leaving Flight.

export interface AscentSessionMods {
  cruiseSink: number;
  cruiseGlide: number;
  diveSink: number;
  diveGlide: number;
  stumbleVy: number;
  stumbleLockS: number;
  stumbleImmuneS: number;
  cruiseSpeedMult: number;
}

const DEFAULT_SESSION: AscentSessionMods = {
  cruiseSink: ASCENT_GLIDE.cruiseSink,
  cruiseGlide: ASCENT_GLIDE.cruiseGlide,
  diveSink: ASCENT_GLIDE.diveSink,
  diveGlide: ASCENT_GLIDE.diveGlide,
  stumbleVy: ASCENT_STUMBLE.vy,
  stumbleLockS: ASCENT_STUMBLE.lockS,
  stumbleImmuneS: ASCENT_STUMBLE.immuneS,
  cruiseSpeedMult: 1,
};

let sessionMods: AscentSessionMods = { ...DEFAULT_SESSION };

export function setAscentSessionMods(partial: Partial<AscentSessionMods>): void {
  sessionMods = { ...DEFAULT_SESSION, ...partial };
}

export function clearAscentSessionMods(): void {
  sessionMods = { ...DEFAULT_SESSION };
}

export function ascentSessionMods(): AscentSessionMods {
  return sessionMods;
}
