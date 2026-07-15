// The Circuit leaderboard — ranked by sectors cleared in one run, then total time.
// Higher sectors always beat lower; same sectors → faster time wins.
//
// Per-device split (docs/circuit-board.md): depth is SOUL (one cross-device
// identity fact) but time-at-depth is CRAFT (per input), so the boards are split
// by BODY — the mobile one-thumb Climb (`thumb`) and the desktop 6-DOF Circuit
// (`flight`) each get their own sorted set. A one-thumb time and a 6-DOF time
// can't share a column. One owner token can hold one entry per body.
import "server-only";
import { Redis } from "@upstash/redis";

export type CircuitBody = "thumb" | "flight";

export interface CircuitEntry {
  token: string;
  handle: string;
  sectors: number; // 0..100
  totalMs: number;
  clearedAll: boolean;
  at: number;
  body: CircuitBody;
  reach: number; // server-derived: 0 if sectors===0 else ceil(sectors/10)
}

export interface CircuitBoard {
  shared: boolean;
  body: CircuitBody;
  entries: CircuitEntry[];
  mine: CircuitEntry | null;
}

// per-body keys — the legacy `z:circuit:board` / `z:circuit:entry:<token>` are
// FROZEN (10-scale, body-less, mixed devices): no new writes, archived as
// "Season 0" (docs/circuit-board.md §6).
const boardKey = (body: CircuitBody) => `z:circuit:board:${body}`;
const entryKey = (body: CircuitBody, token: string) => `z:circuit:entry:${body}:${token}`;
const BOARD_CAP = 50;
// 90-min ceiling: a desktop 6-DOF full clear is aspirationally 60–90 min. Still
// < 10M so "one more sector always outranks any time" holds in the packing.
const MAX_MS = 90 * 60 * 1000;
export const MAX_SECTORS = 100;

function reachOf(sectors: number): number {
  return sectors <= 0 ? 0 : Math.ceil(sectors / 10);
}

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
    const eKey = entryKey(entry.body, entry.token);
    const bKey = boardKey(entry.body);
    const prev = await this.r.get<CircuitEntry>(eKey);
    if (prev && !isBetter(entry, prev)) {
      return { saved: false, entry: prev };
    }
    await this.r.set(eKey, entry);
    await this.r.zadd(bKey, { score: circuitScore(entry.sectors, entry.totalMs), member: entry.token });
    const count = await this.r.zcard(bKey);
    if (count > BOARD_CAP) {
      await this.r.zpopmin(bKey, count - BOARD_CAP);
    }
    return { saved: true, entry };
  }

  async board(limit: number, body: CircuitBody, token?: string): Promise<CircuitBoard> {
    const ids = await this.r.zrange<string[]>(boardKey(body), 0, limit - 1, { rev: true });
    const entries: CircuitEntry[] = [];
    for (const id of ids) {
      const e = await this.r.get<CircuitEntry>(entryKey(body, id));
      if (e) entries.push(e);
    }
    let mine: CircuitEntry | null = null;
    if (token) mine = (await this.r.get<CircuitEntry>(entryKey(body, token))) ?? null;
    return { shared: true, body, entries, mine };
  }
}

// ── In-memory fallback ───────────────────────────────────────────────────────
class MemoryCircuit {
  private entries: Record<CircuitBody, Map<string, CircuitEntry>> = {
    thumb: new Map(),
    flight: new Map(),
  };

  async submit(entry: CircuitEntry): Promise<{ saved: boolean; entry: CircuitEntry }> {
    const map = this.entries[entry.body];
    const prev = map.get(entry.token) ?? null;
    if (prev && !isBetter(entry, prev)) {
      return { saved: false, entry: prev };
    }
    map.set(entry.token, entry);
    return { saved: true, entry };
  }

  async board(limit: number, body: CircuitBody, token?: string): Promise<CircuitBoard> {
    const sorted = [...this.entries[body].values()].sort((a, b) => {
      return circuitScore(b.sectors, b.totalMs) - circuitScore(a.sectors, a.totalMs);
    });
    return {
      shared: false,
      body,
      entries: sorted.slice(0, limit),
      mine: token ? (this.entries[body].get(token) ?? null) : null,
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
  body: CircuitBody = "thumb",
): Promise<{ saved: boolean; entry: CircuitEntry }> {
  const s = Math.max(0, Math.min(MAX_SECTORS, Math.floor(sectors)));
  const entry: CircuitEntry = {
    token: token.slice(0, 128),
    handle: handle.slice(0, 24),
    sectors: s,
    totalMs: Math.max(0, Math.min(MAX_MS, Math.floor(totalMs))),
    clearedAll: !!clearedAll,
    at: Date.now(),
    body,
    reach: reachOf(s),
  };
  return getCircuitStore().submit(entry);
}

export async function getCircuitBoard(limit = 20, token?: string, body: CircuitBody = "thumb"): Promise<CircuitBoard> {
  return getCircuitStore().board(Math.min(50, limit), body, token?.slice(0, 128));
}

export { scoreToRank, MAX_MS };
