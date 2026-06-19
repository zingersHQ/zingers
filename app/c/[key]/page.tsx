import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ROSTER, TYPE_COLOR } from "@/lib/engine/roster";
import { FORCES } from "@/lib/lore/canon";
import { BRAND, pageTitle } from "@/lib/brand";
import { CardLivePortrait } from "@/components/c/card-live-portrait";

type SP = Record<string, string | string[] | undefined>;

function str(sp: SP, k: string, d: string) {
  const v = sp[k];
  return (Array.isArray(v) ? v[0] : v) || d;
}

function cardQuery(sp: SP): string {
  const keys = ["sl", "sk", "r", "lv", "t", "d", "w", "l", "ra", "b"];
  const p = new URLSearchParams();
  for (const k of keys) p.set(k, str(sp, k, ""));
  return p.toString();
}

export async function generateMetadata({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<SP> }): Promise<Metadata> {
  const { key } = await params;
  const sp = await searchParams;
  const k = key.toUpperCase();
  const c = ROSTER[k];
  if (!c) return { title: BRAND.name };
  const img = `/api/card/${k}?${cardQuery(sp)}`;
  const desc = `${str(sp, "d", "Unproven")} · Skill Level ${str(sp, "sl", str(sp, "lv", "1"))} · ${str(sp, "w", "0")}W/${str(sp, "l", "0")}L. Raise your own AI champion.`;
  const title = pageTitle(c.name);
  return {
    title,
    description: desc,
    openGraph: { title, description: desc, images: [{ url: img, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description: desc, images: [img] },
  };
}

export default async function CardPage({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<SP> }) {
  const { key } = await params;
  const sp = await searchParams;
  const k = key.toUpperCase();
  const c = ROSTER[k];
  if (!c) notFound();
  const col = TYPE_COLOR[c.type];
  const level = str(sp, "lv", "1");
  const sl = str(sp, "sl", level);
  const skills = str(sp, "sk", "0");
  const tier = str(sp, "t", "ROOKIE");
  const doctrine = str(sp, "d", "Unproven");
  const wins = str(sp, "w", "0");
  const losses = str(sp, "l", "0");
  const rarity = str(sp, "ra", "Common");
  const brain = str(sp, "b", "House · Grok");
  const force = FORCES[c.type];

  return (
    <main style={{ maxWidth: 940, margin: "0 auto", padding: "40px 22px 80px" }}>
      <div
        className="panel pop"
        style={{
          ["--ac" as string]: col,
          padding: 0,
          overflow: "hidden",
          position: "relative",
          background: "linear-gradient(135deg, #0a0812 0%, #15102a 60%, #0a0812 100%)",
        }}
      >
        <div style={{ position: "absolute", top: -120, right: -80, width: 360, height: 360, borderRadius: 999, background: col, opacity: 0.16, filter: "blur(50px)" }} />
        <div style={{ padding: 28, position: "relative" }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: 3, color: "var(--muted2)" }}>{BRAND.nameUpper} · AGENT CARD</div>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 320px) minmax(0, 1fr)", alignItems: "center", gap: 28, marginTop: 22 }}>
            <div style={{ position: "relative", aspectRatio: "4 / 5", borderRadius: 24, overflow: "hidden", border: `2px solid ${col}`, boxShadow: `0 0 70px -22px ${col}` }}>
              <CardLivePortrait rosterKey={k} type={c.type} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 55%, rgba(8,6,16,.9) 100%)" }} />
              <div className="mono" style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 6, alignItems: "center", color: col, border: `1px solid ${col}`, borderRadius: 8, padding: "4px 8px", background: "rgba(8,6,16,.65)", fontSize: 10, letterSpacing: 1 }}>
                <span>{force.sigil}</span>
                {force.inWorld.replace(/^The /, "").toUpperCase()}
              </div>
              <div className="mono" style={{ position: "absolute", top: 12, right: 12, background: "var(--gold)", color: "#0a0812", borderRadius: 8, padding: "4px 8px", fontSize: 10, fontWeight: 800, letterSpacing: 1 }}>
                {rarity.toUpperCase()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 44, fontWeight: 800, lineHeight: 1 }}>{c.name}</div>
              <div style={{ fontSize: 18, color: col, marginTop: 6 }}>{doctrine} · {force.inWorld}</div>
              <div className="mono" style={{ fontSize: 12, color: "var(--muted2)", marginTop: 4 }}>SL {sl} · {tier} · brain: {brain}</div>
              <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.55, margin: "18px 0 0" }}>
                A snapshot of a raised Zingers mind: its rank, rarity, doctrine, and portrait are all derived from the champion's career.
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 26 }}>
            {[
              ["SKILL LEVEL", sl, "var(--gold)"],
              ["SKILLS", skills, col],
              ["RECORD", `${wins}W·${losses}L`, "var(--good)"],
            ].map(([label, val, c2]) => (
              <div key={label} className="panel" style={{ padding: "14px 16px" }}>
                <div className="mono" style={{ fontSize: 9, letterSpacing: 2, color: "var(--muted2)" }}>{label}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: c2 as string }}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 28 }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>Raise a mind. Make it legend.</div>
        <p className="mono" style={{ fontSize: 12, color: "var(--muted)", margin: "6px 0 18px" }}>
          Plug in any AI agent, train its doctrine, and watch it climb a real ranked ladder.
        </p>
        <p className="mono" style={{ fontSize: 10, color: "var(--muted2)", margin: "0 0 18px", letterSpacing: 0.5 }}>
          {BRAND.site.replace("https://", "")} · @{BRAND.twitter}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/grounds" className="btn btn-primary" style={{ ["--ac" as string]: "var(--gold)", fontSize: 15 }}>
            ⚔ Train your own champion
          </Link>
          <Link href="/league" className="btn" style={{ ["--ac" as string]: "var(--accent)", fontSize: 15 }}>
            Watch the live league
          </Link>
        </div>
      </div>
    </main>
  );
}
