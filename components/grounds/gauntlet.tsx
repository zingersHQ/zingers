"use client";
import { useMemo } from "react";
import type { Champion, RosterEntry } from "@/lib/types";
import { TYPE_COLOR, levelFor } from "@/lib/evolve/progression";
import { ratingOf } from "@/lib/evolve/elo";
import { roundReward, gauntletQueue } from "@/lib/scenarios/registry";
import type { GauntletConfig } from "@/lib/scenarios/types";
import { ChampionAvatar } from "@/components/champion-avatar";

// The live run shape the page owns and threads through these panels.
export type GauntletPhase = "fighting" | "cleared" | "over";
export interface GauntletRun {
  phase: GauntletPhase;
  queue: string[]; // opponent keys, weakest → toughest
  idx: number; // current opponent index
  streak: number; // bouts cleared
  pot: number; // crowns banked (at risk until cashed out)
  cashedOut: boolean;
  lastWon: boolean;
}

const EMBER = "#ff7a2a";

function modalShell(children: React.ReactNode, ac: string) {
  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(5,4,10,.7)", backdropFilter: "blur(7px)", zIndex: 52, padding: 16 }}>
      <div className="panel pop" style={{ ["--ac" as string]: ac, width: "min(560px, 95vw)", maxHeight: "90vh", overflow: "auto", padding: 24, borderColor: ac }}>
        {children}
      </div>
    </div>
  );
}

export function GauntletBriefing({
  ownedEntry,
  roster,
  get,
  cfg,
  onStart,
  onClose,
}: {
  ownedEntry: RosterEntry;
  roster: RosterEntry[];
  get: (k: string) => Champion;
  cfg: GauntletConfig;
  onStart: () => void;
  onClose: () => void;
}) {
  const byKey = useMemo(() => Object.fromEntries(roster.map((r) => [r.key, r])), [roster]);
  const queue = useMemo(
    () => gauntletQueue(ownedEntry.key, roster.map((r) => r.key), get, cfg.maxRounds),
    [ownedEntry.key, roster, get, cfg.maxRounds],
  );
  const maxPot = useMemo(() => {
    let pot = 0;
    for (let i = 0; i < queue.length; i++) pot += roundReward(cfg, i + 1);
    return pot + Math.round(pot * cfg.clearBonus);
  }, [queue, cfg]);

  return modalShell(
    <>
      <div style={{ display: "flex", alignItems: "center" }}>
        <div>
          <div className="mono" style={{ fontSize: 11, letterSpacing: 2, color: EMBER }}>EMBER GAUNTLET</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Survive the chain</div>
        </div>
        <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--muted)", fontSize: 18, cursor: "pointer" }}>✕</button>
      </div>
      <p style={{ color: "var(--muted)", fontSize: 13, margin: "8px 0 16px" }}>
        Field <b style={{ color: TYPE_COLOR[ownedEntry.type] }}>{ownedEntry.name}</b> against {queue.length} agents, weakest first.
        Each win <b style={{ color: "var(--gold)" }}>banks crowns into a growing pot</b> — but a single loss ends the run and you keep only a fraction.
        After every win you choose: <b>cash out</b>, or <b style={{ color: EMBER }}>press on</b> for more.
      </p>

      <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)", marginBottom: 8 }}>
        THE CHAIN · clear all {queue.length} for up to {maxPot}👑
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
        {queue.map((k, i) => {
          const r = byKey[k];
          const c = get(k);
          const col = r ? TYPE_COLOR[r.type] : EMBER;
          return (
            <div key={k} className="panel" style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", ["--ac" as string]: col }}>
              <span className="mono" style={{ fontSize: 11, color: "var(--muted2)", width: 18 }}>{i + 1}</span>
              <ChampionAvatar ckey={k} type={r?.type ?? ownedEntry.type} champion={c} size={34} />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{r?.name ?? k}</span>
                <span className="mono" style={{ fontSize: 9, color: col }}>L{levelFor(c.xp).level} · {ratingOf(c)}</span>
              </div>
              <span className="mono" style={{ marginLeft: "auto", fontSize: 12, color: "var(--gold)", fontWeight: 700 }}>+{roundReward(cfg, i + 1)}👑</span>
            </div>
          );
        })}
      </div>

      <button className="btn btn-primary" style={{ ["--ac" as string]: EMBER, width: "100%", fontSize: 15 }} disabled={!queue.length} onClick={onStart}>
        🔥 {queue.length ? "Enter the Gauntlet" : "no opponents available"}
      </button>
    </>,
    EMBER,
  );
}

export function GauntletInterstitial({
  run,
  byKey,
  get,
  cfg,
  onPressOn,
  onCashOut,
}: {
  run: GauntletRun;
  byKey: Record<string, RosterEntry>;
  get: (k: string) => Champion;
  cfg: GauntletConfig;
  onPressOn: () => void;
  onCashOut: () => void;
}) {
  const nextIdx = run.idx + 1;
  const nextKey = run.queue[nextIdx];
  const nextEntry = nextKey ? byKey[nextKey] : null;
  const atRisk = roundReward(cfg, nextIdx + 1);

  return modalShell(
    <div style={{ textAlign: "center" }}>
      <div className="glow" style={{ fontSize: 26, fontWeight: 700, color: "var(--good)" }}>ROUND {run.idx + 1} CLEARED</div>
      <div className="mono" style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>streak ×{run.streak}</div>
      <div style={{ margin: "16px 0", fontSize: 30, fontWeight: 700, color: "var(--gold)" }}>{run.pot}👑 <span style={{ fontSize: 13, color: "var(--muted2)" }}>banked (at risk)</span></div>

      {nextEntry ? (
        <>
          <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)", marginBottom: 8 }}>NEXT IN THE CHAIN</div>
          <div className="panel" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 14px", ["--ac" as string]: TYPE_COLOR[nextEntry.type], marginBottom: 18 }}>
            <ChampionAvatar ckey={nextKey} type={nextEntry.type} champion={get(nextKey)} size={40} />
            <div style={{ textAlign: "left" }}>
              <div style={{ fontWeight: 700 }}>{nextEntry.name}</div>
              <div className="mono" style={{ fontSize: 9, color: TYPE_COLOR[nextEntry.type] }}>L{levelFor(get(nextKey).xp).level} · {ratingOf(get(nextKey))} · win +{atRisk}👑</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="btn" style={{ ["--ac" as string]: "var(--gold)" }} onClick={onCashOut}>💰 Cash out {run.pot}👑</button>
            <button className="btn btn-primary" style={{ ["--ac" as string]: EMBER }} onClick={onPressOn}>🔥 Press on →</button>
          </div>
          <p className="mono" style={{ fontSize: 10, color: "var(--muted2)", marginTop: 10 }}>
            lose and you keep only {Math.floor(run.pot * cfg.consolationFrac)}👑
          </p>
        </>
      ) : (
        <button className="btn btn-primary" style={{ ["--ac" as string]: "var(--gold)" }} onClick={onCashOut}>collect {run.pot}👑</button>
      )}
    </div>,
    "var(--good)",
  );
}

export function GauntletResult({ run, onClose }: { run: GauntletRun; onClose: () => void }) {
  const cleared = run.lastWon && run.idx + 1 >= run.queue.length;
  const title = cleared ? "GAUNTLET CLEARED" : run.cashedOut ? "CASHED OUT" : "DEFEATED";
  const good = run.cashedOut || cleared;
  const ac = good ? "var(--good)" : "var(--bad)";

  return modalShell(
    <div style={{ textAlign: "center" }}>
      <div className="glow" style={{ fontSize: 30, fontWeight: 700, color: ac }}>{title}</div>
      <div className="mono" style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
        {cleared ? `you ran the whole chain · streak ×${run.streak}` : `cleared ${run.streak} of ${run.queue.length} · streak ×${run.streak}`}
      </div>
      <div style={{ margin: "18px 0", fontSize: 26, fontWeight: 700, color: good ? "var(--gold)" : "var(--bad)" }}>
        {good ? "+" : ""}{run.pot}👑
      </div>
      <div className="mono" style={{ fontSize: 11, color: "var(--muted2)", marginBottom: 16 }}>
        {good ? "banked to your purse" : "the pot scattered — you kept the consolation"}
      </div>
      <button className="btn btn-primary" style={{ ["--ac" as string]: ac }} onClick={onClose}>back to the wastes</button>
    </div>,
    ac,
  );
}
