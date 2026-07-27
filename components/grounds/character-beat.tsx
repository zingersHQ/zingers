"use client";
import { useCallback, useEffect, useState } from "react";
import type { Champion, CreatureType } from "@/lib/types";
import { ChampionAvatar } from "@/components/champion-avatar";
import { ChampionPortraitScene } from "@/components/render/champion-portrait-scene";
import { OnboardingAudio } from "@/components/intro/onboarding-audio";
import { primeCreature, speakCreatureType } from "@/lib/creature-voice";
import { jumpBeep, trainStinger, rewardSfx, travelWhoosh, evolveStinger } from "@/lib/sfx";
import { startAmbience, setMood, duckAmbience, ambienceFlourish, setAmbienceIntensity } from "@/lib/ambience-bus";
import type { BeatScript } from "@/lib/lore/character-beats";
import { ONBOARDING_BG } from "@/lib/iconography";
import { TYPE_COLOR } from "@/lib/evolve/progression";
import { useIsMobile } from "@/lib/use-device";

// Caption panel + quote block are fixed so line-to-line text changes never
// resize the champion stage (which would remount/refit the 3D canvas).
const BEAT_CAPTION_H = { mobile: 278, desktop: 296 } as const;
const BEAT_QUOTE_H = { mobile: 92, desktop: 100 } as const;

// A directed narrative beat — not a static slide. The live 3D portrait rises and
// floats, the frame is letterboxed for cinema, each new line pulses a glow and
// types itself in, and a slow parallax field drifts behind. One presentation
// shared by every story moment: champion wakes, the rival's
// taunts, and the season-turn Chronicle.
export function CharacterBeat({
  script,
  accent,
  voice,
  championType,
  portrait,
  onComplete,
  layout = "portrait",
  sound = false,
}: {
  script: BeatScript;
  accent: string;
  /** who vocalises the lines */
  voice: "champion";
  championType?: CreatureType;
  portrait?: { key: string; type: CreatureType; champion: Champion; name: string };
  onComplete: () => void;
  /** "portrait" = talking-head thumbnail; "stage" = champion fills the frame and
   *  performs (for vignettes where you need to actually see the body act). */
  layout?: "portrait" | "stage";
  /** Score + per-beat SFX + verdict flourish. Mounts an ambience engine and a
   *  mute control. For vignettes; off for quiet dialogue overlays. */
  sound?: boolean;
}) {
  const isMobile = useIsMobile();
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const line = script.lines[idx];
  const last = idx >= script.lines.length - 1;
  const done = typed.length >= line.text.length;

  const skipLine = useCallback(() => setTyped(line.text), [line.text]);

  const speak = useCallback(
    (text: string, speaker: string) => {
      if (speaker === "Trainer" || speaker === "The Trainer") return;
      if (championType) speakCreatureType(text, championType);
    },
    [championType],
  );

  useEffect(() => {
    primeCreature();
    speak(line.text, line.speaker);
  }, [idx, line.text, line.speaker, speak]);

  // Start the procedural score once, from the tap that opened this overlay.
  useEffect(() => {
    if (!sound) return;
    setMood("concord");
    setAmbienceIntensity(0.28);
    startAmbience();
    return () => setAmbienceIntensity(0);
  }, [sound]);

  // Per-beat SFX keyed off the line's clip, plus a light sidechain dip so the
  // voice/one-shot punches through the music.
  useEffect(() => {
    if (!sound) return;
    duckAmbience(0.45, 420);
    switch (line.anim) {
      case "jump":
        jumpBeep(last ? 2 : 1);
        if (last) travelWhoosh();
        break;
      case "train":
        trainStinger();
        break;
      case "dance":
        rewardSfx("big");
        break;
      default:
        break;
    }
  }, [idx, sound, line.anim, last]);

  // typewriter reveal — faster on phones; tap the line to show it all at once
  useEffect(() => {
    setTyped("");
    const full = line.text;
    let i = 0;
    const ms = isMobile ? 7 : 17;
    const id = setInterval(() => {
      i++;
      setTyped(full.slice(0, i));
      if (i >= full.length) clearInterval(id);
    }, ms);
    return () => clearInterval(id);
  }, [idx, line.text, isMobile]);

  const advance = useCallback(() => {
    if (last) {
      if (sound) {
        ambienceFlourish("victory");
        evolveStinger();
      }
      onComplete();
    } else setIdx((i) => i + 1);
  }, [last, onComplete, sound]);

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
  const trainerLine = line.speaker === "Trainer" || line.speaker === "The Trainer";
  const captionH = isMobile ? BEAT_CAPTION_H.mobile : BEAT_CAPTION_H.desktop;
  const quoteH = isMobile ? BEAT_QUOTE_H.mobile : BEAT_QUOTE_H.desktop;

  // speaker + typewriter line + progress dots + advance button — identical in
  // both layouts, so the voice/typewriter logic has one home.
  const caption = (
    <>
      <div style={{ minHeight: 34 }}>
        <div className="beat-speaker" style={{ fontSize: 13, fontWeight: 700, color: accent, letterSpacing: 0.5 }}>{line.speaker}</div>
        <div
          className="beat-speaker mono"
          style={{
            fontSize: 9,
            letterSpacing: 1.2,
            color: "var(--muted2)",
            marginTop: 2,
            minHeight: 13,
            visibility: line.role ? "visible" : "hidden",
          }}
        >
          {(line.role ?? " ").toUpperCase()}
        </div>
      </div>

      <p
        className="beat-quote"
        onClick={() => {
          if (!done) skipLine();
        }}
        style={{
          fontSize: trainerLine ? (isMobile ? 15 : 16) : isMobile ? 19 : 22,
          fontWeight: trainerLine ? 500 : 600,
          lineHeight: 1.45,
          margin: "12px auto 0",
          maxWidth: trainerLine ? "36ch" : "30ch",
          color: trainerLine ? "var(--muted)" : "var(--ink)",
          fontStyle: trainerLine ? "normal" : "italic",
          height: quoteH,
          minHeight: quoteH,
          maxHeight: quoteH,
          overflow: "hidden",
          cursor: done ? "default" : "pointer",
        }}
      >
        &ldquo;{typed}
        <span className="beat-caret" style={{ opacity: done ? 0 : 1, color: accent }}>
          |
        </span>
        &rdquo;
      </p>

      <div className="mono" style={{ fontSize: 9, color: "var(--muted2)", marginTop: 14, display: "flex", gap: 6, justifyContent: "center" }}>
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
        style={{
          ["--ac" as string]: accent,
          marginTop: 18,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: isMobile ? "11px 22px" : "12px 28px",
          fontSize: isMobile ? 14 : 15,
        }}
      >
        {last ? "Continue" : done ? "Next" : "Skip line"}
      </button>
    </>
  );

  // Shared backdrop: parallax star field + accent vignette. No top bar / SKIP —
  // dialogue beats advance via the caption button (and Esc), so the "top bar with
  // a skip" is gone from every talking-head beat.
  const backdrop = (
    <>
      <BeatStyles />
      <div className="beat-stars" style={{ ["--ac" as string]: accent } as React.CSSProperties} aria-hidden />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(120% 90% at 50% 32%, color-mix(in srgb, ${accent} 22%, transparent), #050409 72%)`,
          pointerEvents: "none",
        }}
      />
    </>
  );

  // Cinematic chrome (letterbox bars + a skip-all affordance) is reserved for the
  // full-screen "stage" vignette, where skipping a multi-beat cutscene matters.
  const cinemaChrome = (
    <>
      <div className="beat-bar beat-bar--top" aria-hidden />
      <div className="beat-bar beat-bar--bottom" aria-hidden />
      <button
        type="button"
        onClick={onComplete}
        className="mono"
        style={{ position: "absolute", top: 16, right: 18, zIndex: 5, background: "none", border: "none", color: "var(--muted2)", fontSize: 11, letterSpacing: 1, cursor: "pointer" }}
      >
        SKIP
      </button>
    </>
  );

  // Stage: the champion is the frame. Fills the screen and performs the per-line
  // clip; dialogue rides a lower third. For vignettes you need to actually watch.
  if (layout === "stage") {
    return (
      <div
        className="beat-root beat-root--stage"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 92,
          background: ONBOARDING_BG,
          overflow: "hidden",
          display: "grid",
          gridTemplateRows: `minmax(0, 1fr) ${captionH}px`,
          ["--beat-caption-h" as string]: `${captionH}px`,
        }}
      >
        {backdrop}
        {cinemaChrome}
        {sound && <OnboardingAudio compact />}

        {script.kicker && (
          <div
            className="beat-kicker mono"
            style={{ position: "absolute", top: "calc(5.5vh + 16px)", left: 0, right: 0, textAlign: "center", fontSize: 10, letterSpacing: 2.5, color: accent, zIndex: 3 }}
          >
            {script.kicker}
          </div>
        )}

        <div className="beat-stage" style={{ minHeight: 0, position: "relative", zIndex: 2, overflow: "hidden" }}>
          {portrait && (
            <ChampionPortraitScene
              key={portrait.key}
              type={portrait.type}
              champion={portrait.champion}
              preset="region"
              identityKey={portrait.key}
              animMode={line.anim}
              stage
              scale={0.6}
            />
          )}
          {/* legibility scrim rising under the caption */}
          <div aria-hidden style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "46%", background: "linear-gradient(to top, #050409 8%, transparent)", pointerEvents: "none" }} />
        </div>

        <div
          className="beat-caption"
          style={{
            position: "relative",
            zIndex: 3,
            height: captionH,
            minHeight: captionH,
            maxHeight: captionH,
            boxSizing: "border-box",
            textAlign: "center",
            padding: isMobile ? "0 18px calc(5.5vh + 14px)" : "0 20px calc(5.5vh + 22px)",
          }}
        >
          <div style={{ maxWidth: 560, margin: "0 auto" }}>{caption}</div>
        </div>
      </div>
    );
  }

  // Portrait: the original talking-head thumbnail — right for pure dialogue beats.
  return (
    <div
      className="beat-root beat-root--portrait"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 92,
        background: ONBOARDING_BG,
        display: "grid",
        gridTemplateRows: `minmax(0, 1fr) ${captionH}px`,
        overflow: "hidden",
        ["--beat-caption-h" as string]: `${captionH}px`,
      }}
    >
      {backdrop}

      <div
        style={{
          position: "relative",
          zIndex: 3,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px 20px 0",
          textAlign: "center",
        }}
      >
        {script.kicker && (
          <div className="beat-kicker mono" style={{ fontSize: 10, letterSpacing: 2.5, color: accent, marginBottom: 14 }}>
            {script.kicker}
          </div>
        )}

        {portrait && (
          <div style={{ display: "flex", justifyContent: "center", flexShrink: 0 }}>
            <div className="beat-portrait" style={{ position: "relative", padding: 8, borderRadius: 20, border: `2px solid ${col}`, boxShadow: `0 0 48px -12px ${col}`, background: `color-mix(in srgb, ${col} 12%, #0c0b12)` }}>
              {/* per-line glow pulse (cheap remount, leaves the 3D canvas untouched) */}
              <span key={idx} className="beat-glow" style={{ ["--ac" as string]: col } as React.CSSProperties} aria-hidden />
              <ChampionAvatar ckey={portrait.key} type={portrait.type} champion={portrait.champion} size={120} animMode={line.anim} />
            </div>
          </div>
        )}
      </div>

      <div
        className="beat-caption"
        style={{
          position: "relative",
          zIndex: 3,
          height: captionH,
          minHeight: captionH,
          maxHeight: captionH,
          boxSizing: "border-box",
          padding: "0 20px 20px",
          textAlign: "center",
        }}
      >
        <div style={{ width: "min(540px, 94vw)", margin: "0 auto" }}>{caption}</div>
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
