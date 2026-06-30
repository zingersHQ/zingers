// First-duel onboarding — localStorage gate + starter roster helpers.
import type { Champion, CreatureType, RosterEntry, Strat } from "@/lib/types";
import { STORAGE } from "@/lib/brand";
import { WHEEL, wheelNeighbors } from "@/lib/lore/canon";
import { blank } from "@/lib/evolve/progression";
import { FIGHT } from "@/lib/player-copy";

export const FIRST_DUEL_TAGLINE = "Train a champion. Watch it fight.";

/** Faint signature axis at origin adoption — mirrors adoptStarterRookie in store/champions.ts */
const ORIGIN_AXIS: Partial<Record<string, keyof Champion>> = {
  AXIOM: "control",
  VOX: "flair",
  GLITCH: "aggression",
  BASTION: "resilience",
  MUSE: "creativity",
  EMBER: "aggression",
  PARADOX: "control",
  WIT: "flair",
};

/** Rookie body shown during character select — matches post-adoption career. */
export function previewRookieChampion(key: string): Champion {
  const c = blank();
  const axis = ORIGIN_AXIS[key];
  if (axis) (c[axis] as number) = 5;
  return c;
}

/** Region arena used for the guided first fight (proper ring, not the Concord seal). */
export const FIRST_FIGHT_WORLD = "void";

/** Short player-facing hook per onboarding pick (not the roster key). */
export const FIRST_DUEL_HOOKS: Record<string, string> = {
  AXIOM: "Cold proofs. Closes every argument.",
  PARADOX: "Socratic trap. Hunts contradictions.",
  GLITCH: "Chaos lines. Breaks every frame.",
  EMBER: "Hot provocation. All gas, no brake.",
  BASTION: "Patient guard. Outlasts the rush.",
  VOX: "Grand oratory. Plays to the crowd.",
  WIT: "Surgical timing. Needle and riposte.",
  MUSE: "Lateral leaps. Reframes the fight.",
};

/** Champions eligible per Force — weekly rotation picks one per spoke. */
export const STARTERS_BY_FORCE: Record<CreatureType, readonly string[]> = {
  LOGIC: ["AXIOM", "PARADOX"],
  CHAOS: ["GLITCH", "EMBER"],
  COMPOSURE: ["BASTION"],
  RHETORIC: ["VOX", "WIT"],
  CREATIVITY: ["MUSE"],
};

/** Onboarding hero — visually loud, legend-tier silhouette. */
export const FIRST_DUEL_HERO_KEY = "GLITCH";

export const QUICK_START_STRAT: Strat = { risk: 55, focus: 50, aggression: 52 };

/** Copy beats for the post-win Concord landing (Act 1 coda). Reader identity first. */
export const CONCORD_LANDING = [
  {
    kicker: "YOU, THE READER",
    title: "Roam, duel, raise.",
    body: `You're a Reader now — the will that raises minds and holds rank in the arenas. You walk the Grounds; your champion fights. Train doctrine anytime, step through a gate for a ${FIGHT.rankedDuel}, and climb a region's Tower when you're ready for the long game.`,
  },
  {
    kicker: "THE CONCORD",
    title: "Neutral ground above the Vault.",
    body: "You spawn on the approach. The golden seal is the Long Vault — sealed, for now. Every Force keeps an uneasy peace here.",
  },
  {
    kicker: "VAULTGATES",
    title: "Walk out to the regions.",
    body: "The arches ring the plaza. Each gate reaches a founding region — colosseum tribunals, ember gauntlets, void gardens. Your champion fights where you take it.",
  },
] as const;

export function isFirstDuelComplete(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(STORAGE.firstDuel) === "1";
  } catch {
    return true;
  }
}

export function markFirstDuelComplete(): void {
  try {
    localStorage.setItem(STORAGE.firstDuel, "1");
  } catch {}
}

/** One champion per Force for the current week (seasonal rotation). */
export function firstDuelStarterKeys(at = Date.now()): string[] {
  const week = Math.floor(at / (7 * 86_400_000));
  return WHEEL.map((type) => {
    const pool = STARTERS_BY_FORCE[type];
    return pool[week % pool.length]!;
  });
}

export function firstDuelStarters(roster: RosterEntry[]): RosterEntry[] {
  const byKey = Object.fromEntries(roster.map((r) => [r.key, r]));
  return firstDuelStarterKeys()
    .map((k) => byKey[k])
    .filter((r): r is RosterEntry => !!r);
}

/** Pick an opponent whose Force loses to the player's on the wheel. */
export function firstDuelOpponent(playerKey: string, roster: RosterEntry[]): string {
  const player = roster.find((r) => r.key === playerKey);
  if (!player) return "VOX";
  const preyType = wheelNeighbors(player.type).prey;
  const prey = roster.find((r) => r.type === preyType && r.key !== playerKey);
  return prey?.key ?? "VOX";
}
