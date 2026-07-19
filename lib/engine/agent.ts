// The Agent Protocol — the spine that turns Zingers into an agent platform.
// An "agent" is anything that can answer ONE question: given this game state and
// these legal moves, what do you do? Built-in Grok, any OpenAI-compatible model,
// or a bring-your-own HTTP agent all implement the same `act(view)` contract.
import "server-only";
import { chatWith, chatRawWith, houseCfg, parseJson, type ChatCfg, type RawMessage, type ToolFunctionSpec } from "./xai";
import type { AgentConfig, Strat, ToolStep } from "@/lib/types";
import { safeHttpAgentEndpoint } from "@/lib/server/url-safety";

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

// The engine's real, read-only tools handed to a live agent each turn. Their
// outputs come straight from the battle math (no simulated/faked results), so a
// champion that calls them is genuinely acting on verifiable observations.
export interface SimResult {
  moveId: string;
  legal: boolean;
  name?: string;
  expectedDamage?: number;
  matchup?: "super-effective" | "neutral" | "resisted";
  appliesStatus?: string | null;
  finisher?: boolean;
  utility?: string[];
  note?: string;
}

export interface ScoutResult {
  name: string;
  type: string;
  hp: number;
  statuses: string;
  lastLine: string;
  recentMoves: string[];
}

export interface AgentTools {
  // Run the engine's real damage math for a legal move vs. the current opponent.
  simulateMove(moveId: string): SimResult;
  // Read the opponent's live resolve, statuses, last line, and recent moves.
  scoutOpponent(): ScoutResult;
}

// Optional per-turn context. When present AND ZINGERS_AGENT_TOOLS=1, a live
// agent may run a bounded tool loop (slow: multi LLM RTT). Default path is a
// single JSON decision — bouts stay snappy. Absent (mock/HTTP) → single decision.
export interface AgentTurnCtx {
  tools: AgentTools;
  onStep: (step: ToolStep) => void;
}

function agentToolsEnabled(): boolean {
  return process.env.ZINGERS_AGENT_TOOLS === "1";
}

export interface Agent {
  readonly label: string;
  // Return null to defer entirely to the engine's heuristic (offline / failure).
  act(view: AgentView, ctx?: AgentTurnCtx): Promise<AgentDecision | null>;
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

function buildSystem(v: AgentView): string {
  const memory = v.memory.length ? ` What you've learned from past fights (use it): ${v.memory.join("; ")}.` : "";
  return (
    `You are ${v.you.name}, ${v.you.persona}. You are in ${v.arena}. ` +
    `The proposition is: "${v.topic}". You argue ${v.you.stance.toUpperCase()} it. ` +
    `Stay sharply in character, stay on the proposition, be witty and punchy. ${describeStrat(v.strat)}${memory}`
  );
}

function buildState(v: AgentView): string {
  return (
    `Round ${v.round}. Your Resolve ${v.you.hp}/${v.you.max} (statuses: ${v.you.statuses}). ` +
    `Opponent ${v.opponent.name} the ${v.opponent.type} Resolve ${v.opponent.hp}/${v.opponent.max} (statuses: ${v.opponent.statuses}).\n` +
    `Opponent just said: "${v.opponent.lastLine}"\n\n` +
    `Your legal moves:\n- ${v.legalMoves.map((m) => m.desc).join("\n- ")}\n\n`
  );
}

const TACTICS =
  "Play smart: set up combos (apply Exposed/Tilted or self-Hype before a big hit), " +
  "exploit the opponent's statuses, and vary your tactics instead of repeating one move. ";

function buildMessages(v: AgentView) {
  const usr =
    buildState(v) +
    TACTICS +
    "Pick the SMARTEST move for this game state, then deliver your line. " +
    "Your line is a TRASH-TALK BAR: ONE punchy sentence, MAX 14 words, made to be read on a phone. " +
    'Reply ONLY as JSON: {"move":"<id>","intent":"<max 5 word tactic>",' +
    '"line":"<the bar: ONE sentence, MAX 14 words, in character, turn the opponent\'s last words against them>",' +
    '"why":"<max 18 words, plain English: why this move/line is smart right now>"}';
  return [
    { role: "system" as const, content: buildSystem(v) },
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

// ── the tool loop (opt-in via ZINGERS_AGENT_TOOLS=1) ──────────────────────────
// Default bouts skip this: each tool step is another full LLM round-trip and
// stacked to ~30s/turn. Kept for study / research when you explicitly enable it.
const MAX_STEPS = 2; // one investigate + forced commit

const SIMULATE_TOOL: ToolFunctionSpec = {
  type: "function",
  function: {
    name: "simulate_move",
    description:
      "Run the battle engine's REAL damage math for one of your legal moves against the opponent's current state. Returns expected damage, the type matchup, and any status it inflicts. Compare a couple of candidates before you commit.",
    parameters: {
      type: "object",
      properties: { move: { type: "string", description: "a legal move id from your moves" } },
      required: ["move"],
    },
  },
};

const SCOUT_TOOL: ToolFunctionSpec = {
  type: "function",
  function: {
    name: "scout_opponent",
    description: "Read the opponent's current Resolve, statuses, last spoken line, and recent moves before deciding.",
    parameters: { type: "object", properties: {} },
  },
};

const COMMIT_TOOL: ToolFunctionSpec = {
  type: "function",
  function: {
    name: "commit_move",
    description: "Lock in your decision for this turn: the move you execute plus your in-character trash-talk bar.",
    parameters: {
      type: "object",
      properties: {
        move: { type: "string", description: "a legal move id" },
        intent: { type: "string", description: "max 5 word tactic" },
        line: { type: "string", description: "the bar: ONE sentence, MAX 14 words, in character, turn their words against them" },
        why: { type: "string", description: "max 18 words, plain English: why this move/line is smart right now" },
      },
      required: ["move", "line"],
    },
  },
};

const ALL_TOOLS = [SIMULATE_TOOL, SCOUT_TOOL, COMMIT_TOOL];

function safeArgs(raw: string | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

// Drive a live brain through an investigate-then-commit loop using the engine's
// real tools. Returns the committed decision, or null to defer to the heuristic.
async function runToolLoop(cfg: ChatCfg, v: AgentView, ctx: AgentTurnCtx): Promise<AgentDecision | null> {
  const messages: RawMessage[] = [
    {
      role: "system",
      content:
        buildSystem(v) +
        " You decide your turn by USING TOOLS, not by writing JSON. simulate_move runs the engine's real damage math on a legal move; scout_opponent reads their live state. " +
        "At most one investigate tool call, then commit_move. Be decisive.",
    },
    {
      role: "user",
      content:
        buildState(v) +
        TACTICS +
        "Optionally simulate_move once on your top candidate, then commit_move with the smartest move and a TRASH-TALK BAR: ONE punchy sentence, MAX 14 words, turning their last words against them. Do NOT reply in plain text — call a tool.",
    },
  ];

  for (let step = 0; step < MAX_STEPS; step++) {
    const forceCommit = step === MAX_STEPS - 1;
    const msg = await chatRawWith(cfg, messages, {
      tools: forceCommit ? [COMMIT_TOOL] : ALL_TOOLS,
      toolChoice: forceCommit ? { type: "function", function: { name: "commit_move" } } : "auto",
      temperature: 0.9,
      maxTokens: 400,
      timeoutMs: 20000,
      attempts: 2,
    });
    if (!msg) return null;
    messages.push(msg);

    const calls = msg.tool_calls ?? [];
    if (!calls.length) {
      // Some models reply with content instead of a tool call — accept a valid
      // decision, otherwise nudge once toward commit_move.
      const d = coerce(parseJson(msg.content));
      if (d && d.move) return d;
      messages.push({ role: "user", content: "Decide now: call commit_move with a legal move id and your line." });
      continue;
    }

    for (const call of calls) {
      const name = call.function?.name;
      const args = safeArgs(call.function?.arguments);
      if (name === "commit_move") {
        const d = coerce(args);
        if (d && d.move) {
          ctx.onStep({ tool: "commit_move", args, result: null });
          return d;
        }
        messages.push({ role: "tool", tool_call_id: call.id, name, content: JSON.stringify({ error: "move and line are required" }) });
        continue;
      }
      let result: unknown;
      if (name === "simulate_move") result = ctx.tools.simulateMove(String(args.move ?? ""));
      else if (name === "scout_opponent") result = ctx.tools.scoutOpponent();
      else result = { error: `unknown tool: ${name}` };
      ctx.onStep({ tool: name ?? "?", args, result });
      messages.push({ role: "tool", tool_call_id: call.id, name: name ?? "", content: JSON.stringify(result) });
    }
  }
  return null;
}

// Single-shot decision: one LLM round-trip. This is the default bout path —
// trash-talk latency beats multi-step tool investigation.
async function actSingleShot(cfg: ChatCfg, v: AgentView, temperature = 0.92): Promise<AgentDecision | null> {
  const txt = await chatWith(cfg, buildMessages(v), temperature, 180, 15000, 2);
  return coerce(parseJson(txt));
}

// ── adapters ─────────────────────────────────────────────────────────────────
class GrokAgent implements Agent {
  readonly label = "House · Grok";
  async act(v: AgentView, ctx?: AgentTurnCtx) {
    if (ctx && agentToolsEnabled()) {
      const d = await runToolLoop(houseCfg(), v, ctx);
      if (d) return d;
    }
    return actSingleShot(houseCfg(), v, 0.92);
  }
}

class OpenAICompatAgent implements Agent {
  readonly label: string;
  private cfg: ChatCfg;
  constructor(cfg: { baseUrl: string; model: string; apiKey: string | null }) {
    this.label = `Model · ${cfg.model}`;
    this.cfg = { endpoint: cfg.baseUrl.replace(/\/$/, "") + "/chat/completions", key: cfg.apiKey, model: cfg.model };
  }
  async act(v: AgentView, ctx?: AgentTurnCtx) {
    if (ctx && agentToolsEnabled()) {
      const d = await runToolLoop(this.cfg, v, ctx);
      if (d) return d;
    }
    return actSingleShot(this.cfg, v, 0.9);
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
      const endpoint = await safeHttpAgentEndpoint(this.endpoint);
      if (!endpoint) return null;
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 20000);
      const res = await fetch(endpoint, {
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
