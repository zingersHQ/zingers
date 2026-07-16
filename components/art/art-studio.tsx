"use client";
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { WHEEL, FORCES } from "@/lib/lore/canon";
import { GOLD } from "@/lib/render/palette";
import { showcaseChampion } from "@/lib/render/showcase";
import type { CreatureType } from "@/lib/types";
import type { ArtSubject } from "@/components/art/art-viewport";

const ArtViewport = dynamic(
  () => import("@/components/art/art-viewport").then((m) => m.ArtViewport),
  { ssr: false },
);

const FORCE_MINDS: Record<CreatureType, string> = {
  LOGIC: "AXIOM",
  CHAOS: "GLITCH",
  COMPOSURE: "BASTION",
  RHETORIC: "VOX",
  CREATIVITY: "MUSE",
};

const BACKDROPS = [
  { id: "studio", label: "Studio", color: "#0a0813" },
  { id: "grey", label: "Neutral grey", color: "#6b6b6b" },
  { id: "white", label: "White", color: "#f2f2f2" },
  { id: "black", label: "Black", color: "#050505" },
  { id: "green", label: "Key green", color: "#00b140" },
] as const;

export function ArtStudio() {
  const [bg, setBg] = useState<string>(BACKDROPS[0].color);
  const [paused, setPaused] = useState(false);
  const [trainerForce, setTrainerForce] = useState<CreatureType | null>(null);
  const [duoClan, setDuoClan] = useState<CreatureType>("CREATIVITY");
  const [duoMind, setDuoMind] = useState<CreatureType>("LOGIC");

  const duoShow = useMemo(() => showcaseChampion(FORCE_MINDS[duoMind]), [duoMind]);

  const duoSubject: ArtSubject = useMemo(
    () => ({
      kind: "duo",
      force: duoClan,
      type: duoShow.type,
      champion: duoShow.champion,
    }),
    [duoClan, duoShow],
  );

  const soloTiles = useMemo(() => {
    type Tile = { id: string; label: string; accent: string; subject: ArtSubject };
    const trainer: Tile = {
      id: "trainer",
      label: "Trainer",
      accent: trainerForce ? FORCES[trainerForce].hex : GOLD,
      subject: { kind: "trainer", force: trainerForce },
    };
    const champs: Tile[] = WHEEL.map((type) => {
      const show = showcaseChampion(FORCE_MINDS[type]);
      return {
        id: type,
        label: `${FORCES[type].name} · ${show.key}`,
        accent: FORCES[type].hex,
        subject: { kind: "champion", type: show.type, champion: show.champion },
      };
    });
    return [trainer, ...champs];
  }, [trainerForce]);

  return (
    <main style={{ maxWidth: 1280, margin: "0 auto", padding: "22px 18px 80px" }}>
      {/* ── Hero: story + Trainer with champion ─────────────────────────── */}
      <section style={{ marginBottom: 28 }}>
        <p
          className="mono"
          style={{
            margin: "0 0 10px",
            fontSize: 11,
            letterSpacing: 1.6,
            color: FORCES[duoClan].hex,
          }}
        >
          TRAINER & CHAMPION
        </p>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 14px", lineHeight: 1.2 }}>
          A robot and the mind they raise
        </h1>
        <p
          style={{
            margin: "0 0 20px",
            color: "var(--muted)",
            fontSize: 16,
            lineHeight: 1.65,
            maxWidth: 720,
          }}
        >
          You are a Trainer — a silver robot who flies the Grounds with a jetpack strapped on. You
          don&apos;t fight. Beside you walks your Champion, a living mind you claimed, tuned, and swore
          into a Clan. Together you roam the floating regions: you lead, they follow; when you climb,
          they climb after you. This is the pair every story starts with.
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <label className="mono" style={{ fontSize: 11, letterSpacing: 1.2, color: "var(--muted2)" }}>
            CLAN
          </label>
          {WHEEL.map((t) => (
            <Chip key={t} on={duoClan === t} onClick={() => setDuoClan(t)} label={FORCES[t].name} hex={FORCES[t].hex} />
          ))}
          <span style={{ width: 1, height: 22, background: "var(--line2)", margin: "0 2px" }} />
          <label className="mono" style={{ fontSize: 11, letterSpacing: 1.2, color: "var(--muted2)" }}>
            CHAMPION
          </label>
          {WHEEL.map((t) => (
            <Chip
              key={t}
              on={duoMind === t}
              onClick={() => setDuoMind(t)}
              label={FORCE_MINDS[t]}
              hex={FORCES[t].hex}
            />
          ))}
        </div>

        <ArtViewport
          subject={duoSubject}
          bg={bg}
          paused={paused}
          label={`Trainer (${FORCES[duoClan].name}) + ${duoShow.key}`}
          accent={FORCES[duoClan].hex}
          wide
        />
      </section>

      {/* ── Studio controls + solo reference tiles ─────────────────────── */}
      <header style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 6px" }}>Solo references</h2>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 13, lineHeight: 1.5, maxWidth: 680 }}>
          Trainer alone and each Force style. Action buttons on every tile — walk, fly with jetpack,
          and the rest. Drag to orbit; freeze, then PNG for stills.
        </p>
      </header>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
          marginBottom: 16,
          padding: "12px 14px",
          borderRadius: 10,
          border: "1px solid var(--line)",
          background: "color-mix(in srgb, var(--panel) 80%, transparent)",
        }}
      >
        <label className="mono" style={{ fontSize: 11, letterSpacing: 1.2, color: "var(--muted2)" }}>
          BACKDROP
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {BACKDROPS.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setBg(b.color)}
              className="mono"
              style={{
                fontSize: 11,
                padding: "6px 10px",
                borderRadius: 7,
                border: `1px solid ${bg === b.color ? "var(--gold)" : "var(--line2)"}`,
                background: bg === b.color ? "color-mix(in srgb, var(--gold) 14%, transparent)" : "transparent",
                color: "inherit",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  background: b.color,
                  border: "1px solid rgba(255,255,255,.25)",
                }}
              />
              {b.label}
            </button>
          ))}
        </div>

        <span style={{ width: 1, height: 22, background: "var(--line2)", margin: "0 4px" }} />

        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: 0.8,
            padding: "7px 12px",
            borderRadius: 7,
            border: `1px solid ${paused ? "var(--gold)" : "var(--line2)"}`,
            background: paused ? "color-mix(in srgb, var(--gold) 16%, transparent)" : "transparent",
            color: "inherit",
            cursor: "pointer",
          }}
        >
          {paused ? "FROZEN" : "LIVE"}
        </button>

        <span style={{ width: 1, height: 22, background: "var(--line2)", margin: "0 4px" }} />

        <label className="mono" style={{ fontSize: 11, letterSpacing: 1.2, color: "var(--muted2)" }}>
          TRAINER CLAN
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <Chip on={trainerForce === null} onClick={() => setTrainerForce(null)} label="Neutral" hex={GOLD} />
          {WHEEL.map((t) => (
            <Chip
              key={t}
              on={trainerForce === t}
              onClick={() => setTrainerForce(t)}
              label={FORCES[t].name}
              hex={FORCES[t].hex}
            />
          ))}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        {soloTiles.map((t) => (
          <ArtViewport
            key={t.id}
            subject={t.subject}
            bg={bg}
            paused={paused}
            label={t.label}
            accent={t.accent}
          />
        ))}
      </div>
    </main>
  );
}

function Chip({
  on,
  onClick,
  label,
  hex,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
  hex: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mono"
      style={{
        fontSize: 11,
        padding: "6px 10px",
        borderRadius: 7,
        border: `1px solid ${on ? hex : "var(--line2)"}`,
        background: on ? `color-mix(in srgb, ${hex} 18%, transparent)` : "transparent",
        color: "inherit",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}
