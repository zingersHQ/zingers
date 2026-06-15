import type { Recipe } from "@/lib/types";

// Serialize a champion's recipe (dials + persona + memory + agent brain) into
// compact query params for the battle / sim routes. prefix "a" or "b".
export function sideParams(p: string, rec: Recipe): string {
  const s = rec.strat;
  const parts = [`${p}r=${s.risk}`, `${p}f=${s.focus}`, `${p}a=${s.aggression}`];
  if (rec.persona) parts.push(`${p}p=${encodeURIComponent(rec.persona)}`);
  if (rec.memory?.length) parts.push(`${p}mem=${encodeURIComponent(JSON.stringify(rec.memory.slice(0, 6)))}`);
  const ag = rec.agent;
  if (ag && ag.provider !== "grok") {
    parts.push(`${p}prov=${ag.provider}`);
    if (ag.provider === "openai") {
      if (ag.model) parts.push(`${p}model=${encodeURIComponent(ag.model)}`);
      if (ag.baseUrl) parts.push(`${p}base=${encodeURIComponent(ag.baseUrl)}`);
      if (ag.apiKey) parts.push(`${p}key=${encodeURIComponent(ag.apiKey)}`);
    }
    if (ag.provider === "http" && ag.endpoint) parts.push(`${p}url=${encodeURIComponent(ag.endpoint)}`);
  }
  return parts.join("&");
}
