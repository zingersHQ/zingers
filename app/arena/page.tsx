"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Dices, Zap, Scale } from "lucide-react";
import type { BattleEnd, Champion, RosterEntry, Style } from "@/lib/types";
import { TYPE_COLOR, blankStyle, accrue } from "@/lib/evolve/progression";
import { useChampions } from "@/store/champions";
import { useBout } from "@/components/arena/use-bout";
import { ChampionAvatar, doctrineLabel } from "@/components/champion-avatar";
import { GameDock } from "@/components/game-dock";
import { DOCK_H } from "@/lib/play-nav";

interface ByoAgent {
  provider: "grok" | "openai" | "http";
  endpoint: string;
  model: string;
  baseUrl: string;
  apiKey: string;
}

const BLANK_AGENT: ByoAgent = { provider: "grok", endpoint: "", model: "", baseUrl: "https://api.openai.com/v1", apiKey: "" };

// Serialise the challenger's brain into /api/battle query params (side "a").
function agentParams(a: ByoAgent): string {
  if (a.provider === "http" && a.endpoint.trim()) {
    return `&aprov=http&aurl=${encodeURIComponent(a.endpoint.trim())}`;
  }
  if (a.provider === "openai" && a.model.trim()) {
    let s = `&aprov=openai&amodel=${encodeURIComponent(a.model.trim())}&abase=${encodeURIComponent(a.baseUrl.trim())}`;
    if (a.apiKey.trim()) s += `&akey=${encodeURIComponent(a.apiKey.trim())}`;
    return s;
  }
  return "";
}

function agentLabel(a: ByoAgent): string | null {
  if (a.provider === "http" && a.endpoint.trim()) {
    try {
      return new URL(a.endpoint.trim()).host;
    } catch {
      return "custom endpoint";
    }
  }
  if (a.provider === "openai" && a.model.trim()) return a.model.trim();
  return null;
}

export default function ArenaPage() {
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [aKey, setAKey] = useState("AXIOM");
  const [bKey, setBKey] = useState("VOX");
  const [topic, setTopic] = useState("");
  const [pick, setPick] = useState<"a" | "b" | null>(null);
  const [view, setView] = useState<"setup" | "bout">("setup");
  const [resultMsg, setResultMsg] = useState<{ won: boolean } | null>(null);
  const [autoGo, setAutoGo] = useState(false);
  const [agentA, setAgentA] = useState<ByoAgent>(BLANK_AGENT);
  const [showAdv, setShowAdv] = useState(false);

  const bout = useBout();
  const { progress, get, recordBattle, predictResult, predict } = useChampions();

  // always-fresh history for the onEnd closure
  const historyRef = useRef(bout.history);
  historyRef.current = bout.history;

  useEffect(() => {
    // deep-link: /arena?a=AXIOM&b=VOX&go=1  (preselect fighters, optionally autostart)
    const q = new URLSearchParams(window.location.search);
    const qa = q.get("a")?.toUpperCase();
    const qb = q.get("b")?.toUpperCase();
    if (qa) setAKey(qa);
    if (qb) setBKey(qb);
    if (q.get("go") === "1") setAutoGo(true);
    // a bring-your-own agent handed off from /agents (or a shared deep-link)
    const prov = q.get("aprov");
    if (prov === "http" || prov === "openai") {
      setAgentA({
        provider: prov,
        endpoint: q.get("aurl") || "",
        model: q.get("amodel") || "",
        baseUrl: q.get("abase") || "https://api.openai.com/v1",
        apiKey: q.get("akey") || "",
      });
      setShowAdv(true);
    }
    fetch("/api/roster")
      .then((r) => r.json())
      .then((d) => {
        setRoster(d.creatures);
        setTopics(d.topics);
      });
  }, []);

  const byKey = useMemo(() => Object.fromEntries(roster.map((r) => [r.key, r])), [roster]);
  const a = byKey[aKey];
  const b = byKey[bKey];

  function startBout() {
    if (!a || !b) return;
    setResultMsg(null);
    const t = topic || topics[Math.floor(Math.random() * topics.length)] || "cereal is soup";
    setTopic(t);
    setView("bout");
    const url = `/api/battle?a=${aKey}&b=${bKey}&topic=${encodeURIComponent(t)}${agentParams(agentA)}`;
    bout.begin(url, (end: BattleEnd) => {
      const styles: Record<string, Style> = { [aKey]: blankStyle(), [bKey]: blankStyle() };
      for (const turn of historyRef.current) accrue(turn.actor === aKey ? styles[aKey] : styles[bKey], turn);
      const winnerKey = end.winner;
      const loserKey = winnerKey === aKey ? bKey : aKey;
      recordBattle(winnerKey, loserKey, styles);
      if (pick !== null) {
        const correct = (pick === "a" && winnerKey === aKey) || (pick === "b" && winnerKey === bKey);
        predictResult(correct);
        setResultMsg({ won: correct });
      }
    });
  }

  // autostart for deep-linked quick bouts (once roster + topics are ready)
  useEffect(() => {
    if (!autoGo || roster.length === 0 || topics.length === 0) return;
    setAutoGo(false);
    startBout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGo, roster, topics]);

  function again() {
    bout.stop();
    setResultMsg(null);
    setView("setup");
  }

  const acol = a ? TYPE_COLOR[a.type] : "#888";
  const bcol = b ? TYPE_COLOR[b.type] : "#888";

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: `26px 22px ${80 + DOCK_H}px` }}>
      <Header streak={predict.streak} best={predict.best} />

      {view === "setup" && (
        <Setup
          roster={roster}
          topics={topics}
          aKey={aKey}
          bKey={bKey}
          setAKey={setAKey}
          setBKey={setBKey}
          topic={topic}
          setTopic={setTopic}
          pick={pick}
          setPick={setPick}
          onStart={startBout}
          get={get}
          agentA={agentA}
          setAgentA={setAgentA}
          showAdv={showAdv}
          setShowAdv={setShowAdv}
        />
      )}

      {view === "bout" && a && b && (
        <BoutView
          bout={bout}
          a={a}
          b={b}
          acol={acol}
          bcol={bcol}
          aChamp={get(aKey)}
          bChamp={get(bKey)}
          pick={pick}
          resultMsg={resultMsg}
          onAgain={again}
          topic={topic}
          progress={progress}
        />
      )}
      <GameDock fixed />
    </main>
  );
}

function Header({ streak, best }: { streak: number; best: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
      <div>
        <h1 style={{ fontSize: 30, fontWeight: 700, margin: 0 }}>The Arena</h1>
        <p className="mono" style={{ color: "var(--muted2)", fontSize: 12, letterSpacing: 1.5, margin: "6px 0 0" }}>
          1V1 · DEBATE COMBAT · THE TRIBUNAL
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

function Setup(props: {
  roster: RosterEntry[];
  topics: string[];
  aKey: string;
  bKey: string;
  setAKey: (k: string) => void;
  setBKey: (k: string) => void;
  topic: string;
  setTopic: (t: string) => void;
  pick: "a" | "b" | null;
  setPick: (p: "a" | "b" | null) => void;
  onStart: () => void;
  get: (k: string) => Champion;
  agentA: ByoAgent;
  setAgentA: (a: ByoAgent) => void;
  showAdv: boolean;
  setShowAdv: (v: boolean) => void;
}) {
  const { roster, topics, aKey, bKey, setAKey, setBKey, topic, setTopic, pick, setPick, onStart, get, agentA, setAgentA, showAdv, setShowAdv } = props;
  const a = roster.find((r) => r.key === aKey);
  const b = roster.find((r) => r.key === bKey);

  return (
    <div className="fadein">
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 18, alignItems: "stretch" }}>
        <PickColumn label="CHALLENGER · FOR" roster={roster} selected={aKey} exclude={bKey} onSelect={setAKey} get={get} side="a" pick={pick} onPick={() => setPick("a")} />
        <div style={{ display: "grid", placeItems: "center" }}>
          <div className="mono" style={{ fontSize: 24, color: "var(--muted2)", fontWeight: 700 }}>
            VS
          </div>
        </div>
        <PickColumn label="CHALLENGER · AGAINST" roster={roster} selected={bKey} exclude={aKey} onSelect={setBKey} get={get} side="b" pick={pick} onPick={() => setPick("b")} />
      </div>

      <div className="panel" style={{ marginTop: 18, padding: 18 }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: 1.5, color: "var(--muted2)", marginBottom: 10 }}>
          THE PROPOSITION
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {topics.map((t) => (
            <button
              key={t}
              className="btn"
              style={{
                textTransform: "none",
                fontSize: 12,
                borderColor: topic === t ? "var(--gold)" : "var(--line2)",
                color: topic === t ? "var(--gold)" : "var(--ink)",
              }}
              onClick={() => setTopic(t)}
            >
              {t}
            </button>
          ))}
          <button className="btn" style={{ textTransform: "none", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }} onClick={() => setTopic("")}>
            <Dices size={14} strokeWidth={2} /> random
          </button>
        </div>
      </div>

      <AdvancedAgent agentA={agentA} setAgentA={setAgentA} open={showAdv} setOpen={setShowAdv} challenger={a?.name} />

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 18, justifyContent: "center", flexWrap: "wrap" }}>
        <div className="mono" style={{ fontSize: 12, color: pick ? "var(--good)" : "var(--muted2)" }}>
          {pick ? `BACKING ${pick === "a" ? a?.name : b?.name}: STREAK ON THE LINE` : "OPTIONAL: BACK A CHAMPION TO BUILD A STREAK"}
        </div>
        <button className="btn btn-primary" style={{ ["--ac" as string]: "var(--gold)", fontSize: 14, padding: "14px 28px" }} onClick={onStart}>
          {pick ? "▶ Lock it in & fight" : "▶ Start the fight"}
        </button>
      </div>
    </div>
  );
}

function AdvancedAgent({
  agentA,
  setAgentA,
  open,
  setOpen,
  challenger,
}: {
  agentA: ByoAgent;
  setAgentA: (a: ByoAgent) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
  challenger?: string;
}) {
  const label = agentLabel(agentA);
  const set = (patch: Partial<ByoAgent>) => setAgentA({ ...agentA, ...patch });
  const fieldStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 9,
    background: "#100e1a",
    border: "1px solid var(--line2)",
    color: "var(--ink)",
    fontSize: 13,
    outline: "none",
    fontFamily: "var(--font-mono)",
  };

  return (
    <div className="panel" style={{ marginTop: 14, padding: 0, overflow: "hidden" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 16px",
          background: "transparent",
          border: "none",
          color: "var(--ink)",
          cursor: "pointer",
          font: "inherit",
        }}
      >
        <span className="mono" style={{ fontSize: 11, letterSpacing: 1.2, color: "var(--muted2)" }}>
          {open ? "▾" : "▸"} ADVANCED · BRING YOUR OWN AGENT
        </span>
        {label && agentA.provider !== "grok" && (
          <span className="chip" style={{ borderColor: "var(--accent)", color: "var(--accent)", fontSize: 11, marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5 }}>
            <Zap size={12} strokeWidth={2.2} /> {challenger || "challenger"} ← {label}
          </span>
        )}
      </button>

      {open && (
        <div style={{ padding: "4px 16px 16px", borderTop: "1px solid var(--line)" }}>
          <p className="mono" style={{ fontSize: 11, color: "var(--muted2)", lineHeight: 1.6, margin: "12px 0" }}>
            Swap the challenger&apos;s brain. It keeps the body & moveset; your model decides the moves. Keys are sent only to start
            this fight, never stored. Full docs at{" "}
            <Link href="/agents" style={{ color: "var(--accent)" }}>
              /agents
            </Link>
            .
          </p>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            {(["grok", "openai", "http"] as const).map((p) => (
              <button
                key={p}
                className="btn"
                onClick={() => set({ provider: p })}
                style={{
                  textTransform: "none",
                  fontSize: 12,
                  borderColor: agentA.provider === p ? "var(--accent)" : "var(--line2)",
                  color: agentA.provider === p ? "var(--accent)" : "var(--ink)",
                  background: agentA.provider === p ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "transparent",
                }}
              >
                {agentA.provider === p ? "● " : "○ "}
                {p === "grok" ? "House Grok" : p === "openai" ? "OpenAI-compatible" : "HTTP agent"}
              </button>
            ))}
          </div>

          {agentA.provider === "http" && (
            <input style={fieldStyle} placeholder="https://my-agent.example.com/act" value={agentA.endpoint} onChange={(e) => set({ endpoint: e.target.value })} />
          )}
          {agentA.provider === "openai" && (
            <div style={{ display: "grid", gap: 8 }}>
              <input style={fieldStyle} placeholder="model id: gpt-4o-mini, grok-4, llama3.1…" value={agentA.model} onChange={(e) => set({ model: e.target.value })} />
              <input style={fieldStyle} placeholder="base URL: https://api.openai.com/v1" value={agentA.baseUrl} onChange={(e) => set({ baseUrl: e.target.value })} />
              <input style={fieldStyle} type="password" placeholder="API key (optional, not stored)" value={agentA.apiKey} onChange={(e) => set({ apiKey: e.target.value })} />
            </div>
          )}
          {agentA.provider === "grok" && (
            <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>The house Grok agent drives the challenger. Switch above to plug in your own.</p>
          )}
        </div>
      )}
    </div>
  );
}

function PickColumn(props: {
  label: string;
  roster: RosterEntry[];
  selected: string;
  exclude: string;
  onSelect: (k: string) => void;
  get: (k: string) => Champion;
  side: "a" | "b";
  pick: "a" | "b" | null;
  onPick: () => void;
}) {
  const { label, roster, selected, exclude, onSelect, get, side, pick, onPick } = props;
  const sel = roster.find((r) => r.key === selected);
  const col = sel ? TYPE_COLOR[sel.type] : "#888";
  const champ = sel ? get(sel.key) : undefined;
  const dl = champ ? doctrineLabel(champ) : null;
  const backed = pick === side;

  return (
    <div className="panel" style={{ ["--ac" as string]: col, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: col }}>
        {label}
      </div>
      {sel && champ && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <ChampionAvatar ckey={sel.key} type={sel.type} champion={champ} size={120} />
          <div style={{ fontSize: 22, fontWeight: 700 }}>{sel.name}</div>
          <div className="mono" style={{ fontSize: 11, color: col }}>
            {sel.type} · L{dl?.level} {dl?.tier}
          </div>
          <div style={{ fontSize: 13, color: "var(--ink)", fontStyle: "italic" }}>{dl?.doctrine}</div>
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
        {roster.map((r) => {
          const disabled = r.key === exclude;
          const on = r.key === selected;
          return (
            <button
              key={r.key}
              disabled={disabled}
              onClick={() => onSelect(r.key)}
              title={r.key}
              style={{
                width: 30,
                height: 30,
                borderRadius: 9,
                border: `2px solid ${on ? TYPE_COLOR[r.type] : "var(--line2)"}`,
                background: on ? `color-mix(in srgb, ${TYPE_COLOR[r.type]} 30%, #15131f)` : "#15131f",
                opacity: disabled ? 0.25 : 1,
                cursor: disabled ? "not-allowed" : "pointer",
                display: "grid",
                placeItems: "center",
              }}
            >
              <span style={{ width: 9, height: 9, borderRadius: 99, background: TYPE_COLOR[r.type] }} />
            </button>
          );
        })}
      </div>
      <button className={backed ? "btn btn-primary" : "btn"} style={{ ["--ac" as string]: col, fontSize: 12 }} onClick={onPick}>
        {backed ? "✓ backed to win" : "predict win"}
      </button>
    </div>
  );
}

function BoutView(props: {
  bout: ReturnType<typeof useBout>;
  a: RosterEntry;
  b: RosterEntry;
  acol: string;
  bcol: string;
  aChamp: Champion;
  bChamp: Champion;
  pick: "a" | "b" | null;
  resultMsg: { won: boolean } | null;
  onAgain: () => void;
  topic: string;
  progress: Record<string, Champion>;
}) {
  const { bout, a, b, acol, bcol, aChamp, bChamp, pick, resultMsg, onAgain, topic } = props;
  const t = bout.turn;
  const lineActor = t?.actor;

  return (
    <div className="fadein">
      <div className="panel" style={{ padding: "10px 18px", marginBottom: 14, textAlign: "center" }}>
        <span className="mono" style={{ fontSize: 11, color: "var(--muted2)", letterSpacing: 1 }}>
          PROPOSITION ·{" "}
        </span>
        <span style={{ fontStyle: "italic" }}>&ldquo;{bout.start?.topic || topic}&rdquo;</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <FighterPanel entry={a} champ={aChamp} col={acol} hp={bout.hpA} speaking={lineActor === a.key} line={lineActor === a.key ? t?.line : undefined} dmg={t && t.opp === a.key ? t.dmg : undefined} />
        <FighterPanel entry={b} champ={bChamp} col={bcol} hp={bout.hpB} speaking={lineActor === b.key} line={lineActor === b.key ? t?.line : undefined} dmg={t && t.opp === b.key ? t.dmg : undefined} />
      </div>

      {t && (
        <div className="panel pop" key={t.round} style={{ marginTop: 14, padding: 16, ["--ac" as string]: t.actor === a.key ? acol : bcol }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <span className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--gold)" }}>
              ROUND {t.round} · THE READ
            </span>
            <span className="chip" style={{ borderColor: t.actor === a.key ? acol : bcol, color: t.actor === a.key ? acol : bcol }}>
              {t.actor_name} → {t.move}
            </span>
            <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
              intent: {t.intent}
            </span>
            {t.info.crit && <span className="chip" style={{ borderColor: "var(--gold)", color: "var(--gold)" }}>★ HIGHLIGHT</span>}
            {t.info.se && <span className="chip" style={{ borderColor: "var(--good)", color: "var(--good)" }}>SUPER EFFECTIVE</span>}
            {t.info.capped && <span className="chip" style={{ borderColor: "var(--bad)", color: "var(--bad)" }}>CAPPED</span>}
          </div>
          <p style={{ margin: "10px 0 0", color: "var(--ink)", fontSize: 14, lineHeight: 1.5 }}>
            <span style={{ color: "var(--muted2)" }}>why&nbsp;&rsaquo;&nbsp;</span>
            {t.why || "-"}
          </p>
          <div className="mono" style={{ marginTop: 8, fontSize: 11, color: "var(--muted2)", display: "inline-flex", alignItems: "center", gap: 5 }}>
            <Scale size={12} strokeWidth={2} /> jury: {t.ruling}
          </div>
          {/* Why this landed — the engine's own math, made legible: the judge only
              nudges a bounded quality multiplier; type + statuses do the rest. */}
          <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <span className="chip" title="Judge's bounded quality multiplier (0.7–1.3, or 1.4 on a Highlight)"
              style={{ borderColor: t.q >= 1.05 ? "var(--good)" : t.q <= 0.95 ? "var(--bad)" : "var(--line)", color: t.q >= 1.05 ? "var(--good)" : t.q <= 0.95 ? "var(--bad)" : "var(--muted)" }}>
              quality ×{t.q.toFixed(2)}
            </span>
            <span className="mono" style={{ color: "var(--muted2)", fontSize: 12 }}>×</span>
            <span className="chip" title="Type matchup on the pentagon"
              style={{ borderColor: t.info.se ? "var(--good)" : t.info.resist ? "var(--bad)" : "var(--line)", color: t.info.se ? "var(--good)" : t.info.resist ? "var(--bad)" : "var(--muted)" }}>
              type ×{t.info.type.toFixed(2)}{t.info.se ? " (super effective)" : t.info.resist ? " (resisted)" : ""}
            </span>
            <span className="mono" style={{ color: "var(--muted2)", fontSize: 12 }}>→</span>
            <span className="chip" style={{ borderColor: t.actor === a.key ? acol : bcol, color: t.actor === a.key ? acol : bcol, fontWeight: 700 }}>
              {t.dmg} dmg{t.info.capped ? " (CAPPED)" : ""}
            </span>
            {t.info.fizzle && <span className="chip" style={{ borderColor: "var(--bad)", color: "var(--bad)" }}>fizzled</span>}
            {t.info.status?.map((s) => (
              <span key={s} className="chip" style={{ borderColor: "var(--line)", color: "var(--muted)" }}>{s}</span>
            ))}
          </div>
        </div>
      )}

      {bout.end && (
        <ResultCard end={bout.end} a={a} b={b} acol={acol} bcol={bcol} pick={pick} resultMsg={resultMsg} onAgain={onAgain} />
      )}
    </div>
  );
}

function FighterPanel(props: { entry: RosterEntry; champ: Champion; col: string; hp: number; speaking: boolean; line?: string; dmg?: number }) {
  const { entry, champ, col, hp, speaking, line, dmg } = props;
  const dl = doctrineLabel(champ);
  return (
    <div className="panel" style={{ ["--ac" as string]: col, padding: 18, position: "relative", overflow: "hidden", borderColor: speaking ? col : "var(--line)" }}>
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <ChampionAvatar ckey={entry.key} type={entry.type} champion={champ} size={84} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{entry.name}</div>
          <div className="mono" style={{ fontSize: 10, color: col, letterSpacing: 1 }}>
            {entry.type} · L{dl.level} · {dl.doctrine}
          </div>
          <div style={{ marginTop: 10, height: 12, borderRadius: 8, background: "#241f33", overflow: "hidden", border: "1px solid #2a2738" }}>
            <div style={{ width: `${hp}%`, height: "100%", background: hp > 55 ? "var(--good)" : hp > 25 ? "var(--gold)" : "var(--bad)", transition: "width .6s cubic-bezier(.2,.8,.2,1)" }} />
          </div>
          <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
            {hp} / 100 RESOLVE
          </div>
        </div>
        {dmg ? (
          <div className="pop" key={`${hp}-${dmg}`} style={{ position: "absolute", top: 14, right: 16, color: "var(--bad)", fontWeight: 700, fontSize: 26 }}>
            −{dmg}
          </div>
        ) : null}
      </div>
      <div
        style={{
          marginTop: 14,
          minHeight: 52,
          padding: "10px 14px",
          borderRadius: 12,
          background: speaking ? `color-mix(in srgb, ${col} 14%, #100e1a)` : "#100e1a",
          border: `1px solid ${speaking ? col : "var(--line)"}`,
          fontStyle: "italic",
          fontSize: 14,
          color: speaking ? "var(--ink)" : "var(--muted2)",
          transition: "all .2s ease",
        }}
      >
        {speaking && line ? `“${line}”` : "…"}
      </div>
    </div>
  );
}

function ResultCard(props: {
  end: BattleEnd;
  a: RosterEntry;
  b: RosterEntry;
  acol: string;
  bcol: string;
  pick: "a" | "b" | null;
  resultMsg: { won: boolean } | null;
  onAgain: () => void;
}) {
  const { end, a, acol, bcol, pick, resultMsg, onAgain } = props;
  const winnerCol = end.winner === a.key ? acol : bcol;
  const correct = resultMsg?.won;
  return (
    <div style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", background: "rgba(5,4,10,.72)", backdropFilter: "blur(8px)", zIndex: 60 }}>
      <div className="panel pop" style={{ ["--ac" as string]: winnerCol, padding: 30, width: "min(440px, 92vw)", textAlign: "center", boxShadow: `0 0 80px -30px ${winnerCol}` }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: 2, color: "var(--muted2)" }}>
          THE TRIBUNAL RULES
        </div>
        <div style={{ fontSize: 34, fontWeight: 700, margin: "10px 0 4px", color: winnerCol }} className="glow">
          {end.winner_name} wins
        </div>
        <div className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
          defeats {end.loser_name} in {end.rounds} rounds
        </div>
        {end.mvp.line && (
          <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: "#100e1a", border: "1px solid var(--line)" }}>
            <div className="mono" style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--gold)", marginBottom: 6 }}>
              DUNK OF THE MATCH · {end.mvp.dmg} DMG
            </div>
            <div style={{ fontStyle: "italic", fontSize: 14 }}>&ldquo;{end.mvp.line}&rdquo;</div>
          </div>
        )}
        {pick !== null && resultMsg && (
          <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 10, border: `1px solid ${correct ? "var(--good)" : "var(--bad)"}`, color: correct ? "var(--good)" : "var(--bad)", fontWeight: 700 }}>
            {correct ? "✓ Your prediction was right. Streak up!" : "✗ Wrong call. Streak reset."}
          </div>
        )}
        <div className="mono" style={{ fontSize: 11, color: "var(--muted2)", marginTop: 14 }}>
          champions evolved · skills updated
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "center" }}>
          <button className="btn btn-primary" style={{ ["--ac" as string]: winnerCol }} onClick={onAgain}>
            New fight
          </button>
          <Link href="/standings" className="btn">
            Rank
          </Link>
        </div>
      </div>
    </div>
  );
}
