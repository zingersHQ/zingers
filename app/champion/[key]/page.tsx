"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import type { CreatureType, RosterEntry } from "@/lib/types";
import { TYPE_COLOR, levelFor, tierFor, doctrine, AXES } from "@/lib/evolve/progression";
import { ratingOf, houseProfile } from "@/lib/evolve/elo";
import { appearanceOf } from "@/lib/evolve/appearance";
import { useChampions } from "@/store/champions";
import { ChampionAvatar, Sigils, XpBar } from "@/components/champion-avatar";

export default function ChampionPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = use(params);
  const ckey = key.toUpperCase();
  const [entry, setEntry] = useState<RosterEntry | null>(null);
  const [mounted, setMounted] = useState(false);
  const { get } = useChampions();

  useEffect(() => {
    setMounted(true);
    fetch("/api/roster")
      .then((r) => r.json())
      .then((d) => setEntry(d.creatures.find((c: RosterEntry) => c.key === ckey) || null));
  }, [ckey]);

  if (!mounted) return <main style={{ padding: 40 }} />;
  if (!entry) return <main style={{ padding: 40, color: "var(--muted)" }}>Loading champion…</main>;

  const c = get(ckey);
  const type = entry.type as CreatureType;
  const col = TYPE_COLOR[type];
  const lf = levelFor(c.xp);
  const prof = houseProfile(c);
  const app = appearanceOf(c);

  return (
    <main style={{ maxWidth: 920, margin: "0 auto", padding: "26px 22px 80px" }}>
      <Link href="/standings" className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
        ← standings
      </Link>

      <div className="panel" style={{ ["--ac" as string]: col, padding: 28, marginTop: 14, display: "flex", gap: 28, flexWrap: "wrap", alignItems: "center" }}>
        <ChampionAvatar ckey={ckey} type={type} champion={c} size={170} />
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1 style={{ fontSize: 38, fontWeight: 700, margin: 0 }}>{entry.name}</h1>
          <div className="mono" style={{ fontSize: 12, color: col, letterSpacing: 1, marginTop: 4 }}>
            {type} · L{lf.level} {tierFor(lf.level).name} · <i style={{ color: "var(--ink)" }}>{doctrine(c, lf.level)}</i>
          </div>
          <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.5, margin: "12px 0" }}>{entry.persona}</p>
          <div style={{ marginTop: 8 }}>
            <Sigils champion={c} />
          </div>
          <div className="mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--muted2)", margin: "14px 0 4px" }}>
            <span>LEVEL {lf.level}</span>
            <span>
              {lf.into}/{lf.span} XP
            </span>
          </div>
          <XpBar champion={c} color={col} />
          <div style={{ display: "flex", gap: 18, marginTop: 14 }} className="mono">
            <Stat n={c.wins} l="WINS" c="var(--good)" />
            <Stat n={c.losses} l="LOSSES" c="var(--bad)" />
            <Stat n={c.battles} l="BATTLES" c="var(--muted)" />
            <Stat n={ratingOf(c)} l="ELO" c="var(--gold)" />
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        {/* fighting style */}
        <div className="panel" style={{ padding: 20 }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)", marginBottom: 12 }}>
            FIGHTING STYLE · drives the body
          </div>
          {AXES.map((ax) => {
            const v = Math.min(1, (c[ax.k] || 0) / 24);
            return (
              <div key={ax.k} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span>
                    {ax.glyph} {ax.label}
                  </span>
                  <span className="mono" style={{ color: "var(--muted2)" }}>
                    {Math.round(c[ax.k] || 0)}
                  </span>
                </div>
                <div style={{ height: 7, borderRadius: 5, background: "#241f33", overflow: "hidden" }}>
                  <div style={{ width: `${v * 100}%`, height: "100%", background: ax.color, transition: "width .5s ease" }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* form + body morph */}
        <div className="panel" style={{ padding: 20 }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)", marginBottom: 12 }}>
            FORM &amp; RECORD
          </div>
          {prof ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Meter label="Win rate" v={prof.winRate} c="var(--good)" />
              <Meter label="Deception (as Traitor)" v={prof.deception} c="var(--bad)" />
              <Meter label="Detection (Faithful reads)" v={prof.detection} c="#4aa3ff" />
              <Meter label="Survival" v={prof.survival} c="var(--gold)" />
              <div className="mono" style={{ fontSize: 11, color: "var(--muted2)", marginTop: 4 }}>
                across {prof.games} House game(s)
              </div>
            </div>
          ) : (
            <p style={{ color: "var(--muted)", fontSize: 13 }}>
              No House games yet — play one to generate an objective skill profile and ELO.
            </p>
          )}

          <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)", margin: "18px 0 10px" }}>
            BODY MORPH · genome receipt
          </div>
          <div className="mono" style={{ fontSize: 11, color: "var(--muted)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <span>stature ×{(app.h / 1.7).toFixed(2)}</span>
            <span>build ×{app.width.toFixed(2)}</span>
            <span>head ×{app.headScale.toFixed(2)}</span>
            <span>fists ×{app.handScale.toFixed(2)}</span>
            <span>deviation gain ×{app.gain.toFixed(1)}</span>
            <span>tier {app.tier.name}</span>
          </div>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 22, display: "flex", gap: 10, justifyContent: "center" }}>
        <Link href="/arena" className="btn btn-primary" style={{ ["--ac" as string]: col }}>
          ▶ Fight in the Arena
        </Link>
        <Link href="/grounds" className="btn">
          See it in The Grounds
        </Link>
      </div>
    </main>
  );
}

function Stat({ n, l, c }: { n: number; l: string; c: string }) {
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, color: c }}>{n}</div>
      <div style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--muted2)" }}>{l}</div>
    </div>
  );
}

function Meter({ label, v, c }: { label: string; v: number; c: string }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
        <span>{label}</span>
        <span className="mono" style={{ color: "var(--muted2)" }}>
          {v}%
        </span>
      </div>
      <div style={{ height: 7, borderRadius: 5, background: "#241f33", overflow: "hidden" }}>
        <div style={{ width: `${v}%`, height: "100%", background: c, transition: "width .5s ease" }} />
      </div>
    </div>
  );
}
