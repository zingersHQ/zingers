// Shared-world domain logic: seed the house ladder, claim/register champions,
// run ranked bouts that update the ONE global ELO, and read the live feed.
import "server-only";
import { battleEvents, type SideConfig } from "@/lib/engine/battle";
import { ROSTER, TOPICS } from "@/lib/engine/roster";
import { hasExternalAgent } from "@/lib/engine/side-config";
import type { CreatureType } from "@/lib/types";
import { getStore, type FeedEntry, type LadderChampion } from "./store";

export const BASE_RATING = 1000;
const ELO_K = 32;

function shortId(): string {
  return (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).replace(/-/g, "").slice(0, 12);
}

function clamp(v: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, Math.round(v)));
}

function sideOf(c: LadderChampion): SideConfig {
  const cfg: SideConfig = { strat: c.strat };
  if (c.brain.provider === "http" && c.brain.endpoint) cfg.agent = { provider: "http", endpoint: c.brain.endpoint };
  return cfg;
}

// Seed the six base creatures as permanent house champions so the ladder is
// never empty and there are always opponents for the cron league.
export async function ensureSeeded(): Promise<void> {
  const store = getStore();
  if ((await store.getChampion("house-AXIOM"))) return;
  const entries = Object.entries(ROSTER);
  await Promise.all(
    entries.map(([key, c], i) =>
      store.putChampion({
        id: `house-${key}`,
        key,
        name: c.name,
        handle: "HOUSE",
        type: c.type as CreatureType,
        brain: { provider: "grok" },
        strat: { risk: 45 + i * 3, focus: 50, aggression: 48 + i * 2 },
        rating: BASE_RATING,
        wins: 0,
        losses: 0,
        battles: 0,
        house: true,
        ownerToken: "",
        createdAt: Date.now(),
      }),
    ),
  );
}

export interface ClaimInput {
  ownerToken: string;
  handle?: string;
  key: string; // base roster creature
  name?: string;
  brain?: { provider: "grok" | "http"; endpoint?: string };
  strat?: { risk: number; focus: number; aggression: number };
}

export async function claimChampion(input: ClaimInput): Promise<LadderChampion | { error: string }> {
  const key = input.key.toUpperCase();
  const base = ROSTER[key];
  if (!base) return { error: "unknown creature" };
  if (!input.ownerToken) return { error: "missing owner token" };
  const brain = input.brain?.provider === "http" && input.brain.endpoint ? { provider: "http" as const, endpoint: input.brain.endpoint.slice(0, 400) } : { provider: "grok" as const };
  const champ: LadderChampion = {
    id: shortId(),
    key,
    name: (input.name?.trim() || base.name).slice(0, 24),
    handle: (input.handle?.trim() || "").slice(0, 24),
    type: base.type as CreatureType,
    brain,
    strat: {
      risk: clamp(input.strat?.risk ?? 50),
      focus: clamp(input.strat?.focus ?? 50),
      aggression: clamp(input.strat?.aggression ?? 50),
    },
    rating: BASE_RATING,
    wins: 0,
    losses: 0,
    battles: 0,
    house: false,
    ownerToken: input.ownerToken.slice(0, 64),
    createdAt: Date.now(),
  };
  const store = getStore();
  await store.putChampion(champ);
  await store.addOwned(champ.ownerToken, champ.id);
  return champ;
}

function expectedScore(a: number, b: number): number {
  return 1 / (1 + Math.pow(10, (b - a) / 400));
}

// Run one ranked bout and persist the result to the shared ladder + feed.
// Returns a compact summary, or null if the matchup is invalid.
export async function runRankedBout(idA: string, idB: string): Promise<{ winner: string; loser: string; delta: number; topic: string } | null> {
  const store = getStore();
  const [a, b] = await Promise.all([store.getChampion(idA), store.getChampion(idB)]);
  if (!a || !b || a.id === b.id) return null;

  const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
  const sideA = sideOf(a);
  const sideB = sideOf(b);
  const mock = !hasExternalAgent(sideA, sideB);

  let aHp = 100;
  let bHp = 100;
  for await (const ev of battleEvents(a.key, b.key, topic, mock, null, sideA, sideB)) {
    if (ev.type === "end") {
      aHp = ev.a_hp;
      bHp = ev.b_hp;
    }
  }

  // Attribute by side/HP — base creature keys can collide, names can repeat.
  const aWon = aHp > 0 && bHp === 0 ? true : bHp > 0 && aHp === 0 ? false : aHp >= bHp;
  const winner = aWon ? a : b;
  const loser = aWon ? b : a;

  const exp = expectedScore(winner.rating, loser.rating);
  const delta = Math.round(ELO_K * (1 - exp));
  winner.rating += delta;
  loser.rating -= delta;
  winner.wins += 1;
  loser.losses += 1;
  winner.battles += 1;
  loser.battles += 1;

  await Promise.all([store.putChampion(winner), store.putChampion(loser)]);
  const entry: FeedEntry = { t: Date.now(), winner: winner.name, loser: loser.name, topic, delta, mode: "ladder" };
  await store.pushFeed(entry);
  return { winner: winner.name, loser: loser.name, delta, topic };
}

// Pick two distinct champions weighted toward owned (non-house) ones so player
// champions actually play; falls back to any two when the ladder is small.
export async function pickMatchup(): Promise<[string, string] | null> {
  const store = getStore();
  const top = await store.topChampions(50);
  if (top.length < 2) return null;
  const owned = top.filter((c) => !c.house);
  const pool = top;
  const a = (owned.length ? owned : pool)[Math.floor(Math.random() * (owned.length || pool.length))];
  let b = pool[Math.floor(Math.random() * pool.length)];
  let guard = 0;
  while (b.id === a.id && guard++ < 10) b = pool[Math.floor(Math.random() * pool.length)];
  if (b.id === a.id) return null;
  return [a.id, b.id];
}

// Run one bout for a specific champion against a random ladder opponent.
export async function challengeChampion(id: string): Promise<{ winner: string; loser: string; delta: number; topic: string } | null> {
  await ensureSeeded();
  const store = getStore();
  const me = await store.getChampion(id);
  if (!me) return null;
  const pool = (await store.topChampions(50)).filter((c) => c.id !== id);
  if (!pool.length) return null;
  const opp = pool[Math.floor(Math.random() * pool.length)];
  return runRankedBout(id, opp.id);
}

export async function getLadder(limit = 50): Promise<LadderChampion[]> {
  await ensureSeeded();
  return getStore().topChampions(limit);
}

export async function getFeed(limit = 20): Promise<FeedEntry[]> {
  return getStore().getFeed(limit);
}

export async function getOwned(token: string): Promise<LadderChampion[]> {
  if (!token) return [];
  return getStore().getOwned(token);
}
