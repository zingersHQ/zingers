// ─────────────────────────────────────────────────────────────────────────────
// Wing traits — Stage 2 of docs/long-game.md.
//
// Champion → Flight causality: the mind you raise changes how Flight plays.
// Pure and framework-free. Both bodies (Climb + Circuit) resolve the same
// modifiers from the same career state.
//
// v1: one innate trait from Force type + up to one earned trait the Trainer
// picks before launch. Effects land on lives, gold, glide, stumble, scout.
// ─────────────────────────────────────────────────────────────────────────────
import type { Champion, CreatureType, Strat } from "@/lib/types";
import { CIRCUIT_LIVES } from "@/components/grounds/circuit";
import { ASCENT_GLIDE, ASCENT_STUMBLE } from "@/lib/ascent-rules";
import { levelFor, sigilLevel } from "@/lib/evolve/progression";
import { ROSTER } from "@/lib/engine/roster";

export type WingTraitId =
  | "second_wind"
  | "gold_eye"
  | "thick_feathers"
  | "soft_glide"
  | "camp_sense"
  | "tailwind";

export interface WingTraitDef {
  id: WingTraitId;
  name: string;
  /** One-line gloss — ready strip + Director. */
  gloss: string;
  /** Force that wears this as the innate wing. */
  innateType?: CreatureType;
}

export const WING_TRAITS: Record<WingTraitId, WingTraitDef> = {
  second_wind: {
    id: "second_wind",
    name: "Second Wind",
    gloss: "One extra life on every flight (on top of the usual three).",
    innateType: "COMPOSURE",
  },
  gold_eye: {
    id: "gold_eye",
    name: "Gold Eye",
    gloss: "Golden rings appear more often.",
    innateType: "CREATIVITY",
  },
  thick_feathers: {
    id: "thick_feathers",
    name: "Thick Feathers",
    gloss: "Hazards shove softer; grace lasts longer.",
  },
  soft_glide: {
    id: "soft_glide",
    name: "Soft Glide",
    gloss: "Gentler cruise sink. More time to aim.",
    innateType: "LOGIC",
  },
  camp_sense: {
    id: "camp_sense",
    name: "Camp Sense",
    gloss: "Scout starts one Reach higher.",
    innateType: "RHETORIC",
  },
  tailwind: {
    id: "tailwind",
    name: "Tailwind",
    gloss: "Faster forward cruise. Hotter air.",
    innateType: "CHAOS",
  },
};

/** Innate trait per Force — one clear identity per type. */
const INNATE_BY_TYPE: Record<CreatureType, WingTraitId> = {
  COMPOSURE: "second_wind",
  CREATIVITY: "gold_eye",
  LOGIC: "soft_glide",
  RHETORIC: "camp_sense",
  CHAOS: "tailwind",
};

/** Earned unlocks (on top of innate). Data-driven from career axes. */
export interface WingInput {
  key: string;
  champ: Champion;
  strat?: Strat | null;
  campsLit: number;
}

export interface FlightModifiers {
  lives: number;
  goldOddsMult: number;
  goldCrownsMult: number;
  cruiseSink: number;
  cruiseGlide: number;
  diveSink: number;
  diveGlide: number;
  stumbleVy: number;
  stumbleLockS: number;
  stumbleImmuneS: number;
  cruiseSpeedMult: number;
  /** Added to scout camp index when picking scout (clamped to campsLit). */
  scoutCampBonus: number;
  crownPayoutMult: number;
}

export const BASE_FLIGHT_MODIFIERS: FlightModifiers = {
  lives: CIRCUIT_LIVES,
  goldOddsMult: 1,
  goldCrownsMult: 1,
  cruiseSink: ASCENT_GLIDE.cruiseSink,
  cruiseGlide: ASCENT_GLIDE.cruiseGlide,
  diveSink: ASCENT_GLIDE.diveSink,
  diveGlide: ASCENT_GLIDE.diveGlide,
  stumbleVy: ASCENT_STUMBLE.vy,
  stumbleLockS: ASCENT_STUMBLE.lockS,
  stumbleImmuneS: ASCENT_STUMBLE.immuneS,
  cruiseSpeedMult: 1,
  scoutCampBonus: 0,
  crownPayoutMult: 1,
};

export function innateTraitId(type: CreatureType): WingTraitId {
  return INNATE_BY_TYPE[type] ?? "soft_glide";
}

const HEIR_WING_KEY = "zingers_heir_wing";

/** Pending retirement heirloom wing (session) — set by `lib/legacy` on claim. */
export function heirloomWingBonus(): WingTraitId | null {
  if (typeof window === "undefined") return null;
  try {
    const v = sessionStorage.getItem(HEIR_WING_KEY);
    if (v && v in WING_TRAITS) return v as WingTraitId;
  } catch {}
  return null;
}

export function setHeirloomWingBonus(id: WingTraitId | null): void {
  if (typeof window === "undefined") return;
  try {
    if (id) sessionStorage.setItem(HEIR_WING_KEY, id);
    else sessionStorage.removeItem(HEIR_WING_KEY);
  } catch {}
}

/** Earned traits available beyond the innate (max one equipped in v1). */
export function earnedTraitsAvailable(input: WingInput): WingTraitId[] {
  const { champ, strat, campsLit } = input;
  const type = ROSTER[input.key]?.type;
  const innate = type ? innateTraitId(type) : null;
  const out: WingTraitId[] = [];

  const push = (id: WingTraitId) => {
    if (id !== innate && !out.includes(id)) out.push(id);
  };

  const heir = heirloomWingBonus();
  if (heir) push(heir);

  // Resilience sigil II+ or ADEPT-ish level → Second Wind (if not innate)
  if (sigilLevel(champ.resilience) >= 2 || levelFor(champ.xp).level >= 5) push("second_wind");
  // Flair / creativity → Gold Eye
  if (sigilLevel(champ.flair) >= 2 || sigilLevel(champ.creativity) >= 2) push("gold_eye");
  // Control / focus temperament → Soft Glide
  if (sigilLevel(champ.control) >= 2 || (strat?.focus ?? 0) >= 65) push("soft_glide");
  // Resilience I+ → Thick Feathers (always earnable; COMPOSURE innate is Second Wind)
  if (sigilLevel(champ.resilience) >= 1 || champ.wins >= 3) push("thick_feathers");
  // Camps lit → Camp Sense
  if (campsLit >= 1) push("camp_sense");
  // Aggression / risk → Tailwind
  if (sigilLevel(champ.aggression) >= 2 || (strat?.risk ?? 0) >= 65) push("tailwind");

  return out;
}

export function resolveLoadout(
  input: WingInput,
  /** Preferred earned trait id, or null for auto. */
  earnedPick: WingTraitId | null = null,
): WingTraitId[] {
  const type = ROSTER[input.key]?.type;
  if (!type) return [];
  const innate = innateTraitId(type);
  const earned = earnedTraitsAvailable(input);
  const heir = heirloomWingBonus();
  const pick =
    earnedPick && earned.includes(earnedPick)
      ? earnedPick
      : heir && earned.includes(heir)
        ? heir
        : earned[0] ?? null;
  return pick ? [innate, pick] : [innate];
}

function applyTrait(mods: FlightModifiers, id: WingTraitId): void {
  switch (id) {
    case "second_wind":
      mods.lives = Math.max(mods.lives, CIRCUIT_LIVES + 1);
      break;
    case "gold_eye":
      mods.goldOddsMult *= 2;
      mods.goldCrownsMult *= 1.25;
      break;
    case "thick_feathers":
      mods.stumbleVy = -4; // baseline shove is -6; softer hit
      mods.stumbleImmuneS = Math.max(mods.stumbleImmuneS, 2.2);
      break;
    case "soft_glide":
      mods.cruiseSink = -1.8; // gentler than -2.8
      mods.cruiseGlide = Math.max(mods.cruiseGlide, 8.5);
      break;
    case "camp_sense":
      mods.scoutCampBonus = Math.max(mods.scoutCampBonus, 1);
      break;
    case "tailwind":
      mods.cruiseSpeedMult *= 1.12;
      break;
  }
}

export function resolveFlightModifiers(loadout: WingTraitId[]): FlightModifiers {
  const mods: FlightModifiers = { ...BASE_FLIGHT_MODIFIERS };
  for (const id of loadout) applyTrait(mods, id);
  return mods;
}

export function wingInputFrom(
  key: string,
  champ: Champion,
  strat: Strat | null | undefined,
  campsLit: number,
): WingInput {
  return { key, champ, strat, campsLit };
}

export function traitLabel(id: WingTraitId): string {
  return WING_TRAITS[id]?.name ?? id;
}

export function traitGloss(id: WingTraitId): string {
  return WING_TRAITS[id]?.gloss ?? "";
}

/** Short ready-strip line: "Second Wind · Gold Eye". */
export function loadoutLine(loadout: WingTraitId[]): string {
  return loadout.map(traitLabel).join(" · ");
}
