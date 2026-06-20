// The judge — Zingers' single most important fairness layer, isolated here so the
// "bounded LLM influence" invariant lives in ONE auditable place. The model only
// ever returns a quality MULTIPLIER inside [Q_MIN, Q_MAX], or exactly Q_HIGHLIGHT
// on a flagged crit. Nothing the model writes can push damage outside that band,
// so writing nudges outcomes but never decides them (docs/combat-design.md §1).
//
// Pure + framework-free (no server-only): battle.ts uses it at runtime, and the
// judge-consistency harness (scripts/judge-check.mjs, via /api/sim) checks the
// invariants this module guarantees.
import { Q_HIGHLIGHT, Q_MIN, Q_MAX } from "./roster";

// Bump when the scoring rubric below changes — lets us track judge drift across
// versions and pin a harness run to a known rubric.
// v2: the jury enforces the ASSIGNED STANCE — abandoning your side or going
// off-proposition is rejected (≈0), the way a real tribunal scores a debater.
export const JUDGE_VERSION = 2;

// Minimal RNG surface (matches lib/engine/xai makeRng) so this stays decoupled.
export interface JudgeRng {
  random(): number;
  uniform(lo: number, hi: number): number;
}

export interface JudgeResult {
  quality: number; // already clamped: in [Q_MIN, Q_MAX] or === Q_HIGHLIGHT
  highlight: boolean;
  ruling: string;
}

// THE invariant. Any raw model number → a legal multiplier. A highlight replaces
// quality with Q_HIGHLIGHT (never stacks on top of it).
export function clampQuality(raw: unknown, highlight = false): number {
  if (highlight) return Q_HIGHLIGHT;
  const n = Number(raw);
  if (!Number.isFinite(n)) return 1.0;
  return Math.max(Q_MIN, Math.min(Q_MAX, n));
}

// Is q a legal judge output? (in-band, or exactly the highlight value.) The
// harness asserts every streamed turn satisfies this.
export function isLegalQuality(q: number): boolean {
  if (q === Q_HIGHLIGHT) return true;
  return Number.isFinite(q) && q >= Q_MIN && q <= Q_MAX;
}

// Deterministic offline judge (keyless demos, tests). Highlight ~10% so a season
// of mock bouts stays in the same band the live judge targets (~1 in 8).
export const MOCK_HIGHLIGHT_RATE = 0.1;

export function mockJudge(rng: JudgeRng): JudgeResult {
  const q = Math.round(rng.uniform(0.85, 1.18) * 100) / 100;
  const highlight = rng.random() < MOCK_HIGHLIGHT_RATE;
  return {
    quality: highlight ? Q_HIGHLIGHT : q,
    highlight,
    ruling: q > 1.05 ? "sharp and on point" : "lands cleanly",
  };
}

// The live judge prompt, centralised + versioned. Rewards wit/clip-worthiness,
// stays strict (most lines 0.9–1.1), reserves highlight for ~1 in 8.
export function buildJudgePrompt(args: {
  attName: string;
  stance: string;
  moveName: string;
  line: string;
  oppLast: string;
  topic: string;
}): { system: string; user: string } {
  const stance = args.stance === "against" ? "AGAINST" : "FOR";
  const system =
    `You are the judge of ZINGERS, a tribunal debate on the proposition: "${args.topic}". ` +
    `${args.attName} has been ASSIGNED to argue ${stance} the proposition and must hold that side. ` +
    "You reward WIT, not term-paper rigor: the funniest, most savage, most quotable bar wins — " +
    "but only when it actually argues the assigned side of THIS proposition. " +
    "You are scoring one line for how hard it lands.";
  const user =
    `${args.attName} (assigned to argue ${stance}) used ${args.moveName} and said:\n"${args.line}"\n` +
    `Opponent's previous line: "${args.oppLast}"\n\n` +
    "Reward: comedic timing, savagery of the roast, turning the opponent's own words/logic " +
    "against them, and clip-worthiness (would someone screenshot this?) — while pushing their " +
    `assigned ${stance} side of the proposition. Reply ONLY as JSON: ` +
    '{"quality": <float 0.7-1.3>, "highlight": <true|false>, "ruling": "<max 8 word verdict, may be funny>"}. ' +
    "Be a STRICT scorer: most lines are 0.9-1.1. Reserve highlight=true for roughly 1 line in 8 — " +
    "only a truly exceptional, clip-worthy zinger that made you laugh or wince; otherwise false. " +
    "JURY RULES — the tribunal rejects a line (quality 0.7) if it: switches sides or concedes the " +
    `proposition (argues the opposite of ${stance}), or wanders off the proposition entirely. ` +
    "A coherent on-topic line that holds the assigned side always beats a funny one that abandons it.";
  return { system, user };
}
