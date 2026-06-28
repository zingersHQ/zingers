"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, Check, ChevronLeft, ChevronRight, Crown, Swords } from "lucide-react";
import type { Champion, RosterEntry, Strat } from "@/lib/types";
import { TYPE_COLOR, doctrine, levelFor, skillCount, skillLevel, tierFor } from "@/lib/evolve/progression";
import { FORCES as FORCE_LORE, FORCE_MOTTO, wheelNeighbors } from "@/lib/lore/canon";
import { ForcesWheel } from "@/components/lore/forces-wheel";
import { primeCreature, speakCreatureType, stopCreature } from "@/lib/creature-voice";
import { ChampionAvatar } from "@/components/champion-avatar";
import { ChampionPortraitScene } from "@/components/render/champion-portrait-scene";
import { DoctrineDial } from "@/components/shared/doctrine-dial";
import { RenderBoundary } from "@/components/grounds/render-guard";
import {
  CONCORD_LANDING,
  FIRST_DUEL_HOOKS,
  QUICK_START_STRAT,
} from "@/lib/first-duel";
import { FIGHT } from "@/lib/player-copy";
import { TRAIN_COST } from "@/store/champions";
import { ROSTER } from "@/lib/engine/roster";
import { ICON, ONBOARDING_BG, forceSigil } from "@/lib/iconography";
import { OnboardingAudio } from "@/components/intro/onboarding-audio";
import { armOnboardingAudio, playOnboardingSound } from "@/lib/sound-gallery";

const AgentShowcase = dynamic(() => import("./agent-showcase"), {
  ssr: false,
  loading: () => (
    <div className="mono" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "var(--muted2)", fontSize: 11 }}>
      Loading champion…
    </div>
  ),
});

// The cinematic intro deck (FirstRun) already delivers the elevator pitch, so the
// funnel opens straight on champion select — no redundant in-game "pitch" slide.
export type FirstDuelPhase = "pick" | "train" | "evolve" | "concord";

const ACC = ICON.accent;

// Width of the right-hand dossier on desktop. The figure canvas spans the FULL
// stage so the champion is centred in the viewport; the dossier floats over the
// right, and the cycle arrows inset by this much so they flank the champion
// (between it and the dossier) rather than the canvas edges.
const DOSSIER_W = 360;

const shell: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 85,
  display: "grid",
  placeItems: "center",
  background: ONBOARDING_BG,
  padding: 16,
};

export function FirstDuelOverlay({
  phase,
  starters,
  selected,
  get,
  crowns,
  evolve,
  isMobile,
  onPick,
  onTrain,
  onEvolveDone,
  onConcordDone,
}: {
  phase: FirstDuelPhase;
  starters: RosterEntry[];
  selected: string | null;
  get: (k: string) => Champion;
  crowns: number;
  evolve: { before: Champion; after: Champion; key: string; type: RosterEntry["type"] } | null;
  isMobile: boolean;
  onPick: (key: string) => void;
  onTrain: (key: string, strat: Strat) => void;
  onEvolveDone: () => void;
  onConcordDone: () => void;
}) {
  const [strat, setStrat] = useState<Strat>(QUICK_START_STRAT);
  const [concordStep, setConcordStep] = useState(0);

  useEffect(() => {
    if (phase === "train" && selected) setStrat(QUICK_START_STRAT);
  }, [phase, selected]);

  useEffect(() => {
    if (phase === "concord") setConcordStep(0);
  }, [phase]);

  useEffect(() => {
    if (phase !== "pick") return;
    return armOnboardingAudio();
  }, [phase]);

  useEffect(() => {
    if (phase === "evolve") playOnboardingSound("evolve");
    if (phase === "concord") playOnboardingSound("concord");
  }, [phase]);

  const handlePick = useCallback(
    (key: string) => {
      playOnboardingSound("pick");
      onPick(key);
    },
    [onPick],
  );

  const handleTrain = useCallback(
    (key: string, s: Strat) => {
      playOnboardingSound("train");
      onTrain(key, s);
    },
    [onTrain],
  );

  if (phase === "pick") {
    return <PickPhase starters={starters} selected={selected} get={get} isMobile={isMobile} onCommit={handlePick} />;
  }

  if (phase === "train" && selected) {
    const entry = starters.find((r) => r.key === selected)!;
    const col = TYPE_COLOR[entry.type];
    const champ = get(selected);
    const canAfford = crowns >= TRAIN_COST;
    const patchStrat = (patch: Partial<Strat>) => setStrat((s) => ({ ...s, ...patch }));
    return (
      <div style={shell}>
        <OnboardingAudio compact={isMobile} />
        <div className="panel pop" style={{ ["--ac" as string]: col, padding: isMobile ? 20 : 26, width: "min(560px, 96vw)", maxHeight: "92vh", overflow: "auto", borderColor: col }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: 2, color: col }}>STEP 2 · TUNE & FIGHT</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: "8px 0 6px" }}>Set {entry.name}&apos;s doctrine.</h2>
          <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.5, margin: "0 0 16px" }}>
            Drag the three dials — how your champion {FIGHT.fights} in the arena. Training costs Crowns and nudges the body before the bell.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
            <ChampionAvatar ckey={selected} type={entry.type} champion={champ} size={72} />
            <div style={{ textAlign: "left" }}>
              <div style={{ fontWeight: 700 }}>{entry.name}</div>
              <div className="mono" style={{ fontSize: 11, color: col }}>{FORCE_LORE[entry.type].name}</div>
            </div>
          </div>
          <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)", margin: "0 0 8px" }}>
            DOCTRINE · free to adjust
          </div>
          <DoctrineDial label="Aggression" value={strat.aggression} color="#ff6b4a" hints={["patient / counter", "relentless"]} onChange={(v) => patchStrat({ aggression: v })} />
          <DoctrineDial label="Focus" value={strat.focus} color="#b07bff" hints={["just hit", "set up combos"]} onChange={(v) => patchStrat({ focus: v })} />
          <DoctrineDial label="Risk" value={strat.risk} color="#f5d020" hints={["play safe", "swing big"]} onChange={(v) => patchStrat({ risk: v })} />
          <button
            className="btn btn-primary"
            style={{ ["--ac" as string]: col, width: "100%", fontSize: 15, padding: "14px 16px", marginTop: 8, opacity: canAfford ? 1 : 0.55 }}
            disabled={!canAfford}
            onClick={() => handleTrain(selected, strat)}
          >
            Train & enter the arena · {TRAIN_COST} <Crown size={14} strokeWidth={2.2} style={{ display: "inline", verticalAlign: "middle" }} />
          </button>
          {!canAfford && (
            <p className="mono" style={{ fontSize: 10, color: "var(--bad)", marginTop: 10, textAlign: "center" }}>
              Need {TRAIN_COST} Crowns to train. Reload if this looks wrong.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (phase === "evolve" && evolve) {
    return <EvolveStep evolve={evolve} isMobile={isMobile} onDone={onEvolveDone} />;
  }

  if (phase === "concord") {
    const beat = CONCORD_LANDING[concordStep];
    const last = concordStep >= CONCORD_LANDING.length - 1;
    return (
      <div style={shell}>
        <OnboardingAudio compact={isMobile} />
        <div className="panel pop" style={{ ["--ac" as string]: ACC, padding: isMobile ? 22 : 28, width: "min(560px, 96vw)", textAlign: "center", borderColor: ACC }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: 2, color: ACC, marginBottom: 8 }}>
            {beat.kicker} · {concordStep + 1}/{CONCORD_LANDING.length}
          </div>
          <h2 style={{ fontSize: isMobile ? 22 : 26, fontWeight: 800, margin: "0 0 10px", lineHeight: 1.15 }}>{beat.title}</h2>
          <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.55, margin: "0 0 22px" }}>{beat.body}</p>
          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 18 }}>
            {CONCORD_LANDING.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === concordStep ? 22 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: i <= concordStep ? ACC : "var(--line2)",
                  transition: "width .2s ease",
                }}
              />
            ))}
          </div>
          <button
            className="btn btn-primary"
            style={{ ["--ac" as string]: ACC, width: "100%", fontSize: 15, padding: "14px 16px" }}
            onClick={() => (last ? onConcordDone() : setConcordStep((s) => s + 1))}
          >
            {last ? "Enter the Concord" : "Continue"}
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// ── Character-select stage ────────────────────────────────────────────────────
// A fighting-game roster screen: one living agent center-stage that swaps as you
// cycle, the wheel reacting to its Force, and a 5-spoke selector strip below. The
// grid of static thumbnails undersold the one thing that's unique — a mind in a
// body — so here the highlighted champion steps forward, throws a jab, and says
// its Force's vow in its own voice before you lock it in.
function PickPhase({
  starters,
  selected,
  get,
  isMobile,
  onCommit,
}: {
  starters: RosterEntry[];
  selected: string | null;
  get: (k: string) => Champion;
  isMobile: boolean;
  onCommit: (key: string) => void;
}) {
  const found = starters.findIndex((r) => r.key === selected);
  const [idx, setIdx] = useState(found < 0 ? 0 : found);
  const safeIdx = Math.min(idx, starters.length - 1);
  const go = useCallback(
    (d: number) => setIdx((v) => (v + d + starters.length) % starters.length),
    [starters.length],
  );

  const entry = starters[safeIdx];
  const champ = get(entry.key);
  const col = TYPE_COLOR[entry.type];
  const force = FORCE_LORE[entry.type];
  const nb = wheelNeighbors(entry.type);
  const prey = FORCE_LORE[nb.prey];
  const pred = FORCE_LORE[nb.predator];
  const hook = FIRST_DUEL_HOOKS[entry.key];
  const motto = FORCE_MOTTO[entry.type];

  // The fighter "speaks" its vow as it steps forward — re-fires whenever the
  // highlighted champion changes (and hushes on the way out).
  useEffect(() => {
    primeCreature();
    speakCreatureType(motto, entry.type);
    return () => stopCreature();
  }, [entry.key, entry.type, motto]);

  // ← / → cycle the roster, Enter locks in the highlighted fighter.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        onCommit(entry.key);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onCommit, entry.key]);

  return (
    <div style={{ ...shell, padding: 0, display: "block", overflow: "hidden" }}>
      <OnboardingAudio compact={isMobile} />
      <div style={{ position: "absolute", inset: 0, background: ICON.void, display: "flex", flexDirection: "column" }}>
        {/* header */}
        <div style={{ padding: isMobile ? "16px 16px 4px" : "26px 32px 8px", textAlign: "center", flexShrink: 0 }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: 2, color: "var(--muted2)" }}>STEP 1 · CHOOSE YOUR CHAMPION</div>
          <h2 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, margin: "6px 0 0" }}>Meet your champions.</h2>
        </div>

        {/* stage + dossier */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            position: "relative",
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: "stretch",
            gap: isMobile ? 0 : 16,
            padding: isMobile ? "0 12px" : "0 24px",
          }}
        >
          {/* living agent */}
          <div style={{ position: "relative", flex: 1, minHeight: isMobile ? 210 : 0 }}>
            <RenderBoundary
              fallback={
                <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
                  <ChampionAvatar ckey={entry.key} type={entry.type} champion={champ} size={isMobile ? 130 : 200} />
                </div>
              }
            >
              <AgentShowcase champion={champ} type={entry.type} scale={isMobile ? 0.58 : 0.62} gesture="punch" everyMs={2600} autoFrame interactive bare framingKey={entry.key} />
            </RenderBoundary>

            {!isMobile && (
              <div style={{ position: "absolute", top: 8, left: 8, pointerEvents: "none", opacity: 0.96 }}>
                <ForcesWheel size={184} highlight={entry.type} />
              </div>
            )}

            <div className="mono" style={{ position: "absolute", bottom: 6, left: 0, right: 0, textAlign: "center", pointerEvents: "none", fontSize: 9, letterSpacing: 1.4, color: "var(--muted2)", opacity: 0.7 }}>
              drag to rotate · scroll to zoom
            </div>
          </div>

          {/* dossier — floats over the right on desktop so the figure canvas can
              span the full stage and the champion sits centred in the viewport */}
          <div
            style={{
              width: isMobile ? "auto" : DOSSIER_W,
              flexShrink: 0,
              position: isMobile ? "relative" : "absolute",
              right: isMobile ? undefined : 24,
              top: isMobile ? undefined : 0,
              bottom: isMobile ? undefined : 0,
              zIndex: 4,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 12,
              padding: isMobile ? "8px 4px 0" : "0 8px",
              textAlign: isMobile ? "center" : "left",
            }}
          >
            <div>
              <div className="mono" style={{ fontSize: 12, letterSpacing: 1, color: col, display: "flex", alignItems: "center", gap: 8, justifyContent: isMobile ? "center" : "flex-start" }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>{force.sigil}</span>
                {force.name.toUpperCase()}
              </div>
              <div style={{ fontSize: isMobile ? 28 : 42, fontWeight: 800, lineHeight: 1.02, margin: "4px 0 0" }}>{entry.name}</div>
            </div>
            {hook && <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.5, margin: 0 }}>{hook}</p>}
            <p style={{ color: col, fontStyle: "italic", fontSize: 14, margin: 0 }}>&ldquo;{motto}&rdquo;</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: isMobile ? "center" : "flex-start" }}>
              <span className="chip" style={{ borderColor: prey.hex, color: prey.hex, fontSize: 11 }}>beats {prey.sigil} {prey.name}</span>
              <span className="chip" style={{ borderColor: pred.hex, color: pred.hex, fontSize: 11, opacity: 0.85 }}>weak to {pred.sigil} {pred.name}</span>
            </div>
            <button
              className="btn btn-primary"
              style={{ ["--ac" as string]: col, width: "100%", fontSize: 15, padding: "14px 16px", marginTop: 4 }}
              onClick={() => onCommit(entry.key)}
            >
              Choose {entry.name}
            </button>
            <p className="mono" style={{ fontSize: 10, color: "var(--muted2)", margin: 0, textAlign: "center" }}>
              One mind per Force this week · pledge a Clan later in the Concord
            </p>
          </div>
        </div>

        {/* roster strip — prev/next flank the reel so the centred figure above
            stays unobstructed */}
        <div
          style={{
            flexShrink: 0,
            padding: isMobile ? "10px 12px 16px" : "12px 24px 22px",
            display: "flex",
            gap: 8,
            alignItems: "center",
            justifyContent: "center",
            overflowX: "auto",
          }}
        >
          <CycleArrow side="left" onClick={() => go(-1)} />
          {starters.map((r, i) => {
            const on = i === safeIdx;
            const rc = TYPE_COLOR[r.type];
            return (
              <button
                key={r.key}
                onClick={() => setIdx(i)}
                aria-label={`preview ${r.name}`}
                className="panel"
                style={{
                  ["--ac" as string]: rc,
                  flexShrink: 0,
                  padding: 8,
                  width: isMobile ? 62 : 84,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  cursor: "pointer",
                  borderColor: on ? rc : "var(--line)",
                  boxShadow: on ? `0 0 22px -6px ${rc}` : undefined,
                  opacity: on ? 1 : 0.6,
                  transform: on ? "translateY(-3px)" : undefined,
                  transition: "all .18s ease",
                }}
              >
                <ChampionAvatar ckey={r.key} type={r.type} champion={get(r.key)} size={isMobile ? 40 : 52} />
                <span className="mono" style={{ fontSize: 10, color: on ? rc : "var(--muted2)", lineHeight: 1 }}>{forceSigil(r.type)}</span>
              </button>
            );
          })}
          <CycleArrow side="right" onClick={() => go(1)} />
        </div>
      </div>
    </div>
  );
}

function CycleArrow({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={side === "left" ? "previous champion" : "next champion"}
      style={{
        flexShrink: 0,
        width: 40,
        height: 40,
        borderRadius: 99,
        background: "rgba(10,8,18,.55)",
        border: "1px solid var(--line2)",
        color: "#fff",
        cursor: "pointer",
        display: "grid",
        placeItems: "center",
        backdropFilter: "blur(6px)",
      }}
    >
      {side === "left" ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
    </button>
  );
}

function cardShareUrl(key: string, champion: Champion) {
  const lf = levelFor(champion.xp);
  const p = new URLSearchParams({
    sl: String(skillLevel(champion)),
    sk: String(skillCount(champion)),
    lv: String(lf.level),
    t: tierFor(lf.level).name,
    d: doctrine(champion, lf.level),
    w: String(champion.wins),
    l: String(champion.losses),
  });
  return `${window.location.origin}/c/${key}?${p.toString()}`;
}

// A single duel can't reshape a body — the silhouette is a deterministic function
// of a whole career, so a one-win delta is sub-pixel. Instead of two identical
// bodies, the "after" panel previews where THIS mind is heading: its own dominant
// proportions taken to Legend tier, so the player sees the body their record is
// sculpting toward (it warps, gains regalia, earns a crown) — real evolution made
// visible, not a fake one-win nudge.
const LEGEND_PROJECT_XP = 30000; // comfortably past the LEGEND threshold (lvl 15+) → crown + full regalia tier
function projectEvolved(c: Champion): Champion {
  const peak = Math.max(1, c.aggression, c.control, c.resilience, c.flair, c.creativity);
  const amp = (v: number) => Math.round(7 + (v / peak) * 21);
  return {
    ...c,
    xp: Math.max(c.xp, LEGEND_PROJECT_XP),
    wins: c.wins + 60,
    battles: c.battles + 72,
    aggression: amp(c.aggression),
    control: amp(c.control),
    resilience: amp(c.resilience),
    flair: amp(c.flair),
    creativity: amp(c.creativity),
  };
}

function EvolveStep({
  evolve,
  isMobile,
  onDone,
}: {
  evolve: { before: Champion; after: Champion; key: string; type: RosterEntry["type"] };
  isMobile: boolean;
  onDone: () => void;
}) {
  const { before, after, key, type } = evolve;
  const name = ROSTER[key]?.name ?? key;
  const col = TYPE_COLOR[type];
  const beforeLf = levelFor(before.xp);
  const afterLf = levelFor(after.xp);
  const projected = projectEvolved(after);
  const projLf = levelFor(projected.xp);
  const projTier = tierFor(projLf.level).name;
  const xpGain = after.xp - before.xp;
  const beforeDoc = doctrine(before, beforeLf.level);
  const afterDoc = doctrine(after, afterLf.level);
  const leveled = afterLf.level > beforeLf.level;
  const avSize = isMobile ? 124 : 248;
  const [copied, setCopied] = useState(false);

  const share = useCallback(() => {
    navigator.clipboard?.writeText(cardShareUrl(key, after));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [key, after]);

  const tweet = useCallback(() => {
    const url = cardShareUrl(key, after);
    const text = `I raised ${name} on Zingers — train · fight · evolve.`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank", "noopener,noreferrer");
  }, [key, name, after]);

  return (
    <div style={shell}>
      <div className="evo2 panel pop" style={{ ["--ac" as string]: col }}>
        <div className="evo2-glow" aria-hidden />
        <header className="evo2-head">
          <div className="evo2-eyebrow mono">
            <span className="evo2-rule" /> FIRST WIN <span className="evo2-rule" />
          </div>
          <h2 className="evo2-title">
            {name} {leveled ? "leveled up" : "grew from the win"}.
          </h2>
          <p className="evo2-sub">
            Your doctrine shaped the fight — {xpGain > 0 ? `+${xpGain} XP` : "XP"} and a {after.wins}W record. The body is a pure function of that record: keep winning and {name}&apos;s silhouette warps toward the {projTier} form.
          </p>
        </header>

        <div className="evo2-stage">
          <EvoPod
            ckey={key}
            type={type}
            champion={after}
            size={avSize}
            label="NOW"
            caption={`L${afterLf.level} · SL ${skillLevel(after)}`}
            accent="var(--muted2)"
          />
          <div className="evo2-arrow" style={{ ["--ac" as string]: col }}>
            <span className="evo2-chev">→</span>
            <span className="evo2-evolves mono">EVOLVES</span>
          </div>
          <EvoPod
            ckey={key}
            type={type}
            champion={projected}
            size={avSize}
            label={`AT ${projTier}`}
            caption={`L${projLf.level} · ${projTier}`}
            accent={col}
            hero
          />
        </div>

        <div className="evo2-chips">
          {leveled && (
            <span className="chip" style={{ borderColor: "var(--gold)", color: "var(--gold)" }}>
              LEVEL {beforeLf.level} → {afterLf.level}
            </span>
          )}
          {afterDoc !== beforeDoc && (
            <span className="chip" style={{ borderColor: col, color: col }}>
              {afterDoc}
            </span>
          )}
          <span className="chip" style={{ borderColor: "var(--line2)", color: "var(--muted)" }}>
            {after.wins}W · {after.losses}L
          </span>
        </div>

        <div className="evo2-foot">
          <div className="evo2-foot-row">
            <div className="evo2-foot-copy">
              <div className="evo2-foot-eyebrow mono">CLIP THIS MOMENT</div>
              <p className="evo2-foot-sub">A frozen read of {name} right now — not a live profile.</p>
            </div>
            <div className="evo2-foot-actions">
              <button className="btn btn-primary" style={{ ["--ac" as string]: "var(--gold)" }} onClick={share}>
                {copied ? <Check size={14} strokeWidth={2.4} /> : <ArrowUpRight size={14} strokeWidth={2.2} />}
                {copied ? "copied" : "copy clip"}
              </button>
              <button className="btn" style={{ ["--ac" as string]: "var(--line2)" }} onClick={tweet}>
                share on X
              </button>
            </div>
          </div>
          <button className="btn btn-primary evo2-cta" style={{ ["--ac" as string]: col }} onClick={onDone}>
            Continue to the Concord
          </button>
        </div>

        <EvolveStyles />
      </div>
    </div>
  );
}

function EvoPod({
  ckey,
  type,
  champion,
  size,
  label,
  caption,
  accent,
  hero,
}: {
  ckey: string;
  type: RosterEntry["type"];
  champion: Champion;
  size: number;
  label: string;
  caption: string;
  accent: string;
  hero?: boolean;
}) {
  return (
    <div className={hero ? "evo2-pod evo2-hero" : "evo2-pod"} style={{ ["--ac" as string]: accent, width: size }}>
      <div className="evo2-frame" style={{ height: size }}>
        <span className="evo2-tag mono">{label}</span>
        <RenderBoundary fallback={<div className="evo2-fallback" />}>
          <ChampionPortraitScene type={type} champion={champion} preset="portrait" identityKey={ckey} />
        </RenderBoundary>
        <div className="evo2-floor" aria-hidden />
      </div>
      <div className="evo2-cap mono">{caption}</div>
    </div>
  );
}

function EvolveStyles() {
  return (
    <style>{`
    .evo2{position:relative;overflow:hidden;width:min(680px,96vw);max-height:94vh;overflow-y:auto;
      padding:30px 30px 24px;text-align:center;
      border-color:color-mix(in srgb,var(--ac) 30%,var(--line2));
      box-shadow:0 30px 90px -30px #000, 0 0 0 1px color-mix(in srgb,var(--ac) 10%,transparent)}
    .evo2-glow{position:absolute;left:50%;top:-46%;width:130%;height:90%;transform:translateX(-50%);pointer-events:none;
      background:radial-gradient(58% 100% at 50% 0%, color-mix(in srgb,var(--ac) 22%,transparent), transparent 70%)}
    .evo2-head{position:relative;z-index:1;margin-bottom:22px}
    .evo2-eyebrow{display:flex;align-items:center;justify-content:center;gap:11px;font-size:10px;letter-spacing:3px;color:var(--ac);margin-bottom:13px}
    .evo2-rule{width:28px;height:1px;background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--ac) 75%,transparent))}
    .evo2-rule:last-child{transform:scaleX(-1)}
    .evo2-title{font-size:28px;font-weight:800;letter-spacing:-.3px;line-height:1.12;margin:0 0 9px;color:var(--ink)}
    .evo2-sub{max-width:486px;margin:0 auto;color:var(--muted);font-size:13.5px;line-height:1.55}

    .evo2-stage{position:relative;z-index:1;display:flex;align-items:center;justify-content:center;gap:18px;margin-bottom:20px}
    .evo2-pod{display:flex;flex-direction:column;align-items:center;min-width:0}
    .evo2-frame{position:relative;width:100%;border-radius:18px;overflow:hidden;
      background:linear-gradient(180deg,#0d0b16,#08070f);
      border:1px solid color-mix(in srgb,var(--ac) 24%,var(--line));
      box-shadow:inset 0 1px 0 rgba(255,255,255,.05), inset 0 0 46px -26px var(--ac)}
    .evo2-frame canvas{width:100%!important;height:100%!important;display:block;border-radius:18px}
    .evo2-fallback{position:absolute;inset:0;background:linear-gradient(180deg,#0d0b16,#08070f)}
    .evo2-hero .evo2-frame{border-color:color-mix(in srgb,var(--ac) 62%,var(--line2));
      box-shadow:0 0 0 1px color-mix(in srgb,var(--ac) 34%,transparent),
                 0 22px 60px -24px color-mix(in srgb,var(--ac) 75%,transparent),
                 inset 0 0 60px -26px var(--ac)}
    .evo2-tag{position:absolute;top:10px;left:10px;z-index:3;font-size:8.5px;letter-spacing:1.8px;
      padding:4px 9px;border-radius:999px;color:var(--ac);
      background:color-mix(in srgb,#08070f 72%,transparent);
      border:1px solid color-mix(in srgb,var(--ac) 38%,var(--line));backdrop-filter:blur(5px)}
    .evo2-hero .evo2-tag{color:color-mix(in srgb,var(--ac) 90%,#fff);
      box-shadow:0 0 16px -4px color-mix(in srgb,var(--ac) 80%,transparent)}
    .evo2-floor{position:absolute;left:50%;bottom:7%;width:60%;height:13%;transform:translateX(-50%);pointer-events:none;
      border-radius:50%;filter:blur(7px);opacity:.45;
      background:radial-gradient(ellipse at center, color-mix(in srgb,var(--ac) 55%,transparent), transparent 70%)}
    .evo2-cap{margin-top:11px;font-size:11px;letter-spacing:.8px;
      color:color-mix(in srgb,var(--ac) 85%,var(--ink))}
    .evo2-hero .evo2-cap{color:var(--ac);text-shadow:0 0 14px color-mix(in srgb,var(--ac) 55%,transparent)}

    .evo2-arrow{display:flex;flex-direction:column;align-items:center;gap:6px;flex-shrink:0}
    .evo2-chev{font-size:26px;font-weight:800;line-height:1;color:var(--ac);
      filter:drop-shadow(0 0 9px color-mix(in srgb,var(--ac) 60%,transparent))}
    .evo2-evolves{font-size:8px;letter-spacing:2px;color:var(--muted2)}

    .evo2-chips{position:relative;z-index:1;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-bottom:22px}
    .evo2-chips .chip{font-size:11px;padding:5px 11px}

    .evo2-foot{position:relative;z-index:1;border-top:1px solid var(--line);padding-top:18px;text-align:left}
    .evo2-foot-row{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:14px;flex-wrap:wrap}
    .evo2-foot-copy{min-width:0}
    .evo2-foot-eyebrow{font-size:10px;letter-spacing:2px;color:var(--gold);margin-bottom:4px}
    .evo2-foot-sub{margin:0;color:var(--muted);font-size:12.5px;line-height:1.4}
    .evo2-foot-actions{display:flex;gap:8px;flex-shrink:0}
    .evo2-foot-actions .btn{display:inline-flex;align-items:center;gap:6px;font-size:11px;padding:9px 13px}
    .evo2-cta{width:100%;font-size:14px;padding:14px 16px;display:flex;align-items:center;justify-content:center}

    @media (max-width:560px){
      .evo2{padding:22px 18px 18px}
      .evo2-title{font-size:21px}
      .evo2-sub{font-size:12.5px}
      .evo2-stage{gap:9px;margin-bottom:16px}
      .evo2-chev{font-size:20px}
      .evo2-foot-row{flex-direction:column;align-items:stretch;gap:12px}
      .evo2-foot-actions .btn{flex:1;justify-content:center}
    }
    `}</style>
  );
}

/** Persistent hub banner until the first duel is won. */
export function FirstDuelHubCta({ isMobile, onStart }: { isMobile: boolean; onStart: () => void }) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: isMobile ? 100 : 88,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        padding: "0 16px",
        pointerEvents: "none",
        zIndex: 58,
      }}
    >
      <div
        className="panel pop"
        style={{
          ["--ac" as string]: ACC,
          pointerEvents: "auto",
          maxWidth: 480,
          width: "100%",
          padding: "14px 16px",
          borderColor: ACC,
          boxShadow: `0 0 32px -8px ${ACC}`,
          textAlign: "center",
        }}
      >
        <div className="mono" style={{ fontSize: 9, letterSpacing: 2, color: ACC, marginBottom: 6 }}>START HERE</div>
        <p style={{ fontSize: isMobile ? 13 : 14, fontWeight: 600, margin: "0 0 4px", lineHeight: 1.35 }}>
          Win your {FIGHT.firstDuel}. Watch your champion grow.
        </p>
        <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 12px" }}>
          Pick a fighter, tune doctrine, watch the {FIGHT.duel} play out.
        </p>
        <button
          className="btn btn-primary"
          style={{ ["--ac" as string]: ACC, width: "100%", fontSize: 14, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          onClick={onStart}
        >
          <Swords size={16} strokeWidth={2.2} />
          Start your {FIGHT.firstDuel}
        </button>
      </div>
    </div>
  );
}
