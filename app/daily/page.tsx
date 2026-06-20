"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Lock, Scale, Mic } from "lucide-react";
import type { BattleEnd, BattleTurn, DailyResponse, DailyResult } from "@/lib/types";
import { TYPE_COLOR } from "@/lib/evolve/progression";
import { BRAND } from "@/lib/brand";
import { useChampions } from "@/store/champions";
import { useBout } from "@/components/arena/use-bout";
import { ChampionAvatar, doctrineLabel } from "@/components/champion-avatar";

const ACC = "#7c5cff";

export default function DailyPage() {
  const [plan, setPlan] = useState<DailyResponse | null>(null);
  const [mounted, setMounted] = useState(false);
  const [winnerPick, setWinnerPick] = useState<"a" | "b" | null>(null);
  const [dunkPick, setDunkPick] = useState<"a" | "b" | null>(null);
  const [view, setView] = useState<"predict" | "bout" | "done">("predict");

  const bout = useBout();
  const get = useChampions((s) => s.get);
  const daily = useChampions((s) => s.daily);
  const recordDaily = useChampions((s) => s.recordDaily);

  const historyRef = useRef<BattleTurn[]>([]);
  historyRef.current = bout.history;
  const pickRef = useRef<{ winner: "a" | "b" | null; dunk: "a" | "b" | null }>({ winner: null, dunk: null });
  pickRef.current = { winner: winnerPick, dunk: dunkPick };

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    fetch("/api/daily").then((r) => r.json()).then(setPlan);
  }, []);

  const solvedToday = mounted && plan != null && daily.result != null && daily.result.day === plan.day;

  useEffect(() => {
    if (solvedToday) setView("done");
  }, [solvedToday]);

  const onEnd = useCallback(
    (end: BattleEnd) => {
      if (!plan) return;
      const hist = historyRef.current;
      // the "dunk" = the single hardest-landing line of the bout (deterministic)
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
      recordDaily(result); // no-ops if already solved (e.g. a replay)
      setView("done");
    },
    [plan, recordDaily],
  );

  const startBout = useCallback(() => {
    if (!plan || !winnerPick) return;
    setView("bout");
    bout.begin(
      `/api/battle?a=${plan.a.key}&b=${plan.b.key}&topic=${encodeURIComponent(plan.topic)}&seed=${plan.seed}&mock=1`,
      onEnd,
    );
  }, [plan, winnerPick, bout, onEnd]);

  const replay = useCallback(() => {
    if (!plan) return;
    setView("bout");
    bout.begin(
      `/api/battle?a=${plan.a.key}&b=${plan.b.key}&topic=${encodeURIComponent(plan.topic)}&seed=${plan.seed}&mock=1`,
      () => setView("done"),
    );
  }, [plan, bout]);

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "26px 22px 90px" }}>
      <Header day={plan?.day} date={plan?.date} streak={mounted ? daily.streak : 0} best={mounted ? daily.best : 0} />

      {!plan || !mounted ? (
        <div className="mono" style={{ textAlign: "center", color: "var(--muted2)", padding: 60 }}>
          loading today&apos;s fight…
        </div>
      ) : view === "predict" ? (
        <Predict
          plan={plan}
          get={get}
          winnerPick={winnerPick}
          setWinnerPick={setWinnerPick}
          dunkPick={dunkPick}
          setDunkPick={setDunkPick}
          onStart={startBout}
        />
      ) : view === "bout" ? (
        <BoutView plan={plan} get={get} bout={bout} />
      ) : (
        <Done plan={plan} get={get} result={daily.result} streak={daily.streak} best={daily.best} onReplay={replay} />
      )}
    </main>
  );
}

function Header({ day, date, streak, best }: { day?: number; date?: string; streak: number; best: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
      <div>
        <h1 style={{ fontSize: 30, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>
          Daily Zinger{day ? <span style={{ color: ACC }}> #{day}</span> : null}
        </h1>
        <p className="mono" style={{ color: "var(--muted2)", fontSize: 12, letterSpacing: 1.5, margin: "6px 0 0" }}>
          ONE SHARED FIGHT · CALL IT BEFORE YOU WATCH{date ? ` · ${date}` : ""}
        </p>
      </div>
      <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
        <Stat label="STREAK" value={String(streak)} ac="var(--gold)" />
        <Stat label="BEST" value={String(best)} ac="var(--good)" />
      </div>
    </div>
  );
}

function Stat({ label, value, ac }: { label: string; value: string; ac: string }) {
  return (
    <div className="panel" style={{ padding: "8px 16px", textAlign: "center" }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: ac }}>{value}</div>
      <div className="mono" style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--muted2)" }}>
        {label}
      </div>
    </div>
  );
}

type GetFn = ReturnType<typeof useChampions.getState>["get"];

function Fighter({ entry, get, side }: { entry: DailyResponse["a"]; get: GetFn; side: string }) {
  const col = TYPE_COLOR[entry.type];
  const champ = get(entry.key);
  const dl = doctrineLabel(champ);
  return (
    <div className="panel" style={{ ["--ac" as string]: col, padding: 18, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
      <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: col }}>{side}</div>
      <ChampionAvatar ckey={entry.key} type={entry.type} champion={champ} size={104} />
      <div style={{ fontSize: 22, fontWeight: 700 }}>{entry.name}</div>
      <div className="mono" style={{ fontSize: 11, color: col }}>
        {entry.type} · L{dl.level} {dl.tier}
      </div>
      <div style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic", lineHeight: 1.4 }}>{entry.persona}</div>
    </div>
  );
}

function Predict(props: {
  plan: DailyResponse;
  get: GetFn;
  winnerPick: "a" | "b" | null;
  setWinnerPick: (p: "a" | "b") => void;
  dunkPick: "a" | "b" | null;
  setDunkPick: (p: "a" | "b" | null) => void;
  onStart: () => void;
}) {
  const { plan, get, winnerPick, setWinnerPick, dunkPick, setDunkPick, onStart } = props;
  const acol = TYPE_COLOR[plan.a.type];
  const bcol = TYPE_COLOR[plan.b.type];

  return (
    <div className="fadein">
      <div className="panel" style={{ padding: 18, marginBottom: 16, textAlign: "center" }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: 1.5, color: "var(--muted2)", marginBottom: 8 }}>
          THE PROPOSITION
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, fontStyle: "italic" }}>&ldquo;{plan.topic}&rdquo;</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 16, alignItems: "center" }}>
        <Fighter entry={plan.a} get={get} side="ARGUING · FOR" />
        <div className="mono" style={{ fontSize: 24, color: "var(--muted2)", fontWeight: 700 }}>VS</div>
        <Fighter entry={plan.b} get={get} side="ARGUING · AGAINST" />
      </div>

      <div className="panel" style={{ marginTop: 18, padding: 18 }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: 1.5, color: "var(--gold)", marginBottom: 12 }}>
          1 · WHO WINS THE TRIBUNAL?
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <PickBtn on={winnerPick === "a"} col={acol} onClick={() => setWinnerPick("a")} label={plan.a.name} />
          <PickBtn on={winnerPick === "b"} col={bcol} onClick={() => setWinnerPick("b")} label={plan.b.name} />
        </div>

        <div className="mono" style={{ fontSize: 11, letterSpacing: 1.5, color: "var(--muted2)", margin: "18px 0 12px" }}>
          2 · WHO LANDS THE DUNK? <span style={{ color: "var(--muted2)", opacity: 0.7 }}>· OPTIONAL</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <PickBtn on={dunkPick === "a"} col={acol} onClick={() => setDunkPick(dunkPick === "a" ? null : "a")} label={plan.a.name} small />
          <PickBtn on={dunkPick === "b"} col={bcol} onClick={() => setDunkPick(dunkPick === "b" ? null : "b")} label={plan.b.name} small />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
        <button
          className="btn btn-primary"
          disabled={!winnerPick}
          style={{ ["--ac" as string]: "var(--gold)", fontSize: 15, padding: "14px 30px", opacity: winnerPick ? 1 : 0.45, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          onClick={onStart}
        >
          <Lock size={15} strokeWidth={2.2} /> Lock it in &amp; watch
        </button>
      </div>
      <p className="mono" style={{ textAlign: "center", fontSize: 10, color: "var(--muted2)", marginTop: 12, letterSpacing: 0.5 }}>
        SAME FIGHT FOR EVERYONE TODAY · ONE CALL · COME BACK TOMORROW
      </p>
    </div>
  );
}

function PickBtn({ on, col, onClick, label, small }: { on: boolean; col: string; onClick: () => void; label: string; small?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="btn"
      style={{
        ["--ac" as string]: col,
        fontSize: small ? 13 : 16,
        fontWeight: 700,
        padding: small ? "10px" : "16px",
        textTransform: "none",
        borderColor: on ? col : "var(--line2)",
        color: on ? col : "var(--ink)",
        background: on ? `color-mix(in srgb, ${col} 16%, transparent)` : "transparent",
        boxShadow: on ? `0 0 24px -10px ${col}` : "none",
      }}
    >
      {on ? "✓ " : ""}
      {label}
    </button>
  );
}

function BoutView({ plan, get, bout }: { plan: DailyResponse; get: GetFn; bout: ReturnType<typeof useBout> }) {
  const t = bout.turn;
  const acol = TYPE_COLOR[plan.a.type];
  const bcol = TYPE_COLOR[plan.b.type];
  return (
    <div className="fadein">
      <div className="panel" style={{ padding: "10px 18px", marginBottom: 14, textAlign: "center" }}>
        <span className="mono" style={{ fontSize: 11, color: "var(--muted2)", letterSpacing: 1 }}>PROPOSITION · </span>
        <span style={{ fontStyle: "italic" }}>&ldquo;{plan.topic}&rdquo;</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <BoutFighter entry={plan.a} get={get} col={acol} hp={bout.hpA} speaking={t?.actor === plan.a.key} line={t?.actor === plan.a.key ? t?.line : undefined} dmg={t && t.opp === plan.a.key ? t.dmg : undefined} />
        <BoutFighter entry={plan.b} get={get} col={bcol} hp={bout.hpB} speaking={t?.actor === plan.b.key} line={t?.actor === plan.b.key ? t?.line : undefined} dmg={t && t.opp === plan.b.key ? t.dmg : undefined} />
      </div>
      {t && (
        <div className="panel pop" key={t.round} style={{ marginTop: 14, padding: 16, ["--ac" as string]: t.actor === plan.a.key ? acol : bcol }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <span className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--gold)" }}>ROUND {t.round} · THE READ</span>
            <span className="chip" style={{ borderColor: t.actor === plan.a.key ? acol : bcol, color: t.actor === plan.a.key ? acol : bcol }}>
              {t.actor_name} → {t.move}
            </span>
            {t.info.crit && <span className="chip" style={{ borderColor: "var(--gold)", color: "var(--gold)" }}>★ HIGHLIGHT</span>}
            {t.info.se && <span className="chip" style={{ borderColor: "var(--good)", color: "var(--good)" }}>SUPER EFFECTIVE</span>}
          </div>
          <div className="mono" style={{ marginTop: 8, fontSize: 11, color: "var(--muted2)", display: "inline-flex", alignItems: "center", gap: 5 }}><Scale size={12} strokeWidth={2} /> jury: {t.ruling} (q={t.q.toFixed(2)})</div>
        </div>
      )}
    </div>
  );
}

function BoutFighter(props: { entry: DailyResponse["a"]; get: GetFn; col: string; hp: number; speaking: boolean; line?: string; dmg?: number }) {
  const { entry, get, col, hp, speaking, line, dmg } = props;
  return (
    <div className="panel" style={{ ["--ac" as string]: col, padding: 16, position: "relative", overflow: "hidden", borderColor: speaking ? col : "var(--line)" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <ChampionAvatar ckey={entry.key} type={entry.type} champion={get(entry.key)} size={72} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{entry.name}</div>
          <div className="mono" style={{ fontSize: 10, color: col, letterSpacing: 1 }}>{entry.type}</div>
          <div style={{ marginTop: 8, height: 11, borderRadius: 8, background: "#241f33", overflow: "hidden", border: "1px solid #2a2738" }}>
            <div style={{ width: `${hp}%`, height: "100%", background: hp > 55 ? "var(--good)" : hp > 25 ? "var(--gold)" : "var(--bad)", transition: "width .6s cubic-bezier(.2,.8,.2,1)" }} />
          </div>
        </div>
        {dmg ? (
          <div className="pop" key={`${hp}-${dmg}`} style={{ position: "absolute", top: 12, right: 14, color: "var(--bad)", fontWeight: 700, fontSize: 24 }}>
            −{dmg}
          </div>
        ) : null}
      </div>
      <div style={{ marginTop: 12, minHeight: 48, padding: "10px 14px", borderRadius: 12, background: speaking ? `color-mix(in srgb, ${col} 14%, #100e1a)` : "#100e1a", border: `1px solid ${speaking ? col : "var(--line)"}`, fontStyle: "italic", fontSize: 13, color: speaking ? "var(--ink)" : "var(--muted2)" }}>
        {speaking && line ? `“${line}”` : "…"}
      </div>
    </div>
  );
}

function gridText(r: DailyResult, topic: string, streak: number, best: number): string {
  const w = r.winnerCorrect ? "✓" : "✗";
  const d = r.dunkCorrect == null ? "—" : r.dunkCorrect ? "✓" : "✗";
  return [
    `Zingers Daily #${r.day}`,
    `"${topic}"`,
    `Winner ${w} · Dunk ${d}`,
    `streak ${streak} · best ${best}`,
    BRAND.site.replace(/^https?:\/\//, "") + "/daily",
  ].join("\n");
}

function Done(props: {
  plan: DailyResponse;
  get: GetFn;
  result: DailyResult | null;
  streak: number;
  best: number;
  onReplay: () => void;
}) {
  const { plan, get, result, streak, best, onReplay } = props;
  const [copied, setCopied] = useState(false);
  if (!result) return null;
  const winnerEntry = result.winnerKey === plan.a.key ? plan.a : plan.b;
  const wcol = TYPE_COLOR[winnerEntry.type];
  const text = gridText(result, plan.topic, streak, best);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the tweet button still works */
    }
  };

  return (
    <div className="fadein" style={{ maxWidth: 560, margin: "0 auto" }}>
      <div className="panel" style={{ ["--ac" as string]: wcol, padding: 26, textAlign: "center", boxShadow: `0 0 80px -34px ${wcol}` }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: 2, color: "var(--muted2)" }}>THE TRIBUNAL RULED</div>
        <div style={{ display: "flex", justifyContent: "center", margin: "16px 0 6px" }}>
          <ChampionAvatar ckey={winnerEntry.key} type={winnerEntry.type} champion={get(winnerEntry.key)} size={108} />
        </div>
        <div className="glow" style={{ fontSize: 30, fontWeight: 800, color: wcol }}>{result.winnerName} wins</div>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
          <Verdict ok={result.winnerCorrect} label="Your winner call" />
          {result.dunkCorrect != null && <Verdict ok={result.dunkCorrect} label="Your dunk call" />}
        </div>

        <div style={{ marginTop: 18, padding: 16, borderRadius: 12, background: "#100e1a", border: "1px solid var(--line)" }}>
          <div className="mono" style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--gold)", marginBottom: 6, display: "inline-flex", alignItems: "center", gap: 5 }}>
            <Mic size={11} strokeWidth={2} /> ZINGER OF THE DAY · {result.dunkName}
          </div>
          <div style={{ fontStyle: "italic", fontSize: 16, lineHeight: 1.5 }}>&ldquo;{result.dunkLine}&rdquo;</div>
        </div>

        <pre
          className="mono"
          style={{ marginTop: 18, padding: 14, borderRadius: 12, background: "#0c0a16", border: "1px solid var(--line2)", fontSize: 12, lineHeight: 1.6, textAlign: "left", whiteSpace: "pre-wrap", color: "var(--ink)" }}
        >
          {text}
        </pre>

        <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="btn btn-primary" style={{ ["--ac" as string]: "var(--gold)" }} onClick={copy}>
            {copied ? "✓ Copied" : "Copy result"}
          </button>
          <a className="btn" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">
            Share on X
          </a>
          <button className="btn" onClick={onReplay}>↺ Replay</button>
        </div>
      </div>

      <p className="mono" style={{ textAlign: "center", fontSize: 11, color: "var(--muted2)", marginTop: 16, letterSpacing: 0.5 }}>
        NEXT ZINGER DROPS AT MIDNIGHT UTC · <Link href="/arena" style={{ color: ACC }}>start your own fight →</Link>
      </p>
    </div>
  );
}

function Verdict({ ok, label }: { ok: boolean; label: string }) {
  const col = ok ? "var(--good)" : "var(--bad)";
  return (
    <div style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${col}`, color: col, fontWeight: 700, fontSize: 13 }}>
      {ok ? "✓" : "✗"} {label}
    </div>
  );
}
