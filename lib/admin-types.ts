// Shared shapes for the /admin Control Room — imported by both the server
// assembler (lib/server/admin.ts) and the client dashboard, so neither side
// re-declares them. Pure types only; no "server-only" here on purpose.

export type AlertLevel = "ok" | "info" | "warn" | "crit";

// One health/anomaly finding. The Control Room sorts these crit → info so the
// thing that needs attention is always on top.
export interface Alert {
  level: AlertLevel;
  code: string; // stable id (store_memory, budget_over, spend_spike, …)
  title: string;
  detail: string;
}

export interface StoreHealth {
  shared: boolean; // false = in-memory fallback (NOT persisted across instances)
  ok: boolean; // a live round-trip to the backend succeeded
  backend: "redis" | "memory";
}

export interface SpendSnapshot {
  calls: number;
  inTok: number;
  outTok: number;
  usd: number;
}

export interface BudgetStatus {
  set: boolean; // is LLM_DAILY_BUDGET_USD configured?
  capUsd: number; // 0 when unset/uncapped
  usedUsd: number; // today's measured spend
  pct: number; // used / cap (0 when uncapped)
  ok: boolean; // under cap (always true when uncapped)
}

// Honest pre-monetization P&L: revenue is real USD in (0 until a paid surface
// exists), expense is measured LLM spend, margin = revenue − expense (negative =
// burn). The in-game Crown economy is reported separately as a virtual ledger.
export interface Pnl {
  revenueTodayUsd: number;
  expenseTodayUsd: number;
  marginTodayUsd: number;
  expenseWindowUsd: number;
  note: string;
}

export interface CrownEconomy {
  earned: number; // SUM of Crowns minted across the window
  spent: number; // SUM of Crowns burned (sinks)
  net: number; // earned − spent (positive = net inflation)
  bets: number;
  betWins: number;
}

export interface AdminDay {
  date: string; // YYYY-MM-DD (UTC)
  dau: number;
  duels: number;
  sessions: number;
  spendUsd: number;
}

export interface AdminFeedEntry {
  t: number;
  winner: string;
  loser: string;
  topic: string;
  delta: number;
}

export interface AdminOverview {
  generatedAt: number;
  windowDays: number;
  store: StoreHealth;
  active: { dau: number; wau: number; mau: number };
  engagement: {
    sessions: number;
    newUsers: number;
    returning: number;
    duels: number;
    wins: number;
    claims: number;
    trains: number;
    daily: number;
    explore: number;
    errors: number;
  };
  economy: CrownEconomy;
  spend: {
    today: SpendSnapshot;
    windowUsd: number;
    perDuelUsd: number; // marginal cost of one ranked duel at measured token rates
    projectedMonthlyUsd: number; // forward burn at current DAU × 5 duels/day
    avgInTok: number;
    avgOutTok: number;
    pricing: { inPerM: number; outPerM: number };
  };
  budget: BudgetStatus;
  pnl: Pnl;
  series: AdminDay[]; // oldest → newest
  feed: AdminFeedEntry[];
  alerts: Alert[];
  championCount: number;
}
