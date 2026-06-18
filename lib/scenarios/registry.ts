// The scenario catalogue + pure helpers the client orchestrates from. Kept free
// of React / three so it stays testable and reusable across worlds.
import type { Champion } from "@/lib/types";
import { ratingOf } from "@/lib/evolve/elo";
import type { GauntletConfig, ScenarioDef, ScenarioId } from "./types";

export const SCENARIOS: Record<ScenarioId, ScenarioDef> = {
  duel: {
    id: "duel",
    name: "Open Duel",
    blurb: "1v1 debate: pick your opponent, place a bet, settle it.",
    objective: "Beat a single challenger of your choosing.",
  },
  gauntlet: {
    id: "gauntlet",
    name: "The Gauntlet",
    blurb: "A rising chain of fighters. Press your luck or cash out.",
    objective: "Win consecutive bouts against ever-stronger agents.",
    gauntlet: { maxRounds: 5, baseReward: 30, rewardGrowth: 1.6, clearBonus: 0.5, consolationFrac: 0.25 },
  },
};

// Crowns banked for clearing round N (1-indexed). Escalates so the deeper you
// press, the bigger the swing — and the more you stand to lose by falling.
export function roundReward(cfg: GauntletConfig, round: number): number {
  return Math.round(cfg.baseReward * Math.pow(cfg.rewardGrowth, round - 1));
}

// The opponents for a gauntlet run, weakest first so the chain ramps up. The
// final entry is the toughest agent on the board.
export function gauntletQueue(
  ownedKey: string,
  rosterKeys: string[],
  get: (k: string) => Champion,
  maxRounds: number,
): string[] {
  return rosterKeys
    .filter((k) => k !== ownedKey)
    .sort((a, b) => ratingOf(get(a)) - ratingOf(get(b)))
    .slice(0, maxRounds);
}
