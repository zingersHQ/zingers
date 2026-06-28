"use client";
// The Control Room: a fast, data-dense supervision dashboard for the operator —
// "is everything working, any weird activity, what's it costing, is it earning?"
// It fuses activity, active players, duels, the Crown economy, measured LLM
// expenses, an honest P&L, and health/anomaly alerts from /api/admin. The screen
// is gated by CRON_SECRET in production (open in local dev) and shares the admin
// key with the /stats Observatory, so unlocking one unlocks both.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CircleCheck,
  Coins,
  CpuIcon,
  Database,
  Info,
  KeyRound,
  RefreshCw,
  Server,
  Swords,
  Users,
} from "lucide-react";
import type { AdminOverview, Alert, AlertLevel } from "@/lib/admin-types";

const KEY_STORAGE = "zingers_stats_key"; // shared with the Observatory
const WINDOWS = [7, 14, 30];

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${Math.round(n / 1000)}k`;
  if (abs >= 1_000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}

function usd(n: number): string {
  if (!Number.isFinite(n)) return "$0";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs < 10) return `${sign}$${abs.toFixed(2)}`;
  return `${sign}$${abs.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

const LEVEL_COLOR: Record<AlertLevel, string> = {
  crit: "var(--bad)",
  warn: "var(--gold)",
  info: "var(--accent)",
  ok: "var(--good)",
};

function readStoredKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(KEY_STORAGE);
  } catch {
    return null;
  }
}

export function AdminDashboard() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [days, setDays] = useState(14);
  const [loading, setLoading] = useState(true);
  const [needsKey, setNeedsKey] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  // Lazy-init from localStorage (guarded for SSR) so we never setState in an
  // effect just to read it back. The first render shows the neutral loading
  // state regardless, so there's no hydration mismatch.
  const [apiKey, setApiKey] = useState<string | null>(readStoredKey);
  const [err, setErr] = useState(false);
  const [nonce, setNonce] = useState(0); // bump to force a manual/auto refresh

  // The single fetch path. Inlined in the effect (rather than a shared callback)
  // so every setState lands AFTER the awaited response — never synchronously in
  // the effect body. The spinner is driven by the initial `loading` state and by
  // the explicit controls, which set it from event handlers.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const qs = new URLSearchParams({ days: String(days) });
        if (apiKey) qs.set("key", apiKey);
        const res = await fetch(`/api/admin?${qs.toString()}`, { cache: "no-store" });
        if (!active) return;
        if (res.status === 401) {
          setNeedsKey(true);
          setData(null);
          return;
        }
        const json = (await res.json()) as AdminOverview;
        if (!active) return;
        setData(json);
        setNeedsKey(false);
        setErr(false);
      } catch {
        if (active) {
          setErr(true);
          setData(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [days, apiKey, nonce]);

  // Auto-refresh every 60s so the room stays live without a manual reload.
  useEffect(() => {
    const id = setInterval(() => setNonce((x) => x + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const refresh = () => {
    setLoading(true);
    setNonce((x) => x + 1);
  };

  const pickWindow = (w: number) => {
    setLoading(true);
    setDays(w);
  };

  const submitKey = () => {
    const k = keyInput.trim();
    if (!k) return;
    try {
      localStorage.setItem(KEY_STORAGE, k);
    } catch {}
    setApiKey(k);
    setNeedsKey(false);
  };

  const crit = useMemo(() => (data?.alerts ?? []).filter((a) => a.level === "crit").length, [data]);

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "22px 20px 90px" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href="/grounds" className="btn" style={{ ["--ac" as string]: "var(--line2)", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <ArrowLeft size={14} strokeWidth={2.2} /> Game
            </Link>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: -0.3 }}>Control Room</h1>
              <div className="mono" style={{ fontSize: 10, letterSpacing: 2, color: "var(--muted2)" }}>
                OPERATIONS · HEALTH · ECONOMY · LAST {days} DAYS
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {data && <StoreBadge store={data.store} />}
          <div className="panel" style={{ display: "flex", gap: 2, padding: 3 }}>
            {WINDOWS.map((w) => (
              <button
                key={w}
                onClick={() => pickWindow(w)}
                className="mono"
                style={{
                  fontSize: 11,
                  padding: "5px 10px",
                  borderRadius: 6,
                  cursor: "pointer",
                  border: "none",
                  background: days === w ? "var(--accent)" : "transparent",
                  color: days === w ? "#fff" : "var(--muted)",
                }}
              >
                {w}d
              </button>
            ))}
          </div>
          <button onClick={refresh} className="btn" style={{ ["--ac" as string]: "var(--accent)", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            <RefreshCw size={13} strokeWidth={2.2} className={loading ? "spin" : undefined} /> Refresh
          </button>
          <Link href="/stats" className="btn" style={{ ["--ac" as string]: "var(--line2)", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            <BarChart3 size={13} strokeWidth={2.2} /> Observatory
          </Link>
        </div>
      </div>

      {needsKey && <KeyGate keyInput={keyInput} setKeyInput={setKeyInput} submitKey={submitKey} />}

      {!data && !needsKey && (
        <div className="mono" style={{ padding: "60px 0", textAlign: "center", color: "var(--muted)" }}>
          {err ? "could not reach /api/admin" : loading ? "reading the ledger…" : "no data"}
        </div>
      )}

      {data && (
        <>
          {/* alerts — the supervision centerpiece */}
          <AlertsPanel alerts={data.alerts} critCount={crit} />

          {/* KPI grid */}
          <SectionLabel icon={<Users size={12} />} text="ACTIVITY & PLAYERS" />
          <div style={grid}>
            <Kpi color="#f0a93a" icon={<Users size={15} />} label="DAU" value={fmt(data.active.dau)} sub="active today" />
            <Kpi color="#39e0ff" icon={<Users size={15} />} label="WAU" value={fmt(data.active.wau)} sub="7-day uniques" />
            <Kpi color="#36d39a" icon={<Users size={15} />} label="MAU" value={fmt(data.active.mau)} sub="30-day uniques" />
            <Kpi color="var(--accent)" icon={<Activity size={15} />} label="Sessions" value={fmt(data.engagement.sessions)} sub={`new ${fmt(data.engagement.newUsers)} · ret ${fmt(data.engagement.returning)}`} />
            <Kpi color="#ff6b4a" icon={<Swords size={15} />} label="Duels" value={fmt(data.engagement.duels)} sub={`${fmt(data.engagement.wins)} player wins`} />
            <Kpi color="var(--gold)" icon={<Swords size={15} />} label="Ladder" value={fmt(data.championCount)} sub="champions registered" />
          </div>

          {/* economy + expenses */}
          <SectionLabel icon={<Coins size={12} />} text="ECONOMY · EXPENSES · P&L" />
          <div style={grid}>
            <Kpi color="var(--gold)" icon={<Coins size={15} />} label="Crowns net" value={fmt(data.economy.net)} sub={`earn ${fmt(data.economy.earned)} · spend ${fmt(data.economy.spent)}`} tone={data.economy.net >= 0 ? "good" : "bad"} />
            <Kpi color="#39e0ff" icon={<Coins size={15} />} label="Bets" value={fmt(data.economy.bets)} sub={`${fmt(data.economy.betWins)} paid out`} />
            <Kpi color="#ff6b4a" icon={<CpuIcon size={15} />} label="LLM spend today" value={usd(data.spend.today.usd)} sub={`${fmt(data.spend.today.calls)} calls · ${fmt(data.spend.today.inTok + data.spend.today.outTok)} tok`} />
            <Kpi color="var(--accent)" icon={<CpuIcon size={15} />} label="Spend / duel" value={`$${data.spend.perDuelUsd.toFixed(4)}`} sub={`${fmt(data.spend.avgInTok)} in / ${fmt(data.spend.avgOutTok)} out`} />
            <Kpi color="#7c5cff" icon={<BarChart3 size={15} />} label="Proj. monthly" value={usd(data.spend.projectedMonthlyUsd)} sub={`at ${fmt(data.active.dau)} DAU × 5/day`} />
            <BudgetKpi budget={data.budget} />
          </div>

          {/* P&L strip */}
          <PnlStrip data={data} />

          {/* charts */}
          <SectionLabel icon={<BarChart3 size={12} />} text="DAILY TRENDS" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginBottom: 22 }}>
            <ChartCard title="Duels / day" color="#ff6b4a" values={data.series.map((d) => d.duels)} labels={data.series.map((d) => d.date)} />
            <ChartCard title="Sessions / day" color="var(--accent)" values={data.series.map((d) => d.sessions)} labels={data.series.map((d) => d.date)} />
            <ChartCard title="LLM spend / day" color="#36d39a" values={data.series.map((d) => d.spendUsd)} labels={data.series.map((d) => d.date)} money />
          </div>

          {/* live feed */}
          <SectionLabel icon={<Activity size={12} />} text="RECENT DUELS" />
          <div className="panel" style={{ padding: 4, marginBottom: 14 }}>
            {data.feed.length === 0 && <div className="mono" style={{ padding: 16, fontSize: 12, color: "var(--muted2)" }}>No duels recorded yet.</div>}
            {data.feed.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderTop: i ? "1px solid var(--line)" : "none", fontSize: 13 }}>
                <span className="mono" style={{ fontSize: 10, color: "var(--muted2)", minWidth: 52 }}>{timeAgo(f.t)}</span>
                <span style={{ fontWeight: 700, color: "var(--good)" }}>{f.winner}</span>
                <span style={{ color: "var(--muted2)", fontSize: 11 }}>beat</span>
                <span style={{ color: "var(--muted)" }}>{f.loser}</span>
                <span className="mono" style={{ marginLeft: "auto", fontSize: 11, color: "var(--gold)" }}>+{f.delta}</span>
                <span className="mono" style={{ fontSize: 10, color: "var(--muted2)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.topic}</span>
              </div>
            ))}
          </div>

          <div className="mono" style={{ fontSize: 10, color: "var(--muted2)", textAlign: "center", marginTop: 16 }}>
            generated {new Date(data.generatedAt).toLocaleTimeString()} · auto-refresh 60s · admin-gated
          </div>
        </>
      )}
    </main>
  );
}

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(168px, 1fr))",
  gap: 10,
  marginBottom: 22,
};

function SectionLabel({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="mono" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, letterSpacing: 2, color: "var(--muted2)", margin: "4px 0 10px" }}>
      {icon}
      {text}
    </div>
  );
}

function Kpi({ icon, color, label, value, sub, tone }: { icon: React.ReactNode; color: string; label: string; value: string; sub: string; tone?: "good" | "bad" }) {
  const valColor = tone === "good" ? "var(--good)" : tone === "bad" ? "var(--bad)" : "var(--ink)";
  return (
    <div className="panel" style={{ ["--ac" as string]: color, padding: "11px 14px" }}>
      <div className="mono" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9, letterSpacing: 1.5, color }}>
        {icon}
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.1, marginTop: 3, color: valColor }}>{value}</div>
      <div className="mono" style={{ fontSize: 9, color: "var(--muted2)", marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function BudgetKpi({ budget }: { budget: AdminOverview["budget"] }) {
  if (!budget.set) {
    return <Kpi color="var(--gold)" icon={<AlertTriangle size={15} />} label="Budget cap" value="none" sub="LLM_DAILY_BUDGET_USD unset" tone="bad" />;
  }
  const pct = Math.min(100, Math.round(budget.pct * 100));
  const tone = !budget.ok ? "bad" : budget.pct >= 0.8 ? undefined : "good";
  return (
    <div className="panel" style={{ ["--ac" as string]: budget.ok ? "var(--good)" : "var(--bad)", padding: "11px 14px" }}>
      <div className="mono" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9, letterSpacing: 1.5, color: budget.ok ? "var(--good)" : "var(--bad)" }}>
        <CpuIcon size={15} /> DAILY BUDGET
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.1, marginTop: 3, color: tone === "bad" ? "var(--bad)" : tone === "good" ? "var(--good)" : "var(--ink)" }}>
        {usd(budget.usedUsd)}<span style={{ fontSize: 13, color: "var(--muted2)", fontWeight: 600 }}> / {usd(budget.capUsd)}</span>
      </div>
      <div style={{ height: 5, borderRadius: 6, background: "var(--line)", overflow: "hidden", marginTop: 6 }}>
        <div style={{ width: `${Math.max(2, pct)}%`, height: "100%", background: budget.ok ? "var(--good)" : "var(--bad)" }} />
      </div>
    </div>
  );
}

function PnlStrip({ data }: { data: AdminOverview }) {
  const m = data.pnl.marginTodayUsd;
  return (
    <div className="panel" style={{ padding: "14px 16px", marginBottom: 22, display: "flex", gap: 22, flexWrap: "wrap", alignItems: "center" }}>
      <div>
        <div className="mono" style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--good)" }}>REVENUE TODAY</div>
        <div style={{ fontSize: 22, fontWeight: 800 }}>{usd(data.pnl.revenueTodayUsd)}</div>
      </div>
      <span style={{ fontSize: 20, color: "var(--muted2)" }}>−</span>
      <div>
        <div className="mono" style={{ fontSize: 9, letterSpacing: 1.5, color: "#ff6b4a" }}>LLM EXPENSE TODAY</div>
        <div style={{ fontSize: 22, fontWeight: 800 }}>{usd(data.pnl.expenseTodayUsd)}</div>
      </div>
      <span style={{ fontSize: 20, color: "var(--muted2)" }}>=</span>
      <div>
        <div className="mono" style={{ fontSize: 9, letterSpacing: 1.5, color: m >= 0 ? "var(--good)" : "var(--bad)" }}>MARGIN TODAY</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: m >= 0 ? "var(--good)" : "var(--bad)" }}>{usd(m)}</div>
      </div>
      <div className="mono" style={{ fontSize: 10, color: "var(--muted2)", maxWidth: 320, lineHeight: 1.5, marginLeft: "auto" }}>
        {data.pnl.note || `${data.windowDays}d expense ${usd(data.pnl.expenseWindowUsd)}`}
      </div>
    </div>
  );
}

function AlertsPanel({ alerts, critCount }: { alerts: Alert[]; critCount: number }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <SectionLabel
        icon={critCount > 0 ? <AlertTriangle size={12} color="var(--bad)" /> : <CircleCheck size={12} color="var(--good)" />}
        text={`HEALTH & ANOMALIES${critCount > 0 ? ` · ${critCount} CRITICAL` : ""}`}
      />
      <div style={{ display: "grid", gap: 8 }}>
        {alerts.map((a) => (
          <div
            key={a.code}
            className="panel"
            style={{ ["--ac" as string]: LEVEL_COLOR[a.level], padding: "10px 14px", display: "flex", gap: 11, alignItems: "flex-start", borderLeft: `3px solid ${LEVEL_COLOR[a.level]}` }}
          >
            <span style={{ marginTop: 1, color: LEVEL_COLOR[a.level], flexShrink: 0 }}>
              {a.level === "ok" ? <CircleCheck size={16} /> : a.level === "info" ? <Info size={16} /> : <AlertTriangle size={16} />}
            </span>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{a.title}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5, marginTop: 1 }}>{a.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StoreBadge({ store }: { store: AdminOverview["store"] }) {
  const healthy = store.shared && store.ok;
  const color = healthy ? "var(--good)" : "var(--bad)";
  const label = !store.shared ? "IN-MEMORY · NOT SAVED" : store.ok ? "REDIS · LIVE" : "REDIS · UNREACHABLE";
  return (
    <span className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, color, border: `1px solid ${color}`, borderRadius: 6, padding: "5px 9px" }}>
      {store.shared ? <Database size={12} /> : <Server size={12} />} {label}
    </span>
  );
}

function ChartCard({ title, color, values, labels, money }: { title: string; color: string; values: number[]; labels: string[]; money?: boolean }) {
  const max = Math.max(1, ...values);
  const total = values.reduce((s, v) => s + v, 0);
  const W = 100;
  const n = values.length || 1;
  const gap = 1.5;
  const bw = (W - gap * (n - 1)) / n;
  return (
    <div className="panel" style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <span className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)" }}>{title.toUpperCase()}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{money ? usd(total) : fmt(total)}</span>
      </div>
      <svg viewBox={`0 0 ${W} 34`} preserveAspectRatio="none" style={{ width: "100%", height: 56, display: "block" }}>
        {values.map((v, i) => {
          const h = (v / max) * 32;
          return <rect key={i} x={i * (bw + gap)} y={34 - h} width={bw} height={Math.max(v > 0 ? 1.2 : 0, h)} rx={0.6} fill={color} opacity={i === n - 1 ? 1 : 0.6} />;
        })}
      </svg>
      <div className="mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 8.5, color: "var(--muted2)", marginTop: 4 }}>
        <span>{labels[0]?.slice(5)}</span>
        <span>{labels[labels.length - 1]?.slice(5)}</span>
      </div>
    </div>
  );
}

function KeyGate({ keyInput, setKeyInput, submitKey }: { keyInput: string; setKeyInput: (v: string) => void; submitKey: () => void }) {
  return (
    <div className="panel" style={{ ["--ac" as string]: "var(--gold)", padding: 22, maxWidth: 440, margin: "30px auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <KeyRound size={18} color="var(--gold)" />
        <div style={{ fontSize: 17, fontWeight: 700 }}>Admin key required</div>
      </div>
      <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.5, marginTop: 0 }}>
        The Control Room is gated by <span className="mono">CRON_SECRET</span>. Paste it to view the numbers — it&apos;s stored only in this browser.
      </p>
      <input
        type="password"
        value={keyInput}
        onChange={(e) => setKeyInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submitKey()}
        placeholder="CRON_SECRET"
        style={{ width: "100%", background: "#0a0813", border: "1px solid var(--line2)", borderRadius: 8, padding: "10px 12px", color: "var(--ink)", fontSize: 13, fontFamily: "var(--font-mono, monospace)" }}
      />
      <button onClick={submitKey} className="btn btn-primary" style={{ ["--ac" as string]: "var(--gold)", width: "100%", marginTop: 12 }}>
        Unlock
      </button>
    </div>
  );
}

function timeAgo(t: number): string {
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86_400)}d`;
}
