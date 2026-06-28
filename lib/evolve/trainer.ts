// ── Reader Rank ──────────────────────────────────────────────────────────────
// The account-level identity number — the thing a player says out loud ("I'm a
// level 12 Reader, sworn to the Lattice"). Distinct from per-champion XP: this
// accrues from EVERYTHING (bouts, training, caches, daily, Keepers) so all
// activity feeds one legible spine. Pure functions, kept free of React/store.
//
// The Reader is canon (lib/lore/canon.ts › READER); Forces and their mottos are
// canon too (› FORCES / FORCE_MOTTO). This module owns only the rank *curve* and
// the XP table — it must never re-name a Force.
import type { CreatureType } from "@/lib/types";
import { FORCES as FORCE_LORE, FORCE_MOTTO, WHEEL } from "@/lib/lore/canon";

export interface TrainerLevel {
  level: number;
  title: string;
  into: number; // xp earned into the current level
  span: number; // xp needed to clear the current level
}

const TITLES: { min: number; title: string }[] = [
  { min: 1, title: "Novice Reader" },
  { min: 5, title: "Apprentice" },
  { min: 10, title: "Adept" },
  { min: 15, title: "Tactician" },
  { min: 20, title: "Vaultseeker" },
  { min: 30, title: "Archon" },
  { min: 45, title: "Vaultbreaker" },
];

export function trainerTitle(level: number): string {
  let t = TITLES[0].title;
  for (const band of TITLES) if (level >= band.min) t = band.title;
  return t;
}

// A gentler curve than champion XP — a trainer levels across the whole game, so
// each level costs a touch more than the last and the early levels come quick.
export function trainerLevel(xp: number): TrainerLevel {
  let lvl = 1;
  let need = 300;
  let acc = 0;
  while (xp >= acc + need) {
    acc += need;
    lvl++;
    need = Math.round(need * 1.22);
  }
  return { level: lvl, title: trainerTitle(lvl), into: xp - acc, span: need };
}

// Canonical XP awards per activity — one source of truth for accrual.
export const TRAINER_XP = {
  boutWin: 50,
  boutLoss: 12, // you still learn from a loss
  train: 15,
  cacheCrown: 10,
  cacheFragment: 20,
  dailyCorrect: 30,
  keeperCracked: 120,
} as const;

// ── Allegiance (the Forces you swear to) ─────────────────────────────────────
// The type Wheel, surfaced as the houses a Reader pledges to for the seasonal
// war. Names and mottos come straight from canon — the `house` is the Force's
// in-world name (The Lattice, The Static, …), never a new invention.
export interface ForceMeta {
  id: CreatureType;
  name: string; // the Force's plain, player-facing name (Logic/Static/Calm/Chorus/Spark)
  motto: string; // its argument, said as a vow (canon)
}

export const FORCES: ForceMeta[] = WHEEL.map((id) => ({
  id,
  name: FORCE_LORE[id].name,
  motto: FORCE_MOTTO[id],
}));

export function forceMeta(id: CreatureType): ForceMeta {
  return FORCES.find((f) => f.id === id) ?? FORCES[0];
}
