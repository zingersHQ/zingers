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
    stake: "No one remembers a Trainer who never fought. The regions are watching now.",
    objective: "Take a duel in a region beyond the Concord.",
    atLevel: 3,
  },
  {
    id: "allegiance",
    act: 2,
    actTitle: "Allegiance",
    title: "Choose Your Side",
    stake: "The five Forces are at war over the season. Neutrality is a choice too, and a quiet one.",
    objective: "Swear to a Force and bind your ranked wins to its war.",
    atLevel: 5,
  },
  {
    id: "ladder",
    act: 2,
    actTitle: "Allegiance",
    title: "Climb the Ranks",
    stake: "Your Force is counting on you now. Every ranked win moves the season.",
    objective: "Win ranked duels and grow the minds you raise.",
    atLevel: 9,
  },
  {
    id: "greeter",
    act: 3,
    actTitle: "The Ascent",
    title: "Higher Sky",
    stake: "Reach II and beyond ask for a proven mind. Your climbs and short proves write the legend.",
    objective: "Clear Reach II on the Climb and leave a mark on the board.",
    atLevel: 13,
  },
  {
    id: "deeper",
    act: 3,
    actTitle: "The Ascent",
    title: "Rival Ghosts",
    stake: "Other Trainers leave paths in the sky. Beat a challenge depth — prove your hands, not just your board rank.",
    objective: "Share a Climb challenge and beat someone else's depth.",
    atLevel: 19,
  },
  {
    id: "diviner",
    act: 4,
    actTitle: "Legend Body",
    title: "Scars of the Climb",
    stake: "Your champion's body records every Reach and every prove. Make it unrecognizable from the rookie you claimed.",
    objective: "Earn ascent sigils across multiple Reaches.",
    atLevel: 27,
  },
  {
    id: "vaultheart",
    act: 4,
    actTitle: "Legend Body",
    title: "Full Clear",
    stake: "The hundred-sector Ascent ends above the Long Vault. Few finish. The body that gets there is the argument.",
    objective: "Clear all 100 sectors of the Climb.",
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
// When the Chronicle turns, a short cinematic performs the season (not a
// dismissible banner only). No Keepers — they are not part of the live game.
export function seasonTurnBeat(season: Season = currentSeason()): BeatScript {
  return {
    kicker: `SEASON ${season.n} · A DOOR OPENS`,
    lines: [
      { speaker: "Chronicle", text: `The Vault stirred. ${season.arc.door} remembered how to open.` },
      { speaker: "Chronicle", text: `Out spilled ${season.arc.fragment}. It has soaked into ${season.region.name}.` },
      { speaker: "Chronicle", text: `The season's echo: ${season.featured.name}, of ${season.featured.lineage}'s line. Read it in the fights ahead.` },
    ],
  };
}
