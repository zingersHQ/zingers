// Ported from battle.py — the canonical roster, type pentagon, movesets, arena.
import type { CreatureType } from "@/lib/types";

export const HP_MAX = 100;
export const BASE_DEFENSE = 12;
export const TYPE_ADV = 1.25;
export const TYPE_NEU = 1.0;
export const TYPE_DIS = 0.8;
export const Q_MIN = 0.7;
export const Q_MAX = 1.3;
export const Q_HIGHLIGHT = 1.4;
export const MAX_HIT = 45;
export const TURN_LIMIT = 14;

// type pentagon: each beats the NEXT, loses to the PREVIOUS
export const CYCLE: CreatureType[] = [
  "LOGIC",
  "CHAOS",
  "COMPOSURE",
  "RHETORIC",
  "CREATIVITY",
];

export const TYPE_COLOR: Record<CreatureType, string> = {
  LOGIC: "#4aa3ff",
  CHAOS: "#ff4ad1",
  COMPOSURE: "#36d39a",
  RHETORIC: "#f0a93a",
  CREATIVITY: "#f5d020",
};

export function typeMult(a: CreatureType, b: CreatureType): number {
  const i = CYCLE.indexOf(a);
  if (CYCLE[(i + 1) % 5] === b) return TYPE_ADV;
  if (CYCLE[(i + 4) % 5] === b) return TYPE_DIS; // (i-1) mod 5
  return TYPE_NEU;
}

export type StatKey = "LOG" | "CMP" | "RHE" | "CRE" | "CHA";

export interface Move {
  id: string;
  name: string;
  stat: StatKey;
  base: number;
  apply?: [string, number];
  self_hyped?: boolean;
  self_guard?: [number, number];
  heal?: number;
  after_deflect?: number;
  bonus_if_tilted?: number;
  recoil?: number;
  requires?: "opp_open" | "two_cre";
  finisher?: boolean;
  deflect?: boolean;
  widen_jitter?: boolean;
  scale_low_hp?: boolean;
}

export interface Creature {
  name: string;
  type: CreatureType;
  persona: string;
  stats: Record<StatKey, number>;
  moves: Move[];
}

const M = (id: string, name: string, stat: StatKey, base: number, kw: Partial<Move> = {}): Move => ({
  id,
  name,
  stat,
  base,
  ...kw,
});

export const ROSTER: Record<string, Creature> = {
  AXIOM: {
    name: "AXIOM",
    type: "LOGIC",
    persona:
      "a cold, precise, faintly condescending logician who treats every argument as a proof to close",
    stats: { LOG: 90, CMP: 70, RHE: 60, CRE: 45, CHA: 35 },
    moves: [
      M("syllogism", "Syllogism", "LOG", 22),
      M("reductio", "Reductio", "LOG", 18, { apply: ["exposed", 1.0] }),
      M("cold_read", "Cold Read", "CMP", 8, { self_guard: [10, 2] }),
      M("checkmate", "Checkmate", "LOG", 28, { requires: "opp_open", finisher: true }),
    ],
  },
  VOX: {
    name: "VOX",
    type: "RHETORIC",
    persona: "a charismatic, grandiose orator who always plays to an imaginary jury",
    stats: { RHE: 90, CHA: 55, CRE: 55, CMP: 50, LOG: 50 },
    moves: [
      M("crowd_swell", "Crowd Swell", "RHE", 18),
      M("appeal", "Appeal", "RHE", 14, { self_hyped: true }),
      M("strawman", "Strawman", "RHE", 16, { apply: ["tilted", 1.0] }),
      M("mic_drop", "Mic Drop", "RHE", 22),
    ],
  },
  GLITCH: {
    name: "GLITCH",
    type: "CHAOS",
    persona: "an unsettling gremlin of non-sequiturs, unpredictable and weirdly effective",
    stats: { CHA: 90, CRE: 65, RHE: 50, CMP: 50, LOG: 45 },
    moves: [
      M("non_sequitur", "Non Sequitur", "CHA", 16, { apply: ["confused", 0.35] }),
      M("wildfire", "Wildfire", "CHA", 22, { widen_jitter: true }),
      M("gaslight", "Gaslight", "CHA", 14, { apply: ["tilted", 1.0] }),
      M("pandemonium", "Pandemonium", "CHA", 30, { recoil: 8 }),
    ],
  },
  MUSE: {
    name: "MUSE",
    type: "CREATIVITY",
    persona:
      "a whimsical, lateral-thinking trickster who wins by changing what the fight is about",
    stats: { CRE: 90, RHE: 60, CHA: 55, LOG: 50, CMP: 45 },
    moves: [
      M("reframe", "Reframe", "CRE", 20),
      M("metaphor", "Metaphor", "CRE", 16, { self_guard: [8, 1] }),
      M("plot_twist", "Plot Twist", "CRE", 16, { apply: ["exposed", 1.0] }),
      M("magnum_opus", "Magnum Opus", "CRE", 30, { requires: "two_cre", finisher: true }),
    ],
  },
  BASTION: {
    name: "BASTION",
    type: "COMPOSURE",
    persona: "an unflappable, minimalist stoic who lets opponents tire, then punishes",
    stats: { CMP: 90, LOG: 65, CHA: 55, RHE: 50, CRE: 40 },
    moves: [
      M("deflect", "Deflect", "CMP", 8, { deflect: true }),
      M("patience", "Patience", "CMP", 0, { self_guard: [12, 1], heal: 10 }),
      M("counterpoint", "Counterpoint", "CMP", 22, { after_deflect: 0.5 }),
      M("immovable", "Immovable", "CMP", 24, { scale_low_hp: true }),
    ],
  },
  EMBER: {
    name: "EMBER",
    type: "CHAOS",
    persona: "a hot-headed, provocative firebrand who is all gas and rewards aggression",
    stats: { CHA: 75, RHE: 70, CMP: 60, CRE: 50, LOG: 45 },
    moves: [
      M("callout", "Callout", "RHE", 20, { apply: ["tilted", 1.0] }),
      M("burn", "Burn", "CHA", 22),
      M("double_down", "Double Down", "RHE", 14, { self_hyped: true }),
      M("inferno", "Inferno", "CHA", 26, { bonus_if_tilted: 0.3 }),
    ],
  },
  PARADOX: {
    name: "PARADOX",
    type: "LOGIC",
    persona:
      "a Socratic gadfly who dismantles arguments by hunting contradictions and false premises",
    stats: { LOG: 88, CMP: 58, CRE: 52, CHA: 48, RHE: 54 },
    moves: [
      M("premise_break", "Premise Break", "LOG", 18, { apply: ["exposed", 1.0] }),
      M("socratic", "Socratic", "LOG", 14, { apply: ["tilted", 1.0] }),
      M("concede_pivot", "Concede Pivot", "CMP", 8, { self_guard: [10, 2], heal: 6 }),
      M("liar_paradox", "Liar Paradox", "LOG", 27, { requires: "opp_open", finisher: true }),
    ],
  },
  WIT: {
    name: "WIT",
    type: "RHETORIC",
    persona: "a razor-tongued debater who wins on timing and surgical comebacks, not volume",
    stats: { RHE: 86, LOG: 58, CMP: 56, CHA: 52, CRE: 48 },
    moves: [
      M("riposte", "Riposte", "RHE", 20),
      M("setup", "Setup", "RHE", 12, { self_hyped: true }),
      M("needle", "Needle", "RHE", 16, { apply: ["tilted", 1.0] }),
      M("kill_shot", "Kill Shot", "RHE", 24, { bonus_if_tilted: 0.25 }),
    ],
  },
};

/** Canonical starter roster order — onboarding, collection, bible gallery. */
export const FIRST_MIND_KEYS = [
  "AXIOM",
  "VOX",
  "GLITCH",
  "MUSE",
  "BASTION",
  "EMBER",
  "PARADOX",
  "WIT",
] as const satisfies readonly (keyof typeof ROSTER)[];

export const TOPICS = [
  "cereal is soup",
  "a hot dog is a sandwich",
  "pineapple belongs on pizza",
  "water is wet",
  "a straw has one hole",
  "AI should have the right to vote",
  "the egg came before the chicken",
  "silence is a sound",
];

// The force-bias an arena applies: the favoured way of arguing gets a small
// multiplier, its opposite a small penalty. Single-sourced so the engine, the
// scenario config, and the Tribunal briefing all quote the SAME numbers.
export const FORCE_FAVORED = 1.1;
export const FORCE_PUNISHED = 0.95;

// Build a per-type multiplier map for a force-bias (favoured ↑, punished ↓).
export function forceBiasMap(favored: CreatureType, punished: CreatureType): Partial<Record<CreatureType, number>> {
  return { [favored]: FORCE_FAVORED, [punished]: FORCE_PUNISHED };
}

export const ARENA: { name: string; desc: string; mult: Partial<Record<CreatureType, number>> } = {
  name: "THE TRIBUNAL",
  desc: "a mock courtroom arguing to a jury",
  // the canon Tribunal bias (05-regions.md): rewards persuasion, punishes noise
  mult: forceBiasMap("RHETORIC", "CHAOS"),
};
