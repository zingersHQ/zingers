"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import type { AutoplayEvent, Strat } from "@/lib/types";

const LEARNERS = [
  { key: "AXIOM", name: "Axiom", type: "LOGIC" },
  { key: "VOX", name: "Vox", type: "RHETORIC" },
  { key: "GLITCH", name: "Glitch", type: "CHAOS" },
  { key: "MUSE", name: "Muse", type: "CREATIVITY" },
  { key: "BASTION", name: "Bastion", type: "COMPOSURE" },
  { key: "EMBER", name: "Ember", type: "CHAOS" },
  { key: "PARADOX", name: "Paradox", type: "LOGIC" },
  { key: "WIT", name: "Wit", type: "RHETORIC" },
];

interface RoundLog {
  round: number;
  opponentName?: string;
  opponentType?: string;
  topic?: string;
  won?: boolean;
  score?: string;
  bestLine?: string;
  note?: string;
  delta?: Strat;
  eloDelta?: number;
  done?: boolean;
}

const DIALS: { key: keyof Strat; label: string; hint: string; ac: string }[] = [
  { key: "risk", label: "RISK", hint: "swing for finishers", ac: "var(--bad)" },
  { key: "focus", label: "FOCUS", hint: "set up combos first", ac: "var(--accent)" },
  { key: "aggression", label: "AGGRO", hint: "raw power & tempo", ac: "var(--gold)" },
];

export function Autoplay() {
  const [learner, setLearner] = useState("AXIOM");
  const [live, setLive] = useState(false);
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [strat, setStrat] = useState<Strat>({ risk: 50, focus: 50, aggression: 50 });
  const [elo, setElo] = useState(0);
  const [rounds, setRounds] = useState<RoundLog[]>([]);
  const [record, setRecord] = useState<{ wins: number; losses: number } | null>(null);
  const [isLive, setIsLive] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const stop = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
  }, []);

  useEffect(() => () => stop(), [stop]);

  const run = () => {
    stop();
    setPhase("running");
    setStrat({ risk: 50, focus: 50, aggression: 50 });
    setElo(0);
    setRounds([]);
    setRecord(null);

    const q = new URLSearchParams({ a: learner, rounds: "6", mock: live ? "0" : "1" });
    const es = new EventSource(`/api/autoplay?${q.toString()}`);
    esRef.current = es;

    es.onmessage = (e) => {
      const ev = JSON.parse(e.data) as AutoplayEvent;
      if (ev.type === "start") {
        setStrat(ev.strat);
        setElo(ev.elo);
        setIsLive(ev.live);
      } else if (ev.type === "round") {
        setRounds((rs) => [
          ...rs,
          { round: ev.round, opponentName: ev.opponentName, opponentType: ev.opponentType, topic: ev.topic },
        ]);
      } else if (ev.type === "bout") {
        setRounds((rs) =>
          rs.map((r) =>
            r.round === ev.round
              ? { ...r, won: ev.won, score: `${ev.learnerHp}–${ev.oppHp}`, bestLine: ev.bestLine }
              : r,
          ),
        );
      } else if (ev.type === "reflect") {
        setStrat(ev.strat);
        setElo(ev.elo);
        setRounds((rs) =>
          rs.map((r) => (r.round === ev.round ? { ...r, note: ev.note, delta: ev.delta, eloDelta: ev.eloDelta } : r)),
        );
      } else if (ev.type === "done") {
        setRecord({ wins: ev.wins, losses: ev.losses });
        setElo(ev.elo);
        setPhase("done");
        stop();
      }
    };
    es.onerror = () => {
      stop();
      setPhase((p) => (p === "running" ? "done" : p));
    };
  };

  const me = LEARNERS.find((l) => l.key === learner)!;

  return (
    <section
      className="panel"
      style={{ ["--ac" as string]: "var(--gold)", padding: 20, marginBottom: 30, position: "relative", overflow: "hidden" }}
    >
      <div className="mono" style={{ fontSize: 11, letterSpacing: 2, color: "var(--gold)" }}>
        THE LOOP · SELF-IMPROVEMENT
      </div>
      <h2 style={{ fontSize: 24, fontWeight: 800, margin: "6px 0 0", letterSpacing: -0.4 }}>
        Watch an agent climb by rewriting itself
      </h2>
      <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, margin: "8px 0 0", maxWidth: 620 }}>
        No human in the loop. Each round it <strong style={{ color: "var(--ink)" }}>fights</strong>, reads the transcript,{" "}
        <strong style={{ color: "var(--ink)" }}>reflects</strong> on what went wrong, and{" "}
        <strong style={{ color: "var(--ink)" }}>retunes its own doctrine</strong>, then faces a tougher opponent.
      </p>

      {/* controls */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", margin: "16px 0 18px" }}>
        <select
          value={learner}
          onChange={(e) => setLearner(e.target.value)}
          disabled={phase === "running"}
          className="mono"
          style={{
            padding: "9px 12px",
            borderRadius: 9,
            background: "#100e1a",
            border: "1px solid var(--line2)",
            color: "var(--ink)",
            fontSize: 13,
            outline: "none",
          }}
        >
          {LEARNERS.map((l) => (
            <option key={l.key} value={l.key}>
              {l.name} · {l.type}
            </option>
          ))}
        </select>
        <button
          onClick={() => setLive((v) => !v)}
          disabled={phase === "running"}
          className="btn"
          title="Live spends real LLM calls; off runs free, deterministic fights"
          style={{
            textTransform: "none",
            fontSize: 12.5,
            borderColor: live ? "var(--good)" : "var(--line2)",
            color: live ? "var(--good)" : "var(--ink)",
            background: live ? "color-mix(in srgb, var(--good) 14%, transparent)" : "transparent",
          }}
        >
          {live ? "● live LLM" : "○ offline"}
        </button>
        <button
          className="btn btn-primary"
          style={{ ["--ac" as string]: "var(--gold)", display: "inline-flex", alignItems: "center", gap: 6 }}
          onClick={run}
          disabled={phase === "running"}
        >
          {phase === "running" ? "running…" : phase === "done" ? <><RotateCcw size={14} strokeWidth={2.2} /> run again</> : <><Play size={14} strokeWidth={2.2} /> let it run</>}
        </button>
        {phase !== "idle" && (
          <span className="chip" style={{ fontSize: 11, borderColor: "var(--line2)", color: "var(--muted)" }}>
            {isLive ? "real fights + reflection" : "offline · deterministic"}
          </span>
        )}
      </div>

      {/* dials + elo */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 18, alignItems: "center" }}>
        <div style={{ display: "grid", gap: 10 }}>
          {DIALS.map((d) => (
            <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="mono" style={{ width: 52, fontSize: 10, letterSpacing: 1, color: "var(--muted2)" }}>
                {d.label}
              </div>
              <div style={{ flex: 1, height: 8, borderRadius: 6, background: "#100e1a", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${strat[d.key]}%`,
                    height: "100%",
                    background: d.ac,
                    borderRadius: 6,
                    transition: "width 600ms cubic-bezier(.2,.8,.2,1)",
                  }}
                />
              </div>
              <div className="mono" style={{ width: 26, textAlign: "right", fontSize: 12, color: "var(--ink)" }}>
                {strat[d.key]}
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", minWidth: 96 }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)" }}>
            {me.name.toUpperCase()} · SKILL SCORE
          </div>
          <div
            style={{
              fontSize: 38,
              fontWeight: 800,
              letterSpacing: -1,
              color: "var(--gold)",
              fontFamily: "var(--font-mono)",
              lineHeight: 1.1,
            }}
          >
            {elo}
          </div>
          {record && (
            <div className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
              {record.wins}W · {record.losses}L
            </div>
          )}
        </div>
      </div>

      {/* feed */}
      {rounds.length > 0 && (
        <div style={{ display: "grid", gap: 8, marginTop: 18 }}>
          {rounds.map((r) => (
            <div
              key={r.round}
              style={{
                border: "1px solid var(--line2)",
                borderRadius: 11,
                padding: "11px 13px",
                background: "#0c0a16",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span className="mono" style={{ fontSize: 11, color: "var(--muted2)" }}>
                  R{r.round}
                </span>
                <span style={{ fontSize: 13.5, fontWeight: 700 }}>vs {r.opponentName ?? "…"}</span>
                {r.won !== undefined ? (
                  <span
                    className="chip"
                    style={{
                      fontSize: 11,
                      borderColor: r.won ? "var(--good)" : "var(--bad)",
                      color: r.won ? "var(--good)" : "var(--bad)",
                    }}
                  >
                    {r.won ? "WON" : "LOST"} {r.score}
                  </span>
                ) : (
                  <span className="mono" style={{ fontSize: 11, color: "var(--muted2)" }}>
                    fighting…
                  </span>
                )}
                {r.eloDelta !== undefined && (
                  <span
                    className="mono"
                    style={{ fontSize: 11, color: r.eloDelta >= 0 ? "var(--good)" : "var(--bad)" }}
                  >
                    {r.eloDelta >= 0 ? "+" : ""}
                    {r.eloDelta} skill
                  </span>
                )}
              </div>
              {r.note && (
                <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginTop: 7, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, color: "var(--muted)", fontStyle: "italic", flex: 1, minWidth: 200 }}>
                    “{r.note}”
                  </span>
                  {r.delta && <DeltaChips delta={r.delta} />}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {phase === "done" && record && (
        <p className="mono" style={{ fontSize: 12, color: "var(--muted)", marginTop: 16, lineHeight: 1.6 }}>
          Started from zero skill and a flat 50/50/50 doctrine. After {record.wins + record.losses} self-coached fights it
          settled on {strat.risk}/{strat.focus}/{strat.aggression}. No one touched the dials but the agent.
        </p>
      )}
    </section>
  );
}

function DeltaChips({ delta }: { delta: Strat }) {
  const items = (Object.entries(delta) as [keyof Strat, number][]).filter(([, v]) => v !== 0);
  if (items.length === 0)
    return (
      <span className="mono" style={{ fontSize: 10.5, color: "var(--muted2)" }}>
        held steady
      </span>
    );
  return (
    <span style={{ display: "inline-flex", gap: 6 }}>
      {items.map(([k, v]) => (
        <span
          key={k}
          className="mono"
          style={{
            fontSize: 10.5,
            padding: "1px 6px",
            borderRadius: 5,
            border: "1px solid var(--line2)",
            color: v > 0 ? "var(--good)" : "var(--bad)",
          }}
        >
          {String(k).slice(0, 4)} {v > 0 ? "+" : ""}
          {v}
        </span>
      ))}
    </span>
  );
}
