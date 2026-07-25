// ─────────────────────────────────────────────────────────────────────────────
// The Unlock Ladder — Stage 1 of docs/long-game.md.
//
// One Trainer track that every activity already feeds (trainerXp). Each rank
// opens something BY NAME. Creates no new content — it rations what ships so the
// first 15 hours feel like a reveal instead of a buffet.
//
// Pure and framework-free. Director, Flight ceilings, world gates, and recruit
// all read the same answers.
// ─────────────────────────────────────────────────────────────────────────────
import { REACH_SIZE, CLIMB_SECTOR_COUNT } from "@/components/grounds/climb/difficulty";
import { trainerLevel } from "@/lib/evolve/trainer";
import { reachThemeByIndex } from "@/components/grounds/climb/reaches";

/** Named doors the ladder can open. */
export type UnlockId =
  | "reaches_iii_iv"
  | "scout"
  | "broker"
  | "region_colosseum"
  | "gauntlet"
  | "recruit_2"
  | "reaches_v_vi"
  | "recruit_3"
  | "reaches_vii_viii"
  | "reaches_ix_x";

export type UnlockKind = "reach_block" | "scout" | "mode" | "region" | "recruit";

export interface UnlockDef {
  id: UnlockId;
  /** Trainer rank that opens this door. */
  minLevel: number;
  kind: UnlockKind;
  /** Short player-facing name (no undefined jargon without gloss nearby). */
  name: string;
  /** One-line gloss / reason — Director detail copy. */
  gloss: string;
  /** For reach_block: how many Reaches (1..10) are open once this lands. */
  maxReaches?: number;
  /** World id gated by a region unlock (components/grounds/worlds.ts). */
  worldId?: string;
  /** Max champions in roster (owned counts as one). */
  recruitSlots?: number;
}

/**
 * Ordered reveal. Reach II stays on the existing prove-fight gate (wins ≥ 1),
 * not this table — see `maxReachesOpen`.
 */
export const UNLOCK_LADDER: readonly UnlockDef[] = [
  {
    id: "reaches_iii_iv",
    minLevel: 3,
    kind: "reach_block",
    name: "Reaches III–IV",
    gloss: "Garden Drift and Ember Thermals. The mid sky opens.",
    maxReaches: 4,
  },
  {
    id: "scout",
    minLevel: 3,
    kind: "scout",
    name: "Scout flights",
    gloss: "Practice from a lit camp. Half XP, quiet Crowns.",
  },
  {
    id: "broker",
    minLevel: 4,
    kind: "mode",
    name: "the Broker",
    gloss: "Trade Crowns for Fragments at the Hub exchange.",
  },
  {
    // Always travelable (Act 1 guide). Kept on the ladder so the Director can
    // name the Tribunal once the Trainer has a champion and a first duel.
    id: "region_colosseum",
    minLevel: 1,
    kind: "region",
    name: "the Colosseum",
    gloss: "The Tribunal. Argue the side you're given.",
    worldId: "grounds",
  },
  {
    id: "gauntlet",
    minLevel: 5,
    kind: "region",
    name: "the Gauntlet",
    gloss: "The Ember Wastes. Keep winning to grow the prize.",
    worldId: "gauntlet",
  },
  {
    id: "recruit_2",
    minLevel: 6,
    kind: "recruit",
    name: "a second champion",
    gloss: "Recruit another mind into your roster.",
    recruitSlots: 2,
  },
  {
    id: "reaches_v_vi",
    minLevel: 7,
    kind: "reach_block",
    name: "Reaches V–VI",
    gloss: "The Amphitheatre and Concord Dawn. Thin bright air.",
    maxReaches: 6,
  },
  {
    id: "recruit_3",
    minLevel: 8,
    kind: "recruit",
    name: "a third champion slot",
    gloss: "Room for one more mind in the stable.",
    recruitSlots: 3,
  },
  {
    id: "reaches_vii_viii",
    minLevel: 10,
    kind: "reach_block",
    name: "Reaches VII–VIII",
    gloss: "High Colosseum and Garden Zenith. The hard climb.",
    maxReaches: 8,
  },
  {
    id: "reaches_ix_x",
    minLevel: 13,
    kind: "reach_block",
    name: "Reaches IX–X",
    gloss: "Ember Corona and the Hum. The top of the sky.",
    maxReaches: 10,
  },
] as const;

/** Always-open region for Act 1 (first fight world). */
export const STARTER_REGION_WORLD = "void";

/** Worlds that are never ladder-gated. */
const OPEN_WORLDS = new Set(["concord", STARTER_REGION_WORLD]);

export interface LadderSnapshot {
  trainerXp: number;
  /** Owned champion's ranked wins — feeds the Reach II prove gate. */
  wins: number;
  /** Ranked depth already earned (grandfathers open sky for existing saves). */
  bestSectors: number;
  /** Camps lit — scout also needs at least one. */
  campsLit: number;
  /** Champions in roster including owned. */
  rosterCount: number;
  firstDuelDone: boolean;
}

export interface LadderState {
  level: number;
  title: string;
  /** How many Reaches (1..10) ranked Flight may enter. */
  maxReaches: number;
  /** First sector index that is locked (0..100). Equal to CLIMB_SECTOR_COUNT when fully open. */
  lockSector: number;
  scout: boolean;
  broker: boolean;
  /** Max roster size (owned + recruits). */
  recruitSlots: number;
  /** World ids the Trainer may travel to. */
  openWorlds: ReadonlySet<string>;
  /** First locked door on the ladder, if any. */
  next: UnlockDef | null;
  /** All doors already open. */
  unlocked: UnlockId[];
}

function reachBlocksOpen(level: number): number {
  // Reach I always; Reach II is prove-gated separately.
  let max = 1;
  for (const u of UNLOCK_LADDER) {
    if (u.kind === "reach_block" && u.maxReaches && level >= u.minLevel) {
      max = Math.max(max, u.maxReaches);
    }
  }
  return max;
}

/**
 * Ranked sky the Trainer may enter. Reach II needs a win (existing altitude
 * key). Higher blocks need Trainer rank. Depth already flown is grandfathered
 * so a ladder deploy never soft-locks a save mid-sky.
 */
export function maxReachesOpen(level: number, wins: number, bestSectors: number): number {
  // Reach I always. Reach II+ needs the prove fight (wins ≥ 1). Rank blocks
  // only extend the sky *after* that door — never skip the altitude key.
  let max = 1;
  if ((wins ?? 0) >= 1) {
    max = 2;
    max = Math.max(max, reachBlocksOpen(level));
  }
  // Grandfather earned depth (ceil sectors → reaches, cap 10).
  const earned = Math.min(10, Math.max(0, Math.ceil(Math.max(0, bestSectors) / REACH_SIZE)));
  if (earned > 0) max = Math.max(max, earned);
  return Math.min(10, max);
}

export function lockSectorFor(maxReaches: number): number {
  if (maxReaches >= 10) return CLIMB_SECTOR_COUNT;
  return maxReaches * REACH_SIZE;
}

export function recruitSlotsOpen(level: number): number {
  let slots = 1;
  for (const u of UNLOCK_LADDER) {
    if (u.kind === "recruit" && u.recruitSlots && level >= u.minLevel) {
      slots = Math.max(slots, u.recruitSlots);
    }
  }
  return slots;
}

export function isWorldOpen(worldId: string, level: number, firstDuelDone: boolean): boolean {
  if (OPEN_WORLDS.has(worldId)) return true;
  // Colosseum stays open for Act 1 guide + Tribunal home (void is the starter
  // fight world; this is the second region, not a late-rank drip).
  if (worldId === "grounds") return true;
  if (worldId === "gauntlet") {
    const u = UNLOCK_LADDER.find((x) => x.id === "gauntlet")!;
    return level >= u.minLevel && firstDuelDone;
  }
  // Unknown ids: fail open so future worlds aren't bricked.
  return true;
}

export function isScoutOpen(level: number, campsLit: number): boolean {
  const u = UNLOCK_LADDER.find((x) => x.id === "scout")!;
  return level >= u.minLevel && campsLit >= 1;
}

export function isBrokerOpen(level: number): boolean {
  const u = UNLOCK_LADDER.find((x) => x.id === "broker")!;
  return level >= u.minLevel;
}

export function evaluateLadder(s: LadderSnapshot): LadderState {
  const tl = trainerLevel(s.trainerXp);
  const level = tl.level;
  const maxReaches = maxReachesOpen(level, s.wins, s.bestSectors);
  const unlocked: UnlockId[] = [];

  for (const u of UNLOCK_LADDER) {
    if (level < u.minLevel) continue;
    if (u.kind === "scout" && s.campsLit < 1) continue;
    if (u.id === "gauntlet" && !s.firstDuelDone) continue;
    if (u.id === "region_colosseum" && !s.firstDuelDone) continue;
    if (u.kind === "reach_block" && (u.maxReaches ?? 0) > maxReaches) continue;
    unlocked.push(u.id);
  }

  // Reach blocks unlocked by grandfathered depth even below minLevel.
  for (const u of UNLOCK_LADDER) {
    if (u.kind === "reach_block" && u.maxReaches && maxReaches >= u.maxReaches && !unlocked.includes(u.id)) {
      unlocked.push(u.id);
    }
  }

  let next: UnlockDef | null = null;
  for (const u of UNLOCK_LADDER) {
    if (unlocked.includes(u.id)) continue;
    // Scout waits on a camp even when rank is ready — still the "next" door.
    if (u.kind === "region" && !s.firstDuelDone) continue;
    next = u;
    break;
  }

  const openWorlds = new Set<string>([...OPEN_WORLDS]);
  for (const id of ["grounds", "gauntlet"] as const) {
    if (isWorldOpen(id, level, s.firstDuelDone)) openWorlds.add(id);
  }

  return {
    level,
    title: tl.title,
    maxReaches,
    lockSector: lockSectorFor(maxReaches),
    scout: isScoutOpen(level, s.campsLit),
    broker: isBrokerOpen(level),
    recruitSlots: recruitSlotsOpen(level),
    openWorlds,
    next,
    unlocked,
  };
}

/** Copy helpers for Flight rank-lock UI and the Director. */
export function unlockNeedLine(u: UnlockDef, level: number): string {
  if (level >= u.minLevel) {
    if (u.kind === "scout") return "Light a camp on a ranked flight with me, then Scout opens.";
    if (u.kind === "region") return "Finish our first duel, then this gate opens.";
    return u.gloss;
  }
  const need = u.minLevel - level;
  return `Trainer rank ${u.minLevel}. ${need} ${need === 1 ? "rank" : "ranks"} to go. ${u.gloss}`;
}

export function reachLockCopy(maxReaches: number, next: UnlockDef | null): {
  kicker: string;
  title: string;
  detail: string;
} {
  const theme = reachThemeByIndex(Math.min(9, maxReaches));
  if (next?.kind === "reach_block") {
    return {
      kicker: "YOUR CHAMPION",
      title: `Stay with me. Trainer rank ${next.minLevel} opens ${next.name}.`,
      detail: `${theme.name} is as high as this rank goes. ${next.gloss}`,
    };
  }
  return {
    kicker: "YOUR CHAMPION",
    title: "Higher sky needs a higher rank. Stay with me.",
    detail: `${theme.name} is the top of our open sky. Keep flying, fighting, and teaching to climb Trainer rank.`,
  };
}

/** Sector index (0-based) where the next Reach begins after `maxReaches` open. */
export function nextReachStartSector(maxReaches: number): number {
  return lockSectorFor(maxReaches);
}

/**
 * Ranked Flight only: true when `nextSector` (the sector you're about to enter)
 * sits at or past the Trainer-rank ceiling — and it is NOT the Reach II prove
 * door (that stays on `needsAltitudeProve`).
 */
export function hitsRankLock(
  nextSector: number,
  level: number,
  wins: number,
  bestSectors: number,
): boolean {
  if ((wins ?? 0) < 1) return false; // prove gate owns the Reach II door
  const lock = lockSectorFor(maxReachesOpen(level, wins, bestSectors));
  return nextSector >= lock && lock < CLIMB_SECTOR_COUNT;
}
