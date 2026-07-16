"use client";
// ─────────────────────────────────────────────────────────────────────────────
// Mobile splash door (docs/two-doors.md §3) — the bus-time entrance. A phone
// opens on ONE epic screen: the Trainer taking wing, jetpack lit, champion in
// tow — and a single loud CTA, "Fly", that drops you straight into a guest Climb.
// A quiet secondary lets returning trainers step into the Grounds instead.
//
// Fantasy, not tech (vocabulary): no "agent", no "$ZING", no "AI" here — just the
// world and the joy of flight. This is a TYPOGRAPHIC fallback poster; when the
// splash art asset lands it can layer in behind the copy (two-doors T2 art dep).
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect } from "react";
import { Rocket, ChevronRight } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { track as pingEvent } from "@/lib/track";

export function MobileSplash({ onFly, onEnter }: { onFly: () => void; onEnter: () => void }) {
  useEffect(() => {
    pingEvent("m_splash");
  }, []);

  const fly = () => {
    pingEvent("m_fly");
    onFly();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1200,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        overflow: "hidden",
        background: "radial-gradient(120% 90% at 50% 8%, #1a2b4d 0%, #12112a 46%, #08070f 100%)",
        color: "#fff",
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* sky beams — the Ascent's light, rising behind the hero */}
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.5 }}>
        <div style={{ position: "absolute", top: "-10%", left: "50%", width: 3, height: "72%", transform: "translateX(-50%)", background: "linear-gradient(to top, transparent, #39e0ff88)", filter: "blur(1px)", animation: "mSplashBeam 3.6s ease-in-out infinite" }} />
        <div style={{ position: "absolute", top: "-6%", left: "38%", width: 2, height: "60%", background: "linear-gradient(to top, transparent, #7cf6c866)", filter: "blur(1px)", animation: "mSplashBeam 4.4s ease-in-out infinite .6s" }} />
        <div style={{ position: "absolute", top: "-6%", left: "62%", width: 2, height: "60%", background: "linear-gradient(to top, transparent, #b98cff66)", filter: "blur(1px)", animation: "mSplashBeam 4.0s ease-in-out infinite 1.1s" }} />
      </div>

      {/* the hero glyph — a stylised jetpack ascent (fallback for the poster art) */}
      <div aria-hidden style={{ position: "absolute", top: "16%", left: 0, right: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>
        <div style={{ fontSize: 108, lineHeight: 1, filter: "drop-shadow(0 0 34px #39e0ff88)", animation: "mSplashHover 3.2s ease-in-out infinite" }}>🚀</div>
      </div>

      {/* copy + calls to action, weighted to the thumb */}
      <div style={{ position: "relative", padding: "0 24px calc(40px + env(safe-area-inset-bottom, 0px))", textAlign: "center" }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: 4, color: "#39e0ff", marginBottom: 10 }}>{BRAND.nameUpper}</div>
        <h1 style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.02, margin: "0 0 10px", letterSpacing: -0.5, textShadow: "0 4px 30px rgba(0,0,0,.6)" }}>
          Take flight.
        </h1>
        <p style={{ fontSize: 14.5, lineHeight: 1.5, color: "rgba(230,226,245,.78)", margin: "0 auto 26px", maxWidth: 300 }}>
          One thumb, one soaring climb. Thread the rings, ride the jetpack, chase the sky — your champion flying right behind you.
        </p>

        <button
          type="button"
          onClick={fly}
          style={{
            width: "100%",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 9,
            padding: "17px 18px",
            borderRadius: 15,
            border: "none",
            background: "linear-gradient(135deg, #39e0ff, #7cf6c8)",
            color: "#04121a",
            fontSize: 17,
            fontWeight: 800,
            letterSpacing: 0.3,
            cursor: "pointer",
            boxShadow: "0 14px 40px -12px #39e0ffaa",
          }}
        >
          <Rocket size={20} strokeWidth={2.6} /> Fly
        </button>

        <button
          type="button"
          onClick={onEnter}
          style={{
            marginTop: 14,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            padding: "10px 14px",
            border: "none",
            background: "transparent",
            color: "rgba(230,226,245,.62)",
            fontSize: 13.5,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Enter the Grounds <ChevronRight size={15} strokeWidth={2.4} />
        </button>
      </div>

      <style>{`
        @keyframes mSplashHover { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-14px) } }
        @keyframes mSplashBeam { 0%,100% { opacity: .35 } 50% { opacity: .85 } }
        @media (prefers-reduced-motion: reduce) {
          .mSplashNoMotion, [style*="mSplashHover"], [style*="mSplashBeam"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

export default MobileSplash;
