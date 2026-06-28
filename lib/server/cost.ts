// LLM cost model — turns measured token usage into dollars and projects spend at
// scale, so the autonomous League and live judge are budgeted HONESTLY before any
// aggressive monetization (the report's "model real LLM costs" risk). Pricing is
// env-overridable; usage is recorded by the house LLM client (lib/engine/xai.ts).
import "server-only";
import { getStore } from "./store";

// USD per 1M tokens. Override with ZINGERS_PRICE_IN / ZINGERS_PRICE_OUT when the
// house model or its pricing changes — no code edit needed.
const PRICE_IN_PER_M = Number(process.env.ZINGERS_PRICE_IN ?? 0.2);
const PRICE_OUT_PER_M = Number(process.env.ZINGERS_PRICE_OUT ?? 0.5);

const utcDay = (now = Date.now()) => Math.floor(now / 86_400_000);

export function usdFor(inTok: number, outTok: number): number {
  return (inTok / 1e6) * PRICE_IN_PER_M + (outTok / 1e6) * PRICE_OUT_PER_M;
}

// Best-effort: record one house LLM call's usage into today's counters. Never
// throws into the caller (cost accounting must not break a bout).
export async function recordUsage(promptTokens: number, completionTokens: number): Promise<void> {
  if (!promptTokens && !completionTokens) return;
  try {
    await getStore().incrUsage(utcDay(), 1, Math.max(0, promptTokens | 0), Math.max(0, completionTokens | 0));
  } catch {
    // accounting is non-fatal
  }
}

// Is today's measured house spend still under the configured daily cap? Used by
// the autonomous League to stop spending when over budget (cap 0 = unlimited).
export async function withinDailyBudget(): Promise<boolean> {
  const cap = Number(process.env.LLM_DAILY_BUDGET_USD ?? 0);
  if (!cap || cap <= 0) return true;
  const { usd } = await getDailyCost();
  return usd < cap;
}

export interface CostSnapshot {
  day: number;
  calls: number;
  inTok: number;
  outTok: number;
  usd: number;
  pricing: { inPerM: number; outPerM: number };
}

export async function getDailyCost(day = utcDay()): Promise<CostSnapshot> {
  const u = await getStore().getUsage(day);
  return { day, calls: u.calls, inTok: u.inTok, outTok: u.outTok, usd: usdFor(u.inTok, u.outTok), pricing: { inPerM: PRICE_IN_PER_M, outPerM: PRICE_OUT_PER_M } };
}

// Measured spend for each given UTC day (oldest → newest as passed). One read per
// day; powers the dashboard's daily-burn chart and trailing-average anomaly check.
export async function costSeries(days: number[]): Promise<CostSnapshot[]> {
  const store = getStore();
  const usages = await Promise.all(days.map((d) => store.getUsage(d)));
  return days.map((d, i) => ({
    day: d,
    calls: usages[i].calls,
    inTok: usages[i].inTok,
    outTok: usages[i].outTok,
    usd: usdFor(usages[i].inTok, usages[i].outTok),
    pricing: { inPerM: PRICE_IN_PER_M, outPerM: PRICE_OUT_PER_M },
  }));
}

// The configured daily spend cap (0/unset = uncapped). Surfaced so the dashboard
// can show headroom and warn when no guardrail is set (launch gate 4).
export function dailyBudgetCapUsd(): number {
  const cap = Number(process.env.LLM_DAILY_BUDGET_USD ?? 0);
  return Number.isFinite(cap) && cap > 0 ? cap : 0;
}

export interface ProjectionInput {
  dau: number; // daily active players
  boutsPerPlayerPerDay: number; // live bouts a player watches/runs
  leagueBoutsPerDay: number; // autonomous league bouts/day (server-paid)
}

export interface Projection extends ProjectionInput {
  callsPerBout: number; // 2 actors × ~7 turns + 1 judge/turn ≈ measured average
  avgInTok: number;
  avgOutTok: number;
  monthlyUsd: number;
}

// Project monthly house spend. Uses MEASURED per-call token averages from today's
// counters when available, so the estimate self-calibrates instead of guessing.
export async function projectMonthly(input: ProjectionInput): Promise<Projection> {
  const today = await getStore().getUsage(utcDay());
  const avgInTok = today.calls ? today.inTok / today.calls : 450;
  const avgOutTok = today.calls ? today.outTok / today.calls : 120;
  // A live bout: each turn is ~1 actor decision + 1 judge call; ~7 turns/bout.
  const callsPerBout = 16;
  const usdPerBout = callsPerBout * usdFor(avgInTok, avgOutTok);
  const boutsPerDay = input.dau * input.boutsPerPlayerPerDay + input.leagueBoutsPerDay;
  const monthlyUsd = usdPerBout * boutsPerDay * 30;
  return { ...input, callsPerBout, avgInTok, avgOutTok, monthlyUsd };
}
