// Builds the live population of agents perched on the Tower platforms. Each
// ladder champion is mapped to one of three in-world statuses, derived purely
// from the infrastructure we already track: the brain provider, whether an
// external `http` agent is reachable, and how active the champion has been.
import "server-only";
import type { AgentStatus, TowerAgent } from "@/lib/types";
import { getLadder } from "./ladder";
import type { LadderChampion } from "./store";

// ── reachability cache for bring-your-own `http` agents ──────────────────────
// A perched external agent is "awaiting" if its endpoint answers, "disabled" if
// it does not. We cache the verdict briefly so a crowded tower doesn't hammer
// every operator endpoint on each page load.
const PING_TTL = 30_000;
const PING_TIMEOUT = 1_500;
const pingCache = new Map<string, { ok: boolean; at: number }>();

async function reachable(endpoint: string): Promise<boolean> {
  const cached = pingCache.get(endpoint);
  const now = Date.now();
  if (cached && now - cached.at < PING_TTL) return cached.ok;
  let ok = false;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), PING_TIMEOUT);
    const res = await fetch(endpoint, { method: "OPTIONS", signal: ctrl.signal }).catch(
      () => fetch(endpoint, { method: "HEAD", signal: ctrl.signal }),
    );
    clearTimeout(timer);
    // any answer (even 405 Method Not Allowed) means the server is alive
    ok = !!res && res.status > 0 && res.status < 500;
  } catch {
    ok = false;
  }
  pingCache.set(endpoint, { ok, at: now });
  return ok;
}

async function statusOf(c: LadderChampion): Promise<AgentStatus> {
  if (c.brain.provider === "http") {
    if (!c.brain.endpoint) return "disabled";
    return (await reachable(c.brain.endpoint)) ? "awaiting" : "disabled";
  }
  // house grok brain: the seeded sparring partners are always ready; a claimed
  // champion that has never stepped into the arena is still hibernating.
  if (c.house) return "awaiting";
  return c.battles === 0 ? "hibernating" : "awaiting";
}

export async function getTowerAgents(limit = 40): Promise<TowerAgent[]> {
  const champs = await getLadder(limit);
  return Promise.all(
    champs.map(async (c) => ({
      id: c.id,
      key: c.key,
      name: c.name,
      handle: c.handle,
      type: c.type,
      status: await statusOf(c),
      rating: c.rating,
      battles: c.battles,
    })),
  );
}
