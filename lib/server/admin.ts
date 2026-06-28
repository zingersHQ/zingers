// The Control Room data layer — one assembler that fuses the behaviour analytics,
// the measured LLM spend, the in-game Crown economy, the live ladder feed, and a
// set of HEALTH/ANOMALY checks into a single supervision payload. This is the
// "is everything working, any weird activity, what's it costing, is it earning"
// view the operator reads. Admin-only; the route gates it behind CRON_SECRET.
import "server-only";
import { getAnalytics } from "./track";
import { costSeries, dailyBudgetCapUsd, getDailyCost, projectMonthly, usdFor } from "./cost";
import { getFeed } from "./ladder";
import { getStore, isShared } from "./store";
import type { AdminOverview, Alert } from "@/lib/admin-types";

const utcDay = (now = Date.now()) => Math.floor(now / 86_400_000);
const round2 = (n: number) => Math.round(n * 100) / 100;

export async function getAdminOverview(windowDays = 14): Promise<AdminOverview> {
  const store = getStore();
  const today = utcDay();
  const days = Array.from({ length: windowDays }, (_, i) => today - (windowDays - 1 - i));

  // Fan out the independent reads. Analytics already aggregates active players,
  // the funnel, and the per-day event series; we layer spend + feed + health on.
  const [analytics, ping, costsByDay, todayCost, projection, feed, championCount] = await Promise.all([
    getAnalytics(windowDays),
    store.ping(),
    costSeries(days),
    getDailyCost(today),
    projectMonthly({ dau: 0, boutsPerPlayerPerDay: 5, leagueBoutsPerDay: 0 }),
    getFeed(12),
    store.countChampions(),
  ]);

  const totals = analytics.totals;
  const n = (k: string) => totals[k] ?? 0;

  // Forward burn at the CURRENT active-player base (analytics DAU), recomputed
  // here so the projection tracks reality rather than the route's placeholder.
  const dau = analytics.active.dau;
  const perDuelUsd = projection.callsPerBout * usdFor(projection.avgInTok, projection.avgOutTok);
  const projectedMonthlyUsd = perDuelUsd * (dau * 5) * 30;

  const windowUsd = costsByDay.reduce((s, c) => s + c.usd, 0);

  const capUsd = dailyBudgetCapUsd();
  const budget = {
    set: capUsd > 0,
    capUsd,
    usedUsd: todayCost.usd,
    pct: capUsd > 0 ? todayCost.usd / capUsd : 0,
    ok: capUsd <= 0 || todayCost.usd < capUsd,
  };

  const economy = {
    earned: n("earn"),
    spent: n("spend"),
    net: n("earn") - n("spend"),
    bets: n("bet"),
    betWins: n("bet_win"),
  };

  // Honest P&L: no paid surface exists yet, so revenue is 0 and margin is pure
  // burn. Wire REVENUE_TODAY_USD (or a real billing read) when monetization ships.
  const revenueTodayUsd = Math.max(0, Number(process.env.REVENUE_TODAY_USD ?? 0)) || 0;
  const pnl = {
    revenueTodayUsd,
    expenseTodayUsd: todayCost.usd,
    marginTodayUsd: revenueTodayUsd - todayCost.usd,
    expenseWindowUsd: windowUsd,
    note: revenueTodayUsd > 0 ? "" : "No paid surface yet — $ZING is fuel, not product. Revenue is 0 by design pre-launch.",
  };

  const series = analytics.series.map((d, i) => ({
    date: d.date,
    dau: d.dau,
    duels: d.events.bout ?? 0,
    sessions: d.events.session ?? 0,
    spendUsd: round2(costsByDay[i]?.usd ?? 0),
  }));

  const alerts = buildAlerts({
    shared: isShared(),
    ping,
    budget,
    todayUsd: todayCost.usd,
    costsByDay: costsByDay.map((c) => c.usd),
    sessionsToday: analytics.today.session ?? 0,
    errorsToday: analytics.today.error ?? 0,
    duelsToday: analytics.today.bout ?? 0,
    economyNet: economy.net,
    bets: economy.bets,
    betWins: economy.betWins,
  });

  return {
    generatedAt: Date.now(),
    windowDays,
    store: { shared: isShared(), ok: ping, backend: isShared() ? "redis" : "memory" },
    active: analytics.active,
    engagement: {
      sessions: n("session"),
      newUsers: n("new_user"),
      returning: n("return"),
      duels: n("bout"),
      wins: n("bout_win"),
      claims: n("claim"),
      trains: n("train"),
      daily: n("daily"),
      explore: n("explore"),
      errors: n("error"),
    },
    economy,
    spend: {
      today: { calls: todayCost.calls, inTok: todayCost.inTok, outTok: todayCost.outTok, usd: round2(todayCost.usd) },
      windowUsd: round2(windowUsd),
      perDuelUsd,
      projectedMonthlyUsd,
      avgInTok: Math.round(projection.avgInTok),
      avgOutTok: Math.round(projection.avgOutTok),
      pricing: todayCost.pricing,
    },
    budget,
    pnl,
    series,
    feed: feed.map((f) => ({ t: f.t, winner: f.winner, loser: f.loser, topic: f.topic, delta: f.delta })),
    alerts,
    championCount,
  };
}

interface AlertInput {
  shared: boolean;
  ping: boolean;
  budget: { set: boolean; capUsd: number; usedUsd: number; pct: number; ok: boolean };
  todayUsd: number;
  costsByDay: number[]; // window, oldest → newest (includes today as last)
  sessionsToday: number;
  errorsToday: number;
  duelsToday: number;
  economyNet: number;
  bets: number;
  betWins: number;
}

// Turn the raw signals into a sorted list of operator-facing findings. Each check
// has a floor so a tiny sample can't trip a scary alert; ordering is crit→info.
function buildAlerts(x: AlertInput): Alert[] {
  const out: Alert[] = [];

  // 1. Persistence — the single most important production check. Without a real
  //    Redis the ladder/wallets/analytics evaporate on every cold start.
  if (!x.shared) {
    out.push({
      level: "crit",
      code: "store_memory",
      title: "Database not connected — data is NOT being saved",
      detail: "The store is on the in-memory fallback; the ladder, wallets and analytics reset on every cold start. Provision Upstash Redis and set KV_REST_API_URL / KV_REST_API_TOKEN.",
    });
  } else if (!x.ping) {
    out.push({
      level: "crit",
      code: "store_unreachable",
      title: "Database unreachable",
      detail: "Redis is configured but a live ping failed. Check the Upstash store status and the REST credentials.",
    });
  }

  // 2. Spend cap — over budget is critical (the league should self-throttle), and
  //    an unset cap is a standing warning (launch gate 4).
  if (x.budget.set && !x.budget.ok) {
    out.push({
      level: "crit",
      code: "budget_over",
      title: "Daily LLM budget exceeded",
      detail: `Today's measured spend $${x.todayUsd.toFixed(2)} is over the $${x.budget.capUsd.toFixed(2)} cap. The autonomous league should have stopped spending real inference.`,
    });
  } else if (x.budget.set && x.budget.pct >= 0.8) {
    out.push({
      level: "warn",
      code: "budget_near",
      title: "Approaching daily LLM budget",
      detail: `Today's spend is ${(x.budget.pct * 100).toFixed(0)}% of the $${x.budget.capUsd.toFixed(2)} cap.`,
    });
  } else if (!x.budget.set) {
    out.push({
      level: "warn",
      code: "budget_unset",
      title: "No LLM daily budget cap set",
      detail: "LLM_DAILY_BUDGET_USD is unset, so the autonomous league has no hard spend guardrail. Set it in production (launch gate 4).",
    });
  }

  // 3. Spend spike — today materially above the trailing average is worth a look.
  const prior = x.costsByDay.slice(0, -1).filter((v) => v > 0);
  if (prior.length >= 3 && x.todayUsd > 0.5) {
    const avg = prior.reduce((s, v) => s + v, 0) / prior.length;
    if (avg > 0 && x.todayUsd > avg * 3) {
      out.push({
        level: "warn",
        code: "spend_spike",
        title: "LLM spend spike today",
        detail: `Today's $${x.todayUsd.toFixed(2)} is ${(x.todayUsd / avg).toFixed(1)}× the ${prior.length}-day average of $${avg.toFixed(2)}.`,
      });
    }
  }

  // 4. Error rate — client render/runtime errors as a share of sessions.
  if (x.sessionsToday >= 20 && x.errorsToday > 0) {
    const rate = x.errorsToday / x.sessionsToday;
    if (rate >= 0.05) {
      out.push({
        level: "warn",
        code: "error_rate",
        title: "Elevated client error rate",
        detail: `${x.errorsToday} errors over ${x.sessionsToday} sessions today (${(rate * 100).toFixed(1)}%).`,
      });
    }
  }

  // 5. Betting edge — wins should sit near ~50% for a fair 2× market. A persistent
  //    high win rate at volume hints at exploitable timing or an outcome leak.
  if (x.bets >= 30) {
    const winRate = x.betWins / x.bets;
    if (winRate >= 0.62) {
      out.push({
        level: "warn",
        code: "bet_edge",
        title: "Bettors winning unusually often",
        detail: `${x.betWins}/${x.bets} wagers paid out (${(winRate * 100).toFixed(0)}%) over the window — above the ~50% a fair 2× market expects. Check for an exploit.`,
      });
    }
  }

  // 6. Crown inflation — large net minting relative to sinks signals an economy
  //    that's getting easier (or a forged-earn exploit slipping past the clamps).
  if (x.economyNet > 100_000) {
    out.push({
      level: "info",
      code: "crown_inflation",
      title: "Crown economy net-positive at scale",
      detail: `Net +${x.economyNet.toLocaleString("en-US")} Crowns minted over the window (earn ≫ spend). Watch sink/source balance.`,
    });
  }

  // 7. Engagement-without-play — sessions but no duels today usually means the
  //    funnel broke somewhere before the first fight.
  if (x.sessionsToday >= 20 && x.duelsToday === 0) {
    out.push({
      level: "warn",
      code: "no_duels",
      title: "Traffic but zero duels today",
      detail: `${x.sessionsToday} sessions and not one ranked duel — the path to the first fight may be broken.`,
    });
  }

  if (out.length === 0) {
    out.push({ level: "ok", code: "all_clear", title: "All systems nominal", detail: "No anomalies detected across persistence, spend, errors, betting, or economy." });
  }

  const rank: Record<string, number> = { crit: 0, warn: 1, info: 2, ok: 3 };
  return out.sort((a, b) => rank[a.level] - rank[b.level]);
}
