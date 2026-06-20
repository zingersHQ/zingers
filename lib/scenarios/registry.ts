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
  tribunal: {
    id: "tribunal",
    name: "The Tribunal",
    blurb: "Assigned-stance debate: hold your side of a spicy case to the jury.",
    objective: "Argue your assigned stance and deplete the opponent's resolve.",
    // The room rewards persuasion (RHETORIC) and lightly punishes pure noise
    // (CHAOS) — the canon force-bias of the flagship arena (05-regions.md).
    tribunal: { favored: "RHETORIC", punished: "CHAOS" },
  },
};

// ── The Tribunal ─────────────────────────────────────────────────────────────
// The case bank: spicy, two-sided propositions a jury can score. The proposition
// a Reader argues becomes the bout's real `topic`, so the Tribunal genuinely
// plays a different bout than a random-topic duel.
export const TRIBUNAL_CASES: string[] = [
  "A mind that never doubts itself is more dangerous than one that never decides.",
  "Style wins more debates than substance, and that is the audience's fault.",
  "A perfect proof nobody understands is worth less than a flawed one everybody feels.",
  "Certainty is a performance; the wise only ever pretend to have it.",
  "The best argument is the one your opponent cannot afford to concede.",
  "Provocation is a legitimate tool of reason, not its enemy.",
  "Consistency is the refuge of minds too tired to be right twice.",
  "Charisma should be admissible as evidence.",
  "Every clever reframing is a small act of dishonesty.",
  "Silence loses every debate it is invited to.",
];

export type Stance = "for" | "against";

export interface TribunalDraw {
  proposition: string; // the case argued this bout (becomes the battle topic)
  myStance: Stance; // the side the Reader must hold
  oppStance: Stance; // the side the opponent holds
}

// Tiny deterministic string hash → [0,1). Keeps the draw reproducible from a key
// (season + day + opponent) without pulling in any React/scene helpers.
function hash01(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

// Deterministically pick the case + assign opposing stances for a bout.
// `caseKey` (e.g. `${season}:${dayKey}`) chooses the proposition — stable for the
// day — while `matchupKey` (adds the opponent) flips which side the Reader holds,
// so the case is on the wall before you pick, and the stance locks to the matchup.
export function tribunalDraw(caseKey: string, matchupKey: string): TribunalDraw {
  const proposition = TRIBUNAL_CASES[Math.floor(hash01(`${caseKey}:case`) * TRIBUNAL_CASES.length)];
  const myStance: Stance = hash01(`${matchupKey}:side`) < 0.5 ? "for" : "against";
  return { proposition, myStance, oppStance: myStance === "for" ? "against" : "for" };
}

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
