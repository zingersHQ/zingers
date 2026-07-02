"use client";
import { useCallback, useEffect, useState } from "react";
import type { Champion, CreatureType } from "@/lib/types";
import { ChampionAvatar } from "@/components/champion-avatar";
import { primeCreature, speakCreature, speakCreatureType } from "@/lib/creature-voice";
import type { BeatScript } from "@/lib/lore/character-beats";
import { ONBOARDING_BG } from "@/lib/iconography";
import { TYPE_COLOR } from "@/lib/evolve/progression";

// A directed narrative beat — not a static slide. The live 3D portrait rises and
// floats, the frame is letterboxed for cinema, each new line pulses a glow and
// types itself in, and a slow parallax field drifts behind. One presentation
// shared by every story moment: champion wakes, Keeper performances, the rival's
// taunts, and the season-turn Chronicle.
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
  const [typed, setTyped] = useState("");
  const line = script.lines[idx];
  const last = idx >= script.lines.length - 1;
  const done = typed.length >= line.text.length;

  const speak = useCallback(
    (text: string, speaker: string) => {
      if (speaker === "Reader" || speaker === "The Reader") return;
      if (voice === "keeper" && keeperLevel) speakCreature(text, keeperLevel);
      else if (championType) speakCreatureType(text, championType);
    },
    [voice, keeperLevel, championType],
  );

  useEffect(() => {
    primeCreature();
    speak(line.text, line.speaker);
  }, [idx, line.text, line.speaker, speak]);

  // typewriter reveal — each line types itself in, in sync with the voice
  useEffect(() => {
    setTyped("");
    const full = line.text;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setTyped(full.slice(0, i));
      if (i >= full.length) clearInterval(id);
    }, 17);
    return () => clearInterval(id);
  }, [idx, line.text]);

  const advance = useCallback(() => {
    if (last) onComplete();
    else setIdx((i) => i + 1);
  }, [last, onComplete]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onComplete();
        return;
      }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, onComplete]);

  const col = portrait ? TYPE_COLOR[portrait.type] : accent;

  return (
    <div
      className="beat-root"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 92,
        background: ONBOARDING_BG,
        display: "grid",
        placeItems: "center",
        padding: 20,
        overflow: "hidden",
      }}
    >
      <BeatStyles />

      {/* drifting parallax field */}
      <div className="beat-stars" style={{ ["--ac" as string]: accent } as React.CSSProperties} aria-hidden />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(120% 90% at 50% 32%, color-mix(in srgb, ${accent} 22%, transparent), #050409 72%)`,
          pointerEvents: "none",
        }}
      />

      {/* cinematic letterbox */}
      <div className="beat-bar beat-bar--top" aria-hidden />
      <div className="beat-bar beat-bar--bottom" aria-hidden />

      <button
        type="button"
        onClick={onComplete}
        className="mono"
        style={{
          position: "absolute",
          top: 16,
          right: 18,
          zIndex: 4,
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

      <div style={{ position: "relative", width: "min(540px, 94vw)", textAlign: "center", zIndex: 3 }}>
        {script.kicker && (
          <div className="beat-kicker mono" style={{ fontSize: 10, letterSpacing: 2.5, color: accent, marginBottom: 14 }}>
            {script.kicker}
          </div>
        )}

        {portrait && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
            <div className="beat-portrait" style={{ position: "relative", padding: 8, borderRadius: 20, border: `2px solid ${col}`, boxShadow: `0 0 48px -12px ${col}`, background: `color-mix(in srgb, ${col} 12%, #0c0b12)` }}>
              {/* per-line glow pulse (cheap remount, leaves the 3D canvas untouched) */}
              <span key={idx} className="beat-glow" style={{ ["--ac" as string]: col } as React.CSSProperties} aria-hidden />
              <ChampionAvatar ckey={portrait.key} type={portrait.type} champion={portrait.champion} size={120} />
            </div>
          </div>
        )}

        <div className="beat-speaker" style={{ fontSize: 13, fontWeight: 700, color: accent, letterSpacing: 0.5 }}>{line.speaker}</div>
        {line.role && (
          <div className="beat-speaker mono" style={{ fontSize: 9, letterSpacing: 1.2, color: "var(--muted2)", marginTop: 2 }}>
            {line.role.toUpperCase()}
          </div>
        )}

        <p
          style={{
            fontSize: line.speaker === "Reader" || line.speaker === "The Reader" ? 16 : 22,
            fontWeight: line.speaker === "Reader" || line.speaker === "The Reader" ? 500 : 600,
            lineHeight: 1.45,
            margin: "18px auto 0",
            maxWidth: line.speaker === "Reader" || line.speaker === "The Reader" ? "36ch" : "30ch",
            color: line.speaker === "Reader" || line.speaker === "The Reader" ? "var(--muted)" : "var(--ink)",
            fontStyle: line.speaker === "Reader" || line.speaker === "The Reader" ? "normal" : "italic",
            minHeight: "2.9em",
          }}
        >
          &ldquo;{typed}
          <span className="beat-caret" style={{ opacity: done ? 0 : 1, color: accent }}>
            |
          </span>
          &rdquo;
        </p>

        <div className="mono" style={{ fontSize: 9, color: "var(--muted2)", marginTop: 16, display: "flex", gap: 6, justifyContent: "center" }}>
          {script.lines.map((_, i) => (
            <span
              key={i}
              style={{
                width: i === idx ? 16 : 6,
                height: 6,
                borderRadius: 4,
                background: i === idx ? accent : i < idx ? "var(--muted2)" : "rgba(255,255,255,.18)",
                transition: "all .3s",
              }}
            />
          ))}
        </div>

        <button
          type="button"
          className="btn btn-primary pop"
          onClick={advance}
          style={{ ["--ac" as string]: accent, marginTop: 26, padding: "12px 28px", fontSize: 15 }}
        >
          {last ? "Continue" : "Next"}
        </button>
      </div>
    </div>
  );
}

function BeatStyles() {
  return (
    <style>{`
    .beat-bar{position:absolute;left:0;right:0;height:0;background:#020106;z-index:4;pointer-events:none;animation:beatBar .6s cubic-bezier(.2,.8,.2,1) forwards}
    .beat-bar--top{top:0}
    .beat-bar--bottom{bottom:0}
    @keyframes beatBar{to{height:5.5vh}}
    .beat-stars{position:absolute;inset:-20% -20% -20% -20%;pointer-events:none;opacity:.5;
      background-image:radial-gradient(1.5px 1.5px at 20% 30%, color-mix(in srgb,var(--ac) 70%,#fff) 50%, transparent),
        radial-gradient(1.5px 1.5px at 70% 60%, rgba(255,255,255,.7) 50%, transparent),
        radial-gradient(1px 1px at 40% 80%, color-mix(in srgb,var(--ac) 60%,#fff) 50%, transparent),
        radial-gradient(1px 1px at 85% 20%, rgba(255,255,255,.6) 50%, transparent),
        radial-gradient(1.5px 1.5px at 55% 45%, color-mix(in srgb,var(--ac) 70%,#fff) 50%, transparent);
      background-size:cover;animation:beatDrift 26s linear infinite}
    @keyframes beatDrift{from{transform:translateY(0) scale(1)}to{transform:translateY(-28px) scale(1.04)}}
    .beat-portrait{animation:beatRise .7s cubic-bezier(.2,.8,.2,1) both, beatFloat 6s ease-in-out 0.7s infinite}
    @keyframes beatRise{from{opacity:0;transform:translateY(22px) scale(.92)}to{opacity:1;transform:none}}
    @keyframes beatFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
    .beat-glow{position:absolute;inset:-3px;border-radius:22px;pointer-events:none;
      box-shadow:0 0 0 2px color-mix(in srgb,var(--ac) 70%,transparent), 0 0 60px -6px var(--ac);
      animation:beatGlow .9s ease-out forwards}
    @keyframes beatGlow{0%{opacity:.95;transform:scale(1.06)}100%{opacity:0;transform:scale(1.16)}}
    .beat-kicker{animation:beatFade .5s ease-out both}
    .beat-speaker{animation:beatFade .5s ease-out .08s both}
    @keyframes beatFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
    .beat-caret{animation:beatBlink 1s step-end infinite}
    @keyframes beatBlink{50%{opacity:0}}
    @media (prefers-reduced-motion: reduce){
      .beat-stars,.beat-portrait,.beat-glow,.beat-caret{animation:none}
    }
    `}</style>
  );
}
