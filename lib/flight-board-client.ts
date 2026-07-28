// Client helper for ranked Flight board submits — begin ticket at takeoff,
// submit with retry when the network drops after a live ticket was issued.
// Offline at takeoff (no runId) cannot be recovered without weakening wall-clock.

export type FlightBoardBody = "thumb" | "flight";

const STORAGE_KEY = "zingers_flight_board_pending_v1";
/** Match server ticket TTL (`FLIGHT_RUN_TTL_SEC`). */
const MAX_AGE_MS = 2 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 8;

const FINAL_REJECTS = new Set([
  "run_required",
  "run_unknown",
  "run_mismatch",
  "time_too_fast",
  "wall_too_short",
  "time_ahead_of_clock",
]);

export type CircuitBoardSubmit = {
  kind: "circuit";
  token: string;
  body: FlightBoardBody;
  sectors: number;
  totalMs: number;
  clearedAll: boolean;
  campsLit?: number;
  runId: string;
};

export type ExpeditionBoardSubmit = {
  kind: "expedition";
  token: string;
  body: FlightBoardBody;
  weekId: string;
  sectors: number;
  totalMs: number;
  runId: string;
};

type PendingRow = (CircuitBoardSubmit | ExpeditionBoardSubmit) & {
  at: number;
  attempts: number;
};

export type BoardSubmitResult = {
  /** Server accepted the write path (saved or not-a-PB). */
  ok: boolean;
  /** Network flake — queued for retry while the ticket may still live. */
  queued: boolean;
  craftCrowns?: number;
  balance?: number;
  rejected?: string;
};

export async function beginFlightBoardRun(
  token: string,
  body: FlightBoardBody,
): Promise<string | null> {
  try {
    const r = await fetch("/api/circuit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "begin", token, body }),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { runId?: string };
    return typeof j.runId === "string" && j.runId.length >= 16 ? j.runId : null;
  } catch {
    return null;
  }
}

function readQueue(): PendingRow[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PendingRow[];
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    return parsed.filter(
      (p) =>
        p &&
        typeof p.runId === "string" &&
        p.runId.length >= 16 &&
        typeof p.at === "number" &&
        now - p.at < MAX_AGE_MS &&
        (p.attempts ?? 0) < MAX_ATTEMPTS,
    );
  } catch {
    return [];
  }
}

function writeQueue(rows: PendingRow[]): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    if (rows.length === 0) sessionStorage.removeItem(STORAGE_KEY);
    else sessionStorage.setItem(STORAGE_KEY, JSON.stringify(rows.slice(0, 4)));
  } catch {
    /* quota / private mode */
  }
}

function enqueue(row: CircuitBoardSubmit | ExpeditionBoardSubmit): void {
  const q = readQueue().filter((p) => p.runId !== row.runId);
  q.push({ ...row, at: Date.now(), attempts: 0 });
  writeQueue(q);
  scheduleFlush(1_500);
}

function bumpAttempt(runId: string): void {
  const q = readQueue();
  const next = q
    .map((p) => (p.runId === runId ? { ...p, attempts: (p.attempts ?? 0) + 1 } : p))
    .filter((p) => (p.attempts ?? 0) < MAX_ATTEMPTS);
  writeQueue(next);
}

function dropFromQueue(runId: string): void {
  writeQueue(readQueue().filter((p) => p.runId !== runId));
}

async function postOnce(row: CircuitBoardSubmit | ExpeditionBoardSubmit): Promise<BoardSubmitResult> {
  const url = row.kind === "circuit" ? "/api/circuit" : "/api/expedition";
  const body =
    row.kind === "circuit"
      ? {
          token: row.token,
          body: row.body,
          sectors: row.sectors,
          totalMs: row.totalMs,
          clearedAll: row.clearedAll,
          campsLit: row.campsLit,
          runId: row.runId,
        }
      : {
          token: row.token,
          weekId: row.weekId,
          body: row.body,
          sectors: row.sectors,
          totalMs: row.totalMs,
          runId: row.runId,
        };

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      // 5xx / rate limit — worth another try while the ticket lives.
      if (r.status >= 500 || r.status === 429) {
        return { ok: false, queued: true };
      }
      return { ok: false, queued: false, rejected: `http_${r.status}` };
    }
    let j: { balance?: number; craftCrowns?: number; rejected?: string; saved?: boolean } = {};
    try {
      j = (await r.json()) as typeof j;
    } catch {
      /* empty */
    }
    if (typeof j.rejected === "string" && j.rejected) {
      // Ticket consumed or invalid — do not loop.
      if (FINAL_REJECTS.has(j.rejected)) {
        return { ok: false, queued: false, rejected: j.rejected, balance: j.balance };
      }
      return { ok: false, queued: false, rejected: j.rejected, balance: j.balance };
    }
    return {
      ok: true,
      queued: false,
      craftCrowns: typeof j.craftCrowns === "number" ? j.craftCrowns : 0,
      balance: typeof j.balance === "number" ? j.balance : undefined,
    };
  } catch {
    return { ok: false, queued: true };
  }
}

/**
 * Submit a board row. Requires a takeoff `runId`. On network flake, queues in
 * sessionStorage and retries on online / focus until ticket TTL.
 */
export async function submitFlightBoardRun(
  row: CircuitBoardSubmit | ExpeditionBoardSubmit,
): Promise<BoardSubmitResult> {
  if (!row.runId || row.runId.length < 16) {
    return { ok: false, queued: false, rejected: "run_required" };
  }
  const result = await postOnce(row);
  if (result.ok) {
    dropFromQueue(row.runId);
    return result;
  }
  if (result.queued) {
    enqueue(row);
    return { ...result, queued: true };
  }
  dropFromQueue(row.runId);
  return result;
}

let flushTimer: number | null = null;
let flushing = false;

function scheduleFlush(delayMs: number): void {
  if (typeof window === "undefined") return;
  if (flushTimer != null) window.clearTimeout(flushTimer);
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    void flushPendingFlightBoardSubmits();
  }, Math.max(0, delayMs));
}

export async function flushPendingFlightBoardSubmits(): Promise<void> {
  if (typeof window === "undefined" || flushing) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  const q = readQueue();
  if (q.length === 0) return;
  flushing = true;
  try {
    let anyRetryable = false;
    for (const row of q) {
      const { at, attempts, ...payload } = row;
      void at;
      void attempts;
      const result = await postOnce(payload);
      if (result.ok) {
        dropFromQueue(row.runId);
        continue;
      }
      if (result.queued) {
        bumpAttempt(row.runId);
        anyRetryable = true;
        continue;
      }
      dropFromQueue(row.runId);
    }
    if (anyRetryable) {
      const next = readQueue()[0];
      const n = next?.attempts ?? 1;
      scheduleFlush(Math.min(60_000, 2_000 * 2 ** Math.min(5, n)));
    }
  } finally {
    flushing = false;
  }
}

let listenersBound = false;

/** Idempotent — call from Flight mounts so a return online flushes the queue. */
export function armFlightBoardRetryListeners(): void {
  if (typeof window === "undefined" || listenersBound) return;
  listenersBound = true;
  window.addEventListener("online", () => {
    void flushPendingFlightBoardSubmits();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) void flushPendingFlightBoardSubmits();
  });
  // Catch submits left from a prior run in this tab.
  scheduleFlush(800);
}
