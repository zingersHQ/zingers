"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Champion, HouseEnd, RosterEntry } from "@/lib/types";
import { TYPE_COLOR, skillLevel } from "@/lib/evolve/progression";
import { type RatingDelta } from "@/lib/evolve/elo";
import { useChampions } from "@/store/champions";
import { useHouse, type PlayerView } from "@/components/house/use-house";
import { ChampionAvatar } from "@/components/champion-avatar";

export default function HousePage() {
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [cast, setCast] = useState<string[]>(["AXIOM", "VOX", "GLITCH", "BASTION", "MUSE", "EMBER"]);
  const [traitors, setTraitors] = useState(2);
  const [peek, setPeek] = useState(true);
  const [view, setView] = useState<"setup" | "live">("setup");
  const [deltas, setDeltas] = useState<Record<string, RatingDelta> | null>(null);

  const house = useHouse();
  const { get, recordHouseGame } = useChampions();
  const votesLog = useRef<{ voter: string; target: string }[]>([]);

  useEffect(() => {
    fetch("/api/roster").then((r) => r.json()).then((d) => setRoster(d.creatures));
  }, []);

  const nameToKey = useMemo(() => Object.fromEntries(house.players.map((p) => [p.name, p.key])), [house.players]);

  // accumulate votes (as keys) for the objective ELO record
  useEffect(() => {
    if (!house.votes) return;
    for (const v of house.votes.votes) {
      const voter = nameToKey[v.voter];
      const target = nameToKey[v.target];
      if (voter && target) votesLog.current.push({ voter, target });
    }
  }, [house.votes, nameToKey]);

  const maxTraitors = Math.max(1, Math.floor((cast.length - 1) / 2));
  const effTraitors = Math.min(traitors, maxTraitors);

  function start() {
    if (cast.length < 4) return;
    votesLog.current = [];
    setDeltas(null);
    setView("live");
    const url = `/api/house?cast=${cast.join(",")}&traitors=${effTraitors}`;
    house.begin(url, (end: HouseEnd) => {
      const d = recordHouseGame(end, votesLog.current);
      setDeltas(d);
    });
  }

  function again() {
    house.stop();
    setView("setup");
    setDeltas(null);
  }

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "26px 22px 80px" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 700, margin: 0 }}>The House</h1>
          <p className="mono" style={{ color: "var(--muted2)", fontSize: 12, letterSpacing: 1.5, margin: "6px 0 0" }}>
            SOCIAL DEDUCTION · THE HOUSE DECIDES · WINS COUNT TOWARD YOUR RANK
          </p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="btn" style={{ borderColor: peek ? "var(--gold)" : "var(--line2)", color: peek ? "var(--gold)" : "var(--ink)" }} onClick={() => setPeek((v) => !v)}>
            {peek ? "👁 peek: on" : "👁 peek: off"}
          </button>
          <Link href="/standings" className="btn">
            standings
          </Link>
        </div>
      </div>

      {view === "setup" && (
        <Setup roster={roster} cast={cast} setCast={setCast} traitors={effTraitors} setTraitors={setTraitors} maxTraitors={maxTraitors} get={get} onStart={start} />
      )}

      {view === "live" && <Live house={house} peek={peek} get={get} deltas={deltas} onAgain={again} />}
    </main>
  );
}

function Setup(props: {
  roster: RosterEntry[];
  cast: string[];
  setCast: (c: string[]) => void;
  traitors: number;
  setTraitors: (n: number) => void;
  maxTraitors: number;
  get: (k: string) => Champion;
  onStart: () => void;
}) {
  const { roster, cast, setCast, traitors, setTraitors, maxTraitors, get, onStart } = props;
  const toggle = (k: string) => setCast(cast.includes(k) ? cast.filter((x) => x !== k) : [...cast, k]);

  return (
    <div className="fadein">
      <div className="panel" style={{ padding: 20 }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: 1.5, color: "var(--muted2)", marginBottom: 14 }}>
          CAST · pick at least 4
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
          {roster.map((r) => {
            const on = cast.includes(r.key);
            const col = TYPE_COLOR[r.type];
            return (
              <button
                key={r.key}
                onClick={() => toggle(r.key)}
                className="panel"
                style={{ ["--ac" as string]: col, padding: 12, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer", borderColor: on ? col : "var(--line)", opacity: on ? 1 : 0.5 }}
              >
                <ChampionAvatar ckey={r.key} type={r.type} champion={get(r.key)} size={72} />
                <div style={{ fontWeight: 700 }}>{r.name}</div>
                <div className="mono" style={{ fontSize: 10, color: col }}>
                  {r.type} · SL {skillLevel(get(r.key))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 18, justifyContent: "center", flexWrap: "wrap" }}>
        <div className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>TRAITORS</div>
        {Array.from({ length: maxTraitors }, (_, i) => i + 1).map((n) => (
          <button key={n} className={n === traitors ? "btn btn-primary" : "btn"} style={{ ["--ac" as string]: "var(--bad)", width: 44 }} onClick={() => setTraitors(n)}>
            {n}
          </button>
        ))}
        <button className="btn btn-primary" style={{ ["--ac" as string]: "var(--good)", fontSize: 14, padding: "14px 28px" }} disabled={cast.length < 4} onClick={onStart}>
          ▶ Open the House
        </button>
      </div>
      {cast.length < 4 && <p style={{ textAlign: "center", color: "var(--bad)", marginTop: 10 }}>Pick at least 4 contestants.</p>}
    </div>
  );
}

function Live(props: {
  house: ReturnType<typeof useHouse>;
  peek: boolean;
  get: (k: string) => Champion;
  deltas: Record<string, RatingDelta> | null;
  onAgain: () => void;
}) {
  const { house, peek, get, deltas, onAgain } = props;
  const phaseLabel =
    house.phase === "night" ? "NIGHT · the house sleeps" : house.phase === "vote" ? "THE VOTE" : house.phase === "done" ? "VERDICT" : "DAY · the house debates";
  const phaseCol = house.phase === "night" ? "#6a6bff" : house.phase === "vote" ? "var(--gold)" : "var(--good)";

  return (
    <div className="fadein">
      <div className="panel" style={{ ["--ac" as string]: phaseCol, padding: "12px 18px", marginBottom: 14, display: "flex", alignItems: "center", gap: 14, borderColor: phaseCol }}>
        <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: phaseCol, letterSpacing: 1 }}>
          ROUND {house.round || 1}
        </span>
        <span style={{ fontWeight: 700 }}>{phaseLabel}</span>
        {house.night?.blocked && <span className="chip" style={{ borderColor: "var(--good)", color: "var(--good)" }}>SHIELD HELD</span>}
        <span className="mono" style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted)" }}>
          {house.players.filter((p) => p.alive).length} alive
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
        {house.players.map((p) => (
          <ContestantCard key={p.key} p={p} peek={peek} champ={get(p.key)} speaking={house.speaking === p.key} votes={house.votes} />
        ))}
      </div>

      {house.feed.length > 0 && (
        <div className="panel" style={{ marginTop: 16, padding: 16 }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)", marginBottom: 10 }}>
            HOUSE LOG
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {house.feed.slice(-6).map((f, i) => (
              <div key={i} className="mono" style={{ fontSize: 12, color: f.kind === "good" ? "var(--good)" : f.kind === "bad" ? "var(--bad)" : f.kind === "night" ? "#9a93ff" : "var(--muted)" }}>
                › {f.txt}
              </div>
            ))}
          </div>
        </div>
      )}

      {house.end && <Verdict end={house.end} deltas={deltas} onAgain={onAgain} />}
    </div>
  );
}

function ContestantCard({ p, peek, champ, speaking, votes }: { p: PlayerView; peek: boolean; champ: Champion; speaking: boolean; votes: ReturnType<typeof useHouse>["votes"] }) {
  const col = TYPE_COLOR[p.type];
  const isTraitor = p.role === "TRAITOR";
  const voteCount = votes ? votes.tally.find(([n]) => n === p.name)?.[1] ?? 0 : 0;
  return (
    <div
      className="panel"
      style={{
        ["--ac" as string]: col,
        padding: 14,
        opacity: p.alive ? 1 : 0.42,
        borderColor: speaking ? col : "var(--line)",
        boxShadow: speaking ? `0 0 30px -16px ${col}` : "none",
        filter: p.alive ? "none" : "grayscale(0.7)",
        position: "relative",
        transition: "all .2s ease",
      }}
    >
      {!p.alive && (
        <div className="mono" style={{ position: "absolute", top: 10, right: 12, fontSize: 10, color: "var(--bad)", letterSpacing: 1 }}>
          OUT
        </div>
      )}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <ChampionAvatar ckey={p.key} type={p.type} champion={champ} size={56} />
        <div>
          <div style={{ fontWeight: 700 }}>{p.name}</div>
          {peek ? (
            <div className="mono" style={{ fontSize: 10, color: isTraitor ? "var(--bad)" : col, letterSpacing: 0.5 }}>
              {p.role_label}
            </div>
          ) : (
            <div className="mono" style={{ fontSize: 10, color: "var(--muted2)" }}>
              ? ? ?
            </div>
          )}
        </div>
        {voteCount > 0 && (
          <div className="mono" style={{ marginLeft: "auto", fontSize: 12, color: "var(--gold)", fontWeight: 700 }}>
            {voteCount}▾
          </div>
        )}
      </div>
      <div style={{ marginTop: 10, minHeight: 40, fontStyle: "italic", fontSize: 13, color: speaking ? "var(--ink)" : "var(--muted2)" }}>
        {p.line ? `“${p.line}”` : "…"}
      </div>
      {peek && p.thought && (
        <div
          className="mono"
          style={{ marginTop: 8, fontSize: 11, color: isTraitor ? "var(--bad)" : "#7fd0ff", borderTop: "1px dashed var(--line2)", paddingTop: 8 }}
        >
          {isTraitor ? "🔪" : "💭"} {p.thought}
        </div>
      )}
    </div>
  );
}

function Verdict({ end, deltas, onAgain }: { end: HouseEnd; deltas: Record<string, RatingDelta> | null; onAgain: () => void }) {
  const traitorsWon = end.winner === "TRAITORS";
  const col = traitorsWon ? "var(--bad)" : "var(--good)";
  return (
    <div style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", background: "rgba(5,4,10,.74)", backdropFilter: "blur(8px)", zIndex: 60, padding: 20 }}>
      <div className="panel pop" style={{ ["--ac" as string]: col, padding: 28, width: "min(520px, 94vw)", maxHeight: "88vh", overflow: "auto", boxShadow: `0 0 80px -28px ${col}` }}>
        <div style={{ textAlign: "center" }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: 2, color: "var(--muted2)" }}>
            THE ENGINE DECIDES: OBJECTIVE VERDICT
          </div>
          <div className="glow" style={{ fontSize: 30, fontWeight: 700, margin: "8px 0", color: col }}>
            {traitorsWon ? "THE TRAITORS WIN" : "THE FAITHFUL WIN"}
          </div>
        </div>
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
          {end.roles
            .slice()
            .sort((a, b) => (deltas ? deltas[b.key].delta - deltas[a.key].delta : 0))
            .map((r) => {
              const d = deltas?.[r.key];
              return (
                <div key={r.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 10, background: "#100e1a", border: "1px solid var(--line)" }}>
                  <span style={{ fontWeight: 700, width: 80 }}>{r.name}</span>
                  <span className="mono" style={{ fontSize: 11, color: r.traitor ? "var(--bad)" : "var(--muted)", width: 80 }}>
                    {r.role}
                  </span>
                  <span className="mono" style={{ fontSize: 11, color: "var(--muted2)" }}>{r.alive ? "survived" : "out"}</span>
                  {d && (
                    <span className="mono" style={{ marginLeft: "auto", fontSize: 13, fontWeight: 700, color: d.delta >= 0 ? "var(--good)" : "var(--bad)" }}>
                      {d.delta >= 0 ? "+" : ""}
                      {d.delta} pts
                    </span>
                  )}
                </div>
              );
            })}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "center" }}>
          <button className="btn btn-primary" style={{ ["--ac" as string]: col }} onClick={onAgain}>
            New game
          </button>
          <Link href="/standings" className="btn">
            Standings
          </Link>
        </div>
      </div>
    </div>
  );
}
