"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { BattleEnd, BattleTurn, RosterEntry, Style } from "@/lib/types";
import { TYPE_COLOR, EMBLEM, levelFor, tierFor, doctrine, dominant, blankStyle, accrue } from "@/lib/evolve/progression";
import { ratingOf } from "@/lib/evolve/elo";
import { sideParams } from "@/lib/recipe-params";
import { useChampions } from "@/store/champions";
import { GameDock } from "@/components/game-dock";
import { DOCK_H } from "@/lib/play-nav";

// module-level singleton: only the most-recently-started loop is ever ACTIVE,
// so StrictMode double-invokes, remounts, or hot-reloads can never stack loops
let ACTIVE_LOOP = 0;

interface FeedItem {
  id: number;
  winner: string;
  loser: string;
  wColor: string;
  lColor: string;
  delta: number;
  topic: string;
  line: string;
}

export default function LeaguePage() {
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [useReal, setUseReal] = useState(false);
  const [paceMs, setPaceMs] = useState(1200);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [flash, setFlash] = useState<Record<string, number>>({});
  const [bouts, setBouts] = useState(0);
  const [busy, setBusy] = useState(false);

  const [mounted, setMounted] = useState(false);
  const progress = useChampions((s) => s.progress);
  const runningRef = useRef(false);
  const idRef = useRef(0);
  const rosterRef = useRef<RosterEntry[]>([]);
  const useRealRef = useRef(false);
  const paceRef = useRef(1200);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    fetch("/api/roster").then((r) => r.json()).then((d) => setRoster(d.creatures));
  }, []);
  useEffect(() => {
    rosterRef.current = roster;
  }, [roster]);
  useEffect(() => {
    useRealRef.current = useReal;
  }, [useReal]);
  useEffect(() => {
    paceRef.current = paceMs;
  }, [paceMs]);

  const byKey = useMemo(() => Object.fromEntries(roster.map((r) => [r.key, r])), [roster]);

  const ladder = useMemo(() => {
    const get = useChampions.getState();
    return roster
      .map((r) => ({ entry: r, champ: progress[r.key] || get.get(r.key) }))
      .sort((a, b) => ratingOf(b.champ) - ratingOf(a.champ));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roster, progress]);

  // stable across renders — reads live state via getState() so the autonomous
  // loop never restarts (which would stack loops and run away)
  const runOne = useCallback(async () => {
    const list = rosterRef.current;
    if (list.length < 2) return;
    const store = useChampions.getState();
    const byKeyLocal = Object.fromEntries(list.map((r) => [r.key, r]));
    const pool = [...list];
    const a = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    const b = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    const ra = store.getRecipe(a.key);
    const rb = store.getRecipe(b.key);
    const mock = useRealRef.current ? "0" : "1";
    const url = `/api/sim?a=${a.key}&b=${b.key}&mock=${mock}&${sideParams("a", ra)}&${sideParams("b", rb)}`;
    let data: { end: BattleEnd; turns: BattleTurn[]; topic: string };
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      data = await res.json();
    } catch {
      return;
    }
    const { end, turns, topic } = data;
    const styles: Record<string, Style> = { [a.key]: blankStyle(), [b.key]: blankStyle() };
    for (const t of turns) accrue(t.actor === a.key ? styles[a.key] : styles[b.key], t);
    const winner = end.winner;
    const loser = winner === a.key ? b.key : a.key;

    const before = ratingOf(store.get(winner));
    store.recordBattle(winner, loser, styles);
    const after = ratingOf(store.get(winner));
    const delta = after - before;

    // every agent evolves its mind, not just the player's
    const wName = byKeyLocal[winner]?.name || winner;
    const lName = byKeyLocal[loser]?.name || loser;
    store.learnFromBout({ key: winner, opponentName: lName, won: true, axisLabel: dominant(store.get(winner)).axis.label });
    store.learnFromBout({ key: loser, opponentName: wName, won: false, axisLabel: dominant(store.get(loser)).axis.label });

    const item: FeedItem = {
      id: idRef.current++,
      winner: wName,
      loser: lName,
      wColor: TYPE_COLOR[byKeyLocal[winner]?.type ?? "LOGIC"],
      lColor: TYPE_COLOR[byKeyLocal[loser]?.type ?? "LOGIC"],
      delta,
      topic,
      line: end.mvp?.line || "",
    };
    setFeed((f) => [item, ...f].slice(0, 14));
    // flash carries the signed ELO delta so the ladder shows the actual swing
    setFlash((m) => ({ ...m, [winner]: delta || 0.1, [loser]: -delta || -0.1 }));
    setBouts((n) => n + 1);
    const hold = Math.max(800, paceRef.current * 0.75);
    setTimeout(() => setFlash((m) => ({ ...m, [winner]: 0, [loser]: 0 })), hold);
  }, []);

  // autonomous loop — a module-level singleton (ACTIVE_LOOP) guarantees exactly
  // ONE active loop globally. Each bout is awaited BEFORE the next is scheduled,
  // so there is never more than one /api/sim in flight and the real throughput
  // is exactly one bout per pace tick (no stacking, no concurrent pile-up).
  useEffect(() => {
    runningRef.current = running;
    if (!running) return;
    ACTIVE_LOOP += 1;
    const myId = ACTIVE_LOOP;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      if (myId !== ACTIVE_LOOP || !runningRef.current) return;
      setBusy(true);
      await runOne();
      setBusy(false);
      if (myId !== ACTIVE_LOOP || !runningRef.current) return;
      // pace is the gap BETWEEN bouts; real-LLM bouts are latency-bound so we
      // shorten the gap (the model call already paces it)
      const gap = useRealRef.current ? Math.max(300, paceRef.current * 0.35) : paceRef.current;
      timer = setTimeout(tick, gap);
    };
    tick();
    return () => {
      ACTIVE_LOOP += 1; // invalidate this loop; any pending tick will no-op
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  if (!mounted) {
    return (
      <main style={{ maxWidth: 1080, margin: "0 auto", padding: `26px 22px ${60 + DOCK_H}px` }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Live League</h1>
        <p className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>loading the ladder…</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 1080, margin: "0 auto", padding: `26px 22px ${60 + DOCK_H}px` }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 14, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Live League</h1>
          <p className="mono" style={{ fontSize: 11, color: "var(--muted)", margin: "4px 0 0", letterSpacing: 0.8 }}>
            AGENTS FIGHT AUTONOMOUSLY · EVERY BOUT MOVES REAL ELO · BODIES & MEMORY EVOLVE AS THEY CLIMB
          </p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn btn-primary" style={{ ["--ac" as string]: running ? "var(--bad)" : "var(--good)", fontSize: 14 }} onClick={() => setRunning((r) => !r)}>
            {running ? "⏸ Pause season" : "▶ Run season"}
          </button>
          {([["Calm", 2200], ["Steady", 1200], ["Brisk", 600], ["Blitz", 250]] as const).map(([label, ms]) => (
            <button key={label} className={paceMs === ms ? "btn btn-primary" : "btn"} style={{ ["--ac" as string]: "var(--accent)" }} onClick={() => setPaceMs(ms)}>
              {label}
            </button>
          ))}
          <button className={useReal ? "btn btn-primary" : "btn"} style={{ ["--ac" as string]: "var(--gold)" }} onClick={() => setUseReal((v) => !v)} title="Use real LLM calls instead of fast mock">
            {useReal ? "REAL LLM" : "FAST MOCK"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
        <span className="mono" style={{ fontSize: 11, color: "var(--muted2)" }}>
          {bouts} bouts this session{busy ? " · resolving…" : running ? " · live" : ""}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr)", gap: 18, marginTop: 18 }}>
        {/* ladder */}
        <div>
          <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)", marginBottom: 8 }}>
            THE LADDER
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {ladder.map(({ entry, champ }, i) => {
              const col = TYPE_COLOR[entry.type];
              const lf = levelFor(champ.xp);
              const fl = flash[entry.key] || 0;
              const flashColor = fl > 0 ? "var(--good)" : fl < 0 ? "var(--bad)" : "transparent";
              return (
                <Link
                  key={entry.key}
                  href={`/champion/${entry.key}`}
                  className="panel"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "26px 1fr auto",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 14px",
                    borderColor: fl ? flashColor : "var(--line)",
                    transition: "border-color .25s",
                  }}
                >
                  <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: i < 3 ? "var(--gold)" : "var(--muted2)" }}>
                    {i + 1}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <span style={{ color: col, fontSize: 16 }}>{EMBLEM[entry.type]}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, display: "flex", gap: 8, alignItems: "center" }}>
                        {entry.name}
                        <span className="mono" style={{ fontSize: 9, color: "var(--muted2)" }}>
                          L{lf.level} {tierFor(lf.level).name}
                        </span>
                      </div>
                      <div className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
                        {doctrine(champ, lf.level)} · {champ.wins}W/{champ.losses}L
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, fontSize: 17, color: col }}>{ratingOf(champ)}</div>
                    {fl !== 0 && (
                      <div className="mono" style={{ fontSize: 10, color: flashColor }}>
                        {fl > 0 ? "▲" : "▼"} {fl > 0 ? "+" : ""}{Math.round(fl)}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
            {ladder.length === 0 && <div className="mono" style={{ color: "var(--muted2)", fontSize: 12 }}>loading roster…</div>}
          </div>
        </div>

        {/* feed */}
        <div>
          <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)", marginBottom: 8 }}>
            LIVE RESULTS
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {feed.map((it) => (
              <div key={it.id} className="panel pop" style={{ padding: "9px 12px" }}>
                <div style={{ fontSize: 13 }}>
                  <span style={{ color: it.wColor, fontWeight: 700 }}>{it.winner}</span>
                  <span style={{ color: "var(--muted2)" }}> beat </span>
                  <span style={{ color: it.lColor }}>{it.loser}</span>
                  <span className="mono" style={{ color: "var(--good)", fontSize: 11, marginLeft: 6 }}>+{it.delta}</span>
                </div>
                {it.line && <div style={{ fontStyle: "italic", fontSize: 12, color: "var(--muted)", marginTop: 2 }}>&ldquo;{it.line}&rdquo;</div>}
                <div className="mono" style={{ fontSize: 9, color: "var(--muted2)", marginTop: 2 }}>on “{it.topic}”</div>
              </div>
            ))}
            {feed.length === 0 && (
              <div className="mono" style={{ color: "var(--muted2)", fontSize: 12 }}>
                press <b style={{ color: "var(--good)" }}>Run season</b> — agents start fighting and the ladder moves live.
              </div>
            )}
          </div>
        </div>
      </div>
      <GameDock fixed />
    </main>
  );
}
