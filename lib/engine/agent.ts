// The Agent Protocol — the spine that turns Zingers into an agent platform.
// An "agent" is anything that can answer ONE question: given this game state and
// these legal moves, what do you do? Built-in Grok, any OpenAI-compatible model,
// or a bring-your-own HTTP agent all implement the same `act(view)` contract.
import "server-only";
import { chat, chatWith } from "./xai";
import { parseJson } from "./xai";
import type { AgentConfig, Strat } from "@/lib/types";

export interface AgentMoveView {
  id: string;
  name: string;
  desc: string;
}

export interface AgentView {
  topic: string;
  round: number;
  arena: string;
  you: { name: string; type: string; persona: string; stance: string; hp: number; max: number; statuses: string };
  opponent: { name: string; type: string; hp: number; max: number; statuses: string; lastLine: string };
  legalMoves: AgentMoveView[];
  strat: Strat;
  memory: string[];
}

export interface AgentDecision {
  move: string; // a legal move id (validated by the engine; bad ids fall back)
  intent?: string;
  line: string;
  why: string;
}

export interface Agent {
  readonly label: string;
  // Return null to defer entirely to the engine's heuristic (offline / failure).
  act(view: AgentView): Promise<AgentDecision | null>;
}

// ── shared prompt construction (Grok + OpenAI-compatible share this) ──────────
function band(v: number, lo: string, mid: string, hi: string) {
  return v < 34 ? lo : v > 66 ? hi : mid;
}
export function describeStrat(s: Strat): string {
  return (
    `Your handler has trained you — fight to this doctrine: ` +
    `RISK ${s.risk}/100 (${band(s.risk, "play it safe, avoid big gambles", "balanced gambles", "swing for the fences, take big risks")}); ` +
    `FOCUS ${s.focus}/100 (${band(s.focus, "just hit, don't overthink setups", "mix setups and hits", "set up Exposed/Tilted combos before big hits")}); ` +
    `AGGRESSION ${s.aggression}/100 (${band(s.aggression, "patient, defensive, counter-punch", "measured tempo", "relentless pressure, biggest hits")}).`
  );
}

function buildMessages(v: AgentView) {
  const memory = v.memory.length ? ` What you've learned from past bouts (use it): ${v.memory.join("; ")}.` : "";
  const sys =
    `You are ${v.you.name}, ${v.you.persona}. You are in ${v.arena}. ` +
    `The proposition is: "${v.topic}". You argue ${v.you.stance.toUpperCase()} it. ` +
    `Stay sharply in character, stay on the proposition, be witty and punchy. ${describeStrat(v.strat)}${memory}`;
  const usr =
    `Round ${v.round}. Your Resolve ${v.you.hp}/${v.you.max} (statuses: ${v.you.statuses}). ` +
    `Opponent ${v.opponent.name} the ${v.opponent.type} Resolve ${v.opponent.hp}/${v.opponent.max} (statuses: ${v.opponent.statuses}).\n` +
    `Opponent just said: "${v.opponent.lastLine}"\n\n` +
    `Your legal moves:\n- ${v.legalMoves.map((m) => m.desc).join("\n- ")}\n\n` +
    "Play smart: set up combos (apply Exposed/Tilted or self-Hype before a big hit), " +
    "exploit the opponent's statuses, and vary your tactics instead of repeating one move. " +
    "Pick the SMARTEST move for this game state, then deliver your line. " +
    "Your line is a TRASH-TALK BAR: ONE punchy sentence, MAX 14 words, made to be read on a phone. " +
    'Reply ONLY as JSON: {"move":"<id>","intent":"<max 5 word tactic>",' +
    '"line":"<the bar: ONE sentence, MAX 14 words, in character, turn the opponent\'s last words against them>",' +
    '"why":"<max 18 words, plain English: why this move/line is smart right now>"}';
  return [
    { role: "system" as const, content: sys },
    { role: "user" as const, content: usr },
  ];
}

function coerce(out: { move?: string; intent?: string; line?: string; why?: string } | null): AgentDecision | null {
  if (!out || (!out.move && !out.line)) return null;
  return {
    move: String(out.move ?? "").trim(),
    intent: (out.intent ?? "").toString().slice(0, 42),
    line: (out.line ?? "").toString().trim().slice(0, 160),
    why: (out.why ?? "").toString().trim().slice(0, 160),
  };
}

// ── adapters ─────────────────────────────────────────────────────────────────
class GrokAgent implements Agent {
  readonly label = "House · Grok";
  async act(v: AgentView) {
    return coerce(parseJson(await chat(buildMessages(v), 0.92)));
  }
}

class OpenAICompatAgent implements Agent {
  readonly label: string;
  constructor(private cfg: { baseUrl: string; model: string; apiKey: string | null }) {
    this.label = `Model · ${cfg.model}`;
  }
  async act(v: AgentView) {
    const endpoint = this.cfg.baseUrl.replace(/\/$/, "") + "/chat/completions";
    const txt = await chatWith({ endpoint, key: this.cfg.apiKey, model: this.cfg.model }, buildMessages(v), 0.9, 220, 45000, 2);
    return coerce(parseJson(txt));
  }
}

// Bring-your-own agent: we POST the full AgentView and expect an AgentDecision.
class HttpAgent implements Agent {
  readonly label: string;
  constructor(private endpoint: string) {
    this.label = `Agent · ${shortHost(endpoint)}`;
  }
  async act(v: AgentView) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 20000);
      const res = await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(v),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (!res.ok) return null;
      const out = (await res.json()) as { move?: string; intent?: string; line?: string; why?: string };
      return coerce(out);
    } catch {
      return null;
    }
  }
}

// Heuristic-only: always defers to the engine (offline / mock mode).
class MockAgent implements Agent {
  readonly label = "Heuristic";
  async act() {
    return null;
  }
}

function shortHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "custom";
  }
}

export function makeAgent(cfg: AgentConfig | undefined, mock: boolean): Agent {
  if (mock) return new MockAgent();
  if (!cfg || cfg.provider === "grok") return new GrokAgent();
  if (cfg.provider === "openai" && cfg.model) {
    return new OpenAICompatAgent({
      baseUrl: cfg.baseUrl || "https://api.openai.com/v1",
      model: cfg.model,
      apiKey: cfg.apiKey || null,
    });
  }
  if (cfg.provider === "http" && cfg.endpoint) return new HttpAgent(cfg.endpoint);
  return new GrokAgent();
}
