import type { ReactNode } from "react";
import { BRAND, pageTitle } from "@/lib/brand";
import { orgCanonical } from "@/lib/org/hosts";
import { currentSeason } from "@/lib/lore/season";
import { SeasonBanner } from "@/components/lore/season-banner";
import { BibleGallery } from "@/components/bible/bible-gallery";

export const metadata = {
  title: pageTitle("Visual Gallery"),
  description: "Live game renders of Zingers forces, minds, regions, and Keepers. Canon docs live on zingers.org.",
};

const DOC_LINKS = [
  { slug: "bible", label: "Bible index" },
  { slug: "bible/forces", label: "Forces" },
  { slug: "bible/champions", label: "Champions" },
  { slug: "bible/regions", label: "Regions" },
  { slug: "bible/keepers", label: "Keepers" },
  { slug: "bible/ascent", label: "Flight" },
  { slug: "bible/glossary", label: "Glossary" },
] as const;

export default function BiblePage() {
  const season = currentSeason();

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "30px 22px 100px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap", marginBottom: 8 }}>
        <h1 style={{ fontSize: 34, fontWeight: 800, margin: 0 }}>Visual Gallery</h1>
        <span className="mono" style={{ color: "var(--muted2)", fontSize: 12, letterSpacing: 1.5 }}>
          {BRAND.site.replace("https://", "").toUpperCase()} · GAME RENDERS
        </span>
      </div>
      <p style={{ maxWidth: 780, color: "var(--muted)", fontSize: 15, lineHeight: 1.65, margin: "0 0 14px" }}>
        Every portrait here is the real champion model, a deterministic function of a raised career, not generated
        art. The written canon lives on{" "}
        <a href={orgCanonical("bible")} target="_blank" rel="noopener noreferrer" className="org-prose__a" style={{ color: "var(--accent)" }}>
          zingers.org/bible
        </a>
        .
      </p>
      <nav
        aria-label="Canon docs"
        className="mono"
        style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", margin: "0 0 22px", fontSize: 12 }}
      >
        {DOC_LINKS.map((d) => (
          <a
            key={d.slug}
            href={orgCanonical(d.slug)}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent)" }}
          >
            {d.label}
          </a>
        ))}
      </nav>

      <div style={{ marginBottom: 26 }}>
        <SeasonBanner />
      </div>

      <BibleGallery />

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
