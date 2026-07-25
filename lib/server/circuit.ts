// The Circuit leaderboard — ranked by sectors cleared in one run, then total time.
// Higher sectors always beat lower; same sectors → faster time wins.
//
// Per-device split (docs/circuit-board.md): depth is SOUL (one cross-device
// identity fact) but time-at-depth is CRAFT (per input), so the boards are split
// by BODY — the mobile one-thumb Climb (`thumb`) and the desktop 6-DOF Circuit
// (`flight`) each get their own sorted set. A one-thumb time and a 6-DOF time
// can't share a column. One owner token can hold one entry per body.
//
// Display labels are server-authoritative (linked claimed name → short wallet →
// short token). Client-supplied handles are ignored on submit.
import "server-only";
import { Redis } from "@upstash/redis";
import { ascentCraftCrowns, CLIMB_SECTOR_COUNT } from "@/lib/ascent-rules";
import {
  DAILY_VARIABLE_EARN_CAP,
  MAX_GAUNTLET_PAYOUTS_PER_DAY,
} from "@/lib/economy";
import { getStore } from "@/lib/server/store";
import { resolveTrainerLabel } from "@/lib/server/solana-link";
import { track } from "@/lib/server/track";

export type CircuitBody = "thumb" | "flight";

export interface CircuitEntry {
  token: string;
  handle: string;
  sectors: number; // 0..CLIMB_SECTOR_COUNT
  totalMs: number;
  clearedAll: boolean;
  at: number;
  body: CircuitBody;
  reach: number; // server-derived: 0 if sectors===0 else ceil(sectors/REACH_SIZE)
}

/** Public board row — no owner token leaked. */
export interface CircuitPublicEntry {
  handle: string;
  sectors: number;
  totalMs: number;
  clearedAll: boolean;
  reach: number;
  you: boolean;
}

export interface CircuitBoard {
  shared: boolean;
  body: CircuitBody;
  entries: CircuitEntry[];
  mine: CircuitEntry | null;
}

export interface CircuitPublicBoard {
  shared: boolean;
  body: CircuitBody;
  entries: CircuitPublicEntry[];
  mine: CircuitPublicEntry | null;
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
/** Soft floor — rejects absurd speed-posts (not proof of play; boards stay soft-trust). */
const MIN_MS_PER_SECTOR = 400;
export const MAX_SECTORS = CLIMB_SECTOR_COUNT;

const utcDay = () => Math.floor(Date.now() / 86_400_000);

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

  async writeEntry(entry: CircuitEntry): Promise<void> {
    await this.r.set(entryKey(entry.body, entry.token), entry);
  }

  async submit(entry: CircuitEntry): Promise<{ saved: boolean; entry: CircuitEntry }> {
    const eKey = entryKey(entry.body, entry.token);
    const bKey = boardKey(entry.body);
    const prev = await this.r.get<CircuitEntry>(eKey);
    if (prev && !isBetter(entry, prev)) {
      // Identity may have changed since the last best — refresh label only.
      if (prev.handle !== entry.handle) {
        const refreshed = { ...prev, handle: entry.handle };
        await this.writeEntry(refreshed);
        return { saved: false, entry: refreshed };
      }
      return { saved: false, entry: prev };
    }
    await this.writeEntry(entry);
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

  writeEntry(entry: CircuitEntry): void {
    this.entries[entry.body].set(entry.token, entry);
  }

  async submit(entry: CircuitEntry): Promise<{ saved: boolean; entry: CircuitEntry }> {
    const map = this.entries[entry.body];
    const prev = map.get(entry.token) ?? null;
    if (prev && !isBetter(entry, prev)) {
      if (prev.handle !== entry.handle) {
        const refreshed = { ...prev, handle: entry.handle };
        this.writeEntry(refreshed);
        return { saved: false, entry: refreshed };
      }
      return { saved: false, entry: prev };
    }
    this.writeEntry(entry);
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
  sectors: number,
  totalMs: number,
  _clearedAll: boolean,
  body: CircuitBody = "thumb",
): Promise<{
  saved: boolean;
  entry: CircuitPublicEntry;
  craftCrowns: number;
  balance?: number;
  rejected?: string;
}> {
  const tok = token.slice(0, 128);
  const handle = (await resolveTrainerLabel(tok)).slice(0, 48);
  const s = Math.max(0, Math.min(MAX_SECTORS, Math.floor(sectors)));
  const ms = Math.max(0, Math.min(MAX_MS, Math.floor(totalMs)));
  // Server decides clear — client flag is ignored.
  const clearedAll = s === MAX_SECTORS;

  if (s > 0 && ms < s * MIN_MS_PER_SECTOR) {
    const prev = (await getCircuitBoard(1, tok, body)).mine;
    return {
      saved: false,
      craftCrowns: 0,
      rejected: "time_too_fast",
      entry: prev
        ? {
            handle: prev.handle,
            sectors: prev.sectors,
            totalMs: prev.totalMs,
            clearedAll: prev.clearedAll,
            reach: prev.reach,
            you: true,
          }
        : {
            handle,
            sectors: 0,
            totalMs: 0,
            clearedAll: false,
            reach: 0,
            you: true,
          },
    };
  }

  const entry: CircuitEntry = {
    token: tok,
    handle,
    sectors: s,
    totalMs: ms,
    clearedAll,
    at: Date.now(),
    body,
    reach: reachOf(s),
  };
  const result = await getCircuitStore().submit(entry);

  // Craft Crowns only on a real server-side PB — amount from shared formula, not client.
  let craftCrowns = 0;
  let balance: number | undefined;
  if (result.saved) {
    const amt = ascentCraftCrowns(result.entry.sectors, result.entry.clearedAll);
    if (amt > 0) {
      const store = getStore();
      const day = utcDay();
      const claimKey = `ascent:${body}:${tok}:${result.entry.sectors}:${result.entry.totalMs}`;
      const claimed = await store.claimOnce(claimKey, 2 * 86_400);
      if (claimed) {
        const n = await store.incrGauntletPayout(tok, day);
        if (n <= MAX_GAUNTLET_PAYOUTS_PER_DAY) {
          const earned = await store.incrDailyEarn(tok, day, amt);
          if (earned <= DAILY_VARIABLE_EARN_CAP) {
            const w = await store.adjustWallet(tok, amt);
            if (w.ok) {
              craftCrowns = amt;
              balance = w.balance;
              void track("earn", tok, amt);
            }
          } else {
            await store.incrDailyEarn(tok, day, -amt);
          }
        }
      }
    }
  }
  if (balance == null) balance = await getStore().getWallet(tok);

  return {
    saved: result.saved,
    craftCrowns,
    balance,
    entry: {
      handle: result.entry.handle,
      sectors: result.entry.sectors,
      totalMs: result.entry.totalMs,
      clearedAll: result.entry.clearedAll,
      reach: result.entry.reach,
      you: true,
    },
  };
}

export async function getCircuitBoard(limit = 20, token?: string, body: CircuitBody = "thumb"): Promise<CircuitBoard> {
  return getCircuitStore().board(Math.min(50, limit), body, token?.slice(0, 128));
}

/** Resolve live identity labels and strip owner tokens from the public payload. */
export async function getPublicCircuitBoard(
  limit = 20,
  token?: string,
  body: CircuitBody = "thumb",
): Promise<CircuitPublicBoard> {
  const board = await getCircuitBoard(limit, token, body);
  const mineTok = board.mine?.token;
  const labelCache = new Map<string, string>();
  const labelFor = async (tok: string) => {
    const hit = labelCache.get(tok);
    if (hit) return hit;
    const label = await resolveTrainerLabel(tok);
    labelCache.set(tok, label);
    return label;
  };

  const entries: CircuitPublicEntry[] = [];
  for (const e of board.entries) {
    const handle = await labelFor(e.token);
    entries.push({
      handle,
      sectors: e.sectors,
      totalMs: e.totalMs,
      clearedAll: e.clearedAll,
      reach: e.reach,
      you: !!mineTok && e.token === mineTok,
    });
  }

  let mine: CircuitPublicEntry | null = null;
  if (board.mine) {
    const handle = await labelFor(board.mine.token);
    mine = {
      handle,
      sectors: board.mine.sectors,
      totalMs: board.mine.totalMs,
      clearedAll: board.mine.clearedAll,
      reach: board.mine.reach,
      you: true,
    };
  }

  return { shared: board.shared, body: board.body, entries, mine };
}

export { scoreToRank, MAX_MS };
