import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { BRAND, pageTitle } from "@/lib/brand";
import { FORCES, FOUNDING_REGIONS, KEEPERS } from "@/lib/lore/canon";
import { currentSeason } from "@/lib/lore/season";
import { FIRST_MIND_KEYS, portraitOf } from "@/lib/cards/assets";
import { forceImage, keeperImage, regionImage } from "@/lib/lore/assets";
import { ROSTER } from "@/lib/engine/roster";
import { SeasonBanner } from "@/components/lore/season-banner";

export const metadata = {
  title: pageTitle("The Zingers Bible"),
  description: "The public encyclopedia for Zingers: forces, minds, regions, Keepers, seasons, and the Long Vault.",
};

const FORCE_SLUG: Record<string, string> = {
  LOGIC: "lattice",
  CHAOS: "static",
  COMPOSURE: "stillness",
  RHETORIC: "chorus",
  CREATIVITY: "spark",
};

export default function BiblePage() {
  const season = currentSeason();

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "30px 22px 100px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap", marginBottom: 8 }}>
        <h1 style={{ fontSize: 34, fontWeight: 800, margin: 0 }}>The Zingers Bible</h1>
        <span className="mono" style={{ color: "var(--muted2)", fontSize: 12, letterSpacing: 1.5 }}>
          {BRAND.siteTech.replace("https://", "").toUpperCase()} · PUBLIC CANON
        </span>
      </div>
      <p style={{ maxWidth: 780, color: "var(--muted)", fontSize: 15, lineHeight: 1.65, margin: "0 0 22px" }}>
        The canon of the Zingers universe: the Hum, the Five Forces, the First Minds, the Long Vault, the Keepers,
        the regions, and the living Chronicle. This page is the public encyclopedia view; the markdown source lives
        in <span className="mono">docs/bible/</span>.
      </p>

      <div style={{ marginBottom: 26 }}>
        <SeasonBanner />
      </div>

      <Section title="The Five Forces" kicker="argument as physics">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
          {Object.values(FORCES).map((f) => (
            <article key={f.type} className="panel" style={{ ["--ac" as string]: f.hex, overflow: "hidden", padding: 0 }}>
              <div style={{ position: "relative", aspectRatio: "1 / 1", background: "#0a0812" }}>
                <Image src={forceImage(FORCE_SLUG[f.type])} alt={f.inWorld} fill sizes="220px" style={{ objectFit: "cover" }} />
              </div>
              <div style={{ padding: 13 }}>
                <div style={{ color: f.hex, fontWeight: 800 }}>{f.sigil} {f.inWorld}</div>
                <div className="mono" style={{ fontSize: 10, color: "var(--muted2)", marginTop: 2 }}>{f.type}</div>
                <p style={{ color: "var(--muted)", fontSize: 12, lineHeight: 1.45, margin: "8px 0 0" }}>
                  {f.element}; argues by {f.argues}.
                </p>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section title="The Six First Minds" kicker="starter roster · premium card portraits">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {FIRST_MIND_KEYS.map((key) => {
            const r = ROSTER[key];
            const force = FORCES[r.type];
            return (
              <Link key={key} href={`/champion/${key}`} className="panel" style={{ ["--ac" as string]: force.hex, overflow: "hidden", padding: 0, textDecoration: "none", color: "inherit" }}>
                <div style={{ position: "relative", aspectRatio: "4 / 5", background: "#0a0812" }}>
                  <Image src={portraitOf(key)} alt={`${key} portrait`} fill sizes="260px" style={{ objectFit: "cover" }} />
                </div>
                <div style={{ padding: 13 }}>
                  <div style={{ fontWeight: 800 }}>{key}</div>
                  <div className="mono" style={{ fontSize: 10, color: force.hex }}>{force.inWorld} · {r.type}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </Section>

      <Section title="The Founding Regions" kicker="the Grounds grows as the Vault opens">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
          {FOUNDING_REGIONS.map((region) => {
            const force = FORCES[region.bias];
            return (
              <article key={region.id} className="panel" style={{ ["--ac" as string]: force.hex, overflow: "hidden", padding: 0 }}>
                <div style={{ position: "relative", aspectRatio: "16 / 9", background: "#0a0812" }}>
                  <Image src={regionImage(region.id)} alt={region.name} fill sizes="360px" style={{ objectFit: "cover" }} />
                </div>
                <div style={{ padding: 14 }}>
                  <div style={{ fontWeight: 800 }}>{region.name}</div>
                  <div className="mono" style={{ fontSize: 10, color: force.hex }}>{region.arena} · {force.inWorld}</div>
                  <p style={{ color: "var(--muted)", fontSize: 12, lineHeight: 1.45, margin: "8px 0 0" }}>{region.blurb}</p>
                </div>
              </article>
            );
          })}
        </div>
      </Section>

      <Section title="The Keepers" kicker="campaign spine · five cipher-words">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {KEEPERS.map((keeper) => (
            <article key={keeper.name} className="panel" style={{ ["--ac" as string]: keeper.hex, overflow: "hidden", padding: 0 }}>
              <div style={{ position: "relative", aspectRatio: "4 / 5", background: "#0a0812" }}>
                <Image src={keeperImage(keeper.name)} alt={`${keeper.name}, ${keeper.title}`} fill sizes="260px" style={{ objectFit: "cover" }} />
              </div>
              <div style={{ padding: 13 }}>
                <div style={{ fontWeight: 800 }}>{keeper.name}</div>
                <div className="mono" style={{ fontSize: 10, color: keeper.hex }}>LEVEL {keeper.level} · {keeper.title}</div>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Current Chronicle State" kicker={`season ${season.n}`}>
        <div className="panel" style={{ padding: 18 }}>
          <p style={{ color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>{season.arc.blurb}</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            {season.topics.map((topic) => (
              <span key={topic} style={{ border: "1px solid var(--line)", borderRadius: 999, padding: "5px 9px", fontSize: 12, color: "var(--muted)" }}>
                {topic}
              </span>
            ))}
          </div>
        </div>
      </Section>
    </main>
  );
}

function Section({ title, kicker, children }: { title: string; kicker: string; children: ReactNode }) {
  return (
    <section style={{ marginTop: 30 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{title}</h2>
        <span className="mono" style={{ fontSize: 10, color: "var(--muted2)", letterSpacing: 1.5 }}>{kicker.toUpperCase()}</span>
      </div>
      {children}
    </section>
  );
}
