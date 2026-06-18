import type { SideConfig } from "./battle";
import type { AgentConfig, AgentProvider, Strat } from "@/lib/types";

function clamp(v: number) {
  return Math.max(0, Math.min(100, v));
}

// Decode one side's recipe (dials + persona + memory + agent brain) from query
// params. prefix "a" for player A, "b" for player B. Shared by the streaming
// (/api/battle) and headless (/api/sim) routes.
export function readSide(q: URLSearchParams, p: string): SideConfig {
  const num = (k: string) => {
    const raw = q.get(p + k);
    if (raw === null || raw === "") return null; // absent stays null — don't coerce to 0
    const n = Number(raw);
    return Number.isFinite(n) ? clamp(n) : null;
  };
  const r = num("r");
  const f = num("f");
  const a = num("a");
  const cfg: SideConfig = {};
  if (r !== null || f !== null || a !== null) {
    const strat: Strat = { risk: r ?? 50, focus: f ?? 50, aggression: a ?? 50 };
    cfg.strat = strat;
  }
  const persona = q.get(p + "p");
  if (persona) cfg.persona = persona.slice(0, 300);

  const prov = q.get(p + "prov") as AgentProvider | null;
  if (prov === "openai" || prov === "http" || prov === "grok") {
    const agent: AgentConfig = { provider: prov };
    if (prov === "openai") {
      agent.model = q.get(p + "model")?.slice(0, 120) || undefined;
      agent.baseUrl = q.get(p + "base")?.slice(0, 200) || undefined;
      agent.apiKey = q.get(p + "key")?.slice(0, 400) || undefined;
    }
    if (prov === "http") agent.endpoint = q.get(p + "url")?.slice(0, 400) || undefined;
    cfg.agent = agent;
  }

  const mem = q.get(p + "mem");
  if (mem) {
    try {
      const arr = JSON.parse(mem);
      if (Array.isArray(arr)) cfg.memory = arr.filter((x) => typeof x === "string").slice(0, 6).map((x: string) => x.slice(0, 160));
    } catch {}
  }
  return cfg;
}

// true if either side brings its own brain (OpenAI-compatible or HTTP). Such a
// bout must NOT be forced into mock mode just because the house has no xAI key.
export function hasExternalAgent(...sides: SideConfig[]): boolean {
  return sides.some((s) => !!s.agent && s.agent.provider !== "grok");
}
