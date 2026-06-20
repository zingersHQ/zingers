// Ported from battle.py + server.py battle_events(). Async generator so the SSE
// route can stream each turn as the LLM resolves it.
import "server-only";
import {
  ARENA,
  BASE_DEFENSE,
  HP_MAX,
  MAX_HIT,
  Move,
  Q_HIGHLIGHT,
  ROSTER,
  TURN_LIMIT,
  TYPE_NEU,
  typeMult,
  type Creature,
} from "./roster";
import { chat, KEY, makeRng, parseJson, type Rng } from "./xai";
import { buildJudgePrompt, clampQuality, mockJudge } from "./judge";
import { banterLine } from "./banter";
import { makeAgent, type Agent, type AgentTools, type AgentTurnCtx, type AgentView, type ScoutResult, type SimResult } from "./agent";
import { DEFAULT_STRAT, type AgentConfig, type BattleEvent, type BattleHighlight, type FighterPub, type ResolveInfo, type Strat, type ToolStep } from "@/lib/types";

class Fighter {
  key: string;
  name: string;
  type: Creature["type"];
  persona: string;
  strat: Strat;
  stats: Creature["stats"];
  moves: Move[];
  stance: "for" | "against";
  hp = HP_MAX;
  exposed = 0;
  tilted = 0;
  confused = 0;
  hyped = false;
  guard = 0;
  guardTurns = 0;
  deflect = false;
  lastMove: string | null = null;
  moveHistory: string[] = [];
  creCount = 0;
  lines: string[] = [];
  best: [number, string] = [0, ""];
  agent: Agent;
  memory: string[] = [];

  constructor(key: string, stance: "for" | "against", cfg: SideConfig = {}, mock = false) {
    const c = ROSTER[key];
    this.key = key;
    this.name = c.name;
    this.type = c.type;
    this.persona = cfg.persona?.trim() ? cfg.persona.trim() : c.persona;
    this.strat = cfg.strat ?? DEFAULT_STRAT;
    this.stats = { ...c.stats };
    this.moves = c.moves;
    this.stance = stance;
    this.agent = makeAgent(cfg.agent, mock);
    this.memory = cfg.memory ?? [];
  }
  alive() {
    return this.hp > 0;
  }
}

function fighterPub(f: Fighter): FighterPub {
  return { key: f.key, name: f.name, type: f.type, stance: f.stance, hp: f.hp, max: HP_MAX, persona: f.persona };
}

function legalMoves(att: Fighter, opp: Fighter): Move[] {
  return att.moves.filter((m) => {
    if (m.requires === "opp_open" && !(opp.exposed || opp.tilted)) return false;
    if (m.requires === "two_cre" && att.creCount < 2) return false;
    return true;
  });
}

function describeMove(m: Move): string {
  const fx: string[] = [];
  if (m.apply) fx.push(`inflicts ${m.apply[0]}`);
  if (m.self_hyped) fx.push("self Hyped");
  if (m.self_guard) fx.push("self Guard");
  if (m.heal) fx.push(`heal ${m.heal}`);
  if (m.after_deflect) fx.push("+50% right after Deflect");
  if (m.bonus_if_tilted) fx.push("+30% vs Tilted");
  if (m.recoil) fx.push(`recoil ${m.recoil}`);
  if (m.finisher) fx.push("FINISHER");
  return `${m.name} (id=${m.id}, ${m.stat}, pow ${m.base}${fx.length ? "; " + fx.join(", ") : ""})`;
}

function statusStr(f: Fighter): string {
  const s: string[] = [];
  if (f.exposed) s.push("Exposed");
  if (f.tilted) s.push("Tilted");
  if (f.confused) s.push("Confused");
  if (f.hyped) s.push("Hyped");
  if (f.guardTurns) s.push(`Guard+${f.guard}`);
  return s.join(", ") || "none";
}

const MOCK_INTENT: Record<string, string> = {
  syllogism: "Compound the proof",
  checkmate: "Punish the opening",
  reductio: "Pry them open",
  mic_drop: "Cash in the hype",
  appeal: "Bank momentum",
  strawman: "Rattle them",
  crowd_swell: "Work the jury",
  burn: "Scorch them",
  inferno: "Finish the firestarter",
  callout: "Provoke a mistake",
  reframe: "Change the frame",
  magnum_opus: "Unveil the masterpiece",
  immovable: "Stand and punish",
  counterpoint: "Punish the lull",
  deflect: "Read the big hit",
};

interface AgentChoice {
  move: Move;
  intent: string;
  line: string;
  why: string;
  trace: ToolStep[];
}

// How the handler's training tilts move selection (mock) and is briefed (live).
function stratScore(m: Move, att: Fighter, opp: Fighter): number {
  const { risk, focus, aggression } = att.strat;
  let s = m.base;
  if (aggression > 50) s += ((aggression - 50) / 50) * (m.base * 0.6); // prefer raw power
  if (m.finisher) s += risk / 6;
  if (m.widen_jitter) s += risk / 10;
  if (focus > 50 && m.apply && !(opp.exposed || opp.tilted)) s += ((focus - 50) / 50) * 14; // set up combos first
  if (focus > 50 && (m.bonus_if_tilted || m.after_deflect) && (opp.tilted || att.lastMove === "deflect")) s += 10;
  if (aggression < 45 && (m.heal || m.deflect || m.self_guard)) s += ((45 - aggression) / 45) * 14; // play safe
  return s;
}

function buildView(att: Fighter, opp: Fighter, topic: string, rnd: number): AgentView {
  const moves = legalMoves(att, opp);
  return {
    topic,
    round: rnd,
    arena: `${ARENA.name} (${ARENA.desc})`,
    you: { name: att.name, type: att.type, persona: att.persona, stance: att.stance, hp: att.hp, max: HP_MAX, statuses: statusStr(att) },
    opponent: {
      name: opp.name,
      type: opp.type,
      hp: opp.hp,
      max: HP_MAX,
      statuses: statusStr(opp),
      lastLine: opp.lines.length ? opp.lines[opp.lines.length - 1] : "(opponent has not spoken yet)",
    },
    legalMoves: moves.map((m) => ({ id: m.id, name: m.name, desc: describeMove(m) })),
    strat: att.strat,
    memory: att.memory,
  };
}

// A funny, in-character, deterministic line for when no live brain supplies one.
function houseLine(att: Fighter, opp: Fighter, moveId: string, topic: string, rng: Rng): string {
  return banterLine({
    moveId,
    attName: att.name,
    attType: att.type,
    oppName: opp.name,
    topic,
    confused: att.confused > 0,
    tilted: att.tilted > 0,
    rng,
  });
}

// One turn: ask the side's Agent to decide, validate, and fall back to the
// trained-doctrine heuristic if the agent fails or returns an illegal move.
async function agentTurn(att: Fighter, opp: Fighter, topic: string, rnd: number, rng: Rng): Promise<AgentChoice> {
  const moves = legalMoves(att, opp);
  const valid = Object.fromEntries(moves.map((m) => [m.id, m]));
  const trace: ToolStep[] = [];
  const ctx: AgentTurnCtx = {
    tools: buildTools(att, opp),
    onStep: (s) => {
      if (trace.length < 8) trace.push(s);
    },
  };
  const out = await att.agent.act(buildView(att, opp, topic, rnd), ctx);
  if (out && out.move && valid[out.move]) {
    return {
      move: valid[out.move],
      intent: (out.intent || MOCK_INTENT[out.move] || "Press the advantage").slice(0, 42),
      line: (out.line || houseLine(att, opp, out.move, topic, rng)).slice(0, 160),
      why: (out.why || `${valid[out.move].name} fits the trained doctrine here.`).slice(0, 160),
      trace,
    };
  }
  // heuristic fallback — pick the move best matching the trained doctrine
  const m = moves.reduce((a, b) => (stratScore(b, att, opp) > stratScore(a, att, opp) ? b : a));
  return {
    move: m,
    intent: out?.intent || MOCK_INTENT[m.id] || "Press the advantage",
    line: out?.line || houseLine(att, opp, m.id, topic, rng),
    why: out?.why || `${m.name} fits the trained doctrine here.`,
    trace,
  };
}

async function judge(
  att: Fighter,
  opp: Fighter,
  move: Move,
  line: string,
  topic: string,
  mock: boolean,
  rng: Rng,
): Promise<[number, boolean, string]> {
  if (mock || !KEY) {
    const m = mockJudge(rng);
    return [m.quality, m.highlight, m.ruling];
  }
  const oppLast = opp.lines.length ? opp.lines[opp.lines.length - 1] : "(none)";
  const { system, user } = buildJudgePrompt({
    attName: att.name,
    stance: att.stance,
    moveName: move.name,
    line,
    oppLast,
    topic,
  });
  const out = parseJson<{ quality?: number; highlight?: boolean; ruling?: string }>(
    await chat([{ role: "system", content: system }, { role: "user", content: user }], 0.2, 120),
  );
  if (!out) return [1.0, false, "noted"];
  const hl = Boolean(out.highlight);
  // clampQuality enforces the [Q_MIN, Q_MAX]/Q_HIGHLIGHT band — the model can
  // never push damage outside the engine's bounds.
  return [clampQuality(out.quality, hl), hl, String(out.ruling ?? "noted").slice(0, 40)];
}

const statScale = (v: number) => 0.5 + v / 100.0;

function resolve(att: Fighter, opp: Fighter, move: Move, quality: number, rng: Rng): [number, ResolveInfo] {
  const fizzle = att.confused > 0 && rng.random() < 0.3;
  const base = move.base;
  const info: ResolveInfo = {
    fizzle,
    type: TYPE_NEU,
    capped: false,
    crit: quality >= Q_HIGHLIGHT,
    se: false,
    resist: false,
    status: [],
  };
  const q = quality - (att.tilted ? 0.2 : 0.0);
  let dmg = 0;
  if (base > 0 && !fizzle) {
    const sc = statScale(att.stats[move.stat]);
    const tm = typeMult(att.type, opp.type);
    info.type = tm;
    info.se = tm > 1.0;
    info.resist = tm < 1.0;
    const arena = ARENA.mult[att.type] ?? 1.0;
    let mult = 1.0;
    if (opp.exposed) {
      mult *= 1.2;
      opp.exposed = 0;
    }
    if (att.hyped) {
      mult *= 1.2;
      att.hyped = false;
    }
    if (move.bonus_if_tilted && opp.tilted) mult *= 1.0 + move.bonus_if_tilted;
    if (move.after_deflect && att.lastMove === "deflect") mult *= 1.0 + move.after_deflect;
    if (move.scale_low_hp) mult *= 1.0 + (HP_MAX - att.hp) / HP_MAX;
    const [lo, hi] = move.widen_jitter ? [0.7, 1.3] : [0.9, 1.1];
    const jit = rng.uniform(lo, hi);
    const raw = base * sc * tm * arena * q * mult * jit;
    dmg = Math.round(raw) - (BASE_DEFENSE + opp.guard);
    if (opp.deflect) {
      dmg = Math.round(dmg * 0.5);
      opp.deflect = false;
      info.status.push("DEFLECTED");
    }
    dmg = Math.max(1, dmg);
    if (dmg > MAX_HIT) {
      dmg = MAX_HIT;
      info.capped = true;
    }
    opp.hp = Math.max(0, opp.hp - dmg);
  }
  if (!fizzle) {
    if (move.apply && rng.random() <= move.apply[1]) {
      const eff = move.apply[0];
      if (eff === "exposed") opp.exposed = 1;
      else if (eff === "tilted") opp.tilted = 1;
      else if (eff === "confused") opp.confused = 1;
      info.status.push(`${opp.name} ${eff[0].toUpperCase() + eff.slice(1)}`);
    }
    if (move.self_hyped) {
      att.hyped = true;
      info.status.push(`${att.name} Hyped`);
    }
    if (move.self_guard) {
      [att.guard, att.guardTurns] = move.self_guard;
      info.status.push(`${att.name} Guard+${att.guard}`);
    }
    if (move.heal) {
      att.hp = Math.min(HP_MAX, att.hp + move.heal);
      info.status.push(`${att.name} +${move.heal} Resolve`);
    }
    if (move.recoil) {
      att.hp = Math.max(0, att.hp - move.recoil);
      info.status.push(`${att.name} recoil ${move.recoil}`);
    }
    if (move.deflect) {
      att.deflect = true;
      info.status.push(`${att.name} braces`);
    }
    if (move.stat === "CRE") att.creCount += 1;
  }
  att.tilted = 0;
  att.confused = 0;
  att.lastMove = move.id;
  att.moveHistory.push(move.name);
  return [dmg, info];
}

// ── engine-backed agent tools (read-only, real math; no faked outputs) ───────
function matchupLabel(tm: number): SimResult["matchup"] {
  return tm > 1 ? "super-effective" : tm < 1 ? "resisted" : "neutral";
}

// The deterministic EXPECTATION of a move against the live state: the same math
// resolve() uses, with mean quality/jitter (1.0) and no RNG or mutation. Honest
// preview — what the engine would do on average — handed to the agent as a tool.
function previewMove(att: Fighter, opp: Fighter, move: Move): SimResult {
  const utility: string[] = [];
  if (move.self_hyped) utility.push("self Hyped");
  if (move.self_guard) utility.push(`self Guard+${move.self_guard[0]}`);
  if (move.heal) utility.push(`heal ${move.heal}`);
  if (move.deflect) utility.push("brace for Deflect");
  if (move.recoil) utility.push(`recoil ${move.recoil}`);

  const tm = typeMult(att.type, opp.type);
  let expected = 0;
  if (move.base > 0) {
    const sc = statScale(att.stats[move.stat]);
    const arena = ARENA.mult[att.type] ?? 1.0;
    let mult = 1.0;
    if (opp.exposed) mult *= 1.2;
    if (att.hyped) mult *= 1.2;
    if (move.bonus_if_tilted && opp.tilted) mult *= 1.0 + move.bonus_if_tilted;
    if (move.after_deflect && att.lastMove === "deflect") mult *= 1.0 + move.after_deflect;
    if (move.scale_low_hp) mult *= 1.0 + (HP_MAX - att.hp) / HP_MAX;
    const raw = move.base * sc * tm * arena * mult; // q = 1.0, jitter mean = 1.0
    let dmg = Math.round(raw) - (BASE_DEFENSE + opp.guard);
    dmg = Math.max(1, dmg);
    if (dmg > MAX_HIT) dmg = MAX_HIT;
    expected = dmg;
  }

  return {
    moveId: move.id,
    legal: true,
    name: move.name,
    expectedDamage: expected,
    matchup: matchupLabel(tm),
    appliesStatus: move.apply ? `${move.apply[0]} (${Math.round(move.apply[1] * 100)}% chance)` : null,
    finisher: !!move.finisher,
    utility: utility.length ? utility : undefined,
    note: move.requires === "opp_open" ? "requires opponent Exposed or Tilted" : undefined,
  };
}

function buildTools(att: Fighter, opp: Fighter): AgentTools {
  const legal = legalMoves(att, opp);
  const byId = new Map(legal.map((m) => [m.id, m]));
  return {
    simulateMove: (id: string): SimResult => {
      const m = byId.get(id);
      if (!m) return { moveId: id, legal: false, note: "not a legal move this turn" };
      return previewMove(att, opp, m);
    },
    scoutOpponent: (): ScoutResult => ({
      name: opp.name,
      type: opp.type,
      hp: opp.hp,
      statuses: statusStr(opp),
      lastLine: opp.lines.length ? opp.lines[opp.lines.length - 1] : "(opponent has not spoken yet)",
      recentMoves: opp.moveHistory.slice(-3),
    }),
  };
}

export interface SideConfig {
  strat?: Strat;
  persona?: string;
  agent?: AgentConfig;
  memory?: string[];
}

export async function* battleEvents(
  aKey: string,
  bKey: string,
  topic: string,
  mock: boolean,
  seed?: number | null,
  cfgA: SideConfig = {},
  cfgB: SideConfig = {},
): AsyncGenerator<BattleEvent> {
  const rng = makeRng(seed);
  const a = new Fighter(aKey, "for", cfgA, mock);
  const b = new Fighter(bKey, "against", cfgB, mock);
  yield { type: "start", topic, arena: ARENA.name, arena_desc: ARENA.desc, a: fighterPub(a), b: fighterPub(b) };
  let mvp = { dmg: 0, line: "", round: 0, actor_name: "" };
  let lastHl = -10;
  const order = [a, b];
  let rnd = 0;
  // ── the tug-of-war ── momentum is side-A-positive and decays toward neutral,
  // so a big bar SURGES the meter and a lull lets it drift back — that's the
  // turning point spectators feel. Streaks mark who's "on a roll".
  let momentum = 0;
  const SURGE_AT = 40; // meter past this = that side is visibly running the show
  const clampM = (v: number) => Math.max(-100, Math.min(100, v));
  let bestSwing = { round: 0, delta: 0, line: "", actor: "" };
  let ko: { round: number; line: string; actor: string; actor_name: string; dmg: number } | null = null;
  while (a.alive() && b.alive() && rnd < TURN_LIMIT) {
    rnd += 1;
    const att = order[(rnd - 1) % 2];
    const opp = order[rnd % 2];
    const { move, intent, line, why, trace } = await agentTurn(att, opp, topic, rnd, rng);
    att.lines.push(line);
    let [q, hl, ruling] = await judge(att, opp, move, line, topic, mock, rng);
    if (hl) {
      if (rnd - lastHl < 3 || rng.random() < 0.5) q = Math.min(q, 1.28);
      else lastHl = rnd;
    }
    const [dmg, info] = resolve(att, opp, move, q, rng);
    if (dmg > mvp.dmg) mvp = { dmg, line, round: rnd, actor_name: att.name };
    if (dmg > att.best[0]) att.best = [dmg, line];

    // momentum: a hard / crit / super-effective bar swings the meter toward the
    // attacker; resisted bars push less. Then decay toward 0.
    const attackerIsA = att === a;
    const impact = dmg + (info.crit ? 10 : 0) + (info.se ? 5 : 0) - (info.resist ? 3 : 0);
    const prevMomentum = momentum;
    momentum = clampM(momentum * 0.78 + (attackerIsA ? 1 : -1) * impact * 1.6);
    const swing = Math.abs(momentum - prevMomentum);
    if (rnd > 1 && swing > bestSwing.delta) bestSwing = { round: rnd, delta: swing, line, actor: att.key };
    // "on a roll" = the meter is firmly on one side right now
    const surge: "a" | "b" | null = momentum >= SURGE_AT ? "a" : momentum <= -SURGE_AT ? "b" : null;
    if (!opp.alive()) ko = { round: rnd, line, actor: att.key, actor_name: att.name, dmg };

    if (att.guardTurns) {
      att.guardTurns -= 1;
      if (att.guardTurns === 0) att.guard = 0;
    }
    yield {
      type: "turn",
      round: rnd,
      actor: att.key,
      opp: opp.key,
      actor_name: att.name,
      actor_type: att.type,
      move: move.name,
      intent,
      line,
      why,
      dmg,
      info,
      q: Math.round(q * 100) / 100,
      ruling,
      a_hp: a.hp,
      b_hp: b.hp,
      momentum: Math.round(momentum),
      surge,
      trace: trace.length ? trace : undefined,
    };
    if (!opp.alive()) break;
  }
  let w: Fighter, l: Fighter;
  if (a.alive() && !b.alive()) [w, l] = [a, b];
  else if (b.alive() && !a.alive()) [w, l] = [b, a];
  else [w, l] = a.hp >= b.hp ? [a, b] : [b, a];

  // Highlight reel — lead the replay with the best moment, not turn one.
  // Order by drama: the finish, then the hardest bar, then the swing; deduped.
  const highlights: BattleHighlight[] = [];
  const seen = new Set<number>();
  const add = (h: BattleHighlight | null) => {
    if (h && h.round && !seen.has(h.round)) { seen.add(h.round); highlights.push(h); }
  };
  if (ko) add({ round: ko.round, line: ko.line, actor_name: ko.actor_name, dmg: ko.dmg, kind: "ko" });
  if (mvp.round) add({ round: mvp.round, line: mvp.line, actor_name: mvp.actor_name, dmg: mvp.dmg, kind: "crit" });
  if (bestSwing.round) {
    const sw = order.find((f) => f.key === bestSwing.actor);
    add({ round: bestSwing.round, line: bestSwing.line, actor_name: sw?.name ?? "", dmg: 0, kind: "turn" });
  }

  yield {
    type: "end",
    winner: w.key,
    winner_name: w.name,
    loser_name: l.name,
    rounds: rnd,
    mvp: { dmg: mvp.dmg, line: mvp.line },
    a_hp: a.hp,
    b_hp: b.hp,
    turning_point: bestSwing.round ? { round: bestSwing.round, line: bestSwing.line, actor: bestSwing.actor } : undefined,
    highlights: highlights.slice(0, 3),
  };
}
