// Unique Ubuntu-style names for ranked champions (not Trainers).
// Mint only when a champion enters the standings — claim / ranked mirror.
import "server-only";
import { Redis } from "@upstash/redis";
import { trainerNameKey } from "@/lib/trainer-label";
import { championNameCandidates, CHAMPION_NAME_BASE_POOL } from "@/lib/champion-names";

type NameStore = {
  getName(champId: string): Promise<string | null>;
  setName(champId: string, name: string): Promise<void>;
  getClaim(nameKey: string): Promise<string | null>;
  tryClaim(nameKey: string, champId: string): Promise<boolean>;
};

function redis(): Redis | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

class RedisNames implements NameStore {
  constructor(private r: Redis) {}
  async getName(champId: string) {
    return (await this.r.get<string>(`z:cname:${champId}`)) ?? null;
  }
  async setName(champId: string, name: string) {
    await this.r.set(`z:cname:${champId}`, name);
  }
  async getClaim(nameKey: string) {
    return (await this.r.get<string>(`z:cname:claim:${nameKey}`)) ?? null;
  }
  async tryClaim(nameKey: string, champId: string) {
    const owner = await this.getClaim(nameKey);
    if (owner === champId) return true;
    if (owner) return false;
    const ok = await this.r.set(`z:cname:claim:${nameKey}`, champId, { nx: true });
    return ok === "OK";
  }
}

class MemoryNames implements NameStore {
  private names = new Map<string, string>();
  private claims = new Map<string, string>();
  async getName(champId: string) {
    return this.names.get(champId) ?? null;
  }
  async setName(champId: string, name: string) {
    this.names.set(champId, name);
  }
  async getClaim(nameKey: string) {
    return this.claims.get(nameKey) ?? null;
  }
  async tryClaim(nameKey: string, champId: string) {
    const owner = this.claims.get(nameKey);
    if (owner === champId) return true;
    if (owner) return false;
    this.claims.set(nameKey, champId);
    return true;
  }
}

let memo: NameStore | null = null;
function store(): NameStore {
  if (memo) return memo;
  const r = redis();
  memo = r ? new RedisNames(r) : new MemoryNames();
  return memo;
}

/** Peek — does not mint. */
export async function getChampionName(champId: string): Promise<string | null> {
  if (!champId) return null;
  return store().getName(champId);
}

/**
 * Idempotent unique name for a ranked champion.
 * `seed` should include ownerToken + roster key + id so retries stay stable.
 */
export async function ensureChampionName(champId: string, seed: string): Promise<string> {
  const id = champId.trim().slice(0, 32);
  if (!id) return "Unnamed";

  const s = store();
  const existing = await s.getName(id);
  if (existing) return existing;

  for (const candidate of championNameCandidates(seed || id)) {
    const key = trainerNameKey(candidate);
    if (!key) continue;
    const ok = await s.tryClaim(key, id);
    if (!ok) continue;
    await s.setName(id, candidate);
    return candidate;
  }

  // Should be unreachable with suffix runway to 9999.
  const fallback = `Echo ${id.slice(0, 8)}`;
  await s.tryClaim(trainerNameKey(fallback) || fallback.toLowerCase(), id);
  await s.setName(id, fallback);
  return fallback;
}

export function championNamePoolInfo() {
  return { basePairs: CHAMPION_NAME_BASE_POOL, suffixMax: 9999 };
}
