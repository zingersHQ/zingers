"use client";
// The Observatory: a console-style analytics screen. A 3D stat-town fills the
// view; a HUD overlays the headline numbers (active players, the core funnel,
// the event ledger). Data comes from /api/stats, which is open in local dev and
// gated by CRON_SECRET in production — so the screen prompts once for an admin
// key and remembers it locally.
import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Activity, ArrowLeft, RefreshCw, Users, Swords, Crown, KeyRound } from "lucide-react";
import type { Analytics } from "@/lib/stats-types";

const StatTown = dynamic(() => import("@/components/stats/stat-town"), {
  ssr: false,
  loading: () => (
    <div className="mono" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "var(--muted)" }}>
      raising the stat-town…
    </div>
  ),
});

const KEY_STORAGE = "zingers_stats_key";
const WINDOWS = [7, 14, 30];

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function StatsScreen() {
  const [data, setData] = useState<Analytics | null>(null);
  const [days, setDays] = useState(14);
  const [loading, setLoading] = useState(true);
  const [needsKey, setNeedsKey] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [apiKey, setApiKey] = useState<string | null>(null);

  useEffect(() => {
    try {
      setApiKey(localStorage.getItem(KEY_STORAGE));
    } catch {}
  }, []);

  const load = useCallback(
    async (d: number, key: string | null) => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({ days: String(d) });
        if (key) qs.set("key", key);
        const res = await fetch(`/api/stats?${qs.toString()}`, { cache: "no-store" });
        if (res.status === 401) {
          setNeedsKey(true);
          setData(null);
          return;
        }
        const json = (await res.json()) as Analytics;
        setData(json);
        setNeedsKey(false);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    load(days, apiKey);
  }, [days, apiKey, load]);

  const submitKey = () => {
    const k = keyInput.trim();
    if (!k) return;
    try {
      localStorage.setItem(KEY_STORAGE, k);
    } catch {}
    setApiKey(k);
    setNeedsKey(false);
  };

  const totals = data?.totals ?? {};
  const active = data?.active ?? { dau: 0, wau: 0, mau: 0 };

  const funnel = useMemo(() => {
    const f = data?.funnel ?? [];
    const top = Math.max(1, f[0]?.value ?? 1);
    return f.map((step, i) => ({
      ...step,
      pct: Math.round((step.value / top) * 100),
      drop: i > 0 && f[i - 1].value > 0 ? Math.round((step.value / f[i - 1].value) * 100) : null,
    }));
  }, [data]);

  return (
    <main style={{ position: "fixed", inset: 0, background: "#06050d", overflow: "hidden" }}>
      {/* 3D town */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>{data && <StatTown data={data} />}</div>

      {/* top bar */}
      <div style={{ position: "absolute", top: 16, left: 18, right: 18, zIndex: 10, display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap", pointerEvents: "none" }}>
        <div style={{ pointerEvents: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href="/grounds" className="btn" style={{ ["--ac" as string]: "var(--line2)", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <ArrowLeft size={14} strokeWidth={2.2} /> Game
            </Link>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: 0.5 }}>The Observatory</h1>
              <div className="mono" style={{ fontSize: 10, letterSpacing: 2, color: "var(--muted2)" }}>HOW THE WORLD IS PLAYED · LAST {days} DAYS</div>
            </div>
          </div>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, pointerEvents: "auto", flexWrap: "wrap" }}>
          {data && !data.shared && (
            <span className="mono" style={{ fontSize: 10, color: "var(--gold)", border: "1px solid rgba(240,169,58,.4)", borderRadius: 6, padding: "5px 8px" }}>
              LOCAL MODE · provision Redis to share
            </span>
          )}
          <div className="panel" style={{ display: "flex", gap: 2, padding: 3 }}>
            {WINDOWS.map((w) => (
              <button
                key={w}
                onClick={() => setDays(w)}
                className="mono"
                style={{
                  fontSize: 11,
                  padding: "5px 10px",
                  borderRadius: 6,
                  cursor: "pointer",
                  border: "none",
                  background: days === w ? "var(--accent, #7c5cff)" : "transparent",
                  color: days === w ? "#fff" : "var(--muted)",
                }}
              >
                {w}d
              </button>
            ))}
          </div>
          <button onClick={() => load(days, apiKey)} className="btn" style={{ ["--ac" as string]: "var(--accent, #7c5cff)", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            <RefreshCw size={13} strokeWidth={2.2} className={loading ? "spin" : undefined} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI rail — active players */}
      {data && (
        <div style={{ position: "absolute", top: 84, left: 18, zIndex: 10, display: "flex", gap: 10, flexWrap: "wrap", pointerEvents: "none" }}>
          <Kpi icon={<Users size={15} />} color="#f0a93a" label="DAU" value={active.dau} sub="active today" />
          <Kpi icon={<Users size={15} />} color="#39e0ff" label="WAU" value={active.wau} sub="7-day uniques" />
          <Kpi icon={<Users size={15} />} color="#36d39a" label="MAU" value={active.mau} sub="30-day uniques" />
          <Kpi icon={<Activity size={15} />} color="#7c5cff" label="Visits" value={totals.session ?? 0} sub={`new ${fmt(totals.new_user ?? 0)} · ret ${fmt(totals.return ?? 0)}`} />
          <Kpi icon={<Swords size={15} />} color="#ff6b4a" label="Fights" value={totals.bout ?? 0} sub={`${fmt(totals.bout_win ?? 0)} player wins`} />
          <Kpi icon={<Crown size={15} />} color="var(--gold)" label="Crowns earned" value={totals.earn ?? 0} sub={`${fmt(totals.spend ?? 0)} spent`} />
        </div>
      )}

      {/* funnel — bottom left */}
      {data && (
        <div className="panel" style={{ position: "absolute", left: 18, bottom: 18, zIndex: 10, width: "min(330px, 88vw)", padding: 14, pointerEvents: "auto", background: "rgba(8,7,16,.82)" }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: 2, color: "var(--muted2)", marginBottom: 10 }}>ACQUISITION FUNNEL</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {funnel.map((s) => (
              <div key={s.key}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 12, marginBottom: 3 }}>
                  <span style={{ fontWeight: 600 }}>{s.label}</span>
                  <span className="mono" style={{ color: "var(--muted)" }}>
                    {fmt(s.value)}
                    {s.drop !== null && <span style={{ color: "var(--muted2)", marginLeft: 6 }}>{s.drop}%</span>}
                  </span>
                </div>
                <div style={{ height: 7, borderRadius: 9, background: "var(--line)", overflow: "hidden" }}>
                  <div style={{ width: `${Math.max(2, s.pct)}%`, height: "100%", background: "linear-gradient(90deg, #7c5cff, #39e0ff)" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* event ledger — bottom right */}
      {data && (
        <div className="panel" style={{ position: "absolute", right: 18, bottom: 18, zIndex: 10, width: "min(280px, 86vw)", maxHeight: "46vh", overflowY: "auto", padding: 14, pointerEvents: "auto", background: "rgba(8,7,16,.82)" }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: 2, color: "var(--muted2)", marginBottom: 10 }}>EVENT LEDGER · {days}d TOTAL</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {Object.entries(totals)
              .sort((a, b) => b[1] - a[1])
              .map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }} className="mono">
                  <span style={{ color: "var(--muted)" }}>{k}</span>
                  <span style={{ color: "var(--ink)", fontWeight: 600 }}>{fmt(v)}</span>
                </div>
              ))}
            {Object.keys(totals).length === 0 && <span className="mono" style={{ fontSize: 11, color: "var(--muted2)" }}>No events recorded yet.</span>}
          </div>
        </div>
      )}

      {/* loading / empty */}
      {!data && !needsKey && (
        <div className="mono" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "var(--muted)", zIndex: 5 }}>
          {loading ? "reading the ledger…" : "no data"}
        </div>
      )}

      {/* admin key gate */}
      {needsKey && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "var(--overlay)", backdropFilter: "blur(6px)", zIndex: 30, padding: 20 }}>
          <div className="panel" style={{ ["--ac" as string]: "var(--gold)", padding: 24, width: "min(420px, 92vw)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <KeyRound size={18} color="var(--gold)" />
              <div style={{ fontSize: 18, fontWeight: 700 }}>Admin key required</div>
            </div>
            <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.5, marginTop: 0 }}>
              The Observatory is gated by <span className="mono">CRON_SECRET</span>. Paste it to view the numbers — it&apos;s stored only in this browser.
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
        </div>
      )}
    </main>
  );
}

function Kpi({ icon, color, label, value, sub }: { icon: React.ReactNode; color: string; label: string; value: number; sub: string }) {
  return (
    <div className="panel" style={{ ["--ac" as string]: color, padding: "10px 14px", minWidth: 116, background: "rgba(8,7,16,.82)" }}>
      <div className="mono" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9, letterSpacing: 1.5, color }}>
        {icon}
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.1, marginTop: 2 }}>{fmt(value)}</div>
      <div className="mono" style={{ fontSize: 9, color: "var(--muted2)", marginTop: 1 }}>{sub}</div>
    </div>
  );
}
