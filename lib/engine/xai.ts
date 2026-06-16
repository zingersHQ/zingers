// Server-only xAI/Grok client — ported from battle.py chat()/parse_json().
// Keys never reach the browser; routes that call this are Node-runtime only.
import "server-only";

export const ENDPOINT = "https://api.x.ai/v1/chat/completions";
export const MODEL = process.env.ZINGERS_MODEL || process.env.BATTLER_MODEL || "grok-4.20-0309-non-reasoning";
export const KEY = process.env.XAI_API_KEY || null;

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// ── Function-calling primitives (OpenAI-compatible) ──────────────────────────
// These let an agent actually EXECUTE tools in a reason→act→observe loop, rather
// than emit one structured string. Works for xAI Grok and any /chat/completions
// endpoint that supports `tools` + `tool_calls`.
export interface ToolFunctionSpec {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

export interface RawToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface RawMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: RawToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ChatCfg {
  endpoint: string;
  key: string | null;
  model: string;
}

export const houseCfg = (): ChatCfg => ({ endpoint: ENDPOINT, key: KEY, model: MODEL });

// One round-trip of a tool-calling conversation: send the running transcript
// (incl. prior tool results) and return the assistant message, which may carry
// `tool_calls` to execute or final `content`. The caller owns the loop.
export async function chatRawWith(
  cfg: ChatCfg,
  messages: RawMessage[],
  opts: {
    tools?: ToolFunctionSpec[];
    toolChoice?: unknown;
    temperature?: number;
    maxTokens?: number;
    timeoutMs?: number;
    attempts?: number;
  } = {},
): Promise<RawMessage | null> {
  const { tools, toolChoice, temperature = 0.8, maxTokens = 400, timeoutMs = 60000, attempts = 3 } = opts;
  const payload: Record<string, unknown> = { model: cfg.model, messages, temperature, max_tokens: maxTokens };
  if (tools && tools.length) payload.tools = tools;
  if (toolChoice !== undefined) payload.tool_choice = toolChoice;
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cfg.key) headers.Authorization = `Bearer ${cfg.key}`;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await fetch(cfg.endpoint, { method: "POST", headers, body, signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error(`chat ${res.status}`);
      const d = await res.json();
      const msg = d?.choices?.[0]?.message;
      if (!msg) return null;
      return { role: "assistant", content: msg.content ?? null, tool_calls: msg.tool_calls };
    } catch {
      if (attempt === attempts - 1) return null;
      await new Promise((r) => setTimeout(r, 1200));
    }
  }
  return null;
}

// Generic OpenAI-compatible chat call. Works for xAI Grok, OpenAI, OpenRouter,
// local Ollama, etc. — any endpoint that speaks /chat/completions.
export async function chatWith(
  cfg: { endpoint: string; key: string | null; model: string },
  messages: ChatMessage[],
  temperature = 0.8,
  maxTokens = 220,
  timeoutMs = 60000,
  attempts = 3,
): Promise<string | null> {
  const body = JSON.stringify({ model: cfg.model, messages, temperature, max_tokens: maxTokens });
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cfg.key) headers.Authorization = `Bearer ${cfg.key}`;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await fetch(cfg.endpoint, { method: "POST", headers, body, signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error(`chat ${res.status}`);
      const d = await res.json();
      return d?.choices?.[0]?.message?.content ?? null;
    } catch {
      if (attempt === attempts - 1) return null;
      await new Promise((r) => setTimeout(r, 1200));
    }
  }
  return null;
}

// Default house model (xAI Grok).
export async function chat(
  messages: ChatMessage[],
  temperature = 0.8,
  maxTokens = 220,
): Promise<string | null> {
  if (!KEY) return null;
  return chatWith({ endpoint: ENDPOINT, key: KEY, model: MODEL }, messages, temperature, maxTokens);
}

export function parseJson<T = Record<string, unknown>>(txt: string | null): T | null {
  if (!txt) return null;
  const a = txt.indexOf("{");
  const b = txt.lastIndexOf("}");
  if (a < 0 || b < 0) return null;
  try {
    return JSON.parse(txt.slice(a, b + 1)) as T;
  } catch {
    return null;
  }
}

// Deterministic seeded RNG (mulberry32) so ?seed= reproduces a bout exactly.
export function makeRng(seed?: number | null) {
  let s = seed == null ? (Math.random() * 2 ** 32) >>> 0 : seed >>> 0;
  const next = () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    random: next,
    uniform: (lo: number, hi: number) => lo + next() * (hi - lo),
    choice: <T>(arr: T[]): T => arr[Math.floor(next() * arr.length)],
    sample: <T>(arr: T[], n: number): T[] => {
      const pool = [...arr];
      const out: T[] = [];
      for (let i = 0; i < n && pool.length; i++) out.push(pool.splice(Math.floor(next() * pool.length), 1)[0]);
      return out;
    },
    shuffle: <T>(arr: T[]): T[] => {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
  };
}

export type Rng = ReturnType<typeof makeRng>;
