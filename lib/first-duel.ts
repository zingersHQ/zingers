// First-duel onboarding — localStorage gate + starter roster helpers.
import type { Champion, CreatureType, RosterEntry, Strat } from "@/lib/types";
import { STORAGE } from "@/lib/brand";
import { WHEEL, wheelNeighbors } from "@/lib/lore/canon";
import { blank } from "@/lib/evolve/progression";
import { ROSTER } from "@/lib/engine/roster";
import { FIGHT } from "@/lib/player-copy";
import {
  BAKED_FIRST_DUEL_HOOKS,
  BAKED_ORIGIN_AXIS,
  BAKED_STARTERS_BY_FORCE,
} from "@/lib/minds/baked";

export const FIRST_DUEL_TAGLINE = "Claim a mind. Jump to fly.";

/** Player-facing persona one-liner from roster (sentence-cased). */
export function personaLine(key: string): string {
  const p = ROSTER[key]?.persona?.trim();
  if (!p) return "";
  const capped = p.charAt(0).toUpperCase() + p.slice(1);
  return capped.endsWith(".") ? capped : `${capped}.`;
}

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
  ...BAKED_ORIGIN_AXIS,
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
  ...BAKED_FIRST_DUEL_HOOKS,
};

/** Champions eligible per Force — weekly rotation picks one per spoke. */
export const STARTERS_BY_FORCE: Record<CreatureType, readonly string[]> = {
  LOGIC: ["AXIOM", "PARADOX"],
  CHAOS: ["GLITCH", "EMBER"],
  COMPOSURE: ["BASTION", ...(BAKED_STARTERS_BY_FORCE.COMPOSURE ?? [])],
  RHETORIC: ["VOX", "WIT"],
  CREATIVITY: ["MUSE", ...(BAKED_STARTERS_BY_FORCE.CREATIVITY ?? [])],
};

/** Onboarding hero — visually loud, legend-tier silhouette. */
export const FIRST_DUEL_HERO_KEY = "GLITCH";

export const QUICK_START_STRAT: Strat = { risk: 55, focus: 50, aggression: 52 };

/** Copy beats for the post-win Concord landing (Act 1 coda). Trainer identity first. */
export function concordLanding(championName?: string) {
  const who = championName?.trim() || "your champion";
  return [
    {
      kicker: "YOU, THE TRAINER",
      title: "You raise. It fights.",
      body: `You're a Trainer now. ${who} flies beside you and fights for you. Fly higher, tune how it fights, and win battles to make it stronger.`,
    },
    {
      kicker: "THE HUB",
      title: "Fly through a gate to fight.",
      body: `This is the Hub — where you land. The glowing arches around you are gates. Fly through one to reach a place where ${who} battles. Win to earn Crowns, then spend them to grow it.`,
    },
  ] as const;
}

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

/**
 * Deterministic "wild mind" for guest Ascent / Climb — same loaner across a
 * device so attachment lands before adoption (mobile + desktop).
 */
export function guestLoanerKey(deviceToken = "guest"): string {
  const keys = firstDuelStarterKeys().filter((k) => ROSTER[k]);
  if (!keys.length) return "AXIOM";
  let h = 2166136261;
  for (let i = 0; i < deviceToken.length; i++) {
    h ^= deviceToken.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return keys[(h >>> 0) % keys.length]!;
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
