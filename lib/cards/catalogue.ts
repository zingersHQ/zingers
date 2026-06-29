// ─────────────────────────────────────────────────────────────────────────────
// The Catalogue — a worked demonstration that the generative stack is real.
//
// Nothing here is hand-painted. Each of the 20 agents is *grown* by replaying the
// actual battle-evolution model (`applyResult`) over a seeded, biased career, then
// read back through the same pure pipeline the live game uses:
//
//   blank() → applyResult() ×N  → cardOf()  → (force, tier, sigils, doctrine,
//                                              rarity, abilities, genome→body)
//
// So "different levels of evolution" are different *careers*, "different types"
// are real Forces off the roster, and "different clans" are real Force pledges.
// The only authored input is each agent's STARTING INTENT (which First Mind it
// echoes, what it fights for, and how hard) — everything visible is derived.
// ─────────────────────────────────────────────────────────────────────────────
import type { Champion, CreatureType, Style, StyleAxis } from "@/lib/types";
import { blank, blankStyle, applyResult } from "@/lib/evolve/progression";
import { cardOf, type Card } from "@/lib/cards/card";

export interface CatalogueAgent {
  /** unique identity → seeds the body/palette/phenotype so siblings diverge */
  id: string;
  /** the real card view, read off the simulated career */
  card: Card;
  /** the grown career record (drives the live 3D portrait) */
  champion: Champion;
  /** the Force this agent has pledged to for the season war (its Clan) */
  clan: CreatureType;
  /** the First Mind it descends from (its key) */
  lineage: string;
}

// mulberry32 — the same tiny PRNG the season engine uses, so careers reproduce
// identically on server and client (no hydration drift).
function rngFrom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Grow a career by replaying real bouts. Each turn nudges the chosen style axes
// (with jitter) and folds the result in through the live `applyResult` model, so
// XP, win/loss, the dominant axis, sigils and the body morph all emerge — never
// set by hand. `battles` controls how far it has evolved (ROOKIE → LEGEND).
function growCareer(
  seed: number,
  bias: Partial<Record<StyleAxis, number>>,
  battles: number,
  winRate: number,
): Champion {
  const c = blank();
  const r = rngFrom(seed);
  for (let i = 0; i < battles; i++) {
    const won = r() < winRate;
    const style: Style = blankStyle();
    for (const k of Object.keys(bias) as StyleAxis[]) {
      // jittered intensity so two careers with the same intent still diverge
      style[k] = (bias[k] ?? 0) * (0.55 + r() * 0.9);
    }
    applyResult(c, { won, style, margin: Math.round(r() * 40) });
  }
  return c;
}

// One authored "seed of intent" per agent. base = the First Mind it echoes (gives
// the real Force, moveset & stats); everything downstream is grown/derived.
interface AgentSeed {
  id: string;
  base: string; // roster key → Force, abilities, stats
  name?: string; // display override (descendants get their own names)
  clan: CreatureType; // pledged Force (its Clan) — may differ from its own Force
  bias: Partial<Record<StyleAxis, number>>; // how it has learned to fight
  battles: number; // how far it has evolved
  winRate: number;
}

// 20 agents spanning every axis of the system on purpose:
//   • all 5 Forces/types          (LOGIC, CHAOS, COMPOSURE, RHETORIC, CREATIVITY)
//   • all 5 evolution tiers        (ROOKIE → ADEPT → VETERAN → ELITE → LEGEND)
//   • all 5 clans                  (pledges, including cross-Force loyalties)
//   • all 5 dominant style axes    (→ distinct doctrines, sigils & phenotypes)
//   • the 8 First Minds + 12 grown descendants (named from canon lineage)
const SEEDS: AgentSeed[] = [
  // ── The eight First Minds, at a spread of tiers and pledges ────────────────
  { id: "axiom",   base: "AXIOM",   clan: "LOGIC",      bias: { control: 1.5, resilience: 0.5 },     battles: 40,  winRate: 0.62 }, // VETERAN
  { id: "vox",     base: "VOX",     clan: "RHETORIC",   bias: { flair: 1.7, control: 0.5 },           battles: 320, winRate: 0.7 },  // LEGEND
  { id: "glitch",  base: "GLITCH",  clan: "CHAOS",      bias: { aggression: 1.8 },                    battles: 3,   winRate: 0.45 }, // ROOKIE
  { id: "muse",    base: "MUSE",    clan: "CREATIVITY", bias: { creativity: 1.6, flair: 0.6 },        battles: 10,  winRate: 0.55 }, // ADEPT
  { id: "bastion", base: "BASTION", clan: "COMPOSURE",  bias: { resilience: 1.7, control: 0.5 },      battles: 90,  winRate: 0.66 }, // ELITE
  { id: "ember",   base: "EMBER",   clan: "RHETORIC",   bias: { aggression: 1.6, flair: 0.7 },        battles: 42,  winRate: 0.58 }, // VETERAN, cross-pledge
  { id: "paradox", base: "PARADOX", clan: "CREATIVITY", bias: { creativity: 1.5, control: 0.8 },      battles: 95,  winRate: 0.64 }, // ELITE, cross-pledge
  { id: "wit",     base: "WIT",     clan: "CHAOS",      bias: { flair: 1.6, aggression: 0.6 },        battles: 12,  winRate: 0.53 }, // ADEPT, cross-pledge

  // ── Twelve grown descendants, each echoing a First Mind (lineage = base) ───
  { id: "pale-theorem",  base: "AXIOM",   name: "Pale Theorem",  clan: "LOGIC",      bias: { control: 1.6 },                    battles: 320, winRate: 0.72 }, // LEGEND
  { id: "iron-verdict",  base: "VOX",     name: "Iron Verdict",  clan: "COMPOSURE",  bias: { control: 1.4, resilience: 0.7 },   battles: 44,  winRate: 0.6 },  // VETERAN, cross
  { id: "hollow-static", base: "GLITCH",  name: "Hollow Static", clan: "CHAOS",      bias: { aggression: 1.7, flair: 0.5 },     battles: 92,  winRate: 0.6 },  // ELITE
  { id: "bright-stanza", base: "MUSE",    name: "Bright Stanza", clan: "CREATIVITY", bias: { flair: 1.5, creativity: 0.8 },     battles: 41,  winRate: 0.57 }, // VETERAN
  { id: "low-cipher",    base: "PARADOX", name: "Low Cipher",    clan: "LOGIC",      bias: { creativity: 1.4, control: 0.6 },   battles: 11,  winRate: 0.52 }, // ADEPT
  { id: "far-chant",     base: "WIT",     name: "Far Chant",     clan: "RHETORIC",   bias: { flair: 1.8 },                      battles: 3,   winRate: 0.43 }, // ROOKIE
  { id: "cinder-ember",  base: "EMBER",   name: "Cinder Ember",  clan: "CHAOS",      bias: { aggression: 1.9 },                 battles: 320, winRate: 0.68 }, // LEGEND
  { id: "glass-locus",   base: "BASTION", name: "Glass Locus",   clan: "COMPOSURE",  bias: { resilience: 1.6, control: 0.6 },   battles: 93,  winRate: 0.65 }, // ELITE
  { id: "quiet-riddle",  base: "MUSE",    name: "Quiet Riddle",  clan: "CREATIVITY", bias: { creativity: 1.7 },                 battles: 3,   winRate: 0.4 },  // ROOKIE
  { id: "wry-echo",      base: "VOX",     name: "Wry Echo",      clan: "LOGIC",      bias: { control: 1.5, flair: 0.6 },        battles: 12,  winRate: 0.54 }, // ADEPT, cross
  { id: "glass-theorem", base: "AXIOM",   name: "Glass Theorem", clan: "CHAOS",      bias: { aggression: 1.4, control: 0.7 },   battles: 43,  winRate: 0.59 }, // VETERAN, cross
  { id: "pale-riddle",   base: "MUSE",    name: "Pale Riddle",   clan: "COMPOSURE",  bias: { creativity: 1.6, resilience: 0.7 }, battles: 320, winRate: 0.69 }, // LEGEND, cross
];

// Build one agent: grow its career, then read the real card view off it. We keep
// the base roster key for `cardOf` (so the Force, abilities and stats are the
// genuine ones) but stamp the card with this agent's unique id + display name so
// every portrait seeds a distinct body.
function buildAgent(seed: AgentSeed): CatalogueAgent {
  const champion = growCareer(hash(seed.id), seed.bias, seed.battles, seed.winRate);
  const base = cardOf(seed.base, champion, { name: seed.name, lineage: seed.base });
  const card: Card = { ...base, key: seed.id, name: seed.name ?? base.name };
  return { id: seed.id, card, champion, clan: seed.clan, lineage: seed.base };
}

let cache: CatalogueAgent[] | null = null;

/** The 20-agent catalogue, emulated from the real systems. Memoised (pure). */
export function catalogue(): CatalogueAgent[] {
  if (!cache) cache = SEEDS.map(buildAgent);
  return cache;
}
