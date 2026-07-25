"use client";
// ─────────────────────────────────────────────────────────────────────────────
// Mobile splash door (docs/two-doors.md §3) — the bus-time entrance. A phone
// opens on ONE epic screen: infinite flight of the Trainer + champion over a
// looping belt of real Grounds islands — and a single loud CTA, "Fly", that
// drops you straight into a guest Climb. A quiet secondary lets returning
// trainers step into the Grounds instead.
//
// Fantasy, not tech (vocabulary): no "agent", no "$ZING", no "AI" here — just the
// world and the joy of flight. The WebGL hero is shared with the desktop `/`
// Awaken beat (`components/home/infinite-flight-hero.tsx`).
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Rocket, ChevronRight } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { track as pingEvent } from "@/lib/track";
import { FlightHeroPoster } from "@/components/home/flight-hero-poster";

// Infinite-flight hero loads after first paint so the captured still + CTA are
// usable instantly on a cold phone.
const SplashScene = dynamic(() => import("./mobile-splash-scene"), { ssr: false, loading: () => null });

export function MobileSplash({ onFly, onEnter }: { onFly: () => void; onEnter: () => void }) {
  const [live, setLive] = useState(false);

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
        background: "radial-gradient(120% 90% at 50% 10%, #f0c090 0%, #c88858 42%, #2a1830 100%)",
        color: "#fff",
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* Captured first frame (our models) for instant paint / SEO; live WebGL fades over it. */}
      <div aria-hidden style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <FlightHeroPoster visible={!live} />
        <SplashScene onReady={() => setLive(true)} />
      </div>

      {/* soft sun shafts — golden-hour read over the live sky */}
      <div aria-hidden style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", opacity: 0.4 }}>
        <div style={{ position: "absolute", top: "-12%", left: "42%", width: 4, height: "78%", transform: "rotate(-12deg)", background: "linear-gradient(to top, transparent, #ffe2a888)", filter: "blur(2px)", animation: "mSplashBeam 3.6s ease-in-out infinite" }} />
        <div style={{ position: "absolute", top: "-8%", left: "58%", width: 3, height: "64%", transform: "rotate(8deg)", background: "linear-gradient(to top, transparent, #ffc87866)", filter: "blur(2px)", animation: "mSplashBeam 4.4s ease-in-out infinite .6s" }} />
      </div>

      {/* scrim — keep the lower-third copy legible over the render */}
      <div aria-hidden style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none", background: "linear-gradient(to top, #1a1020 4%, rgba(26,16,32,.72) 28%, transparent 56%)" }} />

      {/* copy + calls to action, weighted to the thumb */}
      <div style={{ position: "relative", zIndex: 3, padding: "0 24px calc(40px + env(safe-area-inset-bottom, 0px))", textAlign: "center" }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: 4, color: "#39e0ff", marginBottom: 10 }}>{BRAND.nameUpper}</div>
        <h1 style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.02, margin: "0 0 10px", letterSpacing: -0.5, textShadow: "0 4px 30px rgba(0,0,0,.6)" }}>
          Take flight.
        </h1>
        <p style={{ fontSize: 14.5, lineHeight: 1.5, color: "rgba(230,226,245,.78)", margin: "0 auto 26px", maxWidth: 300 }}>
          Jetpack lit, a thinking champion flying at your side. Climb the sky, raise the mind. You both rise.
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
          Enter the world <ChevronRight size={15} strokeWidth={2.4} />
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
