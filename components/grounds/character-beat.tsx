"use client";
import { useCallback, useEffect, useState } from "react";
import type { Champion, CreatureType } from "@/lib/types";
import { ChampionAvatar } from "@/components/champion-avatar";
import { primeCreature, speakCreature, speakCreatureType } from "@/lib/creature-voice";
import type { BeatScript } from "@/lib/lore/character-beats";
import { ONBOARDING_BG } from "@/lib/iconography";
import { TYPE_COLOR } from "@/lib/evolve/progression";

export function CharacterBeat({
  script,
  accent,
  voice,
  keeperLevel,
  championType,
  portrait,
  onComplete,
}: {
  script: BeatScript;
  accent: string;
  /** who vocalises the lines */
  voice: "keeper" | "champion";
  keeperLevel?: number;
  championType?: CreatureType;
  portrait?: { key: string; type: CreatureType; champion: Champion; name: string };
  onComplete: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const line = script.lines[idx];
  const last = idx >= script.lines.length - 1;

  const speak = useCallback(
    (text: string) => {
      if (voice === "keeper" && keeperLevel) speakCreature(text, keeperLevel);
      else if (championType) speakCreatureType(text, championType);
    },
    [voice, keeperLevel, championType],
  );

  useEffect(() => {
    primeCreature();
    speak(line.text);
  }, [idx, line.text, speak]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onComplete();
        return;
      }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (last) onComplete();
        else setIdx((i) => i + 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [last, onComplete]);

  const advance = () => {
    if (last) onComplete();
    else setIdx((i) => i + 1);
  };

  const col = portrait ? TYPE_COLOR[portrait.type] : accent;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 92,
        background: ONBOARDING_BG,
        display: "grid",
        placeItems: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(120% 90% at 50% 30%, color-mix(in srgb, ${accent} 18%, transparent), #050409 72%)`,
          pointerEvents: "none",
        }}
      />

      <button
        type="button"
        onClick={onComplete}
        className="mono"
        style={{
          position: "absolute",
          top: 16,
          right: 18,
          zIndex: 2,
          background: "none",
          border: "none",
          color: "var(--muted2)",
          fontSize: 11,
          letterSpacing: 1,
          cursor: "pointer",
        }}
      >
        SKIP
      </button>

      <div style={{ position: "relative", width: "min(520px, 94vw)", textAlign: "center" }}>
        {script.kicker && (
          <div className="mono" style={{ fontSize: 10, letterSpacing: 2.5, color: accent, marginBottom: 14 }}>
            {script.kicker}
          </div>
        )}

        {portrait && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
            <div
              style={{
                padding: 8,
                borderRadius: 20,
                border: `2px solid ${col}`,
                boxShadow: `0 0 48px -12px ${col}`,
                background: `color-mix(in srgb, ${col} 12%, #0c0b12)`,
              }}
            >
              <ChampionAvatar ckey={portrait.key} type={portrait.type} champion={portrait.champion} size={120} />
            </div>
          </div>
        )}

        <div style={{ fontSize: 13, fontWeight: 700, color: accent, letterSpacing: 0.5 }}>{line.speaker}</div>
        {line.role && (
          <div className="mono" style={{ fontSize: 9, letterSpacing: 1.2, color: "var(--muted2)", marginTop: 2 }}>
            {line.role.toUpperCase()}
          </div>
        )}

        <p
          key={idx}
          className="fadein"
          style={{
            fontSize: 22,
            fontWeight: 600,
            lineHeight: 1.45,
            margin: "18px 0 0",
            color: "var(--ink)",
            fontStyle: "italic",
          }}
        >
          &ldquo;{line.text}&rdquo;
        </p>

        <div className="mono" style={{ fontSize: 9, color: "var(--muted2)", marginTop: 16 }}>
          {idx + 1} / {script.lines.length}
        </div>

        <button
          type="button"
          className="btn btn-primary pop"
          onClick={advance}
          style={{ ["--ac" as string]: accent, marginTop: 28, padding: "12px 28px", fontSize: 15 }}
        >
          {last ? "Continue" : "Next"}
        </button>
      </div>
    </div>
  );
}
