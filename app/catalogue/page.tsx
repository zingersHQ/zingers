"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { catalogue, type CatalogueAgent } from "@/lib/cards/catalogue";
import { ChampionCardFrame } from "@/components/collection/card-frame";
import { AnimationLab } from "@/components/catalogue/animation-lab";
import { FORCES, FORCE_MOTTO } from "@/lib/lore/canon";
import { TIERS } from "@/lib/evolve/progression";
import type { CreatureType } from "@/lib/types";

const TIER_ORDER = TIERS.map((t) => t.name); // ROOKIE → LEGEND
const FORCE_KEYS = Object.keys(FORCES) as CreatureType[];

type ForceFilter = CreatureType | "ALL";
type TierFilter = string | "ALL";

export default function CataloguePage() {
  const agents = useMemo(() => catalogue(), []);
  const labSample = agents.find((a) => a.id === "axiom") ?? agents[0];
  const [force, setForce] = useState<ForceFilter>("ALL");
  const [tier, setTier] = useState<TierFilter>("ALL");
  const [clan, setClan] = useState<ForceFilter>("ALL");

  const shown = agents.filter(
    (a) =>
      (force === "ALL" || a.card.type === force) &&
      (tier === "ALL" || a.card.tier === tier) &&
      (clan === "ALL" || a.clan === clan),
  );

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "26px 22px 100px" }}>
      <div style={{ marginBottom: 6, display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 30, fontWeight: 700, margin: 0 }}>The Catalogue</h1>
        <span className="mono" style={{ color: "var(--muted2)", fontSize: 12, letterSpacing: 1.5 }}>
          20 AGENTS, EMULATED FROM THE REAL SYSTEMS
        </span>
      </div>
      <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, maxWidth: 760, margin: "0 0 18px" }}>
        Nothing below is hand-drawn. Each agent is <em>grown</em>: a blank mind replays the actual
        battle-evolution model over a seeded career, then is read back through the same pipeline the live game
        uses — Force, tier, sigils, doctrine, rarity and the genome→body portrait. Different{" "}
        <strong>levels of evolution</strong> are different careers; different <strong>types</strong> are the five
        real Forces; different <strong>clans</strong> are real Force pledges. The only authored input is each
        agent&apos;s starting intent.
      </p>

      <DimensionLegend agents={agents} />

      <AnimationLab sample={labSample} />

      <div style={{ display: "flex", flexDirection: "column", gap: 10, margin: "20px 0 22px" }}>
        <FilterRow label="TYPE">
          <Chip on={force === "ALL"} onClick={() => setForce("ALL")} label="All" />
          {FORCE_KEYS.map((f) => (
            <Chip key={f} on={force === f} onClick={() => setForce(f)} label={FORCES[f].name} hex={FORCES[f].hex} sigil={FORCES[f].sigil} />
          ))}
        </FilterRow>
        <FilterRow label="TIER">
          <Chip on={tier === "ALL"} onClick={() => setTier("ALL")} label="All" />
          {TIER_ORDER.map((t) => (
            <Chip key={t} on={tier === t} onClick={() => setTier(t)} label={t} />
          ))}
        </FilterRow>
        <FilterRow label="CLAN">
          <Chip on={clan === "ALL"} onClick={() => setClan("ALL")} label="All" />
          {FORCE_KEYS.map((f) => (
            <Chip key={f} on={clan === f} onClick={() => setClan(f)} label={FORCES[f].name} hex={FORCES[f].hex} sigil={FORCES[f].sigil} />
          ))}
        </FilterRow>
      </div>

      <div className="mono" style={{ fontSize: 11, color: "var(--muted2)", marginBottom: 16, letterSpacing: 1 }}>
        SHOWING {shown.length} / {agents.length}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 18 }}>
        {shown.map((a) => (
          <Link key={a.id} href={`/champion/${a.lineage}`} style={{ textDecoration: "none", color: "inherit" }}>
            <ChampionCardFrame card={a.card} champion={a.champion} compact footer={<ClanPledge agent={a} />} />
          </Link>
        ))}
      </div>
    </main>
  );
}

function ClanPledge({ agent }: { agent: CatalogueAgent }) {
  const f = FORCES[agent.clan];
  const isDescendant = agent.lineage.toUpperCase() !== agent.card.name.toUpperCase();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, borderTop: "1px solid var(--line)", paddingTop: 10, marginTop: 2 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span className="mono" style={{ fontSize: 9, letterSpacing: 1, color: "var(--muted2)" }}>
          PLEDGED CLAN
        </span>
        <span className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: f.hex }}>
          <span style={{ fontSize: 13 }}>{f.sigil}</span>
          {f.name.toUpperCase()}
        </span>
      </div>
      <div className="mono" style={{ fontSize: 10, color: "var(--muted)", fontStyle: "italic" }}>
        “{FORCE_MOTTO[agent.clan]}”
      </div>
      {isDescendant && (
        <div className="mono" style={{ fontSize: 9, letterSpacing: 1, color: "var(--muted2)" }}>
          ECHOES {agent.lineage}
        </div>
      )}
    </div>
  );
}

function DimensionLegend({ agents }: { agents: CatalogueAgent[] }) {
  const types = new Set(agents.map((a) => a.card.type)).size;
  const tiers = new Set(agents.map((a) => a.card.tier)).size;
  const clans = new Set(agents.map((a) => a.clan)).size;
  const minds = new Set(agents.map((a) => a.lineage)).size;
  const items: [string, string][] = [
    [String(types), "Forces / types"],
    [String(tiers), "evolution tiers"],
    [String(clans), "clan pledges"],
    [String(minds), "First-Mind lineages"],
  ];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      {items.map(([n, label]) => (
        <div key={label} className="panel" style={{ padding: "8px 14px", display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: "var(--gold)" }}>{n}</span>
          <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <span className="mono" style={{ fontSize: 10, letterSpacing: 1, color: "var(--muted2)", width: 44 }}>{label}</span>
      {children}
    </div>
  );
}

function Chip({ on, onClick, label, hex, sigil }: { on: boolean; onClick: () => void; label: string; hex?: string; sigil?: string }) {
  const ac = hex ?? "var(--accent)";
  return (
    <button
      type="button"
      onClick={onClick}
      className="mono"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11,
        letterSpacing: 0.5,
        padding: "5px 11px",
        borderRadius: 8,
        cursor: "pointer",
        border: `1px solid ${on ? ac : "var(--line2)"}`,
        color: on ? (hex ? ac : "var(--ink)") : "var(--muted)",
        background: on ? `color-mix(in srgb, ${ac} 16%, transparent)` : "transparent",
      }}
    >
      {sigil && <span style={{ fontSize: 12 }}>{sigil}</span>}
      {label}
    </button>
  );
}
