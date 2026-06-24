// First-duel onboarding — localStorage gate + starter roster helpers.
import type { RosterEntry } from "@/lib/types";
import { STORAGE } from "@/lib/brand";
import { wheelNeighbors } from "@/lib/lore/canon";

export const FIRST_DUEL_TAGLINE = "Train a champion. Watch it fight.";

/** Short player-facing hook per onboarding pick (not the roster key). */
export const FIRST_DUEL_HOOKS: Record<string, string> = {
  AXIOM: "Cold proofs. Closes every argument.",
  GLITCH: "Chaos lines. Breaks every frame.",
  BASTION: "Patient guard. Outlasts the rush.",
};

/** Three maximally distinct champions (not all eight). */
export const FIRST_DUEL_STARTERS = ["AXIOM", "GLITCH", "BASTION"] as const;

/** Pitch-screen hero — visually loud, legend-tier silhouette. */
export const FIRST_DUEL_HERO_KEY = "GLITCH";

export const QUICK_START_STRAT = { risk: 55, focus: 50, aggression: 52 };

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

export function firstDuelStarters(roster: RosterEntry[]): RosterEntry[] {
  const set = new Set<string>(FIRST_DUEL_STARTERS);
  return roster.filter((r) => set.has(r.key));
}

/** Pick an opponent whose Force loses to the player's on the wheel. */
export function firstDuelOpponent(playerKey: string, roster: RosterEntry[]): string {
  const player = roster.find((r) => r.key === playerKey);
  if (!player) return "VOX";
  const preyType = wheelNeighbors(player.type).prey;
  const prey = roster.find((r) => r.type === preyType && r.key !== playerKey);
  return prey?.key ?? "VOX";
}
