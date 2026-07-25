// ─────────────────────────────────────────────────────────────────────────────
// Conditions — Stage 3 of docs/long-game.md.
//
// A data-driven modifier on a ranked Flight run (and later fights). Pure catalog
// + merge into FlightModifiers. Sector spice (climb/modifiers.ts) stays per-
// sector; Conditions are the whole-run weather.
//
// Today's sky is deterministic from the UTC day so every Trainer shares one
// board-feeling challenge. Scout practice stays Clear Sky.
// ─────────────────────────────────────────────────────────────────────────────
import type { FlightModifiers } from "@/lib/wing-traits";
import { BASE_FLIGHT_MODIFIERS } from "@/lib/wing-traits";

export type ConditionId =
  | "clear"
  | "thin_air"
  | "fog_bank"
  | "crosswind"
  | "sudden_death"
  | "gold_rush"
  | "no_scout"
  | "hostile_air"
  | "heavy_air"
  | "silent_run"
  | "golden_hour"
  | "gale"
  | "brittle"
  | "still_air";

export interface RunCondition {
  id: ConditionId;
  name: string;
  /** Ready-strip / Director gloss. */
  gloss: string;
  /** Cap lives after wing traits (Sudden Death). */
  livesCap?: number;
  goldOddsMult?: number;
  goldCrownsMult?: number;
  /** Added to cruiseSink (more negative = falls faster). */
  cruiseSinkAdd?: number;
  cruiseGlideMult?: number;
  diveSinkAdd?: number;
  stumbleVy?: number;
  stumbleImmuneMult?: number;
  cruiseSpeedMult?: number;
  fogNearMult?: number;
  ambience?: number | null;
  warm?: boolean;
  moteColor?: string | null;
  banScout?: boolean;
  crownPayoutMult?: number;
}

/** Presentation + physics after wings + condition merge. */
export interface RunMods extends FlightModifiers {
  condition: RunCondition;
  fogNearMult: number;
  ambience: number | null;
  warm: boolean;
  moteColor: string | null;
  banScout: boolean;
}

export const CLEAR_SKY: RunCondition = {
  id: "clear",
  name: "Clear sky",
  gloss: "No weather. Just the climb.",
};

/** Ranked daily pool — Clear is omitted so every day has a named sky. */
export const FLIGHT_CONDITIONS: readonly RunCondition[] = [
  {
    id: "thin_air",
    name: "Thin air",
    gloss: "You sink faster between thrusts.",
    cruiseSinkAdd: -1.4,
    cruiseGlideMult: 0.85,
  },
  {
    id: "fog_bank",
    name: "Fog bank",
    gloss: "The next rings hide in the mist.",
    fogNearMult: 0.55,
  },
  {
    id: "crosswind",
    name: "Crosswind",
    gloss: "Faster push. Less time to aim.",
    cruiseSpeedMult: 1.14,
    cruiseSinkAdd: -0.5,
  },
  {
    id: "sudden_death",
    name: "Sudden death",
    gloss: "One life. No continue.",
    livesCap: 1,
  },
  {
    id: "gold_rush",
    name: "Gold rush",
    gloss: "Golden rings everywhere. Greed pays.",
    goldOddsMult: 2.2,
    goldCrownsMult: 1.5,
  },
  {
    id: "no_scout",
    name: "No scout",
    gloss: "Ranked only today. Practice camps are closed.",
    banScout: true,
  },
  {
    id: "hostile_air",
    name: "Hostile air",
    gloss: "Hazards hit harder; grace is shorter.",
    stumbleVy: -8,
    stumbleImmuneMult: 0.7,
  },
  {
    id: "heavy_air",
    name: "Heavy air",
    gloss: "Slower cruise, softer fall. Dense sky.",
    cruiseSpeedMult: 0.88,
    cruiseSinkAdd: 1.0, // less negative sink
    cruiseGlideMult: 1.15,
  },
  {
    id: "silent_run",
    name: "Silent run",
    gloss: "The score drops to a bare drone.",
    ambience: 0.06,
  },
  {
    id: "golden_hour",
    name: "Golden hour",
    gloss: "Warm light. A little more gold.",
    warm: true,
    moteColor: "#ffcf6a",
    goldOddsMult: 1.35,
    goldCrownsMult: 1.2,
  },
  {
    id: "gale",
    name: "Gale",
    gloss: "A hard forward wind. Hold on.",
    cruiseSpeedMult: 1.22,
  },
  {
    id: "brittle",
    name: "Brittle sky",
    gloss: "One clip and you're shoved hard.",
    stumbleVy: -9,
    stumbleImmuneMult: 0.75,
  },
  {
    id: "still_air",
    name: "Still air",
    gloss: "Slow cruise. Every ring is a choice.",
    cruiseSpeedMult: 0.82,
    cruiseSinkAdd: 0.6,
  },
] as const;

const BY_ID: Record<ConditionId, RunCondition> = {
  clear: CLEAR_SKY,
  ...Object.fromEntries(FLIGHT_CONDITIONS.map((c) => [c.id, c])),
} as Record<ConditionId, RunCondition>;

export function conditionById(id: ConditionId | string | null | undefined): RunCondition {
  if (!id) return CLEAR_SKY;
  return BY_ID[id as ConditionId] ?? CLEAR_SKY;
}

/** Same UTC day index as the Director / daily fight. */
const DAILY_EPOCH_UTC = Date.UTC(2024, 0, 1);
export function conditionDayNumber(now = new Date()): number {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(1, Math.floor((today - DAILY_EPOCH_UTC) / 86_400_000) + 1);
}

/** Shared ranked sky for the UTC day. */
export function dailyFlightCondition(now = new Date()): RunCondition {
  const n = conditionDayNumber(now);
  return FLIGHT_CONDITIONS[(n - 1) % FLIGHT_CONDITIONS.length]!;
}

/**
 * Wings first, then Condition. Lives use a cap (Sudden Death beats Second Wind).
 * Scout practice should pass CLEAR_SKY.
 */
export function mergeRunMods(
  wings: FlightModifiers,
  condition: RunCondition = CLEAR_SKY,
): RunMods {
  const m: FlightModifiers = { ...wings };

  if (condition.goldOddsMult) m.goldOddsMult *= condition.goldOddsMult;
  if (condition.goldCrownsMult) m.goldCrownsMult *= condition.goldCrownsMult;
  if (condition.crownPayoutMult) m.crownPayoutMult *= condition.crownPayoutMult;
  if (condition.cruiseSpeedMult) m.cruiseSpeedMult *= condition.cruiseSpeedMult;
  if (condition.cruiseSinkAdd) m.cruiseSink += condition.cruiseSinkAdd;
  if (condition.diveSinkAdd) m.diveSink += condition.diveSinkAdd;
  if (condition.cruiseGlideMult) m.cruiseGlide *= condition.cruiseGlideMult;
  if (condition.stumbleVy != null) m.stumbleVy = condition.stumbleVy;
  if (condition.stumbleImmuneMult) m.stumbleImmuneS *= condition.stumbleImmuneMult;
  if (condition.livesCap != null) m.lives = Math.min(m.lives, condition.livesCap);

  // Keep sink in a playable band.
  m.cruiseSink = Math.max(-6, Math.min(-0.6, m.cruiseSink));
  m.cruiseSpeedMult = Math.max(0.7, Math.min(1.4, m.cruiseSpeedMult));

  return {
    ...m,
    condition,
    fogNearMult: condition.fogNearMult ?? 1,
    ambience: condition.ambience ?? null,
    warm: !!condition.warm,
    moteColor: condition.moteColor ?? null,
    banScout: !!condition.banScout,
  };
}

export function conditionLine(c: RunCondition): string {
  if (c.id === "clear") return "Clear sky";
  return `${c.name} — ${c.gloss}`;
}

/** Baseline run mods with no wings (guest / empty loadout). */
export function guestRunMods(condition: RunCondition = CLEAR_SKY): RunMods {
  return mergeRunMods({ ...BASE_FLIGHT_MODIFIERS }, condition);
}
