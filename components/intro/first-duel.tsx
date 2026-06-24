"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, Check, Crown, Swords } from "lucide-react";
import type { Champion, RosterEntry, Strat } from "@/lib/types";
import { TYPE_COLOR, doctrine, levelFor, skillCount, skillLevel, tierFor } from "@/lib/evolve/progression";
import { FORCES as FORCE_LORE, wheelNeighbors } from "@/lib/lore/canon";
import { ForcesChain } from "@/components/lore/forces-wheel";
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
import { ICON, ONBOARDING_BG, forceHex, forceSigil } from "@/lib/iconography";
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
      <div style={{ ...shell, padding: 0, display: "block" }}>
        <OnboardingAudio compact={isMobile} />
        <div style={{ position: "relative", height: isMobile ? "min(52vh, 420px)" : "min(58vh, 480px)", background: ICON.void }}>
          <RenderBoundary
            fallback={
              <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", padding: 24 }}>
                <ChampionAvatar ckey={PITCH_HERO.key} type={PITCH_HERO.type} champion={PITCH_HERO.champion} size={isMobile ? 120 : 160} />
              </div>
            }
          >
            <AgentShowcase champion={PITCH_HERO.champion} type={PITCH_HERO.type} scale={isMobile ? 0.58 : 0.72} dolly gesture="idle" />
          </RenderBoundary>
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(180deg, transparent 35%, rgba(5,4,9,.55) 68%, #050409 100%)",
              pointerEvents: "none",
            }}
          />
        </div>
        <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center", padding: isMobile ? "0 20px 28px" : "0 28px 36px", marginTop: isMobile ? -48 : -56, position: "relative" }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: 2.5, color: ACC, marginBottom: 10 }}>WELCOME TO ZINGERS</div>
          <h1 style={{ fontSize: isMobile ? 28 : 36, fontWeight: 800, margin: "0 0 12px", letterSpacing: -0.5, lineHeight: 1.08 }}>
            Your champion fights for you.
          </h1>
          <p style={{ fontSize: isMobile ? 15 : 17, color: "var(--muted)", lineHeight: 1.55, margin: "0 0 10px" }}>
            Pick a fighter, set how it {FIGHT.fights}, and watch your {FIGHT.firstDuel} play out in a real arena. Wins feed XP — and over time, the body on screen becomes a record of that career.
          </p>
          <p className="mono" style={{ fontSize: 11, color: "var(--muted2)", margin: "0 0 24px" }}>
            About a minute · tune doctrine · watch the {FIGHT.duel}
          </p>
          <button
            className="btn btn-primary pop"
            style={{ ["--ac" as string]: ACC, fontSize: 16, padding: "14px 28px", display: "inline-flex", alignItems: "center", gap: 8 }}
            onClick={handlePitchContinue}
          >
            Choose your champion
          </button>
        </div>
      </div>
    );
  }

  if (phase === "pick") {
    const cols = isMobile ? "1fr" : starters.length > 3 ? "repeat(auto-fit, minmax(148px, 1fr))" : "repeat(3, 1fr)";
    return (
      <div style={shell}>
        <OnboardingAudio compact={isMobile} />
        <div className="panel" style={{ padding: isMobile ? 20 : 28, width: "min(860px, 96vw)", maxHeight: "92vh", overflow: "auto", textAlign: "center" }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: 2, color: "var(--muted2)" }}>STEP 1 · CHOOSE YOUR CHAMPION</div>
          <h2 style={{ fontSize: isMobile ? 22 : 26, fontWeight: 700, margin: "8px 0 6px" }}>Who goes first?</h2>
          <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.5, margin: "0 0 6px" }}>
            One champion per Force — five styles on the wheel. Each beats the next.
          </p>
          <p style={{ color: "var(--muted2)", fontSize: 12, lineHeight: 1.45, margin: "0 0 14px" }}>
            One mind per Force this week — the roster rotates. You will pledge a Clan later in the Concord.
          </p>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
            <ForcesChain />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: cols, gap: 12 }}>
            {starters.map((r) => {
              const c = get(r.key);
              const col = TYPE_COLOR[r.type];
              const nb = wheelNeighbors(r.type);
              const prey = FORCE_LORE[nb.prey];
              const pred = FORCE_LORE[nb.predator];
              const on = selected === r.key;
              const hook = FIRST_DUEL_HOOKS[r.key];
              return (
                <button
                  key={r.key}
                  className="panel"
                  onClick={() => handlePick(r.key)}
                  style={{
                    ["--ac" as string]: col,
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    borderColor: on ? col : "var(--line)",
                    boxShadow: on ? `0 0 24px -8px ${col}` : undefined,
                  }}
                >
                  <ChampionAvatar ckey={r.key} type={r.type} champion={c} size={isMobile ? 72 : 88} />
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{r.name}</div>
                  <div className="mono" style={{ fontSize: 14, color: col, lineHeight: 1 }}>
                    {forceSigil(r.type)}
                  </div>
                  <div className="mono" style={{ fontSize: 10, color: forceHex(r.type) }}>
                    {FORCE_LORE[r.type].inWorld}
                  </div>
                  {hook && <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.4 }}>{hook}</div>}
                  <div className="mono" style={{ display: "flex", gap: 8, fontSize: 9, color: "var(--muted2)" }}>
                    <span>beats {prey.sigil}</span>
                    <span>weak to {pred.sigil}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
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
              <div className="mono" style={{ fontSize: 11, color: col }}>{FORCE_LORE[entry.type].inWorld}</div>
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
