// Weekly Expedition board — same depth-then-time packing as Circuit, keyed by
// weekId + body. No craft Crowns here (client awards fractional XP/Crowns);
// the board is the shared weekly prestige.
import "server-only";
import { Redis } from "@upstash/redis";
import { EXPEDITION_SECTORS } from "@/lib/expeditions";
import { shortOwnerLabel } from "@/lib/trainer-label";
import type { CircuitBody } from "@/lib/server/circuit";
import { circuitScore } from "@/lib/server/circuit";

export interface ExpeditionEntry {
  token: string;
  handle: string;
  weekId: string;
  sectors: number;
  totalMs: number;
  clearedAll: boolean;
  at: number;
  body: CircuitBody;
}

export interface ExpeditionPublicEntry {
  handle: string;
  sectors: number;
  totalMs: number;
  clearedAll: boolean;
  you: boolean;
}

export interface ExpeditionPublicBoard {
  shared: boolean;
  weekId: string;
  body: CircuitBody;
  entries: ExpeditionPublicEntry[];
  mine: ExpeditionPublicEntry | null;
}

const BOARD_CAP = 50;
const MAX_MS = 90 * 60 * 1000;
const MIN_MS_PER_SECTOR = 400;

const boardKey = (weekId: string, body: CircuitBody) => `z:expedition:board:${weekId}:${body}`;
const entryKey = (weekId: string, body: CircuitBody, token: string) =>
  `z:expedition:entry:${weekId}:${body}:${token}`;

function isBetter(a: ExpeditionEntry, b: ExpeditionEntry | null): boolean {
  if (!b) return true;
  if (a.sectors !== b.sectors) return a.sectors > b.sectors;
  return a.totalMs < b.totalMs;
}

function toPublic(e: ExpeditionEntry, you: boolean): ExpeditionPublicEntry {
  return {
    handle: e.handle,
    sectors: e.sectors,
    totalMs: e.totalMs,
    clearedAll: e.clearedAll,
    you,
  };
}

class RedisExpedition {
  constructor(private r: Redis) {}

  async submit(entry: ExpeditionEntry): Promise<{ saved: boolean; entry: ExpeditionEntry }> {
    const eKey = entryKey(entry.weekId, entry.body, entry.token);
    const bKey = boardKey(entry.weekId, entry.body);
    const prev = await this.r.get<ExpeditionEntry>(eKey);
    if (prev && !isBetter(entry, prev)) {
      if (prev.handle !== entry.handle) {
        const refreshed = { ...prev, handle: entry.handle };
        await this.r.set(eKey, refreshed);
        return { saved: false, entry: refreshed };
      }
      return { saved: false, entry: prev };
    }
    await this.r.set(eKey, entry);
    await this.r.zadd(bKey, {
      score: circuitScore(entry.sectors, entry.totalMs),
      member: entry.token,
    });
    // Expire board after ~3 weeks so Redis doesn't keep every week forever.
    await this.r.expire(bKey, 21 * 86_400);
    await this.r.expire(eKey, 21 * 86_400);
    const count = await this.r.zcard(bKey);
    if (count > BOARD_CAP) await this.r.zpopmin(bKey, count - BOARD_CAP);
    return { saved: true, entry };
  }

  async board(weekId: string, limit: number, body: CircuitBody, token?: string): Promise<ExpeditionPublicBoard> {
    const ids = await this.r.zrange<string[]>(boardKey(weekId, body), 0, limit - 1, { rev: true });
    const entries: ExpeditionPublicEntry[] = [];
    for (const id of ids) {
      const e = await this.r.get<ExpeditionEntry>(entryKey(weekId, body, id));
      if (e) entries.push(toPublic(e, !!token && e.token === token));
    }
    let mine: ExpeditionPublicEntry | null = null;
    if (token) {
      const m = await this.r.get<ExpeditionEntry>(entryKey(weekId, body, token));
      if (m) mine = toPublic(m, true);
    }
    return { shared: true, weekId, body, entries, mine };
  }
}

class MemoryExpedition {
  private entries = new Map<string, ExpeditionEntry>();

  private key(weekId: string, body: CircuitBody, token: string) {
    return `${weekId}:${body}:${token}`;
  }

  async submit(entry: ExpeditionEntry): Promise<{ saved: boolean; entry: ExpeditionEntry }> {
    const k = this.key(entry.weekId, entry.body, entry.token);
    const prev = this.entries.get(k) ?? null;
    if (prev && !isBetter(entry, prev)) {
      if (prev.handle !== entry.handle) {
        const refreshed = { ...prev, handle: entry.handle };
        this.entries.set(k, refreshed);
        return { saved: false, entry: refreshed };
      }
      return { saved: false, entry: prev };
    }
    this.entries.set(k, entry);
    return { saved: true, entry };
  }

  async board(weekId: string, limit: number, body: CircuitBody, token?: string): Promise<ExpeditionPublicBoard> {
    const sorted = [...this.entries.values()]
      .filter((e) => e.weekId === weekId && e.body === body)
      .sort((a, b) => circuitScore(b.sectors, b.totalMs) - circuitScore(a.sectors, a.totalMs));
    return {
      shared: false,
      weekId,
      body,
      entries: sorted.slice(0, limit).map((e) => toPublic(e, !!token && e.token === token)),
      mine: token
        ? (() => {
            const m = this.entries.get(this.key(weekId, body, token));
            return m ? toPublic(m, true) : null;
          })()
        : null,
    };
  }
}

let cached: RedisExpedition | MemoryExpedition | null = null;

function getStore(): RedisExpedition | MemoryExpedition {
  if (cached) return cached;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  cached =
    url && token
      ? new RedisExpedition(new Redis({ url, token }))
      : new MemoryExpedition();
  return cached;
}

export function isExpeditionShared(): boolean {
  return Boolean(
    (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL) &&
      (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN),
  );
}

export async function submitExpeditionRun(
  token: string,
  weekId: string,
  sectors: number,
  totalMs: number,
  body: CircuitBody = "thumb",
): Promise<{ saved: boolean; entry: ExpeditionPublicEntry; rejected?: string }> {
  const tok = token.slice(0, 128);
  const week = weekId.slice(0, 16);
  // Trainers are nameless drivers — board shows a short token stub, not a vanity name.
  const handle = shortOwnerLabel(tok);
  const s = Math.max(0, Math.min(EXPEDITION_SECTORS, Math.floor(sectors)));
  const ms = Math.max(0, Math.min(MAX_MS, Math.floor(totalMs)));
  const clearedAll = s >= EXPEDITION_SECTORS;

  if (s > 0 && ms < s * MIN_MS_PER_SECTOR) {
    return {
      saved: false,
      rejected: "time_too_fast",
      entry: { handle, sectors: 0, totalMs: 0, clearedAll: false, you: true },
    };
  }

  const entry: ExpeditionEntry = {
    token: tok,
    handle,
    weekId: week,
    sectors: s,
    totalMs: ms,
    clearedAll,
    at: Date.now(),
    body,
  };
  const result = await getStore().submit(entry);
  return { saved: result.saved, entry: toPublic(result.entry, true) };
}

export async function getPublicExpeditionBoard(
  weekId: string,
  limit: number,
  token: string | undefined,
  body: CircuitBody,
): Promise<ExpeditionPublicBoard> {
  const board = await getStore().board(weekId.slice(0, 16), Math.min(50, limit), body, token);
  return { ...board, shared: isExpeditionShared() };
}
