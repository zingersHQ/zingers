// Server-side persistence for the SHARED world: one global ladder, registered
// champions, and a live bout feed. Backed by Upstash Redis when configured,
// with an in-memory fallback so dev/build/preview never crash before the store
// is provisioned. The in-memory backend is per-instance (not shared) — fine for
// local dev, but the real shared ladder requires the Redis env vars.
import "server-only";
import { Redis } from "@upstash/redis";
import type { CreatureType } from "@/lib/types";

export interface LadderChampion {
  id: string;
  key: string; // base roster creature (moveset + type)
  name: string; // display name
  handle: string; // owner's public handle (optional, "" if none)
  type: CreatureType;
  brain: { provider: "grok" | "http"; endpoint?: string };
  strat: { risk: number; focus: number; aggression: number };
  rating: number;
  wins: number;
  losses: number;
  battles: number;
  house: boolean; // seeded house champion (always on the ladder)
  ownerToken: string; // "" for house champions
  createdAt: number;
}

export interface FeedEntry {
  t: number; // timestamp
  winner: string; // name
  loser: string; // name
  topic: string;
  delta: number; // rating swing
  mode: "ladder";
}

export interface Store {
  getChampion(id: string): Promise<LadderChampion | null>;
  putChampion(c: LadderChampion): Promise<void>;
  topChampions(limit: number): Promise<LadderChampion[]>;
  countChampions(): Promise<number>;
  pushFeed(e: FeedEntry): Promise<void>;
  getFeed(limit: number): Promise<FeedEntry[]>;
  addOwned(token: string, id: string): Promise<void>;
  getOwned(token: string): Promise<LadderChampion[]>;
}

const K = {
  champ: (id: string) => `z:champ:${id}`,
  ladder: "z:ladder",
  feed: "z:feed",
  owner: (token: string) => `z:owner:${token}`,
};

const FEED_CAP = 60;

// ── Upstash backend ──────────────────────────────────────────────────────────
class UpstashStore implements Store {
  constructor(private r: Redis) {}

  async getChampion(id: string) {
    return (await this.r.get<LadderChampion>(K.champ(id))) ?? null;
  }
  async putChampion(c: LadderChampion) {
    await this.r.set(K.champ(c.id), c);
    await this.r.zadd(K.ladder, { score: c.rating, member: c.id });
  }
  async topChampions(limit: number) {
    const ids = (await this.r.zrange<string[]>(K.ladder, 0, limit - 1, { rev: true })) || [];
    if (!ids.length) return [];
    const champs = await Promise.all(ids.map((id) => this.getChampion(id)));
    return champs.filter((c): c is LadderChampion => !!c);
  }
  async countChampions() {
    return (await this.r.zcard(K.ladder)) || 0;
  }
  async pushFeed(e: FeedEntry) {
    await this.r.lpush(K.feed, e);
    await this.r.ltrim(K.feed, 0, FEED_CAP - 1);
  }
  async getFeed(limit: number) {
    return (await this.r.lrange<FeedEntry>(K.feed, 0, limit - 1)) || [];
  }
  async addOwned(token: string, id: string) {
    await this.r.sadd(K.owner(token), id);
  }
  async getOwned(token: string) {
    const ids = (await this.r.smembers(K.owner(token))) || [];
    if (!ids.length) return [];
    const champs = await Promise.all(ids.map((id) => this.getChampion(id)));
    return champs.filter((c): c is LadderChampion => !!c);
  }
}

// ── In-memory fallback (per-instance; not shared across serverless workers) ────
class MemoryStore implements Store {
  private champs = new Map<string, LadderChampion>();
  private feed: FeedEntry[] = [];
  private owners = new Map<string, Set<string>>();

  async getChampion(id: string) {
    return this.champs.get(id) ?? null;
  }
  async putChampion(c: LadderChampion) {
    this.champs.set(c.id, { ...c });
  }
  async topChampions(limit: number) {
    return [...this.champs.values()].sort((a, b) => b.rating - a.rating).slice(0, limit);
  }
  async countChampions() {
    return this.champs.size;
  }
  async pushFeed(e: FeedEntry) {
    this.feed.unshift(e);
    this.feed = this.feed.slice(0, FEED_CAP);
  }
  async getFeed(limit: number) {
    return this.feed.slice(0, limit);
  }
  async addOwned(token: string, id: string) {
    if (!this.owners.has(token)) this.owners.set(token, new Set());
    this.owners.get(token)!.add(id);
  }
  async getOwned(token: string) {
    const ids = [...(this.owners.get(token) ?? [])];
    return ids.map((id) => this.champs.get(id)).filter((c): c is LadderChampion => !!c);
  }
}

let cached: Store | null = null;
let warnedMemory = false;

export function isShared(): boolean {
  return Boolean(
    (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL) &&
      (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN),
  );
}

export function getStore(): Store {
  if (cached) return cached;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    cached = new UpstashStore(new Redis({ url, token }));
  } else {
    if (!warnedMemory) {
      console.warn("[zingers] No Redis env — using in-memory store (not shared across instances). Provision Upstash to enable the real shared ladder.");
      warnedMemory = true;
    }
    cached = new MemoryStore();
  }
  return cached;
}
