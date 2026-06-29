"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { CatalogueAgent } from "@/lib/cards/catalogue";
import { ANIM_MODES, type CreatureAnimMode } from "@/lib/render/animations";
import { TYPE_COLOR } from "@/lib/evolve/progression";
import type { CreatureType } from "@/lib/types";
import { showcaseChampion } from "@/lib/render/showcase";

const AgentShowcase = dynamic(() => import("@/components/intro/agent-showcase"), {
  ssr: false,
  loading: () => <LabPlaceholder label="loading…" />,
});

const BATTLE_RIVAL = showcaseChampion("BASTION");

function LabPlaceholder({ label }: { label: string }) {
  return (
    <div
      className="mono"
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        color: "var(--muted2)",
        fontSize: 10,
        letterSpacing: 1,
      }}
    >
      {label}
    </div>
  );
}

/** Lazy-mount each preview tile — keeps WebGL contexts bounded. */
function LabTile({
  agent,
  mode,
  label,
  blurb,
}: {
  agent: CatalogueAgent;
  mode: CreatureAnimMode;
  label: string;
  blurb: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);
  const accent = TYPE_COLOR[agent.card.type];

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    let off: ReturnType<typeof setTimeout> | undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          if (off) clearTimeout(off);
          setLive(true);
        } else {
          off = setTimeout(() => setLive(false), 800);
        }
      },
      { rootMargin: "120px 0px" },
    );
    io.observe(el);
    return () => {
      if (off) clearTimeout(off);
      io.disconnect();
    };
  }, []);

  const duel = mode === "battle";

  return (
    <div
      ref={rootRef}
      className="panel"
      style={{
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        border: `1px solid color-mix(in srgb, ${accent} 28%, var(--line))`,
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: duel ? "16 / 11" : "4 / 5",
          background: `radial-gradient(120% 120% at 50% 18%, color-mix(in srgb, ${accent} 20%, #0a0812), #0a0812)`,
        }}
      >
        {live ? (
          <AgentShowcase
            champion={agent.champion}
            type={agent.card.type as CreatureType}
            scale={duel ? 0.42 : 0.72}
            animMode={mode}
            bare
            rival={duel ? { champion: BATTLE_RIVAL.champion, type: BATTLE_RIVAL.type } : undefined}
          />
        ) : (
          <LabPlaceholder label="scroll near" />
        )}
      </div>
      <div style={{ padding: "12px 14px 14px" }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: 1.4, color: accent, marginBottom: 4 }}>
          {label.toUpperCase()}
        </div>
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.45, color: "var(--muted)" }}>{blurb}</p>
      </div>
    </div>
  );
}

/** Side-by-side previews of every creature animation mode — review lab for tuning. */
export function AnimationLab({ sample }: { sample: CatalogueAgent }) {
  return (
    <section style={{ margin: "28px 0 34px" }}>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 6px" }}>Animation lab</h2>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: "var(--muted)", maxWidth: 720 }}>
          Every motion state the game uses — standing, breathing, bounce, gestures, and battle rhythm — rendered
          live on <strong style={{ color: "var(--ink)" }}>{sample.card.name}</strong>. Scroll to mount each preview;
          tune timings in <code className="mono" style={{ fontSize: 11 }}>lib/render/animations.ts</code>.
        </p>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 14,
        }}
      >
        {ANIM_MODES.map(({ mode, label, blurb }) => (
          <LabTile key={mode} agent={sample} mode={mode} label={label} blurb={blurb} />
        ))}
      </div>
    </section>
  );
}
