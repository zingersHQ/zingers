"use client";
import Link from "next/link";
import type { CreatureType } from "@/lib/types";
import { FORCES, FOUNDING_REGIONS, WHEEL } from "@/lib/lore/canon";
import { FIRST_MIND_KEYS } from "@/lib/cards/assets";
import { BAKED_MIND_KEYS } from "@/lib/minds/baked";
import { ROSTER } from "@/lib/engine/roster";
import { CanonRenderTile } from "@/components/bible/canon-render-tile";
import { GalleryPager } from "@/components/bible/gallery-pager";
import { RegionScene } from "@/components/lore/region-scene";
import { showcaseChampion, showcaseForForce } from "@/lib/render/showcase";

/** Deal minds round-robin by Force so each desktop page of 5 is one of each Clan. */
function interleaveByForce(keys: readonly string[]): string[] {
  const buckets = Object.fromEntries(WHEEL.map((f) => [f, [] as string[]])) as Record<CreatureType, string[]>;
  for (const k of keys) {
    const t = ROSTER[k]?.type;
    if (t && buckets[t]) buckets[t].push(k);
  }
  const out: string[] = [];
  let guard = 0;
  while (guard++ < keys.length + 5) {
    let took = false;
    for (const f of WHEEL) {
      const next = buckets[f].shift();
      if (next) {
        out.push(next);
        took = true;
      }
    }
    if (!took) break;
  }
  return out;
}

const DEX_LATER = interleaveByForce(BAKED_MIND_KEYS.filter((k) => ROSTER[k]));

const FORCE_SLUG: Record<string, string> = {
  LOGIC: "lattice",
  CHAOS: "static",
  COMPOSURE: "stillness",
  RHETORIC: "chorus",
  CREATIVITY: "spark",
};

export function BibleGallery() {
  const forceTiles = Object.values(FORCES).map((f) => {
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
  });

  const firstTiles = FIRST_MIND_KEYS.map((key) => {
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
  });

  const dexTiles = DEX_LATER.map((key) => {
    const r = ROSTER[key];
    const force = FORCES[r.type];
    const { type, champion } = showcaseChampion(key);
    return (
      <Link key={key} href={`/champion/${key}`} className="panel" style={{ ["--ac" as string]: force.hex, overflow: "hidden", padding: 0, textDecoration: "none", color: "inherit" }}>
        <div style={{ aspectRatio: "1 / 1" }}>
          <CanonRenderTile rosterKey={key} type={type} champion={champion} preset="portrait" label={`${key} portrait`} />
        </div>
        <div style={{ padding: "10px 12px 12px" }}>
          <div style={{ fontWeight: 800, fontSize: 14 }}>{key}</div>
          <div className="mono" style={{ fontSize: 9.5, color: force.hex }}>{force.name}</div>
        </div>
      </Link>
    );
  });

  const regionTiles = FOUNDING_REGIONS.map((region) => {
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
  });

  return (
    <>
      <Section title="The Five Forces" kicker="argument as physics · game renders">
        <GalleryPager label="forces" items={forceTiles} minCol={180} />
      </Section>

      <Section title="The Eight First Minds" kicker="archetypes · every later mind echoes one">
        <div className="bible-first-grid">{firstTiles}</div>
      </Section>

      {DEX_LATER.length > 0 && (
        <Section title="The Dex" kicker={`${DEX_LATER.length} later minds · lineage echoes · evolving bodies`}>
          <GalleryPager label="dex" items={dexTiles} minCol={180} />
        </Section>
      )}

      <Section title="The Founding Regions" kicker="biome-lit game renders">
        <GalleryPager label="regions" items={regionTiles} minCol={280} />
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
