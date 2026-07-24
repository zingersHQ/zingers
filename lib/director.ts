// ─────────────────────────────────────────────────────────────────────────────
// The Director — "what should I do now?" (docs/long-game.md §6, Stage 0–4).
//
// Zingers ships far more content than a player ever perceives: camps, chests,
// imprints, the daily, the board. None of it announces itself, so the game reads
// as finished the moment the first fight ends. The Director indexes what already
// exists and names ONE next thing, plus at most two smaller ones — never a menu.
//
// Stage 1: the Unlock Ladder is the spine — when the sky or a named door is
// closed, the Director points at the rank that opens it.
// Stage 4: cold/spent form rotates the stable; retire-eligible and rival Face
// surface as smaller asks.
//
// Pure and framework-free so both bodies (mobile Climb, desktop Circuit) and any
// future surface read the same answer. State comes in; copy goes out.
// ─────────────────────────────────────────────────────────────────────────────
import { CLIMB_SECTOR_COUNT, REACH_SIZE } from "@/components/grounds/climb/difficulty";
import { reachThemeByIndex } from "@/components/grounds/climb/reaches";
import { firstLightChestCrowns, HUNDRED_CHEST_CROWNS, type ClimbProgress } from "@/lib/climb-campaign";
import {
  evaluateLadder,
  unlockNeedLine,
  type UnlockDef,
  type UnlockKind,
} from "@/lib/unlock-ladder";
import { dailyFlightCondition, type RunCondition } from "@/lib/conditions";
import type { FormBand } from "@/lib/career-friction";
import { thisWeekExpedition } from "@/lib/expeditions";

/** Where a directive sends the Trainer. Each body maps these to its own nav. */
export type DirectiveTarget = "flight" | "champion" | "daily" | "claim" | "hub" | "collection";

export interface DirectiveProgress {
  at: number;
  of: number;
  unit: string;
}

export interface Directive {
  id: string;
  /** Small label above the line, e.g. NEXT / TODAY. */
  kicker: string;
  /** The one line. Imperative or a named destination — never a question. */
  title: string;
  /** One supporting line: the number, the reward, the reason. */
  detail: string;
  cta: string;
  target: DirectiveTarget;
  progress?: DirectiveProgress;
}

export interface DirectorPlan {
  primary: Directive;
  /** At most two smaller asks. The point is a queue, not a buffet. */
  also: Directive[];
}

/** Everything the Director reads. Assembled by `useDirective` from the store. */
export interface DirectorSnapshot {
  owned: string | null;
  championName: string | null;
  /** Fraction into the active champion's current level, 0..1. */
  levelPct: number;
  climb: ClimbProgress;
  /** Has today's shared fight already been called? */
  dailyDone: boolean;
  dailyStreak: number;
  /** At least one of today's lessons is still unteached. */
  imprintReady: boolean;
  /** Account XP — feeds the Unlock Ladder. */
  trainerXp: number;
  /** Owned champion ranked wins (Reach II prove). */
  wins: number;
  /** Roster size including owned. */
  rosterCount: number;
  firstDuelDone: boolean;
  /** Stage 4 career form (steady when unknown / guest). */
  form?: FormBand;
  /** 0 fresh · 1 tired · 2 spent */
  fatigue?: 0 | 1 | 2;
  /** Eligible to seal into the House + leave an heirloom. */
  canRetire?: boolean;
  /** Rival name when a Face ask is worth surfacing. */
  rivalName?: string | null;
  /** True when the feud is fresh, behind, or a new chapter. */
  rivalDue?: boolean;
  /** Stage 5 — weekly Expedition unlocked (camp or depth). */
  expeditionOpen?: boolean;
}

/** Mirrors the UTC-date puzzle number in `lib/server/daily.ts` (client-safe). */
const DAILY_EPOCH_UTC = Date.UTC(2024, 0, 1);
export function dailyNumber(now = new Date()): number {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(1, Math.floor((today - DAILY_EPOCH_UTC) / 86_400_000) + 1);
}

/** Sector that lights camp `n` (camp n = first sector of Reach n). */
function campSector(n: number): number {
  return Math.max(1, (n - 1) * REACH_SIZE + 1);
}

const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);

function targetForUnlock(kind: UnlockKind): DirectiveTarget {
  if (kind === "recruit") return "collection";
  if (kind === "region" || kind === "mode") return "hub";
  return "flight";
}

function ctaForUnlock(kind: UnlockKind): string {
  if (kind === "recruit") return "Open collection";
  if (kind === "region" || kind === "mode") return "Go to the Hub";
  if (kind === "scout") return "Fly";
  return "Earn rank";
}

// ── the primary rules, highest urgency first ─────────────────────────────────

function claimDirective(): Directive {
  return {
    id: "claim",
    kicker: "NEXT",
    title: "Keep the mind that flew with you",
    detail: "Claim a champion and your runs start counting — XP, Crowns, and a place on the board.",
    cta: "Choose your champion",
    target: "claim",
  };
}

function firstFlightDirective(): Directive {
  return {
    id: "first-flight",
    kicker: "NEXT",
    title: "Take your first flight",
    detail: "Hold to rise, release to fall, thread the rings. How high you get is the score.",
    cta: "Fly",
    target: "flight",
  };
}

function evolveDirective(name: string): Directive {
  return {
    id: "evolve",
    kicker: "NEXT",
    title: `${name} is one win from the next level`,
    detail: "Take a fight or train once to cross it — the body changes with the record.",
    cta: "Open your champion",
    target: "champion",
  };
}

function rotateDirective(name: string, form: FormBand, fatigue: 0 | 1 | 2): Directive {
  const spent = fatigue >= 2;
  const broken = form === "broken";
  return {
    id: "rotate",
    kicker: "NEXT",
    title: spent || broken ? `Rest ${name} — field another mind` : `${name} is cold — rotate the stable`,
    detail: spent
      ? "Spent wings: Flight lives and cruise sink. Switch champions or seal them in the Long Vault."
      : broken
        ? "A losing streak is dragging Flight. A fresher mind flies cleaner."
        : "Cold form slows the climb. Train lightly, or let another champion take the sky.",
    cta: "Open collection",
    target: "collection",
  };
}

function unlockDirective(u: UnlockDef, level: number): Directive {
  const ready = level >= u.minLevel;
  return {
    id: `unlock-${u.id}`,
    kicker: ready ? "UNLOCKED" : "NEXT",
    title: ready ? `Open ${u.name}` : `Unlock ${u.name}`,
    detail: unlockNeedLine(u, level),
    cta: ready ? ctaForUnlock(u.kind) : "Fly · fight · teach",
    target: ready ? targetForUnlock(u.kind) : "flight",
    progress: ready
      ? undefined
      : { at: Math.max(0, level), of: u.minLevel, unit: "rank" },
  };
}

function campDirective(climb: ClimbProgress, maxReaches: number): Directive {
  const camp = Math.min(climb.campsLit + 1, maxReaches);
  const target = campSector(camp);
  const from = campSector(camp - 1);
  const need = Math.max(1, target - climb.bestSectors);
  const theme = reachThemeByIndex(Math.max(0, camp - 1));
  return {
    id: `camp-${camp}`,
    kicker: "NEXT",
    title: `Reach ${theme.roman} — ${theme.name}`,
    detail: `${need} ${plural(need, "sector")} higher lights Camp ${camp}: a one-time ${firstLightChestCrowns(camp)} Crown chest.`,
    cta: "Fly",
    target: "flight",
    progress: { at: Math.max(0, climb.bestSectors - from), of: Math.max(1, target - from), unit: "sectors" },
  };
}

function hundredDirective(climb: ClimbProgress): Directive {
  const need = Math.max(1, CLIMB_SECTOR_COUNT - climb.bestSectors);
  return {
    id: "hundred",
    kicker: "NEXT",
    title: "Finish the Hundred",
    detail: `${need} ${plural(need, "sector")} from the top of the sky · ${HUNDRED_CHEST_CROWNS} Crown purse, once.`,
    cta: "Fly",
    target: "flight",
    progress: { at: climb.bestSectors, of: CLIMB_SECTOR_COUNT, unit: "sectors" },
  };
}

function recordDirective(): Directive {
  return {
    id: "record",
    kicker: "NEXT",
    title: "Beat your own record",
    detail: "Every sector is behind you. The board ranks depth first, then time — so now go faster.",
    cta: "Fly",
    target: "flight",
  };
}

// ── the smaller asks ─────────────────────────────────────────────────────────

function dailyDirective(streak: number): Directive {
  return {
    id: "daily",
    kicker: "TODAY",
    title: "Today's fight",
    detail: streak > 0 ? `Call the winner · ${streak}-day streak on the line` : "Two minds argue. Call the winner.",
    cta: "Call it",
    target: "daily",
  };
}

function imprintDirective(name: string): Directive {
  return {
    id: "imprint",
    kicker: "TODAY",
    title: `Teach ${name} something`,
    detail: "A fresh lesson is waiting. What it learns changes how it fights — and how you fly.",
    cta: "Teach",
    target: "champion",
  };
}

function skyDirective(c: RunCondition): Directive {
  return {
    id: `sky-${c.id}`,
    kicker: "TODAY",
    title: `Sky: ${c.name}`,
    detail: c.gloss,
    cta: "Fly",
    target: "flight",
  };
}

function retireDirective(name: string): Directive {
  return {
    id: "retire",
    kicker: "LEGACY",
    title: `Seal ${name} in the Long Vault`,
    detail: "Retirement leaves an heirloom wing for the next mind you claim — and a legend on the House ladder.",
    cta: "Open your champion",
    target: "champion",
  };
}

function rivalDirective(name: string): Directive {
  return {
    id: "rival",
    kicker: "FEUD",
    title: `Face ${name}`,
    detail: "A Rival Trainer is waiting in the Concord. Head-to-head that escalates with every chapter.",
    cta: "Go to the Hub",
    target: "hub",
  };
}

function expeditionDirective(): Directive {
  const exp = thisWeekExpedition();
  return {
    id: `expedition-${exp.weekId}`,
    kicker: "WEEK",
    title: `Expedition: ${exp.name}`,
    detail: exp.gloss,
    cta: "Fly",
    target: "flight",
  };
}

/**
 * The whole point: one next thing, always true, derived from state the game
 * already keeps. Never returns null — a Trainer with nothing left still gets
 * "beat your own record".
 */
export function nextObjective(s: DirectorSnapshot): DirectorPlan {
  const { climb } = s;
  const name = s.championName ?? "your champion";
  const form = s.form ?? "steady";
  const fatigue = s.fatigue ?? 0;
  const ladder = evaluateLadder({
    trainerXp: s.trainerXp,
    wins: s.wins,
    bestSectors: climb.bestSectors,
    campsLit: climb.campsLit,
    rosterCount: s.rosterCount,
    firstDuelDone: s.firstDuelDone,
  });

  const atRankCeiling =
    !!ladder.next &&
    ladder.next.kind === "reach_block" &&
    climb.bestSectors >= ladder.lockSector &&
    ladder.maxReaches < 10;

  const nextUnlock = ladder.next;
  const unlockReady =
    !!nextUnlock &&
    ladder.level >= nextUnlock.minLevel - 1 &&
    !(nextUnlock.kind === "region" && !s.firstDuelDone);

  const needsRotate =
    s.owned &&
    s.rosterCount >= 2 &&
    (fatigue >= 2 || form === "broken" || (form === "cold" && fatigue >= 1));

  let primary: Directive;
  if (!s.owned) primary = claimDirective();
  else if (climb.bestSectors <= 0) primary = firstFlightDirective();
  else if (needsRotate) primary = rotateDirective(name, form, fatigue);
  else if (s.levelPct >= 0.85) primary = evolveDirective(name);
  else if (atRankCeiling && nextUnlock) primary = unlockDirective(nextUnlock, ladder.level);
  else if (climb.hundred) primary = recordDirective();
  else if (ladder.maxReaches >= 10 && climb.campsLit >= 10) primary = hundredDirective(climb);
  else if (
    unlockReady &&
    nextUnlock &&
    nextUnlock.kind !== "reach_block" &&
    // Don't yank them off an active camp push inside open sky.
    (ladder.level >= nextUnlock.minLevel || climb.bestSectors >= ladder.lockSector - REACH_SIZE)
  ) {
    primary = unlockDirective(nextUnlock, ladder.level);
  } else if (climb.campsLit >= ladder.maxReaches && ladder.maxReaches < 10 && nextUnlock) {
    // Filled every open camp — point at the rank that widens the sky.
    primary = unlockDirective(nextUnlock, ladder.level);
  } else {
    primary = campDirective(climb, ladder.maxReaches);
  }

  const also: Directive[] = [];
  if (!s.dailyDone) also.push(dailyDirective(s.dailyStreak));
  if (s.owned && s.imprintReady && primary.id !== "evolve" && primary.id !== "rotate") {
    also.push(imprintDirective(name));
  }
  // Surface the next named door as a smaller ask when primary is a camp push.
  if (
    nextUnlock &&
    !primary.id.startsWith("unlock-") &&
    also.length < 2 &&
    (nextUnlock.kind === "reach_block" || ladder.level >= nextUnlock.minLevel - 1)
  ) {
    also.push(unlockDirective(nextUnlock, ladder.level));
  }
  // Today's ranked Flight weather — one more reason the sky feels different.
  const sky = dailyFlightCondition();
  if (s.owned && sky.id !== "clear" && also.length < 2 && !primary.id.startsWith("sky-")) {
    also.push(skyDirective(sky));
  }
  // Weekly Expedition — shared seeded route + board (Stage 5).
  if (s.owned && s.expeditionOpen && also.length < 2 && !primary.id.startsWith("expedition-")) {
    also.push(expeditionDirective());
  }
  if (s.canRetire && also.length < 2 && primary.id !== "retire") {
    also.push(retireDirective(name));
  }
  if (s.rivalDue && s.rivalName && also.length < 2 && primary.id !== "rival") {
    also.push(rivalDirective(s.rivalName));
  }
  // Solo roster that's spent/broken — still nudge rotate as also when primary stayed flight.
  if (
    s.owned &&
    !needsRotate &&
    (fatigue >= 2 || form === "broken") &&
    also.length < 2 &&
    primary.id !== "rotate"
  ) {
    also.push(rotateDirective(name, form, fatigue));
  }

  return { primary, also: also.slice(0, 2) };
}
