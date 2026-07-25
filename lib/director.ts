// ─────────────────────────────────────────────────────────────────────────────
// The Director — "what should we do now?" (docs/long-game.md §6).
//
// Brain: pure function over save state. One primary ask + ≤2 smaller ones.
// Mouth: the champion speaks. Kickers are their name, never a quest sign (NEXT).
// Copy rules: docs/vocabulary.md — first person we/us, warm and direct, no em dash.
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
export type DirectiveTarget =
  | "flight"
  | "champion"
  | "train"
  | "daily"
  | "claim"
  | "hub"
  | "collection";

export interface DirectiveProgress {
  at: number;
  of: number;
  unit: string;
}

export interface Directive {
  id: string;
  /** Speaker label: champion name, or a soft invite when none yet. */
  kicker: string;
  /** What they say. Warm, direct, first person when a champion is owned. */
  title: string;
  /** One supporting beat. Numbers and rewards live here when needed. */
  detail: string;
  cta: string;
  target: DirectiveTarget;
  progress?: DirectiveProgress;
  /** True when the line is in the champion's voice (quote UI). */
  spoken?: boolean;
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
  /** Weekly Expedition unlocked (camp or depth). */
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

function speaker(name: string | null): string {
  return (name ?? "Your champion").toUpperCase();
}

function targetForUnlock(kind: UnlockKind): DirectiveTarget {
  if (kind === "recruit") return "collection";
  if (kind === "region" || kind === "mode") return "hub";
  return "flight";
}

function ctaForUnlock(kind: UnlockKind): string {
  if (kind === "recruit") return "Open collection";
  if (kind === "region" || kind === "mode") return "Go to the Hub";
  if (kind === "scout") return "Fly with me";
  return "Let's earn rank";
}

// ── primary asks (champion voice when owned) ─────────────────────────────────

function claimDirective(): Directive {
  return {
    id: "claim",
    kicker: "A WILD MIND",
    title: "Don't leave me in the sky.",
    detail: "Claim me and our runs start counting. XP, Crowns, a place on the board.",
    cta: "Choose your champion",
    target: "claim",
    spoken: true,
  };
}

function firstFlightDirective(name: string | null): Directive {
  return {
    id: "first-flight",
    kicker: speaker(name),
    title: "Come on. First flight. Just us and the rings.",
    detail: "Hold to rise, release to fall. How high we get is the score.",
    cta: "Fly with me",
    target: "flight",
    spoken: true,
  };
}

function evolveDirective(name: string): Directive {
  return {
    id: "evolve",
    kicker: speaker(name),
    title: "I'm almost there. One more win and I change.",
    detail: "A fight or a train. The body grows with the record.",
    cta: "Open your champion",
    target: "champion",
    spoken: true,
  };
}

function rotateDirective(name: string, form: FormBand, fatigue: 0 | 1 | 2): Directive {
  const spent = fatigue >= 2;
  const broken = form === "broken";
  return {
    id: "rotate",
    kicker: speaker(name),
    title: spent || broken
      ? "I'm spent. Field someone fresh. I'll still be here."
      : "I'm cold today. Let another mind take the sky for a bit.",
    detail: spent
      ? "Tired wings mean fewer lives and a heavier fall. Rest me, or seal me when you're ready."
      : broken
        ? "The losses are in my bones. A fresher mind flies cleaner right now."
        : "Cold form slows the climb. A light train, or a swap, and we come back stronger.",
    cta: "Open collection",
    target: "collection",
    spoken: true,
  };
}

function unlockDirective(u: UnlockDef, level: number, name: string | null): Directive {
  const ready = level >= u.minLevel;
  const who = speaker(name);
  if (ready) {
    return {
      id: `unlock-${u.id}`,
      kicker: who,
      title: `Hey. ${u.name} is open. Let's go see it.`,
      detail: unlockNeedLine(u, level),
      cta: ctaForUnlock(u.kind),
      target: targetForUnlock(u.kind),
      spoken: true,
    };
  }
  return {
    id: `unlock-${u.id}`,
    kicker: who,
    title: `I want ${u.name}. We unlock it together.`,
    detail: unlockNeedLine(u, level),
    cta: "Fly · fight · teach",
    target: "flight",
    spoken: true,
    progress: { at: Math.max(0, level), of: u.minLevel, unit: "rank" },
  };
}

function campDirective(climb: ClimbProgress, maxReaches: number, name: string | null): Directive {
  const camp = Math.min(climb.campsLit + 1, maxReaches);
  const target = campSector(camp);
  const from = campSector(camp - 1);
  const need = Math.max(1, target - climb.bestSectors);
  const theme = reachThemeByIndex(Math.max(0, camp - 1));
  const crowns = firstLightChestCrowns(camp);
  return {
    id: `camp-${camp}`,
    kicker: speaker(name),
    title: `Stay with me. ${need} more ${plural(need, "stretch")} of sky and we light the next camp.`,
    detail: `That's Camp ${camp}, into ${theme.name}. First time there, a ${crowns} Crown chest is waiting.`,
    cta: "Fly with me",
    target: "flight",
    spoken: true,
    progress: { at: Math.max(0, climb.bestSectors - from), of: Math.max(1, target - from), unit: "sectors" },
  };
}

function hundredDirective(climb: ClimbProgress, name: string | null): Directive {
  const need = Math.max(1, CLIMB_SECTOR_COUNT - climb.bestSectors);
  return {
    id: "hundred",
    kicker: speaker(name),
    title: "The top of the sky. Stay with me all the way.",
    detail: `${need} ${plural(need, "sector")} left. Finish once and there's a ${HUNDRED_CHEST_CROWNS} Crown purse for us.`,
    cta: "Fly with me",
    target: "flight",
    spoken: true,
    progress: { at: climb.bestSectors, of: CLIMB_SECTOR_COUNT, unit: "sectors" },
  };
}

function recordDirective(name: string | null, expeditionOpen?: boolean): Directive {
  const weekly = expeditionOpen
    ? "This week's expedition is a new sky. Or share a challenge and race a friend."
    : "Share a challenge and race a friend. When the week turns, a new sky opens.";
  return {
    id: "record",
    kicker: speaker(name),
    title: "We've stood at the top. Now we fly cleaner.",
    detail: `The Hundred is a summit, not a finish line. Chase a cleaner run. ${weekly}`,
    cta: "Fly with me",
    target: "flight",
    spoken: true,
  };
}

// ── smaller asks ─────────────────────────────────────────────────────────────

function dailyDirective(streak: number, name: string | null): Directive {
  return {
    id: "daily",
    kicker: speaker(name),
    title: streak > 0
      ? `Today's fight is up. Our ${streak}-day streak is on the line.`
      : "Today's fight is up. Call the winner with me.",
    detail: "Same fight for every Trainer. One call.",
    cta: "Call it",
    target: "daily",
    spoken: true,
  };
}

function imprintDirective(name: string): Directive {
  return {
    id: "imprint",
    kicker: speaker(name),
    title: "Teach me something before we climb.",
    detail: "A fresh lesson is waiting. What I learn changes how I fight, and how we fly.",
    cta: "Teach me",
    // Train overlay (desktop) / Champion tab lessons (mobile). Not the career page.
    target: "train",
    spoken: true,
  };
}

function skyDirective(c: RunCondition, name: string | null): Directive {
  return {
    id: `sky-${c.id}`,
    kicker: speaker(name),
    title: `Feel that? Today's sky is ${c.name}.`,
    detail: c.gloss.replace(/\s*—\s*/g, ". ").replace(/\.\./g, "."),
    cta: "Fly with me",
    target: "flight",
    spoken: true,
  };
}

function retireDirective(name: string): Directive {
  return {
    id: "retire",
    kicker: speaker(name),
    title: "If you're ready, seal me in the Long Vault.",
    detail: "I'll leave an heirloom wing for the next mind you claim, and a legend on the House standings.",
    cta: "Open your champion",
    target: "champion",
    spoken: true,
  };
}

function rivalDirective(rivalName: string, name: string | null): Directive {
  return {
    id: "rival",
    kicker: speaker(name),
    title: `${rivalName} is waiting. Face them with me.`,
    detail: "A Rival Trainer in the Hub. Head to head, chapter after chapter.",
    cta: "Go to the Hub",
    target: "hub",
    spoken: true,
  };
}

function expeditionDirective(name: string | null): Directive {
  const exp = thisWeekExpedition();
  return {
    id: `expedition-${exp.weekId}`,
    kicker: speaker(name),
    title: `This week's route is ${exp.name}. Fly it with me.`,
    detail: exp.gloss.replace(/\s*—\s*/g, ". ").replace(/\s*·\s*/g, ". "),
    cta: "Fly with me",
    target: "flight",
    spoken: true,
  };
}

/**
 * One next thing, always true. Never returns null. When a champion is owned,
 * they speak. Guests hear a wild mind inviting claim.
 */
export function nextObjective(s: DirectorSnapshot): DirectorPlan {
  const { climb } = s;
  const name = s.championName;
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
  else if (climb.bestSectors <= 0) primary = firstFlightDirective(name);
  else if (needsRotate) primary = rotateDirective(name!, form, fatigue);
  else if (s.levelPct >= 0.85) primary = evolveDirective(name!);
  else if (atRankCeiling && nextUnlock) primary = unlockDirective(nextUnlock, ladder.level, name);
  else if (climb.hundred) primary = recordDirective(name, s.expeditionOpen);
  else if (ladder.maxReaches >= 10 && climb.campsLit >= 10) primary = hundredDirective(climb, name);
  else if (
    unlockReady &&
    nextUnlock &&
    nextUnlock.kind !== "reach_block" &&
    (ladder.level >= nextUnlock.minLevel || climb.bestSectors >= ladder.lockSector - REACH_SIZE)
  ) {
    primary = unlockDirective(nextUnlock, ladder.level, name);
  } else if (climb.campsLit >= ladder.maxReaches && ladder.maxReaches < 10 && nextUnlock) {
    primary = unlockDirective(nextUnlock, ladder.level, name);
  } else {
    primary = campDirective(climb, ladder.maxReaches, name);
  }

  const also: Directive[] = [];
  if (!s.dailyDone && s.owned) also.push(dailyDirective(s.dailyStreak, name));
  else if (!s.dailyDone) {
    also.push({
      id: "daily",
      kicker: "TODAY",
      title: "Today's fight is waiting.",
      detail: "Two minds argue. Call the winner.",
      cta: "Call it",
      target: "daily",
      spoken: false,
    });
  }
  if (s.owned && s.imprintReady && primary.id !== "evolve" && primary.id !== "rotate") {
    also.push(imprintDirective(name!));
  }
  if (
    nextUnlock &&
    !primary.id.startsWith("unlock-") &&
    also.length < 2 &&
    (nextUnlock.kind === "reach_block" || ladder.level >= nextUnlock.minLevel - 1)
  ) {
    also.push(unlockDirective(nextUnlock, ladder.level, name));
  }
  const sky = dailyFlightCondition();
  if (s.owned && sky.id !== "clear" && also.length < 2 && !primary.id.startsWith("sky-")) {
    also.push(skyDirective(sky, name));
  }
  if (s.owned && s.expeditionOpen && also.length < 2 && !primary.id.startsWith("expedition-")) {
    also.push(expeditionDirective(name));
  }
  if (s.canRetire && s.owned && also.length < 2 && primary.id !== "retire") {
    also.push(retireDirective(name!));
  }
  if (s.rivalDue && s.rivalName && also.length < 2 && primary.id !== "rival") {
    also.push(rivalDirective(s.rivalName, name));
  }
  if (
    s.owned &&
    !needsRotate &&
    (fatigue >= 2 || form === "broken") &&
    also.length < 2 &&
    primary.id !== "rotate"
  ) {
    also.push(rotateDirective(name!, form, fatigue));
  }

  return { primary, also: also.slice(0, 2) };
}
