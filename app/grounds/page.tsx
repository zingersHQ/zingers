"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { AgentConfig, BattleEnd, Champion, Recipe, RosterEntry, Style, TowerAgent } from "@/lib/types";
import { TYPE_COLOR, levelFor, tierFor, doctrine, blankStyle, accrue, dominant } from "@/lib/evolve/progression";
import { ratingOf } from "@/lib/evolve/elo";
import { sideParams } from "@/lib/recipe-params";
import { appearanceOf } from "@/lib/evolve/appearance";
import { useChampions, TRAIN_COST } from "@/store/champions";
import { useBout } from "@/components/arena/use-bout";
import { ChampionAvatar } from "@/components/champion-avatar";
import { FirstRun } from "@/components/intro/first-run";
import { STORAGE } from "@/lib/brand";
import type { GroundChampion, MatchView, NearTarget } from "@/components/grounds/world";
import { BIOMES, DEFAULT_BIOME } from "@/components/grounds/biomes";
import { RenderBoundary, RenderNotice, gpuStatus } from "@/components/grounds/render-guard";

const World = dynamic(() => import("@/components/grounds/world"), {
  ssr: false,
  loading: () => (
    <div className="mono" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "var(--muted)" }}>
      summoning the grounds…
    </div>
  ),
});

export default function GroundsPage() {
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [towerAgents, setTowerAgents] = useState<TowerAgent[]>([]);
  const [altitude, setAltitude] = useState(0);
  const [peakAltitude, setPeakAltitude] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [near, setNear] = useState<NearTarget>(null);
  const [overlay, setOverlay] = useState<"none" | "train" | "arena" | "result">("none");
  const [opponent, setOpponent] = useState<string | null>(null);
  const [matchView, setMatchView] = useState<MatchView | null>(null);
  const [betSide, setBetSide] = useState<"me" | "opp" | null>(null);
  const [betAmt, setBetAmt] = useState(50);
  const [result, setResult] = useState<{
    won: boolean;
    crowns: number;
    betWon: boolean | null;
    ratingDelta: number;
    leveledTo: number | null;
    learned: string | null;
  } | null>(null);
  const [biomeId, setBiomeId] = useState(DEFAULT_BIOME.id);
  const biome = useMemo(() => BIOMES.find((b) => b.id === biomeId) ?? DEFAULT_BIOME, [biomeId]);
  const [showIntro, setShowIntro] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [gpu, setGpu] = useState<ReturnType<typeof gpuStatus> | null>(null);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const store = useChampions();
  const { progress, getRecipe, owned, setOwned, crowns } = store;
  const bout = useBout();
  const counters = useRef({ pa: 0, pb: 0, ha: 0, hb: 0 });
  const historyRef = useRef(bout.history);
  historyRef.current = bout.history;

  useEffect(() => {
    setMounted(true);
    setGpu(gpuStatus());
    if (typeof window !== "undefined" && (window.matchMedia?.("(pointer: coarse)").matches || "ontouchstart" in window || navigator.maxTouchPoints > 0)) {
      setIsTouch(true);
    }
    try {
      const seen = localStorage.getItem(STORAGE.intro) || localStorage.getItem(STORAGE.introLegacy);
      if (!seen) setShowIntro(true);
    } catch {}
  }, []);

  useEffect(() => {
    let live = true;
    setRosterError(null);
    fetch("/api/roster")
      .then((r) => {
        if (!r.ok) throw new Error(`roster ${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (!live) return;
        if (!Array.isArray(d.creatures) || d.creatures.length === 0) throw new Error("empty roster");
        setRoster(d.creatures);
      })
      .catch((e) => {
        if (live) setRosterError(e instanceof Error ? e.message : "failed to load roster");
      });
    fetch("/api/grounds").then((r) => r.json()).then((d) => live && setTowerAgents(d.agents ?? [])).catch(() => {});
    return () => {
      live = false;
    };
  }, [reloadKey]);

  const closeIntro = useCallback(() => {
    try {
      localStorage.setItem(STORAGE.intro, "1");
    } catch {}
    setShowIntro(false);
  }, []);

  const onAltitude = useCallback((y: number) => {
    setAltitude(y);
    setPeakAltitude((p) => (y > p ? y : p));
  }, []);

  const byKey = useMemo(() => Object.fromEntries(roster.map((r) => [r.key, r])), [roster]);
  const champions: GroundChampion[] = useMemo(
    () => roster.map((r) => ({ key: r.key, type: r.type, name: r.name, champion: progress[r.key] || store.get(r.key) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roster, progress],
  );

  const inMatch = bout.phase === "live";
  const controlsEnabled = overlay === "none" && !inMatch && !result;

  // open the nearby interaction (shared by the E key and the on-screen prompt)
  const interact = useCallback(() => {
    if (overlay !== "none" || inMatch || result) return;
    if (near?.kind === "train") setOverlay("train");
    else if (near?.kind === "arena") setOverlay("arena");
    else if (near?.kind === "challenge") {
      setOpponent(near.key);
      setOverlay("arena");
    }
  }, [near, overlay, inMatch, result]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "e") interact();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [interact]);

  // drive the in-world match visuals from streamed turns
  useEffect(() => {
    const t = bout.turn;
    if (!t || !opponent || !owned) return;
    const c = counters.current;
    if (t.actor === owned) {
      c.pa++;
      if (t.dmg > 0) c.hb++;
    } else {
      c.pb++;
      if (t.dmg > 0) c.ha++;
    }
    setMatchView({ aKey: owned, bKey: opponent, hpA: bout.hpA, hpB: bout.hpB, actor: t.actor, punchA: c.pa, punchB: c.pb, hitA: c.ha, hitB: c.hb });
  }, [bout.turn, bout.hpA, bout.hpB, opponent, owned]);

  const startMatch = useCallback(() => {
    if (!owned || !opponent) return;
    if (betSide && !store.spend(betAmt)) return; // not enough crowns
    counters.current = { pa: 0, pb: 0, ha: 0, hb: 0 };
    setResult(null);
    setMatchView({ aKey: owned, bKey: opponent, hpA: 100, hpB: 100, actor: null, punchA: 0, punchB: 0, hitA: 0, hitB: 0 });
    setOverlay("none");
    const ra = getRecipe(owned);
    const rb = getRecipe(opponent);
    const url = `/api/battle?a=${owned}&b=${opponent}&${sideParams("a", ra)}&${sideParams("b", rb)}`;
    bout.begin(url, (end: BattleEnd) => {
      const styles: Record<string, Style> = { [owned]: blankStyle(), [opponent]: blankStyle() };
      for (const turn of historyRef.current) accrue(turn.actor === owned ? styles[owned] : styles[opponent], turn);
      const winnerKey = end.winner;
      const loserKey = winnerKey === owned ? opponent : owned;
      const iWon = winnerKey === owned;

      // snapshot before applying, to show the evolution payoff
      const beforeC = store.get(owned);
      const beforeRating = ratingOf(beforeC);
      const beforeLevel = levelFor(beforeC.xp).level;

      store.recordBattle(winnerKey, loserKey, styles);

      const afterC = store.get(owned);
      const afterRating = ratingOf(afterC);
      const afterLevel = levelFor(afterC.xp).level;
      const dom = dominant(afterC);
      // the MIND learns: opponent-specific memory + gentle doctrine auto-tune
      store.learnFromBout({ key: owned, opponentName: byKey[opponent]?.name || opponent, won: iWon, axisLabel: dom.axis.label });
      const learned = iWon
        ? `Memory updated · leaning ${dom.axis.label.toLowerCase()} vs ${byKey[opponent]?.name || opponent}`
        : `Memory updated · adapting after ${byKey[opponent]?.name || opponent}`;

      let crownsDelta = 0;
      if (iWon) {
        crownsDelta += 40;
        store.earn(40);
      }
      let betWon: boolean | null = null;
      if (betSide) {
        betWon = (betSide === "me" && iWon) || (betSide === "opp" && !iWon);
        if (betWon) {
          store.earn(betAmt * 2);
          crownsDelta += betAmt; // net (stake already spent)
        } else {
          crownsDelta -= betAmt;
        }
      }
      setResult({
        won: iWon,
        crowns: crownsDelta,
        betWon,
        ratingDelta: afterRating - beforeRating,
        leveledTo: afterLevel > beforeLevel ? afterLevel : null,
        learned,
      });
      setOverlay("result");
    });
  }, [owned, opponent, betSide, betAmt, store, getRecipe, bout]);

  function closeMatch() {
    bout.stop();
    setMatchView(null);
    setResult(null);
    setOverlay("none");
    setOpponent(null);
    setBetSide(null);
  }

  const showMatch = inMatch || overlay === "result";

  return (
    <main style={{ position: "relative", height: "calc(100dvh - 49px)", overflow: "hidden" }}>
      {mounted && gpu && !gpu.ok && (
        <RenderNotice
          title="3D isn't available in this browser"
          body={
            <>
              The Grounds needs WebGL, which your browser couldn&apos;t start. In Chrome or Brave, open{" "}
              <b>Settings → System</b> and turn on <b>&ldquo;Use graphics acceleration when available&rdquo;</b>, then restart the
              browser. If it&apos;s already on, check <span className="mono">chrome://gpu</span>.
            </>
          }
          detail={gpu.reason ? `webgl: ${gpu.reason}` : undefined}
        />
      )}

      {mounted && gpu?.ok && rosterError && (
        <RenderNotice
          title="Couldn’t load the roster"
          body="The world is ready, but the champion data failed to load. This is usually a temporary network hiccup."
          detail={rosterError}
          onRetry={() => setReloadKey((k) => k + 1)}
        />
      )}

      {mounted && gpu?.ok && !rosterError && roster.length > 0 && (
        <RenderBoundary
          fallback={(error, reset) => (
            <RenderNotice
              title="The Grounds couldn’t render"
              body={
                gpu?.software
                  ? "Your browser is rendering 3D in software mode (hardware acceleration is off or your GPU is blocklisted), which can’t handle this scene. Enable graphics acceleration in your browser settings and reload."
                  : "Something went wrong while drawing the 3D scene. Reloading usually fixes it."
              }
              detail={`${gpu?.renderer ? gpu.renderer + " · " : ""}${error.message}`}
              onRetry={() => {
                reset();
                setReloadKey((k) => k + 1);
              }}
            />
          )}
        >
          <World champions={champions} ownedKey={owned} onNear={setNear} match={showMatch ? matchView : null} controlsEnabled={controlsEnabled} biome={biome} towerAgents={towerAgents} onAltitude={onAltitude} />
        </RenderBoundary>
      )}

      {/* HUD */}
      <div style={{ position: "absolute", top: 14, left: 16, pointerEvents: "none" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, textShadow: "0 2px 12px #000" }}>The Grounds</h1>
        <p className="mono" style={{ fontSize: 11, color: "var(--muted)", margin: "4px 0 0", letterSpacing: 1 }}>
          {isTouch
            ? "LEFT STICK MOVE · DRAG TO LOOK · JUMP ×4 · CLIMB THE TOWER"
            : "WASD MOVE · SPACE TO JUMP (×4) · CLIMB THE TOWER · E TO CHALLENGE"}
        </p>
      </div>
      <div className="panel" style={{ position: "absolute", top: 14, right: 16, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 18 }}>👑</span>
        <span style={{ fontWeight: 700, fontSize: 18, color: "var(--gold)" }}>{crowns}</span>
        <span className="mono" style={{ fontSize: 9, color: "var(--muted2)", letterSpacing: 1 }}>CROWNS</span>
      </div>

      {/* altitude / tower HUD */}
      {!showMatch && overlay === "none" && towerAgents.length > 0 && (
        <div className="panel" style={{ position: "absolute", top: 64, right: 16, padding: "10px 14px", minWidth: 140, pointerEvents: "none" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 22, color: altitude > 1 ? "#39e0ff" : "var(--muted)" }}>{Math.max(0, altitude).toFixed(1)}</span>
            <span className="mono" style={{ fontSize: 10, color: "var(--muted2)" }}>m</span>
            <span className="mono" style={{ fontSize: 9, color: "var(--muted2)", letterSpacing: 1, marginLeft: "auto" }}>ALTITUDE</span>
          </div>
          <div className="mono" style={{ fontSize: 9, color: "var(--muted2)", marginTop: 4 }}>
            peak {Math.max(0, peakAltitude).toFixed(1)}m
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8, fontSize: 9 }} className="mono">
            <span style={{ color: "#36d39a" }}>⚔ {towerAgents.filter((a) => a.status === "awaiting").length}</span>
            <span style={{ color: "#6a6bff" }}>🌙 {towerAgents.filter((a) => a.status === "hibernating").length}</span>
            <span style={{ color: "#7b7b88" }}>⛔ {towerAgents.filter((a) => a.status === "disabled").length}</span>
          </div>
        </div>
      )}

      {/* world switcher */}
      {!showMatch && overlay === "none" && owned && (
        <div className="panel" style={{ position: "absolute", bottom: 16, left: 16, padding: 8, display: "flex", flexDirection: "column", gap: 6, maxWidth: 200 }}>
          <span className="mono" style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--muted2)", padding: "0 2px" }}>WORLD</span>
          {BIOMES.map((b) => (
            <button
              key={b.id}
              onClick={() => setBiomeId(b.id)}
              className="panel"
              style={{ ["--ac" as string]: b.lights.arenaPoint, textAlign: "left", padding: "6px 10px", cursor: "pointer", borderColor: b.id === biomeId ? b.lights.arenaPoint : "var(--line)", background: b.id === biomeId ? "rgba(255,255,255,.04)" : "transparent" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 9, height: 9, borderRadius: 9, background: b.lights.arenaPoint, boxShadow: `0 0 8px ${b.lights.arenaPoint}` }} />
                <span style={{ fontSize: 12, fontWeight: 700 }}>{b.name}</span>
              </div>
              <div className="mono" style={{ fontSize: 9, color: "var(--muted2)", marginTop: 2 }}>{b.tagline}</div>
            </button>
          ))}
        </div>
      )}

      {/* onboarding: choose your champion */}
      {mounted && !owned && roster.length > 0 && <Onboarding roster={roster} get={store.get} onPick={setOwned} />}

      {/* first-run tutorial / elevator pitch */}
      {mounted && showIntro && <FirstRun onClose={closeIntro} />}

      {/* proximity prompt — tappable on touch, E on desktop */}
      {owned && near && overlay === "none" && !inMatch && !result && (
        <button
          onClick={interact}
          className="panel pop"
          style={{ position: "absolute", bottom: 96, left: "50%", transform: "translateX(-50%)", padding: "12px 20px", cursor: "pointer", color: "var(--ink)", touchAction: "manipulation" }}
        >
          <span className="mono" style={{ fontSize: 13 }}>
            <b style={{ color: "var(--gold)" }}>tap</b> / <b style={{ color: "var(--gold)" }}>E</b> to{" "}
            {near.kind === "train" ? "train your champion" : near.kind === "challenge" ? `challenge ${near.name}` : "enter the Arena"}
          </span>
        </button>
      )}

      {/* training overlay */}
      {overlay === "train" && owned && byKey[owned] && (
        <TrainOverlay ckey={owned} entry={byKey[owned]} onClose={() => setOverlay("none")} />
      )}

      {/* arena / challenge overlay */}
      {overlay === "arena" && owned && (
        <ChallengeOverlay
          owned={owned}
          ownedEntry={byKey[owned]}
          roster={roster}
          get={store.get}
          opponent={opponent}
          setOpponent={setOpponent}
          betSide={betSide}
          setBetSide={setBetSide}
          betAmt={betAmt}
          setBetAmt={setBetAmt}
          crowns={crowns}
          onClose={() => setOverlay("none")}
          onFight={startMatch}
        />
      )}

      {/* live match reasoning overlay */}
      {showMatch && matchView && (
        <MatchHud bout={bout} owned={owned!} opponent={opponent!} byKey={byKey} get={store.get} result={result} onClose={closeMatch} />
      )}

      {/* bottom nav hint */}
      {!showMatch && overlay === "none" && (
        <div className="mono" style={{ position: "absolute", bottom: 14, right: 16, fontSize: 11, display: "flex", gap: 14 }}>
          <button onClick={() => setShowIntro(true)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 11 }}>
            intro
          </button>
          <Link href="/standings" style={{ color: "var(--muted)" }}>
            standings →
          </Link>
        </div>
      )}
    </main>
  );
}

function Onboarding({ roster, get, onPick }: { roster: RosterEntry[]; get: (k: string) => Champion; onPick: (k: string) => void }) {
  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(5,4,10,.8)", backdropFilter: "blur(6px)", zIndex: 40, padding: 20 }}>
      <div className="panel" style={{ padding: 26, width: "min(760px, 95vw)", textAlign: "center" }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: 2, color: "var(--muted2)" }}>
          STEP 1 · CLAIM YOUR CHAMPION
        </div>
        <h2 style={{ fontSize: 26, fontWeight: 700, margin: "8px 0 4px" }}>Pick the agent you&apos;ll train.</h2>
        <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 18px" }}>
          It becomes yours — you tune how it thinks, send it to fight, and watch its body change as it climbs.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          {roster.map((r) => {
            const c = get(r.key);
            const col = TYPE_COLOR[r.type];
            const lf = levelFor(c.xp);
            return (
              <button key={r.key} className="panel" onClick={() => onPick(r.key)} style={{ ["--ac" as string]: col, padding: 14, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <ChampionAvatar ckey={r.key} type={r.type} champion={c} size={84} />
                <div style={{ fontWeight: 700 }}>{r.name}</div>
                <div className="mono" style={{ fontSize: 10, color: col }}>
                  {r.type} · L{lf.level} {tierFor(lf.level).name}
                </div>
                <div style={{ fontSize: 12, fontStyle: "italic" }}>{doctrine(c, lf.level)}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Dial({ label, value, onChange, color, hints }: { label: string; value: number; onChange: (v: number) => void; color: string; hints: [string, string] }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span className="mono" style={{ color }}>
          {value}
        </span>
      </div>
      <input type="range" min={0} max={100} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: "100%", accentColor: color }} />
      <div className="mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--muted2)" }}>
        <span>{hints[0]}</span>
        <span>{hints[1]}</span>
      </div>
    </div>
  );
}

function TrainOverlay({ ckey, entry, onClose }: { ckey: string; entry: RosterEntry; onClose: () => void }) {
  const store = useChampions();
  const champ = store.get(ckey);
  const recipe = store.getRecipe(ckey);
  const col = TYPE_COLOR[entry.type];
  const app = appearanceOf(champ);
  const lf = levelFor(champ.xp);
  const [persona, setPersonaLocal] = useState(recipe.persona ?? "");

  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(5,4,10,.7)", backdropFilter: "blur(7px)", zIndex: 50, padding: 16 }}>
      <div className="panel pop" style={{ ["--ac" as string]: col, width: "min(560px, 95vw)", maxHeight: "90vh", overflow: "auto", padding: 24, borderColor: col }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <ChampionAvatar ckey={ckey} type={entry.type} champion={champ} size={84} />
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Train {entry.name}</div>
            <div className="mono" style={{ fontSize: 11, color: col }}>
              {entry.type} · L{lf.level} {tierFor(lf.level).name} · {doctrine(champ, lf.level)}
            </div>
          </div>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--muted)", fontSize: 18, cursor: "pointer" }}>
            ✕
          </button>
        </div>

        <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)", margin: "18px 0 10px" }}>
          DOCTRINE · how it fights (free to tune anytime)
        </div>
        <Dial label="Aggression" value={recipe.strat.aggression} color="#ff6b4a" hints={["patient / counter", "relentless"]} onChange={(v) => store.setStrat(ckey, { ...recipe.strat, aggression: v })} />
        <Dial label="Focus" value={recipe.strat.focus} color="#b07bff" hints={["just hit", "set up combos"]} onChange={(v) => store.setStrat(ckey, { ...recipe.strat, focus: v })} />
        <Dial label="Risk" value={recipe.strat.risk} color="#f5d020" hints={["play safe", "swing big"]} onChange={(v) => store.setStrat(ckey, { ...recipe.strat, risk: v })} />

        <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)", margin: "18px 0 8px" }}>
          PERSONA · its voice (optional)
        </div>
        <textarea
          value={persona}
          onChange={(e) => setPersonaLocal(e.target.value)}
          onBlur={() => store.setPersona(ckey, persona)}
          placeholder={entry.persona}
          rows={2}
          style={{ width: "100%", background: "#100e1a", border: "1px solid var(--line2)", borderRadius: 10, color: "var(--ink)", padding: 10, fontFamily: "inherit", fontSize: 13, resize: "vertical" }}
        />

        <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)", margin: "18px 0 8px" }}>
          BRAIN · who controls it in the arena
        </div>
        <AgentPicker ckey={ckey} recipe={recipe} />

        <div className="mono" style={{ fontSize: 11, color: "var(--muted)", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, margin: "16px 0" }}>
          <span>stature ×{(app.h / 1.7).toFixed(2)}</span>
          <span>build ×{app.width.toFixed(2)}</span>
          <span>head ×{app.headScale.toFixed(2)}</span>
          <span>fists ×{app.handScale.toFixed(2)}</span>
          <span>level {lf.level}</span>
          <span>{champ.wins}W / {champ.losses}L</span>
        </div>

        <button
          className="btn btn-primary"
          style={{ ["--ac" as string]: "var(--good)", width: "100%", fontSize: 14, opacity: store.crowns < TRAIN_COST ? 0.5 : 1 }}
          disabled={store.crowns < TRAIN_COST}
          onClick={() => store.trainChampion(ckey)}
        >
          ⏫ Train session — {TRAIN_COST} 👑 (adds XP, reshapes the body toward this doctrine)
        </button>
        {store.crowns < TRAIN_COST && <p style={{ color: "var(--bad)", fontSize: 12, textAlign: "center", marginTop: 8 }}>Not enough Crowns — win a bout in the Arena.</p>}
      </div>
    </div>
  );
}

function AgentPicker({ ckey, recipe }: { ckey: string; recipe: Recipe }) {
  const setAgent = useChampions((s) => s.setAgent);
  const [cfg, setCfg] = useState<AgentConfig>(recipe.agent ?? { provider: "grok" });
  const update = (next: AgentConfig) => {
    setCfg(next);
    setAgent(ckey, next.provider === "grok" ? { provider: "grok" } : next);
  };
  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "#100e1a",
    border: "1px solid var(--line2)",
    borderRadius: 8,
    color: "var(--ink)",
    padding: "8px 10px",
    fontFamily: "inherit",
    fontSize: 12,
  };
  const tab = (id: AgentConfig["provider"], label: string) => (
    <button
      type="button"
      onClick={() => update({ ...cfg, provider: id })}
      className={cfg.provider === id ? "btn btn-primary" : "btn"}
      style={{ ["--ac" as string]: "#6a6bff", fontSize: 12 }}
    >
      {label}
    </button>
  );
  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
        {tab("grok", "House · Grok")}
        {tab("openai", "Any model")}
        {tab("http", "My agent")}
      </div>
      {cfg.provider === "grok" && (
        <p className="mono" style={{ fontSize: 10, color: "var(--muted2)", margin: 0 }}>
          The built-in house brain. Zero config — it just fights.
        </p>
      )}
      {cfg.provider === "openai" && (
        <div style={{ display: "grid", gap: 6 }}>
          <input placeholder="model — e.g. gpt-4o-mini" value={cfg.model ?? ""} onChange={(e) => update({ ...cfg, model: e.target.value })} style={inputStyle} />
          <input placeholder="base URL — default https://api.openai.com/v1" value={cfg.baseUrl ?? ""} onChange={(e) => update({ ...cfg, baseUrl: e.target.value })} style={inputStyle} />
          <input placeholder="API key" type="password" value={cfg.apiKey ?? ""} onChange={(e) => update({ ...cfg, apiKey: e.target.value })} style={inputStyle} />
          <span className="mono" style={{ fontSize: 9, color: "var(--muted2)" }}>Any OpenAI-compatible endpoint — GPT, Llama, local Ollama, OpenRouter.</span>
        </div>
      )}
      {cfg.provider === "http" && (
        <div style={{ display: "grid", gap: 6 }}>
          <input placeholder="https://your-agent.example.com/act" value={cfg.endpoint ?? ""} onChange={(e) => update({ ...cfg, endpoint: e.target.value })} style={inputStyle} />
          <span className="mono" style={{ fontSize: 9, color: "var(--muted2)" }}>We POST the AgentView JSON each turn; your server replies with move, line, why.</span>
        </div>
      )}
    </div>
  );
}

function ChallengeOverlay(props: {
  owned: string;
  ownedEntry: RosterEntry;
  roster: RosterEntry[];
  get: (k: string) => Champion;
  opponent: string | null;
  setOpponent: (k: string) => void;
  betSide: "me" | "opp" | null;
  setBetSide: (s: "me" | "opp" | null) => void;
  betAmt: number;
  setBetAmt: (n: number) => void;
  crowns: number;
  onClose: () => void;
  onFight: () => void;
}) {
  const { owned, ownedEntry, roster, get, opponent, setOpponent, betSide, setBetSide, betAmt, setBetAmt, crowns, onClose, onFight } = props;
  const opps = roster.filter((r) => r.key !== owned);
  const oppEntry = opponent ? roster.find((r) => r.key === opponent) : null;

  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(5,4,10,.7)", backdropFilter: "blur(7px)", zIndex: 50, padding: 16 }}>
      <div className="panel pop" style={{ ["--ac" as string]: "var(--gold)", width: "min(620px, 95vw)", maxHeight: "90vh", overflow: "auto", padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Arena — choose your opponent</div>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--muted)", fontSize: 18, cursor: "pointer" }}>
            ✕
          </button>
        </div>
        <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
          You field <b style={{ color: TYPE_COLOR[ownedEntry.type] }}>{ownedEntry.name}</b>. It fights to its trained doctrine.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, margin: "16px 0" }}>
          {opps.map((r) => {
            const col = TYPE_COLOR[r.type];
            const on = opponent === r.key;
            const c = get(r.key);
            return (
              <button key={r.key} onClick={() => setOpponent(r.key)} className="panel" style={{ ["--ac" as string]: col, padding: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer", borderColor: on ? col : "var(--line)" }}>
                <ChampionAvatar ckey={r.key} type={r.type} champion={c} size={60} />
                <div style={{ fontWeight: 700, fontSize: 14 }}>{r.name}</div>
                <div className="mono" style={{ fontSize: 9, color: col }}>
                  L{levelFor(c.xp).level} · {ratingOf(c)}
                </div>
              </button>
            );
          })}
        </div>

        {/* betting */}
        <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)", marginBottom: 8 }}>
          PLACE A BET (optional) · win 2× your stake
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          <button className={betSide === "me" ? "btn btn-primary" : "btn"} style={{ ["--ac" as string]: "var(--good)" }} onClick={() => setBetSide(betSide === "me" ? null : "me")}>
            back {ownedEntry.name}
          </button>
          <button className={betSide === "opp" ? "btn btn-primary" : "btn"} style={{ ["--ac" as string]: "var(--bad)" }} disabled={!oppEntry} onClick={() => setBetSide(betSide === "opp" ? null : "opp")}>
            back {oppEntry?.name ?? "opponent"}
          </button>
          {betSide && (
            <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
              {[25, 50, 100].map((n) => (
                <button key={n} className={betAmt === n ? "btn btn-primary" : "btn"} style={{ ["--ac" as string]: "var(--gold)", opacity: crowns < n ? 0.4 : 1 }} disabled={crowns < n} onClick={() => setBetAmt(n)}>
                  {n}👑
                </button>
              ))}
            </div>
          )}
        </div>

        <button className="btn btn-primary" style={{ ["--ac" as string]: "var(--gold)", width: "100%", fontSize: 15 }} disabled={!opponent} onClick={onFight}>
          ⚔ {opponent ? "Fight!" : "pick an opponent"}
          {betSide ? ` (staking ${betAmt}👑)` : ""}
        </button>
      </div>
    </div>
  );
}

function MatchHud(props: {
  bout: ReturnType<typeof useBout>;
  owned: string;
  opponent: string;
  byKey: Record<string, RosterEntry>;
  get: (k: string) => Champion;
  result: { won: boolean; crowns: number; betWon: boolean | null; ratingDelta: number; leveledTo: number | null; learned: string | null } | null;
  onClose: () => void;
}) {
  const { bout, owned, opponent, byKey, get, result, onClose } = props;
  const t = bout.turn;
  const a = byKey[owned];
  const b = byKey[opponent];
  const [copied, setCopied] = useState(false);
  const share = () => {
    const c = get(owned);
    const lvl = levelFor(c.xp).level;
    const p = new URLSearchParams({
      r: String(ratingOf(c)),
      lv: String(lvl),
      t: tierFor(lvl).name,
      d: doctrine(c, lvl),
      w: String(c.wins),
      l: String(c.losses),
    });
    const url = `${window.location.origin}/c/${owned}?${p.toString()}`;
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <>
      <div style={{ position: "absolute", top: 70, left: "50%", transform: "translateX(-50%)", textAlign: "center", pointerEvents: "none" }}>
        <div className="mono" style={{ fontSize: 12, color: "var(--gold)", letterSpacing: 1 }}>
          {a?.name} <span style={{ color: "var(--muted2)" }}>vs</span> {b?.name}
        </div>
        {bout.start && <div style={{ fontStyle: "italic", color: "var(--ink)", marginTop: 2, textShadow: "0 2px 8px #000" }}>&ldquo;{bout.start.topic}&rdquo;</div>}
      </div>

      {t && !result && (
        <div className="panel pop" key={t.round} style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", width: "min(640px, 94vw)", padding: 16, ["--ac" as string]: TYPE_COLOR[t.actor_type] }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <span className="chip" style={{ borderColor: TYPE_COLOR[t.actor_type], color: TYPE_COLOR[t.actor_type] }}>
              {t.actor_name} → {t.move}
            </span>
            {t.info.crit && <span className="chip" style={{ borderColor: "var(--gold)", color: "var(--gold)" }}>★ HIGHLIGHT</span>}
            {t.info.se && <span className="chip" style={{ borderColor: "var(--good)", color: "var(--good)" }}>SUPER EFFECTIVE</span>}
            {t.dmg > 0 && <span className="mono" style={{ color: "var(--bad)", fontWeight: 700 }}>−{t.dmg}</span>}
          </div>
          <div style={{ fontStyle: "italic", fontSize: 15, margin: "8px 0 6px" }}>&ldquo;{t.line}&rdquo;</div>
          <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
            why › {t.why} <span style={{ color: "var(--muted2)" }}>· ⚖ {t.ruling} (q={t.q.toFixed(2)})</span>
          </div>
        </div>
      )}

      {result && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(5,4,10,.55)", zIndex: 55 }}>
          <div className="panel pop" style={{ ["--ac" as string]: result.won ? "var(--good)" : "var(--bad)", padding: 28, width: "min(420px, 92vw)", textAlign: "center", boxShadow: `0 0 80px -30px ${result.won ? "var(--good)" : "var(--bad)"}` }}>
            <div className="glow" style={{ fontSize: 30, fontWeight: 700, color: result.won ? "var(--good)" : "var(--bad)" }}>
              {result.won ? "VICTORY" : "DEFEAT"}
            </div>
            <div className="mono" style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
              {bout.end?.winner_name} wins in {bout.end?.rounds} rounds
            </div>
            <div style={{ margin: "16px 0", fontSize: 22, fontWeight: 700, color: result.crowns >= 0 ? "var(--gold)" : "var(--bad)" }}>
              {result.crowns >= 0 ? "+" : ""}
              {result.crowns} 👑
            </div>
            {result.betWon !== null && (
              <div className="mono" style={{ fontSize: 12, color: result.betWon ? "var(--good)" : "var(--bad)" }}>
                bet {result.betWon ? "won" : "lost"}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "center", margin: "12px 0 4px", flexWrap: "wrap" }}>
              <span className="chip" style={{ borderColor: result.ratingDelta >= 0 ? "var(--good)" : "var(--bad)", color: result.ratingDelta >= 0 ? "var(--good)" : "var(--bad)" }}>
                ELO {result.ratingDelta >= 0 ? "+" : ""}{result.ratingDelta}
              </span>
              {result.leveledTo && (
                <span className="chip" style={{ borderColor: "var(--gold)", color: "var(--gold)" }}>★ LEVEL UP → L{result.leveledTo}</span>
              )}
            </div>
            {result.learned && (
              <div className="mono" style={{ fontSize: 11, color: "var(--acc, #6a6bff)", marginTop: 2 }}>
                ⟳ {result.learned}
              </div>
            )}
            <div className="mono" style={{ fontSize: 11, color: "var(--muted2)", marginTop: 8 }}>
              {result.won ? "your champion gained XP, reshaped & learned" : "your champion learns from the loss"}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
              <button className="btn" style={{ ["--ac" as string]: "var(--gold)" }} onClick={share}>
                {copied ? "✓ link copied" : "↗ share card"}
              </button>
              <button className="btn btn-primary" style={{ ["--ac" as string]: result.won ? "var(--good)" : "var(--bad)" }} onClick={onClose}>
                back to The Grounds
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
