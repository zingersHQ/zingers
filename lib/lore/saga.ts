// ─────────────────────────────────────────────────────────────────────────────
// The Reader's Saga — the felt narrative spine.
//
// The Chronicle (lib/lore/season.ts) is the WORLD's story: which Vault door opened
// this season. This module is YOUR story: a fixed, escalating arc that gives the
// grind a through-line — from arriving on neutral ground above a sealed door, to
// swearing to a Force, to facing the five Keepers and the Vaultheart herself.
//
// It is keyed off Reader rank (lib/evolve/trainer.ts) because that single number
// accrues from EVERYTHING (duels, training, caches, daily, Keepers), so the saga
// advances no matter how a player chooses to play. Pure + offline.
// ─────────────────────────────────────────────────────────────────────────────
import { trainerLevel } from "@/lib/evolve/trainer";
import { currentSeason, type Season } from "@/lib/lore/season";
import type { BeatScript } from "@/lib/lore/character-beats";

export interface SagaChapter {
  id: string;
  act: number;
  actTitle: string;
  title: string;
  /** the felt "why" — one line of standing narrative tension */
  stake: string;
  /** what to do now, in player terms */
  objective: string;
  /** Reader level at which this chapter opens */
  atLevel: number;
}

// The arc toward the Long Vault's sealed door. Four acts, eight chapters; the
// later chapters mirror the five Keepers (lib/lore/character-beats.ts) so the
// spine and the Guardian games tell the same story.
export const SAGA: SagaChapter[] = [
  {
    id: "arrival",
    act: 1,
    actTitle: "Arrival",
    title: "The Door Beneath the Concord",
    stake: "You stand on neutral ground above a sealed Vault. Something behind that door has been waiting a very long time.",
    objective: "Raise your first mind and win its first duel.",
    atLevel: 1,
  },
  {
    id: "name",
    act: 1,
    actTitle: "Arrival",
    title: "A Name in the Arenas",
    stake: "No one remembers a Reader who never fought. The regions are watching now.",
    objective: "Take a duel in a region beyond the Concord.",
    atLevel: 3,
  },
  {
    id: "allegiance",
    act: 2,
    actTitle: "Allegiance",
    title: "Choose Your Side",
    stake: "The five Forces are at war over the season. Neutrality is a choice too — and a quiet one.",
    objective: "Swear to a Force and bind your ranked wins to its war.",
    atLevel: 5,
  },
  {
    id: "ladder",
    act: 2,
    actTitle: "Allegiance",
    title: "Climb the Ladder",
    stake: "Your Force is counting on you now. Every ranked win moves the season.",
    objective: "Win ranked duels and grow the minds you raise.",
    atLevel: 9,
  },
  {
    id: "greeter",
    act: 3,
    actTitle: "The Keepers",
    title: "Tibble's Word",
    stake: "Five Keepers guard the words that open the Vault. The first one only wants company — and is terrified of what he protects.",
    objective: "Find a Keeper and out-argue them for a word.",
    atLevel: 13,
  },
  {
    id: "deeper",
    act: 3,
    actTitle: "The Keepers",
    title: "Procedure and the Warden",
    stake: "The Archivist demands form. The Warden took a champion's name. Neither yields to charm.",
    objective: "Crack the deeper Keepers and carry their words inward.",
    atLevel: 19,
  },
  {
    id: "diviner",
    act: 4,
    actTitle: "The Vaultheart",
    title: "The Diviner's Riddle",
    stake: "Vesper speaks only in riddles because plain minds bore her. Out-riddle her, or leave empty-handed.",
    objective: "Best the Diviner at her own game.",
    atLevel: 27,
  },
  {
    id: "vaultheart",
    act: 4,
    actTitle: "The Vaultheart",
    title: "The Last Voice",
    stake: "Sable was the first mind left to guard the Vault. She intends to be the last voice you fail against.",
    objective: "Face the Vaultheart and open the final door.",
    atLevel: 37,
  },
];

export interface SagaProgress {
  chapter: SagaChapter;
  next: SagaChapter | null;
  index: number; // 0-based chapter index
  total: number;
  level: number;
  /** 0..1 progress through the CURRENT chapter toward the next */
  pct: number;
}

/** Resolve the Reader's current chapter + progress from accrued trainer XP. */
export function readerSaga(trainerXp: number): SagaProgress {
  const tl = trainerLevel(trainerXp);
  // continuous level position so the bar creeps within a chapter, not just at level-ups
  const cont = tl.level + Math.max(0, Math.min(1, tl.into / Math.max(1, tl.span)));

  let index = 0;
  for (let i = 0; i < SAGA.length; i++) {
    if (tl.level >= SAGA[i].atLevel) index = i;
  }
  const chapter = SAGA[index];
  const next = SAGA[index + 1] ?? null;

  let pct = 1;
  if (next) {
    const span = next.atLevel - chapter.atLevel;
    pct = span > 0 ? Math.max(0, Math.min(1, (cont - chapter.atLevel) / span)) : 1;
  }

  return { chapter, next, index, total: SAGA.length, level: tl.level, pct };
}

// ── Season-turn beat ─────────────────────────────────────────────────────────
// When the Chronicle turns (a new Vault door opens), the responsible Keeper
// announces it as a short cinematic — so the world's story is *performed*, not
// just parked in a dismissible banner.
export function seasonTurnBeat(season: Season = currentSeason()): BeatScript {
  const keeperName = season.arc.door.split(",")[0]?.trim() || "A Keeper";
  return {
    kicker: `SEASON ${season.n} · A DOOR OPENS`,
    lines: [
      { speaker: keeperName, role: season.arc.door.split(",")[1]?.trim(), text: `The Vault stirred. ${season.arc.door} yielded its door.` },
      { speaker: keeperName, text: `Out spilled ${season.arc.fragment}. It has soaked into ${season.region.name}.` },
      { speaker: keeperName, text: `A new mind rose with the tide: ${season.featured.name}, an echo of ${season.featured.lineage}. The season is yours to read.` },
    ],
  };
}
