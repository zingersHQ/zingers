"use client";
import Link from "next/link";
import { FORCES, FOUNDING_REGIONS, KEEPERS } from "@/lib/lore/canon";
import { FIRST_MIND_KEYS } from "@/lib/cards/assets";
import { ROSTER } from "@/lib/engine/roster";
import { CanonRenderTile } from "@/components/bible/canon-render-tile";
import { keeperKindForName } from "@/components/grounds/keeper-regalia";
import { RegionScene } from "@/components/lore/region-scene";
import { showcaseChampion, showcaseForForce, showcaseForKeeper } from "@/lib/render/showcase";

const FORCE_SLUG: Record<string, string> = {
  LOGIC: "lattice",
  CHAOS: "static",
  COMPOSURE: "stillness",
  RHETORIC: "chorus",
  CREATIVITY: "spark",
};

export function BibleGallery() {
  return (
    <>
      <Section title="The Five Forces" kicker="argument as physics · game renders">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
          {Object.values(FORCES).map((f) => {
            const slug = FORCE_SLUG[f.type];
            const { key, type, champion } = showcaseForForce(slug);
            return (
              <article key={f.type} className="panel" style={{ ["--ac" as string]: f.hex, overflow: "hidden", padding: 0 }}>
                <div style={{ aspectRatio: "1 / 1" }}>
                  <CanonRenderTile rosterKey={key} type={type} champion={champion} preset="force" colorHex={f.hex} label={f.name} />
                </div>
                <div style={{ padding: 13 }}>
                  <div style={{ color: f.hex, fontWeight: 800 }}>{f.sigil} {f.name}</div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--muted2)", marginTop: 2, fontStyle: "italic" }}>the {f.inWorld.replace(/^The /, "")}</div>
                  <p style={{ color: "var(--muted)", fontSize: 12, lineHeight: 1.45, margin: "8px 0 0" }}>
                    {f.element}; argues by {f.argues}.
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </Section>

      <Section title="The Eight First Minds" kicker="starter roster · evolving bodies">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {FIRST_MIND_KEYS.map((key) => {
            const r = ROSTER[key];
            const force = FORCES[r.type];
            const { type, champion } = showcaseChampion(key);
            return (
              <Link key={key} href={`/champion/${key}`} className="panel" style={{ ["--ac" as string]: force.hex, overflow: "hidden", padding: 0, textDecoration: "none", color: "inherit" }}>
                <div style={{ aspectRatio: "4 / 5" }}>
                  <CanonRenderTile rosterKey={key} type={type} champion={champion} preset="portrait" label={`${key} portrait`} />
                </div>
                <div style={{ padding: 13 }}>
                  <div style={{ fontWeight: 800 }}>{key}</div>
                  <div className="mono" style={{ fontSize: 10, color: force.hex }}>{force.name} · {r.type}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </Section>

      <Section title="The Founding Regions" kicker="biome-lit game renders">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
          {FOUNDING_REGIONS.map((region) => {
            const force = FORCES[region.bias];
            return (
              <article key={region.id} className="panel" style={{ ["--ac" as string]: force.hex, overflow: "hidden", padding: 0 }}>
                <div style={{ position: "relative", aspectRatio: "16 / 9" }}>
                  <RegionScene regionId={region.id} />
                </div>
                <div style={{ padding: 14 }}>
                  <div style={{ fontWeight: 800 }}>{region.name}</div>
                  <div className="mono" style={{ fontSize: 10, color: force.hex }}>{region.arena} · {force.name}</div>
                  <p style={{ color: "var(--muted)", fontSize: 12, lineHeight: 1.45, margin: "8px 0 0" }}>{region.blurb}</p>
                </div>
              </article>
            );
          })}
        </div>
      </Section>

      <Section title="The Keepers" kicker="campaign spine · cipher-words">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {KEEPERS.map((keeper) => {
            const { key, type, champion, accentHex } = showcaseForKeeper(keeper.name);
            return (
              <article key={keeper.name} className="panel" style={{ ["--ac" as string]: keeper.hex, overflow: "hidden", padding: 0 }}>
                <div style={{ aspectRatio: "4 / 5" }}>
                  <CanonRenderTile rosterKey={key} type={type} champion={champion} preset="keeper" colorHex={accentHex} label={`${keeper.name}, ${keeper.title}`} keeper={keeperKindForName(keeper.name)} />
                </div>
                <div style={{ padding: 13 }}>
                  <div style={{ fontWeight: 800 }}>{keeper.name}</div>
                  <div className="mono" style={{ fontSize: 10, color: keeper.hex }}>LEVEL {keeper.level} · {keeper.title}</div>
                </div>
              </article>
            );
          })}
        </div>
      </Section>
    </>
  );
}

function Section({ title, kicker, children }: { title: string; kicker: string; children: React.ReactNode }) {
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
