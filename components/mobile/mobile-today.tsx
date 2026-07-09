"use client";
// ─────────────────────────────────────────────────────────────────────────────
// M1 — the Today tab (docs/mobile.md). The phone's 30-second door: the shared
// Daily Zinger (one bout the whole world calls before watching), your streak,
// and a Wordle-style share. Reuses lib/server/daily via /api/daily, the shared
// useBout/SSE runner, and recordDaily from the store — same deterministic bout
// (seed + mock) everyone else gets today, so the "did you call it?" share is
// honest. A "your champion" strip threads back to the raise lane.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays, Lock, Flame, Trophy, Mic, Share2, RotateCcw, ChevronRight, Shield, Globe } from "lucide-react";
import type { BattleEnd, BattleTurn, Champion, DailyResponse, DailyResult } from "@/lib/types";
import { TYPE_COLOR } from "@/lib/evolve/progression";
import { BRAND } from "@/lib/brand";
import { ROSTER } from "@/lib/engine/roster";
import { useChampions } from "@/store/champions";
import { useBout } from "@/components/arena/use-bout";
import { ChampionAvatar, doctrineLabel } from "@/components/champion-avatar";
import { MobileBoutStage } from "@/components/mobile/mobile-bout";

type View = "predict" | "bout" | "done";

function shareText(r: DailyResult, streak: number, best: number): string {
  const w = r.winnerCorrect ? "✓" : "✗";
  const d = r.dunkCorrect == null ? "—" : r.dunkCorrect ? "✓" : "✗";
  return [
    `Zingers Daily #${r.day}`,
    `Winner ${w} · Dunk ${d}`,
    `streak ${streak} · best ${best}`,
    BRAND.site.replace(/^https?:\/\//, ""),
  ].join("\n");
}

export function MobileToday({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [plan, setPlan] = useState<DailyResponse | null>(null);
  const [mounted, setMounted] = useState(false);
  const [winnerPick, setWinnerPick] = useState<"a" | "b" | null>(null);
  const [dunkPick, setDunkPick] = useState<"a" | "b" | null>(null);
  const [view, setView] = useState<View>("predict");

  const bout = useBout();
  const get = useChampions((s) => s.get);
  const daily = useChampions((s) => s.daily);
  const recordDaily = useChampions((s) => s.recordDaily);
  const owned = useChampions((s) => s.owned);

  const historyRef = useRef<BattleTurn[]>([]);
  historyRef.current = bout.history;
  const pickRef = useRef<{ winner: "a" | "b" | null; dunk: "a" | "b" | null }>({ winner: null, dunk: null });
  pickRef.current = { winner: winnerPick, dunk: dunkPick };

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    fetch("/api/daily").then((r) => r.json()).then(setPlan).catch(() => {});
  }, []);

  const solvedToday = mounted && plan != null && daily.result != null && daily.result.day === plan.day;
  useEffect(() => {
    if (solvedToday) setView("done");
  }, [solvedToday]);

  const boutUrl = plan ? `/api/battle?a=${plan.a.key}&b=${plan.b.key}&topic=${encodeURIComponent(plan.topic)}&seed=${plan.seed}&mock=1` : "";

  const onEnd = useCallback(
    (end: BattleEnd) => {
      if (!plan) return;
      const hist = historyRef.current;
      let best = { dmg: -1, key: end.winner, line: end.mvp.line, name: end.winner_name };
      for (const t of hist) if (t.dmg > best.dmg) best = { dmg: t.dmg, key: t.actor, line: t.line, name: t.actor_name };
      const { winner, dunk } = pickRef.current;
      const pickedWinnerKey = winner === "a" ? plan.a.key : winner === "b" ? plan.b.key : null;
      const result: DailyResult = {
        day: plan.day,
        winnerCorrect: pickedWinnerKey === end.winner,
        dunkCorrect: dunk == null ? null : (dunk === "a" ? plan.a.key : plan.b.key) === best.key,
        winnerKey: end.winner,
        winnerName: end.winner_name,
        dunkName: best.name,
        dunkLine: best.line,
      };
      recordDaily(result);
      setView("done");
    },
    [plan, recordDaily],
  );

  const startBout = useCallback(() => {
    if (!plan || !winnerPick) return;
    setView("bout");
    bout.begin(boutUrl, onEnd);
  }, [plan, winnerPick, bout, boutUrl, onEnd]);

  const replay = useCallback(() => {
    if (!plan) return;
    setView("bout");
    bout.begin(boutUrl, () => setView("done"));
  }, [plan, bout, boutUrl]);

  const acol = plan ? TYPE_COLOR[plan.a.type] : "#888";
  const bcol = plan ? TYPE_COLOR[plan.b.type] : "#888";

  return (
    <div style={{ height: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "16px 14px 24px" }}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <CalendarDays size={20} strokeWidth={2.2} style={{ color: "var(--accent)" }} />
          <span style={{ fontSize: 20, fontWeight: 800 }}>Daily{plan ? <span style={{ color: "var(--accent)" }}> #{plan.day}</span> : null}</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <Pill icon={<Flame size={12} strokeWidth={2.4} />} label="STREAK" value={mounted ? daily.streak : 0} ac="var(--gold)" />
            <Pill icon={<Trophy size={12} strokeWidth={2.4} />} label="BEST" value={mounted ? daily.best : 0} ac="var(--good)" />
          </div>
        </div>

        {/* your champion strip → raise lane (mounted-gated: reads the persisted
            store, which is empty on the server — rendering it during SSR causes
            a hydration mismatch that can leave the tab half-interactive) */}
        {mounted && owned && ROSTER[owned] && <OwnedStrip owned={owned} get={get} onNavigate={onNavigate} />}
        {mounted && (!owned || !ROSTER[owned]) && (
          <button
            type="button"
            onClick={() => onNavigate?.("champion")}
            className="panel"
            style={{ ["--ac" as string]: "var(--accent)", width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "12px 13px", marginBottom: 14, cursor: "pointer", textAlign: "left" }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 10, display: "grid", placeItems: "center", background: "var(--panel2, #15131f)", flexShrink: 0 }}>
              <Shield size={20} strokeWidth={2.2} style={{ color: "var(--accent)" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 800 }}>Choose your champion</div>
              <div className="mono" style={{ fontSize: 10.5, color: "var(--muted2)" }}>Raise the mind you send to fight</div>
            </div>
            <ChevronRight size={18} strokeWidth={2.2} style={{ color: "var(--muted2)" }} />
          </button>
        )}

        <a
          href="/grounds?world=1"
          className="mono"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            marginBottom: 14,
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid var(--line2)",
            background: "var(--panel2)",
            color: "var(--muted2)",
            fontSize: 11,
            letterSpacing: 0.5,
            textDecoration: "none",
          }}
        >
          <Globe size={14} strokeWidth={2.2} style={{ color: "var(--accent)", flexShrink: 0 }} />
          <span style={{ flex: 1, lineHeight: 1.35 }}>
            3D Grounds <span style={{ opacity: 0.75 }}>(experimental on phone — desktop recommended)</span>
          </span>
          <ChevronRight size={14} strokeWidth={2.2} />
        </a>

        {!plan || !mounted ? (
          <div className="mono" style={{ textAlign: "center", color: "var(--muted2)", padding: 50 }}>loading today&apos;s fight…</div>
        ) : view === "predict" ? (
          <Predict plan={plan} get={get} acol={acol} bcol={bcol} winnerPick={winnerPick} setWinnerPick={setWinnerPick} dunkPick={dunkPick} setDunkPick={setDunkPick} onStart={startBout} onNavigate={onNavigate} />
        ) : view === "bout" ? (
          <MobileBoutStage bout={bout} a={plan.a} b={plan.b} topic={plan.topic} />
        ) : (
          <Done plan={plan} get={get} result={daily.result} streak={daily.streak} best={daily.best} onReplay={replay} onNavigate={onNavigate} />
        )}
      </div>
    </div>
  );
}

function Pill({ icon, label, value, ac }: { icon: React.ReactNode; label: string; value: number; ac: string }) {
  return (
    <span className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 9px", borderRadius: 9, border: "1px solid var(--line2)", fontSize: 11 }}>
      <span style={{ color: ac, display: "inline-flex" }}>{icon}</span>
      <span style={{ fontWeight: 800, color: ac }}>{value}</span>
      <span style={{ color: "var(--muted2)", fontSize: 9, letterSpacing: 1 }}>{label}</span>
    </span>
  );
}

function OwnedStrip({ owned, get, onNavigate }: { owned: string | null; get: (k: string) => Champion; onNavigate?: (tab: string) => void }) {
  if (!owned || !ROSTER[owned]) return null;
  const type = ROSTER[owned].type;
  const champ = get(owned);
  const dl = doctrineLabel(champ);
  const col = TYPE_COLOR[type];
  return (
    <button
      type="button"
      onClick={() => onNavigate?.("champion")}
      className="panel"
      style={{ ["--ac" as string]: col, width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", marginBottom: 14, cursor: "pointer", textAlign: "left" }}
    >
      <ChampionAvatar ckey={owned} type={type} champion={champ} size={44} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="mono" style={{ fontSize: 9, letterSpacing: 1.2, color: "var(--muted2)" }}>YOUR CHAMPION</div>
        <div style={{ fontSize: 15, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ROSTER[owned].name}</div>
        <div className="mono" style={{ fontSize: 10, color: col }}>{type} · L{dl.level} {dl.tier}</div>
      </div>
      <ChevronRight size={18} strokeWidth={2.2} style={{ color: "var(--muted2)" }} />
    </button>
  );
}

function Predict(props: {
  plan: DailyResponse;
  get: (k: string) => Champion;
  acol: string;
  bcol: string;
  winnerPick: "a" | "b" | null;
  setWinnerPick: (p: "a" | "b") => void;
  dunkPick: "a" | "b" | null;
  setDunkPick: (p: "a" | "b" | null) => void;
  onStart: () => void;
  onNavigate?: (tab: string) => void;
}) {
  const { plan, get, acol, bcol, winnerPick, setWinnerPick, dunkPick, setDunkPick, onStart, onNavigate } = props;
  return (
    <div className="fadein">
      <div className="panel" style={{ padding: 14, marginBottom: 12, textAlign: "center" }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)", marginBottom: 6 }}>THE PROPOSITION</div>
        <div style={{ fontSize: 17, fontWeight: 700, fontStyle: "italic", lineHeight: 1.35 }}>&ldquo;{plan.topic}&rdquo;</div>
      </div>

      <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--gold)", marginBottom: 8, textAlign: "center" }}>1 · WHO WINS THE TRIBUNAL?</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <CallCard entry={plan.a} champ={get(plan.a.key)} col={acol} side="FOR" on={winnerPick === "a"} onClick={() => setWinnerPick("a")} />
        <CallCard entry={plan.b} champ={get(plan.b.key)} col={bcol} side="AGAINST" on={winnerPick === "b"} onClick={() => setWinnerPick("b")} />
      </div>

      <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)", margin: "16px 0 8px", textAlign: "center" }}>
        2 · WHO LANDS THE DUNK? <span style={{ opacity: 0.7 }}>· OPTIONAL</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <SmallPick on={dunkPick === "a"} col={acol} label={plan.a.name} onClick={() => setDunkPick(dunkPick === "a" ? null : "a")} />
        <SmallPick on={dunkPick === "b"} col={bcol} label={plan.b.name} onClick={() => setDunkPick(dunkPick === "b" ? null : "b")} />
      </div>

      <button
        type="button"
        disabled={!winnerPick}
        onClick={onStart}
        style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 18, padding: "14px 18px", borderRadius: 12, border: "none", background: "var(--gold, #f5d020)", color: "#0a0a12", fontSize: 15, fontWeight: 800, cursor: winnerPick ? "pointer" : "not-allowed", opacity: winnerPick ? 1 : 0.45 }}
      >
        <Lock size={16} strokeWidth={2.4} /> Lock it in &amp; watch
      </button>
      <p className="mono" style={{ textAlign: "center", fontSize: 10, color: "var(--muted2)", marginTop: 12, letterSpacing: 0.5 }}>
        SAME FIGHT FOR EVERYONE TODAY · ONE CALL · COMES BACK AT MIDNIGHT UTC
      </p>
      <div style={{ textAlign: "center", marginTop: 10 }}>
        <button type="button" onClick={() => onNavigate?.("watch")} className="mono" style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
          or pick your own fight <ChevronRight size={13} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}

function CallCard({ entry, champ, col, side, on, onClick }: { entry: DailyResponse["a"]; champ: Champion; col: string; side: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="panel"
      style={{ ["--ac" as string]: col, padding: 14, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textAlign: "center", cursor: "pointer", borderColor: on ? col : "var(--line)", background: on ? `color-mix(in srgb, ${col} 14%, transparent)` : undefined, boxShadow: on ? `0 0 26px -12px ${col}` : "none" }}
    >
      <div className="mono" style={{ fontSize: 9, letterSpacing: 1.2, color: col }}>{side}</div>
      <ChampionAvatar ckey={entry.key} type={entry.type} champion={champ} size={88} />
      <div style={{ fontSize: 16, fontWeight: 700 }}>{entry.name}</div>
      <div className="mono" style={{ fontSize: 11, fontWeight: 800, color: on ? col : "var(--muted2)", marginTop: 2 }}>{on ? "✓ CALLED" : "TAP TO CALL"}</div>
    </button>
  );
}

function SmallPick({ on, col, label, onClick }: { on: boolean; col: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="btn"
      style={{ ["--ac" as string]: col, fontSize: 13, fontWeight: 700, padding: "11px", textTransform: "none", borderColor: on ? col : "var(--line2)", color: on ? col : "var(--ink)", background: on ? `color-mix(in srgb, ${col} 16%, transparent)` : "transparent" }}
    >
      {on ? "✓ " : ""}{label}
    </button>
  );
}

function Done({
  plan,
  get,
  result,
  streak,
  best,
  onReplay,
  onNavigate,
}: {
  plan: DailyResponse;
  get: (k: string) => Champion;
  result: DailyResult | null;
  streak: number;
  best: number;
  onReplay: () => void;
  onNavigate?: (tab: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  if (!result) return null;
  const winnerEntry = result.winnerKey === plan.a.key ? plan.a : plan.b;
  const wcol = TYPE_COLOR[winnerEntry.type];
  const text = shareText(result, streak, best);

  const share = async () => {
    try {
      const nav = navigator as Navigator & { share?: (d: { text: string }) => Promise<void> };
      if (nav.share) {
        await nav.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* share/clipboard blocked — the X button still works */
    }
  };

  return (
    <div className="fadein">
      <div className="panel" style={{ ["--ac" as string]: wcol, padding: 20, textAlign: "center", boxShadow: `0 0 70px -34px ${wcol}` }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: 2, color: "var(--muted2)" }}>THE TRIBUNAL RULED</div>
        <div style={{ display: "flex", justifyContent: "center", margin: "12px 0 4px" }}>
          <ChampionAvatar ckey={winnerEntry.key} type={winnerEntry.type} champion={get(winnerEntry.key)} size={96} />
        </div>
        <div className="glow" style={{ fontSize: 26, fontWeight: 800, color: wcol }}>{result.winnerName} wins</div>

        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 14, flexWrap: "wrap" }}>
          <VerdictPill ok={result.winnerCorrect} label="Winner call" />
          {result.dunkCorrect != null && <VerdictPill ok={result.dunkCorrect} label="Dunk call" />}
        </div>

        <div style={{ marginTop: 16, padding: 13, borderRadius: 12, background: "var(--panel2)", border: "1px solid var(--line)" }}>
          <div className="mono" style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--gold)", marginBottom: 5, display: "inline-flex", alignItems: "center", gap: 5 }}>
            <Mic size={11} strokeWidth={2} /> ZINGER OF THE DAY · {result.dunkName}
          </div>
          <div style={{ fontStyle: "italic", fontSize: 14, lineHeight: 1.5 }}>&ldquo;{result.dunkLine}&rdquo;</div>
        </div>

        <div style={{ display: "flex", gap: 9, marginTop: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <button type="button" onClick={share} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "11px 18px", borderRadius: 11, border: "none", background: "var(--gold, #f5d020)", color: "#0a0a12", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
            <Share2 size={15} strokeWidth={2.4} /> {copied ? "Copied" : "Share"}
          </button>
          <a className="btn" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" style={{ textTransform: "none" }}>
            Post on X
          </a>
          <button type="button" className="btn" onClick={onReplay} style={{ display: "inline-flex", alignItems: "center", gap: 6, textTransform: "none" }}>
            <RotateCcw size={14} strokeWidth={2.2} /> Replay
          </button>
        </div>
      </div>
      <button type="button" onClick={() => onNavigate?.("watch")} className="mono" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", marginTop: 14, padding: "12px", borderRadius: 12, border: "1px solid var(--line2)", background: "transparent", color: "var(--accent)", fontSize: 13, cursor: "pointer" }}>
        <Shield size={14} strokeWidth={2.2} /> Keep watching — pick your own fights <ChevronRight size={14} strokeWidth={2.2} />
      </button>
    </div>
  );
}

function VerdictPill({ ok, label }: { ok: boolean; label: string }) {
  const col = ok ? "var(--good)" : "var(--bad)";
  return (
    <div style={{ padding: "7px 12px", borderRadius: 10, border: `1px solid ${col}`, color: col, fontWeight: 700, fontSize: 12 }}>
      {ok ? "✓" : "✗"} {label}
    </div>
  );
}

export default MobileToday;
