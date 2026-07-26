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
import enMessages from "@/messages/en.json";

/** next-intl translator scoped to the `director` namespace. */
export type DirectorT = (key: string, values?: Record<string, string | number>) => string;

const EN_DIR = enMessages.director as Record<string, string>;

function identityT(key: string, values?: Record<string, string | number>): string {
  // English fallback when called outside a React tree (tests / SSR without provider).
  let s = EN_DIR[key] ?? key;
  if (values) {
    for (const [k, v] of Object.entries(values)) {
      s = s.replaceAll(`{${k}}`, String(v));
    }
  }
  return s;
}

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

function speaker(name: string | null, t: DirectorT = identityT): string {
  return (name ?? t("yourChampion")).toUpperCase();
}

function targetForUnlock(kind: UnlockKind): DirectiveTarget {
  if (kind === "recruit") return "collection";
  if (kind === "region" || kind === "mode") return "hub";
  return "flight";
}

function ctaForUnlock(kind: UnlockKind, t: DirectorT): string {
  if (kind === "recruit") return t("ctaRecruit");
  if (kind === "region" || kind === "mode") return t("ctaHub");
  if (kind === "scout") return t("ctaScout");
  return t("ctaRank");
}

// ── primary asks (champion voice when owned) ─────────────────────────────────

function claimDirective(t: DirectorT): Directive {
  return {
    id: "claim",
    kicker: t("wildMind"),
    title: t("claimTitle"),
    detail: t("claimDetail"),
    cta: t("claimCta"),
    target: "claim",
    spoken: true,
  };
}

function firstFlightDirective(name: string | null, t: DirectorT): Directive {
  return {
    id: "first-flight",
    kicker: speaker(name, t),
    title: t("firstFlightTitle"),
    detail: t("firstFlightDetail"),
    cta: t("flyCta"),
    target: "flight",
    spoken: true,
  };
}

function evolveDirective(name: string, t: DirectorT): Directive {
  return {
    id: "evolve",
    kicker: speaker(name, t),
    title: t("evolveTitle"),
    detail: t("evolveDetail"),
    cta: t("evolveCta"),
    target: "champion",
    spoken: true,
  };
}

function rotateDirective(name: string, form: FormBand, fatigue: 0 | 1 | 2, t: DirectorT): Directive {
  const spent = fatigue >= 2;
  const broken = form === "broken";
  return {
    id: "rotate",
    kicker: speaker(name, t),
    title: spent || broken ? t("rotateSpentTitle") : t("rotateColdTitle"),
    detail: spent
      ? t("rotateSpentDetail")
      : broken
        ? t("rotateBrokenDetail")
        : t("rotateColdDetail"),
    cta: t("collectionCta"),
    target: "collection",
    spoken: true,
  };
}

function unlockDirective(u: UnlockDef, level: number, name: string | null, t: DirectorT): Directive {
  const ready = level >= u.minLevel;
  const who = speaker(name, t);
  if (ready) {
    return {
      id: `unlock-${u.id}`,
      kicker: who,
      title: t("unlockReadyTitle", { name: u.name }),
      detail: unlockNeedLine(u, level),
      cta: ctaForUnlock(u.kind, t),
      target: targetForUnlock(u.kind),
      spoken: true,
    };
  }
  return {
    id: `unlock-${u.id}`,
    kicker: who,
    title: t("unlockWantTitle", { name: u.name }),
    detail: unlockNeedLine(u, level),
    cta: t("unlockFlyCta"),
    target: "flight",
    spoken: true,
    progress: { at: Math.max(0, level), of: u.minLevel, unit: "rank" },
  };
}

function campDirective(climb: ClimbProgress, maxReaches: number, name: string | null, t: DirectorT): Directive {
  const camp = Math.min(climb.campsLit + 1, maxReaches);
  const target = campSector(camp);
  const from = campSector(camp - 1);
  const need = Math.max(1, target - climb.bestSectors);
  const theme = reachThemeByIndex(Math.max(0, camp - 1));
  const crowns = firstLightChestCrowns(camp);
  const stretch = need === 1 ? t("stretch") : t("stretches");
  return {
    id: `camp-${camp}`,
    kicker: speaker(name, t),
    title: t("campTitle", { need, stretch }),
    detail: t("campDetail", { camp, theme: theme.name, crowns }),
    cta: t("flyCta"),
    target: "flight",
    spoken: true,
    progress: { at: Math.max(0, climb.bestSectors - from), of: Math.max(1, target - from), unit: "sectors" },
  };
}

function hundredDirective(climb: ClimbProgress, name: string | null, t: DirectorT): Directive {
  const need = Math.max(1, CLIMB_SECTOR_COUNT - climb.bestSectors);
  const sector = need === 1 ? t("sector") : t("sectors");
  return {
    id: "hundred",
    kicker: speaker(name, t),
    title: t("hundredTitle"),
    detail: t("hundredDetail", { need, sector, crowns: HUNDRED_CHEST_CROWNS }),
    cta: t("flyCta"),
    target: "flight",
    spoken: true,
    progress: { at: climb.bestSectors, of: CLIMB_SECTOR_COUNT, unit: "sectors" },
  };
}

function recordDirective(name: string | null, expeditionOpen: boolean | undefined, t: DirectorT): Directive {
  return {
    id: "record",
    kicker: speaker(name, t),
    title: t("recordTitle"),
    detail: expeditionOpen ? t("recordDetailExpedition") : t("recordDetail"),
    cta: t("flyCta"),
    target: "flight",
    spoken: true,
  };
}

// ── smaller asks ─────────────────────────────────────────────────────────────

function dailyDirective(streak: number, name: string | null, t: DirectorT): Directive {
  return {
    id: "daily",
    kicker: speaker(name, t),
    title: streak > 0 ? t("dailyStreakTitle", { streak }) : t("dailyTitle"),
    detail: t("dailyDetail"),
    cta: t("dailyCta"),
    target: "daily",
    spoken: true,
  };
}

function imprintDirective(name: string, t: DirectorT): Directive {
  return {
    id: "imprint",
    kicker: speaker(name, t),
    title: t("imprintTitle"),
    detail: t("imprintDetail"),
    cta: t("imprintCta"),
    target: "train",
    spoken: true,
  };
}

function skyDirective(c: RunCondition, name: string | null, t: DirectorT): Directive {
  return {
    id: `sky-${c.id}`,
    kicker: speaker(name, t),
    title: t("skyTitle", { name: c.name }),
    detail: c.gloss.replace(/\s*—\s*/g, ". ").replace(/\.\./g, "."),
    cta: t("flyCta"),
    target: "flight",
    spoken: true,
  };
}

function retireDirective(name: string, t: DirectorT): Directive {
  return {
    id: "retire",
    kicker: speaker(name, t),
    title: t("retireTitle"),
    detail: t("retireDetail"),
    cta: t("retireCta"),
    target: "champion",
    spoken: true,
  };
}

function rivalDirective(rivalName: string, name: string | null, t: DirectorT): Directive {
  return {
    id: "rival",
    kicker: speaker(name, t),
    title: t("rivalTitle", { rival: rivalName }),
    detail: t("rivalDetail"),
    cta: t("ctaHub"),
    target: "hub",
    spoken: true,
  };
}

function expeditionDirective(name: string | null, t: DirectorT): Directive {
  const exp = thisWeekExpedition();
  return {
    id: `expedition-${exp.weekId}`,
    kicker: speaker(name, t),
    title: t("skyTitle", { name: exp.name }),
    detail: exp.gloss.replace(/\s*—\s*/g, ". ").replace(/\s*·\s*/g, ". "),
    cta: t("flyCta"),
    target: "flight",
    spoken: true,
  };
}

/**
 * One next thing, always true. Never returns null. When a champion is owned,
 * they speak. Guests hear a wild mind inviting claim.
 */
export function nextObjective(s: DirectorSnapshot, t: DirectorT = identityT): DirectorPlan {
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
  if (!s.owned) primary = claimDirective(t);
  else if (climb.bestSectors <= 0) primary = firstFlightDirective(name, t);
  else if (needsRotate) primary = rotateDirective(name!, form, fatigue, t);
  else if (s.levelPct >= 0.85) primary = evolveDirective(name!, t);
  else if (atRankCeiling && nextUnlock) primary = unlockDirective(nextUnlock, ladder.level, name, t);
  else if (climb.hundred) primary = recordDirective(name, s.expeditionOpen, t);
  else if (ladder.maxReaches >= 10 && climb.campsLit >= 10) primary = hundredDirective(climb, name, t);
  else if (
    unlockReady &&
    nextUnlock &&
    nextUnlock.kind !== "reach_block" &&
    (ladder.level >= nextUnlock.minLevel || climb.bestSectors >= ladder.lockSector - REACH_SIZE)
  ) {
    primary = unlockDirective(nextUnlock, ladder.level, name, t);
  } else if (climb.campsLit >= ladder.maxReaches && ladder.maxReaches < 10 && nextUnlock) {
    primary = unlockDirective(nextUnlock, ladder.level, name, t);
  } else {
    primary = campDirective(climb, ladder.maxReaches, name, t);
  }

  const also: Directive[] = [];
  if (!s.dailyDone && s.owned) also.push(dailyDirective(s.dailyStreak, name, t));
  else if (!s.dailyDone) {
    also.push({
      id: "daily",
      kicker: "TODAY",
      title: t("dailyTitle"),
      detail: t("dailyDetail"),
      cta: t("dailyCta"),
      target: "daily",
      spoken: false,
    });
  }
  if (s.owned && s.imprintReady && primary.id !== "evolve" && primary.id !== "rotate") {
    also.push(imprintDirective(name!, t));
  }
  if (
    nextUnlock &&
    !primary.id.startsWith("unlock-") &&
    also.length < 2 &&
    (nextUnlock.kind === "reach_block" || ladder.level >= nextUnlock.minLevel - 1)
  ) {
    also.push(unlockDirective(nextUnlock, ladder.level, name, t));
  }
  const sky = dailyFlightCondition();
  if (s.owned && sky.id !== "clear" && also.length < 2 && !primary.id.startsWith("sky-")) {
    also.push(skyDirective(sky, name, t));
  }
  if (s.owned && s.expeditionOpen && also.length < 2 && !primary.id.startsWith("expedition-")) {
    also.push(expeditionDirective(name, t));
  }
  if (s.canRetire && s.owned && also.length < 2 && primary.id !== "retire") {
    also.push(retireDirective(name!, t));
  }
  if (s.rivalDue && s.rivalName && also.length < 2 && primary.id !== "rival") {
    also.push(rivalDirective(s.rivalName, name, t));
  }
  if (
    s.owned &&
    !needsRotate &&
    (fatigue >= 2 || form === "broken") &&
    also.length < 2 &&
    primary.id !== "rotate"
  ) {
    also.push(rotateDirective(name!, form, fatigue, t));
  }

  return { primary, also: also.slice(0, 2) };
}
