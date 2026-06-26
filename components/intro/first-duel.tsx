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
import { DoctrineDial } from "@/components/shared/doctrine-dial";
import { RenderBoundary } from "@/components/grounds/render-guard";
import { showcaseChampion } from "@/lib/render/showcase";
import {
  CONCORD_LANDING,
  FIRST_DUEL_HERO_KEY,
  FIRST_DUEL_HOOKS,
  QUICK_START_STRAT,
} from "@/lib/first-duel";
import { FIGHT } from "@/lib/player-copy";
import { TRAIN_COST } from "@/store/champions";
import { ROSTER } from "@/lib/engine/roster";
import { ICON, ONBOARDING_BG, forceSigil } from "@/lib/iconography";
import { LowerThird } from "@/components/intro/lower-third";
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

export type FirstDuelPhase = "pitch" | "pick" | "train" | "evolve" | "concord";

const ACC = ICON.accent;
const PITCH_HERO = showcaseChampion(FIRST_DUEL_HERO_KEY);

const shell: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 85,
  display: "grid",
  placeItems: "center",
  background: ONBOARDING_BG,
  padding: 16,
};

function armPitchAudio() {
  playOnboardingSound("pitch");
}

export function FirstDuelOverlay({
  phase,
  starters,
  selected,
  get,
  crowns,
  evolve,
  isMobile,
  onPitchContinue,
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
  onPitchContinue: () => void;
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
    if (phase !== "pitch") return;
    return armOnboardingAudio();
  }, [phase]);

  useEffect(() => {
    if (phase === "evolve") playOnboardingSound("evolve");
    if (phase === "concord") playOnboardingSound("concord");
  }, [phase]);

  const handlePitchContinue = useCallback(() => {
    armPitchAudio();
    onPitchContinue();
  }, [onPitchContinue]);

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

  if (phase === "pitch") {
    return (
      <div style={{ ...shell, padding: 0, display: "block", background: ONBOARDING_BG, overflow: "hidden" }}>
        <OnboardingAudio compact={isMobile} />
        <div style={{ position: "absolute", inset: 0, background: ICON.void, overflow: "hidden" }}>
          <RenderBoundary
            fallback={
              <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", padding: 24 }}>
                <ChampionAvatar ckey={PITCH_HERO.key} type={PITCH_HERO.type} champion={PITCH_HERO.champion} size={isMobile ? 120 : 160} />
              </div>
            }
          >
            <AgentShowcase
              champion={PITCH_HERO.champion}
              type={PITCH_HERO.type}
              scale={isMobile ? 0.62 : 0.82}
              dolly
              gesture="idle"
              colorHex={ICON.gold}
            />
          </RenderBoundary>
        </div>
        <LowerThird
          mobile={isMobile}
          accent={ACC}
          kicker="WELCOME TO ZINGERS"
          title="Your champion fights for you."
          body={
            <>
              Pick a fighter, set how it {FIGHT.fights}, and watch your {FIGHT.firstDuel} in the arena.
            </>
          }
        >
          <button
            className="btn btn-primary"
            style={{ ["--ac" as string]: ACC, fontSize: 13, padding: "12px 22px", display: "inline-flex", alignItems: "center", gap: 8 }}
            onClick={handlePitchContinue}
          >
            Choose your champion
          </button>
        </LowerThird>
      </div>
    );
  }

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

            <CycleArrow side="left" onClick={() => go(-1)} />
            <CycleArrow side="right" onClick={() => go(1)} />
          </div>

          {/* dossier */}
          <div
            style={{
              width: isMobile ? "auto" : 360,
              flexShrink: 0,
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

        {/* roster strip */}
        <div
          style={{
            flexShrink: 0,
            padding: isMobile ? "10px 12px 16px" : "12px 24px 22px",
            display: "flex",
            gap: 8,
            justifyContent: "center",
            overflowX: "auto",
          }}
        >
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
        position: "absolute",
        zIndex: 5,
        top: "50%",
        transform: "translateY(-50%)",
        [side]: 6,
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
  const xpGain = after.xp - before.xp;
  const beforeDoc = doctrine(before, beforeLf.level);
  const afterDoc = doctrine(after, afterLf.level);
  const leveled = afterLf.level > beforeLf.level;
  const avSize = isMobile ? 80 : 100;
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
      <div className="panel pop" style={{ ["--ac" as string]: col, padding: isMobile ? 20 : 28, width: "min(640px, 96vw)", textAlign: "center", borderColor: col }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: 2, color: col }}>FIRST WIN</div>
        <h2 style={{ fontSize: isMobile ? 24 : 30, fontWeight: 800, margin: "8px 0 6px" }}>
          {name} {leveled ? "leveled up" : "grew from the win"}.
        </h2>
        <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.5, margin: "0 0 16px" }}>
          Your doctrine shaped the fight. The {FIGHT.duel} added {xpGain > 0 ? `${xpGain} XP` : "XP"} and a {after.wins}W record. The silhouette is your champion&apos;s career made visible.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            gridTemplateRows: "auto auto auto",
            columnGap: isMobile ? 8 : 16,
            rowGap: 8,
            marginBottom: 12,
            alignItems: "center",
            justifyItems: "center",
          }}
        >
          <div className="mono" style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--muted2)" }}>BEFORE</div>
          <div />
          <div className="mono" style={{ fontSize: 9, letterSpacing: 1.5, color: col }}>AFTER</div>
          <div style={{ width: avSize, height: avSize, display: "grid", placeItems: "center" }}>
            <ChampionAvatar ckey={key} type={type} champion={before} size={avSize} />
          </div>
          <div className="mono" style={{ fontSize: 20, color: col, fontWeight: 800 }}>→</div>
          <div style={{ width: avSize, height: avSize, display: "grid", placeItems: "center" }}>
            <ChampionAvatar ckey={key} type={type} champion={after} size={avSize} />
          </div>
          <div className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>L{beforeLf.level} · SL {skillLevel(before)}</div>
          <div />
          <div className="mono" style={{ fontSize: 10, color: col }}>L{afterLf.level} · SL {skillLevel(after)}</div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
          {leveled && (
            <span className="chip" style={{ borderColor: "var(--gold)", color: "var(--gold)", fontSize: 11 }}>
              LEVEL {beforeLf.level} → {afterLf.level}
            </span>
          )}
          {afterDoc !== beforeDoc && (
            <span className="chip" style={{ borderColor: col, color: col, fontSize: 11 }}>
              {afterDoc}
            </span>
          )}
          <span className="chip" style={{ borderColor: "var(--line)", color: "var(--muted)", fontSize: 11 }}>
            {after.wins}W · {after.losses}L
          </span>
        </div>

        <div style={{ borderTop: "1px solid var(--line)", marginTop: 4, paddingTop: 18 }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: 2, color: "var(--gold)", marginBottom: 6 }}>CLIP THIS MOMENT</div>
          <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.45, margin: "0 0 14px" }}>
            A frozen read of {name} right now. Not a live profile.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 14 }}>
            <button className="btn btn-primary" style={{ ["--ac" as string]: "var(--gold)", display: "inline-flex", alignItems: "center", gap: 6 }} onClick={share}>
              {copied ? <Check size={15} strokeWidth={2.4} /> : <ArrowUpRight size={15} strokeWidth={2.2} />}
              {copied ? "link copied" : "copy clip link"}
            </button>
            <button className="btn" style={{ ["--ac" as string]: "var(--line2)", display: "inline-flex", alignItems: "center", gap: 6 }} onClick={tweet}>
              share on X
            </button>
          </div>
          <button className="btn btn-primary" style={{ ["--ac" as string]: col, width: "100%", fontSize: 15, padding: "14px 16px" }} onClick={onDone}>
            Continue to the Concord
          </button>
        </div>
      </div>
    </div>
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
