import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { currentSeason, softReset } from "@/lib/lore/season";
import { FORCES } from "@/lib/lore/canon";
import { regionImage } from "@/lib/lore/assets";

export function SeasonBanner({ compact = false }: { compact?: boolean }) {
  const season = currentSeason();
  const force = FORCES[season.biasForce];
  const sampleOld = 1400;
  const sampleNew = softReset(sampleOld);

  return (
    <section
      className="panel"
      style={{
        ["--ac" as string]: force.hex,
        position: "relative",
        overflow: "hidden",
        padding: compact ? 14 : 18,
        display: "grid",
        gridTemplateColumns: compact ? "1fr" : "minmax(180px, 280px) minmax(0, 1fr)",
        gap: compact ? 12 : 18,
        alignItems: "stretch",
      }}
    >
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 80% 20%, ${force.hex}22, transparent 42%)`, pointerEvents: "none" }} />
      {!compact && (
        <div style={{ position: "relative", minHeight: 160, borderRadius: 14, overflow: "hidden", border: `1px solid ${force.hex}55`, background: "#0a0812" }}>
          <Image src={regionImage(season.region.id)} alt={`${season.region.name} season region`} fill sizes="280px" style={{ objectFit: "cover" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 45%, rgba(8,6,16,.88) 100%)" }} />
          <div className="mono" style={{ position: "absolute", left: 10, bottom: 10, fontSize: 10, letterSpacing: 1.5, color: force.hex }}>
            {season.region.name.toUpperCase()}
          </div>
        </div>
      )}
      <div style={{ position: "relative", minWidth: 0 }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: 2, color: force.hex, marginBottom: 8 }}>
          LIVE CHRONICLE · SEASON {season.n}
        </div>
        <h2 style={{ fontSize: compact ? 20 : 28, lineHeight: 1.05, margin: 0 }}>{season.arc.title}</h2>
        <p style={{ color: "var(--muted)", fontSize: compact ? 12 : 14, lineHeight: 1.55, margin: "10px 0 0" }}>{season.arc.blurb}</p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 13 }}>
          <Chip color={force.hex}>{force.sigil} {force.inWorld}</Chip>
          <Chip color="var(--gold)">Featured: {season.featured.name}</Chip>
          <Chip color="var(--muted2)">Soft reset: {sampleOld} → {sampleNew}</Chip>
        </div>

        {!compact && (
          <>
            <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted2)", marginTop: 16, marginBottom: 8 }}>
              SEASON TOPICS
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {season.topics.slice(0, 6).map((t) => (
                <span key={t} style={{ border: "1px solid var(--line)", borderRadius: 999, padding: "5px 9px", fontSize: 12, color: "var(--muted)" }}>
                  {t}
                </span>
              ))}
            </div>
            <Link href="/collection" className="mono" style={{ display: "inline-block", marginTop: 15, fontSize: 11, color: force.hex, textDecoration: "none" }}>
              View the minds shaped by the Chronicle →
            </Link>
          </>
        )}
      </div>
    </section>
  );
}

function Chip({ children, color }: { children: ReactNode; color: string }) {
  return (
    <span className="mono" style={{ fontSize: 10, color, border: `1px solid ${color}`, borderRadius: 7, padding: "4px 7px", background: "rgba(8,6,16,.35)" }}>
      {children}
    </span>
  );
}
