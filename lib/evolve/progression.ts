// Ported from evolve.js — the parametric progression model. A champion's look
// and title are DERIVED from a record that grows as it fights. Pure functions.
import type { Champion, CreatureType, Style, StyleAxis } from "@/lib/types";

export const TYPE_COLOR: Record<CreatureType, string> = {
  LOGIC: "#4aa3ff",
  CHAOS: "#ff4ad1",
  COMPOSURE: "#36d39a",
  RHETORIC: "#f0a93a",
  CREATIVITY: "#f5d020",
};
export const EMBLEM: Record<CreatureType, string> = {
  LOGIC: "◆",
  CHAOS: "✦",
  COMPOSURE: "▲",
  RHETORIC: "◉",
  CREATIVITY: "✺",
};

export function blank(): Champion {
  return { xp: 0, wins: 0, losses: 0, battles: 0, aggression: 0, control: 0, resilience: 0, flair: 0, creativity: 0 };
}
export function blankStyle(): Style {
  return { aggression: 0, control: 0, resilience: 0, flair: 0, creativity: 0 };
}

// accelerating curve: each level costs ~35% more than the last
export function levelFor(xp: number): { level: number; into: number; span: number } {
  let lvl = 1;
  let need = 100;
  let acc = 0;
  while (xp >= acc + need) {
    acc += need;
    lvl++;
    need = Math.round(need * 1.35);
  }
  return { level: lvl, into: xp - acc, span: need };
}

export interface Tier {
  min: number;
  name: string;
  rings: number;
  crest: boolean;
  particles?: boolean;
  crown?: boolean;
}
export const TIERS: Tier[] = [
  { min: 1, name: "ROOKIE", rings: 0, crest: false },
  { min: 3, name: "ADEPT", rings: 1, crest: true },
  { min: 6, name: "VETERAN", rings: 2, crest: true },
  { min: 10, name: "ELITE", rings: 3, crest: true, particles: true },
  { min: 15, name: "LEGEND", rings: 3, crest: true, particles: true, crown: true },
];
export function tierFor(level: number): Tier {
  let t = TIERS[0];
  for (const x of TIERS) if (level >= x.min) t = x;
  return t;
}
export function tierIndex(level: number): number {
  let i = 0;
  TIERS.forEach((x, k) => {
    if (level >= x.min) i = k;
  });
  return i;
}

export interface Axis {
  k: StyleAxis;
  glyph: string;
  color: string;
  label: string;
  titles: [string, string, string];
}
// Monochrome typographic sigils (no emoji) — each tinted by its axis colour at
// render time, in the same family as the Force emblems.
export const AXES: Axis[] = [
  { k: "aggression", glyph: "✸", color: "#ff6b4a", label: "Aggression", titles: ["Brawler", "The Relentless", "The Annihilator"] },
  { k: "control", glyph: "❖", color: "#b07bff", label: "Control", titles: ["Schemer", "The Manipulator", "The Puppeteer"] },
  { k: "resilience", glyph: "⬢", color: "#36d39a", label: "Resilience", titles: ["Stonewall", "The Unbroken", "The Immovable"] },
  { k: "flair", glyph: "★", color: "#f5d020", label: "Flair", titles: ["Showoff", "The Showman", "The Icon"] },
  { k: "creativity", glyph: "✺", color: "#7fd0ff", label: "Creativity", titles: ["Dreamer", "The Visionary", "The Reality-Bender"] },
];
export const AXMAP: Record<StyleAxis, Axis> = Object.fromEntries(AXES.map((a) => [a.k, a])) as Record<StyleAxis, Axis>;

export function dominant(p: Champion): { axis: Axis; value: number } {
  let best = AXES[0];
  let bv = -1;
  for (const a of AXES) if (p[a.k] > bv) {
    bv = p[a.k];
    best = a;
  }
  return { axis: best, value: bv };
}
export function sigilLevel(v: number): number {
  return v >= 18 ? 3 : v >= 8 ? 2 : v >= 3 ? 1 : 0;
}
export function sigils(p: Champion) {
  return AXES.map((a) => ({ ...a, lvl: sigilLevel(p[a.k]) }))
    .filter((s) => s.lvl > 0)
    .sort((x, y) => y.lvl - x.lvl);
}

// ── Skills & Skill Level (SL) ───────────────────────────────────────────────
// The player-facing replacement for raw ELO. As an agent fights and trains, its
// style axes grow and cross thresholds (sigilLevel 3/8/18) — each crossing is an
// acquired SKILL, named from that axis's earned titles. So evolution is literally
// "the agent learned to do X". SL folds depth (XP level) and breadth (skills) into
// one legible, monotonic number that never drops the way a rating can.
export interface Skill {
  axis: StyleAxis;
  glyph: string;
  color: string;
  name: string; // earned title, e.g. "The Relentless"
  rank: number; // 1 (I) · 2 (II) · 3 (III)
}

// Every rank an axis has crossed is a distinct acquired skill, strongest first.
export function skillsOf(p: Champion): Skill[] {
  const out: Skill[] = [];
  for (const a of AXES) {
    const lvl = sigilLevel(p[a.k]);
    for (let r = 1; r <= lvl; r++) {
      out.push({ axis: a.k, glyph: a.glyph, color: a.color, name: a.titles[r - 1], rank: r });
    }
  }
  return out.sort((x, y) => y.rank - x.rank);
}

// Total acquired skill ranks across all axes (0–15).
export function skillCount(p: Champion): number {
  return AXES.reduce((n, a) => n + sigilLevel(p[a.k]), 0);
}

// Skill Level — the single headline KPI. Depth (XP level) + breadth (skills).
export function skillLevel(p: Champion): number {
  return levelFor(p.xp).level + skillCount(p);
}
export function doctrine(p: Champion, level: number): string {
  const d = dominant(p);
  if (d.value < 3) return "Unproven";
  const idx = level >= 10 ? 2 : level >= 5 ? 1 : 0;
  return d.axis.titles[idx];
}
export const ROMAN: Record<number, string> = { 1: "I", 2: "II", 3: "III" };

// fold one streamed battle turn into a style accumulator
export function accrue(style: Style, ev: { dmg?: number; info?: { crit?: boolean; status?: string[] }; actor_type?: string }): Style {
  if (!ev || !ev.info) return style;
  const dmg = ev.dmg ?? 0;
  if (dmg >= 25) style.aggression += 1.4;
  else if (dmg > 0) style.aggression += dmg / 22;
  if (ev.info.crit) style.flair += 1;
  if (ev.actor_type === "CREATIVITY") style.creativity += 0.7;
  for (const s of ev.info.status || []) {
    if (/Exposed|Tilted|Confused/i.test(s)) style.control += 1;
    if (/Guard|Resolve|braces|Deflect/i.test(s)) style.resilience += 1;
    if (/Hyped/i.test(s)) style.aggression += 0.5;
  }
  return style;
}

export interface ResultDelta {
  leveledUp: boolean;
  newLevel: number;
  tieredUp: boolean;
  tier: string;
  doctrine: string;
}
// apply a finished battle to a champion's career (mutates p); returns what changed
export function applyResult(p: Champion, { won, style = blankStyle(), margin = 0 }: { won: boolean; style?: Style; margin?: number }): ResultDelta {
  const before = levelFor(p.xp).level;
  const beforeTier = tierIndex(before);
  p.battles += 1;
  if (won) p.wins++;
  else p.losses++;
  p.xp += (won ? 70 : 25) + Math.round(Math.min(40, margin) * 0.6);
  for (const a of AXES) p[a.k] += style[a.k] * (won ? 1 : 0.5);
  const after = levelFor(p.xp).level;
  const afterTier = tierIndex(after);
  return { leveledUp: after > before, newLevel: after, tieredUp: afterTier > beforeTier, tier: TIERS[afterTier].name, doctrine: doctrine(p, after) };
}
