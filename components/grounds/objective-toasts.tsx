"use client";
import { useEffect } from "react";
import { Crown, Gem } from "lucide-react";
import type { WorldGoal } from "./goals";

// One-time objectives intro: each goal (peak / depth / secret) appears mid-screen,
// holds long enough to read, then flies up into the top-right Player Hub trigger
// where they can be reviewed later (tap / M). Non-interactive and self-dismissing.
const KIND_ICON: Record<WorldGoal["kind"], string> = { peak: "▲", depth: "▼", secret: "◆" };

const STAGGER = 900; // ms between toasts appearing
const LIFE = 5200; // ms each toast's full animation

export function ObjectiveToasts({
  goals,
  isMobile,
  onDone,
}: {
  goals: WorldGoal[];
  isMobile: boolean;
  onDone: () => void;
}) {
  const shown = goals.slice(0, 3);
  const total = STAGGER * (shown.length - 1) + LIFE + 500;

  useEffect(() => {
    const id = setTimeout(onDone, total);
    return () => clearTimeout(id);
  }, [onDone, total]);

  // Fly toward the hub at top:14 right:16. Distances are relative to the
  // centered stack so the exit lands under/into the hub trigger — nearly a
  // full half-viewport so they read as vanishing into the corner, not mid-right.
  const flyX = isMobile ? "calc(50vw - 40px)" : "calc(50vw - 56px)";
  const flyY = isMobile ? "calc(-50vh + 28px)" : "calc(-50vh + 32px)";

  return (
    <div
      aria-live="polite"
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        pointerEvents: "none",
        zIndex: 59,
        padding: isMobile ? "0 20px" : "0 24px",
        paddingBottom: isMobile ? "12vh" : "8vh",
      }}
    >
      <style>{`
        @keyframes objToast {
          0% { opacity: 0; transform: translateY(18px) scale(.96); }
          7% { opacity: 1; transform: none; }
          52% { opacity: 1; transform: none; }
          100% {
            opacity: 0;
            transform: translate(${flyX}, ${flyY}) scale(.28);
          }
        }
        @keyframes objCue {
          0% { opacity: 0; transform: translateY(8px); }
          12% { opacity: 1; transform: none; }
          72% { opacity: 1; transform: none; }
          100% { opacity: 0; transform: translate(${flyX}, ${flyY}) scale(.6); }
        }
        @keyframes objArrow {
          0%, 100% { transform: translate(0, 0); opacity: .55 }
          50% { transform: translate(3px, -3px); opacity: 1 }
        }
        @media (prefers-reduced-motion: reduce) {
          .obj-toast, .obj-cue {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
          .obj-arrow { animation: none !important; }
        }
      `}</style>

      {shown.map((g, i) => (
        <div
          key={g.id}
          className="obj-toast panel"
          style={{
            ["--ac" as string]: g.color,
            borderColor: g.color,
            display: "flex",
            alignItems: "center",
            gap: 11,
            padding: "9px 13px",
            maxWidth: 380,
            width: "100%",
            opacity: 0,
            animation: `objToast ${LIFE}ms cubic-bezier(.2,.7,.2,1) ${i * STAGGER}ms forwards`,
            boxShadow: `0 8px 28px -12px ${g.color}`,
          }}
        >
          <span style={{ fontSize: 16, color: g.color, flexShrink: 0, width: 20, textAlign: "center" }}>{KIND_ICON[g.kind]}</span>
          <span style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.2 }}>{g.label}</span>
            <span style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.25 }}>{g.hint}</span>
          </span>
          <span className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--muted2)", flexShrink: 0 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "var(--gold)" }}>
              {g.reward.crowns}
              <Crown size={12} strokeWidth={2.2} />
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "#39e0ff" }}>
              <Gem size={11} strokeWidth={2.2} />
              {g.reward.fragments}
            </span>
          </span>
        </div>
      ))}

      <div
        className="obj-cue mono"
        style={{
          opacity: 0,
          animation: `objCue ${LIFE}ms ease ${shown.length * STAGGER}ms forwards`,
          fontSize: 10,
          letterSpacing: 1.2,
          color: "var(--muted)",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          marginTop: 4,
        }}
      >
        <span className="obj-arrow" style={{ animation: "objArrow 1.1s ease-in-out infinite", color: "var(--gold)" }}>↗</span>
        REVIEW IN YOUR HUB · M
      </div>
    </div>
  );
}
