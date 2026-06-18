"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { AXES, blank } from "@/lib/evolve/progression";
import { houseProfile } from "@/lib/evolve/elo";
import { appearanceOf } from "@/lib/evolve/appearance";
import { useChampions } from "@/store/champions";
import { cardOf } from "@/lib/cards/card";
import { ROSTER } from "@/lib/engine/roster";
import { ChampionCardFrame, shareQuery } from "@/components/collection/card-frame";

export default function ChampionPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = use(params);
  const ckey = key.toUpperCase();
  const [mounted, setMounted] = useState(false);
  const { get, getRecipe, owned } = useChampions();

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
  const prof = houseProfile(c);
  const app = appearanceOf(c);
  const shareHref = `/c/${card.key}?${shareQuery(card, recipe.agent?.provider ? `${recipe.agent.provider}` : "House Grok")}`;
  const statRows = Object.entries(card.stats)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }));

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "26px 22px 90px" }}>
      <Link href="/collection" className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
        ← collection
      </Link>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 440px) minmax(0, 1fr)", gap: 22, alignItems: "start", marginTop: 14 }}>
        <ChampionCardFrame
          card={card}
          owned={owned === ckey}
          footer={
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", borderTop: "1px solid var(--line)", paddingTop: 12 }}>
              <Link href={shareHref} className="btn btn-primary" style={{ ["--ac" as string]: card.rarityHex, flex: "1 1 140px", textAlign: "center" }}>
                Share card
              </Link>
              <Link href="/arena" className="btn" style={{ ["--ac" as string]: col, flex: "1 1 140px", textAlign: "center" }}>
                Fight
              </Link>
            </div>
          }
        />

        <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="panel" style={{ ["--ac" as string]: col, padding: 22 }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: 2, color: col, marginBottom: 10 }}>
              CARD SAGA · GENERATED FROM THE RECORD
            </div>
            <h1 style={{ fontSize: 42, fontWeight: 800, margin: 0, lineHeight: 1 }}>{card.name}</h1>
            <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.65, margin: "12px 0 0" }}>{card.saga}</p>
            <p style={{ color: "var(--muted2)", fontSize: 13, lineHeight: 1.55, margin: "12px 0 0" }}>
              {entry.persona}. This card echoes <strong style={{ color: "var(--ink)" }}>{card.lineage}</strong>, carries the physics of{" "}
              <strong style={{ color: col }}>{card.force.inWorld}</strong>, and can be re-rendered from its career state at any time.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <Stat n={card.elo} l="RATING" c="var(--gold)" />
            <Stat n={card.level} l="LEVEL" c={col} />
            <Stat n={card.battles} l="BATTLES" c="var(--muted)" />
          </div>

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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
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
              {AXES.map((ax) => (
                <Meter key={ax.k} label={`${ax.glyph} ${ax.label}`} v={Math.round(c[ax.k] || 0)} c={ax.color} max={24} />
              ))}
            </div>
          </div>

          <div className="panel" style={{ padding: 20 }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)", marginBottom: 12 }}>
              FORM &amp; RECORD
            </div>
            {prof ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                <Meter label="Win rate" v={prof.winRate} c="var(--good)" />
                <Meter label="Deception" v={prof.deception} c="var(--bad)" />
                <Meter label="Detection" v={prof.detection} c="#4aa3ff" />
                <Meter label="Survival" v={prof.survival} c="var(--gold)" />
              </div>
            ) : (
              <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>
                No House games yet — play one to generate an objective skill profile and rating.
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
        </section>
      </div>
    </main>
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
