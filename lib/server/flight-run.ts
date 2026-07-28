// Ranked Flight run tickets — begin at takeoff, consume on board submit.
// Wall clock must cover claimed depth; kills cold curl posts and instant forges.
// Not full proof-of-play. Makes craft boards harder to fake casually.
import "server-only";
import { Redis } from "@upstash/redis";
import type { CircuitBody } from "@/lib/server/circuit";

export const FLIGHT_RUN_TTL_SEC = 2 * 60 * 60;
/** Allow phone sleep / NTP wobble without rejecting honest runs. */
export const FLIGHT_CLOCK_SKEW_MS = 8_000;

/**
 * Per-sector floor from authored gapSec (~1.1s+) × ~4 gates.
 * 1.8s is still well under a perfect corridor; rejects absurd speed posts.
 */
export const FLIGHT_MIN_MS_PER_SECTOR = 1_800;

export type FlightRunReject =
  | "run_required"
  | "run_unknown"
  | "run_mismatch"
  | "time_too_fast"
  | "wall_too_short"
  | "time_ahead_of_clock";

export interface FlightRunTicket {
  token: string;
  body: CircuitBody;
  startedAt: number;
}

type TimingOk = { ok: true };
type TimingBad = { ok: false; reason: FlightRunReject };

/** Pure timing checks — shared by Redis/memory consume paths. */
export function validateFlightTiming(opts: {
  sectors: number;
  totalMs: number;
  wallMs: number;
  minMsPerSector?: number;
  skewMs?: number;
}): TimingOk | TimingBad {
  const minPer = opts.minMsPerSector ?? FLIGHT_MIN_MS_PER_SECTOR;
  const skew = opts.skewMs ?? FLIGHT_CLOCK_SKEW_MS;
  const s = Math.max(0, Math.floor(opts.sectors));
  const ms = Math.max(0, Math.floor(opts.totalMs));
  const wall = Math.max(0, Math.floor(opts.wallMs));
  const floor = s * minPer;

  if (s > 0 && ms < floor) return { ok: false, reason: "time_too_fast" };
  if (s > 0 && wall + skew < floor) return { ok: false, reason: "wall_too_short" };
  if (ms > wall + skew) return { ok: false, reason: "time_ahead_of_clock" };
  return { ok: true };
}

const runKey = (runId: string) => `z:flight:run:${runId}`;
const activeKey = (body: CircuitBody, token: string) => `z:flight:active:${body}:${token.slice(0, 128)}`;

function newRunId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

function redisClient(): Redis | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

class MemoryFlightRuns {
  private byId = new Map<string, FlightRunTicket & { exp: number }>();
  private active = new Map<string, string>();

  begin(token: string, body: CircuitBody): { runId: string; startedAt: number } {
    const tok = token.slice(0, 128);
    const prev = this.active.get(`${body}:${tok}`);
    if (prev) this.byId.delete(prev);
    const runId = newRunId();
    const startedAt = Date.now();
    this.byId.set(runId, {
      token: tok,
      body,
      startedAt,
      exp: startedAt + FLIGHT_RUN_TTL_SEC * 1000,
    });
    this.active.set(`${body}:${tok}`, runId);
    return { runId, startedAt };
  }

  take(runId: string): FlightRunTicket | null {
    const row = this.byId.get(runId);
    if (!row) return null;
    this.byId.delete(runId);
    const aKey = `${row.body}:${row.token}`;
    if (this.active.get(aKey) === runId) this.active.delete(aKey);
    if (Date.now() > row.exp) return null;
    return { token: row.token, body: row.body, startedAt: row.startedAt };
  }
}

const memory = new MemoryFlightRuns();

export async function beginFlightRun(
  token: string,
  body: CircuitBody,
): Promise<{ runId: string; startedAt: number }> {
  const tok = token.slice(0, 128);
  const r = redisClient();
  if (!r) return memory.begin(tok, body);

  const startedAt = Date.now();
  const runId = newRunId();
  const aKey = activeKey(body, tok);
  const prev = await r.get<string>(aKey);
  if (prev) await r.del(runKey(prev));
  const ticket: FlightRunTicket = { token: tok, body, startedAt };
  await r.set(runKey(runId), ticket, { ex: FLIGHT_RUN_TTL_SEC });
  await r.set(aKey, runId, { ex: FLIGHT_RUN_TTL_SEC });
  return { runId, startedAt };
}

export async function consumeFlightRun(opts: {
  runId: string | undefined;
  token: string;
  body: CircuitBody;
  sectors: number;
  totalMs: number;
}): Promise<{ ok: true; startedAt: number } | { ok: false; reason: FlightRunReject }> {
  const runId = typeof opts.runId === "string" ? opts.runId.trim() : "";
  if (!runId || runId.length < 16 || runId.length > 64) {
    return { ok: false, reason: "run_required" };
  }

  const tok = opts.token.slice(0, 128);
  const r = redisClient();
  let ticket: FlightRunTicket | null = null;

  if (!r) {
    ticket = memory.take(runId);
  } else {
    const key = runKey(runId);
    ticket = (await r.get<FlightRunTicket>(key)) ?? null;
    if (ticket) {
      await r.del(key);
      const aKey = activeKey(ticket.body, ticket.token);
      const active = await r.get<string>(aKey);
      if (active === runId) await r.del(aKey);
    }
  }

  if (!ticket) return { ok: false, reason: "run_unknown" };
  if (ticket.token !== tok || ticket.body !== opts.body) {
    return { ok: false, reason: "run_mismatch" };
  }

  const wallMs = Date.now() - ticket.startedAt;
  const timing = validateFlightTiming({
    sectors: opts.sectors,
    totalMs: opts.totalMs,
    wallMs,
  });
  if (!timing.ok) return timing;
  return { ok: true, startedAt: ticket.startedAt };
}
