// The Circuit leaderboard — ranked by sectors cleared in one run, then total time.
// Higher sectors always beat lower; same sectors → faster time wins.
import "server-only";
import { Redis } from "@upstash/redis";

export interface CircuitEntry {
  token: string;
  handle: string;
  sectors: number;
  totalMs: number;
  clearedAll: boolean;
  at: number;
}

export interface CircuitBoard {
  shared: boolean;
  entries: CircuitEntry[];
  mine: CircuitEntry | null;
}

const K_BOARD = "z:circuit:board";
const K_ENTRY = (token: string) => `z:circuit:entry:${token}`;
const BOARD_CAP = 50;
const MAX_MS = 20 * 60 * 1000; // 20 min ceiling for score encoding

/** Higher score = better rank in the sorted set. */
export function circuitScore(sectors: number, totalMs: number): number {
  const ms = Math.max(0, Math.min(MAX_MS, Math.floor(totalMs)));
  return sectors * 10_000_000 + (MAX_MS - ms);
}

function scoreToRank(score: number): { sectors: number; totalMs: number } {
  const sectors = Math.floor(score / 10_000_000);
  const totalMs = MAX_MS - (score % 10_000_000);
  return { sectors, totalMs };
}

function isBetter(a: CircuitEntry, b: CircuitEntry | null): boolean {
  if (!b) return true;
  if (a.sectors !== b.sectors) return a.sectors > b.sectors;
  return a.totalMs < b.totalMs;
}

// ── Redis backend ────────────────────────────────────────────────────────────
class RedisCircuit {
  constructor(private r: Redis) {}

  async submit(entry: CircuitEntry): Promise<{ saved: boolean; entry: CircuitEntry }> {
    const prev = await this.r.get<CircuitEntry>(K_ENTRY(entry.token));
    if (prev && !isBetter(entry, prev)) {
      return { saved: false, entry: prev };
    }
    await this.r.set(K_ENTRY(entry.token), entry);
    await this.r.zadd(K_BOARD, { score: circuitScore(entry.sectors, entry.totalMs), member: entry.token });
    // Trim board to cap (remove lowest scores)
    const count = await this.r.zcard(K_BOARD);
    if (count > BOARD_CAP) {
      await this.r.zpopmin(K_BOARD, count - BOARD_CAP);
    }
    return { saved: true, entry };
  }

  async board(limit: number, token?: string): Promise<CircuitBoard> {
    const ids = await this.r.zrange<string[]>(K_BOARD, 0, limit - 1, { rev: true });
    const entries: CircuitEntry[] = [];
    for (const id of ids) {
      const e = await this.r.get<CircuitEntry>(K_ENTRY(id));
      if (e) entries.push(e);
    }
    let mine: CircuitEntry | null = null;
    if (token) mine = (await this.r.get<CircuitEntry>(K_ENTRY(token))) ?? null;
    return { shared: true, entries, mine };
  }
}

// ── In-memory fallback ───────────────────────────────────────────────────────
class MemoryCircuit {
  private entries = new Map<string, CircuitEntry>();

  async submit(entry: CircuitEntry): Promise<{ saved: boolean; entry: CircuitEntry }> {
    const prev = this.entries.get(entry.token) ?? null;
    if (prev && !isBetter(entry, prev)) {
      return { saved: false, entry: prev };
    }
    this.entries.set(entry.token, entry);
    return { saved: true, entry };
  }

  async board(limit: number, token?: string): Promise<CircuitBoard> {
    const sorted = [...this.entries.values()].sort((a, b) => {
      const sa = circuitScore(a.sectors, a.totalMs);
      const sb = circuitScore(b.sectors, b.totalMs);
      return sb - sa;
    });
    return {
      shared: false,
      entries: sorted.slice(0, limit),
      mine: token ? (this.entries.get(token) ?? null) : null,
    };
  }
}

let cached: RedisCircuit | MemoryCircuit | null = null;

function getCircuitStore(): RedisCircuit | MemoryCircuit {
  if (cached) return cached;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    cached = new RedisCircuit(new Redis({ url, token }));
  } else {
    cached = new MemoryCircuit();
  }
  return cached;
}

export function isCircuitShared(): boolean {
  return Boolean(
    (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL) &&
      (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN),
  );
}

export async function submitCircuitRun(
  token: string,
  handle: string,
  sectors: number,
  totalMs: number,
  clearedAll: boolean,
): Promise<{ saved: boolean; entry: CircuitEntry }> {
  const entry: CircuitEntry = {
    token: token.slice(0, 128),
    handle: handle.slice(0, 24),
    sectors: Math.max(0, Math.min(10, Math.floor(sectors))),
    totalMs: Math.max(0, Math.min(MAX_MS, Math.floor(totalMs))),
    clearedAll: !!clearedAll,
    at: Date.now(),
  };
  return getCircuitStore().submit(entry);
}

export async function getCircuitBoard(limit = 20, token?: string): Promise<CircuitBoard> {
  return getCircuitStore().board(Math.min(50, limit), token?.slice(0, 128));
}

export { scoreToRank };
