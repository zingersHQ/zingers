"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, Swords, ArrowUpCircle, ChevronsUp, Award, Dumbbell, Brain, KeyRound, DoorOpen, Lock, Mountain } from "lucide-react";
import { AXES, blank, ROMAN } from "@/lib/evolve/progression";
import { houseProfile } from "@/lib/evolve/elo";
import { appearanceOf } from "@/lib/evolve/appearance";
import { useChampions } from "@/store/champions";
import { cardOf } from "@/lib/cards/card";
import { ROSTER } from "@/lib/engine/roster";
import { ChampionCardFrame, shareQuery } from "@/components/collection/card-frame";
import { StyleRadar } from "@/components/collection/style-radar";
import { useIsMobile } from "@/lib/use-device";
import type { CareerEvent, CareerEventKind } from "@/lib/types";
import { getHandle } from "@/lib/owner";
import { loadCircuitPersonalBest } from "@/components/grounds/circuit-tracks";

export default function ChampionPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = use(params);
  const ckey = key.toUpperCase();
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();
  const { get, getRecipe, owned, events, snapshots } = useChampions();

  useEffect(() => {
    setMounted(true);
  }, [ckey]);

  if (!mounted) return <main style={{ padding: 40 }} />;
  const entry = ROSTER[ckey];
  if (!entry) return <main style={{ padding: 40, color: "var(--muted)" }}>Unknown champion.</main>;

  const c = get(ckey);
  const recipe = getRecipe(ckey);
  const card = cardOf(ckey, c || blank(), { memory: recipe.memory });
  const col = card.force.hex;
  const saga = [...(events[ckey] || [])].sort((a, b) => b.ts - a.ts);
  const earliest = snapshots[ckey]?.[0]?.axes ?? null;
  const memory = recipe.memory || [];
  const prof = houseProfile(c);
  const app = appearanceOf(c);
  const ascentReaches = (() => {
    const best = loadCircuitPersonalBest();
    return best ? Math.min(10, Math.ceil(best.sectors / 10)) : 0;
  })();
  const shareHref = `/c/${card.key}?${shareQuery(
    card,
    recipe.agent?.provider ? `${recipe.agent.provider}` : "House Grok",
    { nick: recipe.nick, ascentReaches, trainer: getHandle() || undefined },
  )}`;
  const statRows = Object.entries(card.stats)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }));

  const heroButtons = (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Link href={shareHref} className="btn btn-primary" style={{ ["--ac" as string]: card.rarityHex, flex: "1 1 140px", textAlign: "center" }}>
        Share card
      </Link>
      <Link href="/arena" className="btn" style={{ ["--ac" as string]: col, flex: "1 1 140px", textAlign: "center" }}>
        Fight
      </Link>
    </div>
  );

  const cardFrame = (
    <ChampionCardFrame
      card={card}
      champion={c || blank()}
      owned={owned === ckey}
      orientation={isMobile ? "row" : "portrait"}
      footer={isMobile ? undefined : <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>{heroButtons}</div>}
    />
  );

  const detailStack = (
    <>
      <div className="panel" style={{ ["--ac" as string]: col, padding: isMobile ? 18 : 22 }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: 2, color: col, marginBottom: 10 }}>
          CARD SAGA · GENERATED FROM THE RECORD
        </div>
        <h1 style={{ fontSize: isMobile ? 30 : 42, fontWeight: 800, margin: 0, lineHeight: 1.05 }}>{card.name}</h1>
        <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.65, margin: "12px 0 0" }}>{card.saga}</p>
        <p style={{ color: "var(--muted2)", fontSize: 13, lineHeight: 1.55, margin: "12px 0 0" }}>
          {entry.persona}. This card echoes <strong style={{ color: "var(--ink)" }}>{card.lineage}</strong>, carries the physics of{" "}
          <strong style={{ color: col }}>{card.force.name}</strong>, and can be re-rendered from its career state at any time.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <Stat n={card.skillLevel} l="SKILL LEVEL" c="var(--gold)" />
        <Stat n={card.skills.length} l="SKILLS" c={col} />
        <Stat n={card.battles} l="BATTLES" c="var(--muted)" />
      </div>

      {saga.length > 0 && (
        <div className="panel" style={{ padding: 20 }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)", marginBottom: 14 }}>
            THE SAGA · A LIFE IN THE GROUNDS
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {saga.slice(0, 24).map((ev, i) => (
              <SagaRow key={ev.id} ev={ev} accent={col} last={i === Math.min(saga.length, 24) - 1} />
            ))}
          </div>
        </div>
      )}

      {memory.length > 0 && (
        <div className="panel" style={{ ["--ac" as string]: col, padding: 20 }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: col, marginBottom: 12 }}>
            MEMORY · WHAT THIS MIND CARRIES INTO A FIGHT
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {memory.map((note, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, lineHeight: 1.5 }}>
                <Brain size={14} strokeWidth={2} style={{ color: col, marginTop: 3, flexShrink: 0 }} />
                <span style={{ color: "var(--muted)" }}>{note}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="panel" style={{ padding: 20 }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)", marginBottom: 12 }}>
              ABILITIES · CARD TEXT
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {card.abilities.map((a) => (
                <div key={a.id} style={{ border: `1px solid ${a.finisher ? "var(--gold)" : "var(--line)"}`, borderRadius: 10, padding: "10px 12px", background: a.finisher ? "rgba(245,208,32,.06)" : "rgba(255,255,255,.025)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                    <strong>{a.finisher ? "★ " : ""}{a.name}</strong>
                    <span className="mono" style={{ fontSize: 10, color: col }}>{a.stat} · {a.power}</span>
                  </div>
                  <div className="mono" style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.45, marginTop: 4 }}>{a.text}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
            <div className="panel" style={{ padding: 20 }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)", marginBottom: 12 }}>
                COMBAT STATS
              </div>
              {statRows.map(({ label, value }) => (
                <Meter key={label} label={label} v={value} c={col} max={100} />
              ))}
            </div>

            <div className="panel" style={{ padding: 20 }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)", marginBottom: 12 }}>
                FIGHTING STYLE · DRIVES THE BODY
              </div>
              <div style={{ display: "grid", placeItems: "center", padding: "4px 0 12px" }}>
                <StyleRadar current={{ aggression: c.aggression, control: c.control, resilience: c.resilience, flair: c.flair, creativity: c.creativity }} earliest={earliest} accent={col} />
              </div>
              {earliest && (
                <p className="mono" style={{ fontSize: 10, color: "var(--muted2)", textAlign: "center", margin: "0 0 12px", letterSpacing: 0.5 }}>
                  SOLID · NOW &nbsp;·&nbsp; DASHED · WHERE IT STARTED
                </p>
              )}
              {AXES.map((ax) => (
                <Meter key={ax.k} label={`${ax.glyph} ${ax.label}`} v={Math.round(c[ax.k] || 0)} c={ax.color} max={24} />
              ))}
            </div>
          </div>

          <div className="panel" style={{ padding: 20 }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)", marginBottom: 12 }}>
              SKILLS ACQUIRED · {card.skills.length} · SL {card.skillLevel}
            </div>
            {card.skills.length ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {card.skills.map((s) => (
                  <span
                    key={`${s.axis}-${s.rank}`}
                    title={`${s.axis} ${ROMAN[s.rank]}`}
                    className="mono"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: s.color, border: `1px solid ${s.color}55`, borderRadius: 8, padding: "5px 10px", background: `${s.color}11` }}
                  >
                    <span style={{ fontSize: 13 }}>{s.glyph}</span>
                    {s.name}
                    <span style={{ color: "var(--muted2)" }}>{ROMAN[s.rank]}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>
                No skills yet. Fight and train to push a fighting axis past its thresholds — each crossing unlocks a named skill.
              </p>
            )}
          </div>

          <div className="panel" style={{ padding: 20 }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)", marginBottom: 12 }}>
              FORM &amp; RECORD
            </div>
            {prof ? (
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 12 }}>
                <Meter label="Win rate" v={prof.winRate} c="var(--good)" />
                <Meter label="Deception" v={prof.deception} c="var(--bad)" />
                <Meter label="Detection" v={prof.detection} c="#4aa3ff" />
                <Meter label="Survival" v={prof.survival} c="var(--gold)" />
              </div>
            ) : (
              <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>
                No House games yet — play one to generate an objective skill profile.
              </p>
            )}

            <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)", margin: "18px 0 10px" }}>
              BODY MORPH · GENOME RECEIPT
            </div>
            <div className="mono" style={{ fontSize: 11, color: "var(--muted)", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              <span>stature ×{(app.h / 1.7).toFixed(2)}</span>
              <span>build ×{app.width.toFixed(2)}</span>
              <span>head ×{app.headScale.toFixed(2)}</span>
              <span>fists ×{app.handScale.toFixed(2)}</span>
              <span>deviation gain ×{app.gain.toFixed(1)}</span>
              <span>tier {app.tier.name}</span>
            </div>
          </div>
    </>
  );

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "26px 22px 90px" }}>
      <Link href="/collection" className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
        ← collection
      </Link>

      {isMobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 14 }}>
          {cardFrame}
          {heroButtons}
          {detailStack}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 440px) minmax(0, 1fr)", gap: 22, alignItems: "start", marginTop: 14 }}>
          {cardFrame}
          <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>{detailStack}</section>
        </div>
      )}
    </main>
  );
}

const EVENT_META: Record<CareerEventKind, { Icon: typeof Sparkles; tone: "milestone" | "win" | "loss" | "neutral" }> = {
  claimed: { Icon: Sparkles, tone: "milestone" },
  bout: { Icon: Swords, tone: "neutral" },
  levelup: { Icon: ArrowUpCircle, tone: "neutral" },
  tierup: { Icon: ChevronsUp, tone: "milestone" },
  trial: { Icon: Award, tone: "milestone" },
  train: { Icon: Dumbbell, tone: "neutral" },
  imprint: { Icon: Brain, tone: "neutral" },
  keeper: { Icon: KeyRound, tone: "milestone" },
  season: { Icon: DoorOpen, tone: "milestone" },
  sealed: { Icon: Lock, tone: "milestone" },
  ascent: { Icon: Mountain, tone: "milestone" },
};

function relTime(ts: number): string {
  const d = Date.now() - ts;
  const m = Math.floor(d / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function SagaRow({ ev, accent, last }: { ev: CareerEvent; accent: string; last: boolean }) {
  const meta = EVENT_META[ev.kind] ?? EVENT_META.bout;
  const iconColor =
    meta.tone === "milestone"
      ? accent
      : ev.kind === "bout"
        ? ev.won
          ? "var(--good)"
          : "var(--bad)"
        : ev.kind === "levelup"
          ? "var(--gold)"
          : "var(--muted2)";
  const { Icon } = meta;
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      {/* rail: icon + connector line */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, display: "grid", placeItems: "center", border: `1px solid ${iconColor}55`, background: `${iconColor}14` }}>
          <Icon size={14} strokeWidth={2} style={{ color: iconColor }} />
        </div>
        {!last && <div style={{ width: 1, flex: 1, minHeight: 14, background: "var(--line)", margin: "2px 0" }} />}
      </div>
      <div style={{ paddingBottom: last ? 0 : 14, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
          <span style={{ fontSize: 13.5, fontWeight: meta.tone === "milestone" ? 700 : 500, color: meta.tone === "milestone" ? "var(--ink)" : "var(--muted)" }}>{ev.title}</span>
          <span className="mono" style={{ fontSize: 10, color: "var(--muted2)" }}>{relTime(ev.ts)}</span>
        </div>
        {ev.detail && <div className="mono" style={{ fontSize: 11, color: "var(--muted2)", lineHeight: 1.45, marginTop: 3 }}>{ev.detail}</div>}
      </div>
    </div>
  );
}

function Stat({ n, l, c }: { n: number; l: string; c: string }) {
  return (
    <div className="panel" style={{ padding: "14px 16px" }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: c }}>{n}</div>
      <div className="mono" style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--muted2)" }}>{l}</div>
    </div>
  );
}

function Meter({ label, v, c, max = 100 }: { label: string; v: number; c: string; max?: number }) {
  const pct = Math.max(0, Math.min(100, (v / max) * 100));
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
        <span>{label}</span>
        <span className="mono" style={{ color: "var(--muted2)" }}>
          {v}{max === 100 ? "" : `/${max}`}
        </span>
      </div>
      <div style={{ height: 7, borderRadius: 5, background: "#241f33", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: c, transition: "width .5s ease" }} />
      </div>
    </div>
  );
}
