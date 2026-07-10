"use client";
import { useEffect } from "react";
import { Crown, Gem } from "lucide-react";
import type { WorldGoal } from "./goals";

// The one-time objectives intro, as a short cascade of toasts instead of a single
// static banner. Each objective (peak / depth / secret) slides up in turn, holds,
// then fades — and the whole stack points down at the compass tape that tracks
// them from now on. Non-interactive (pointer-through) and self-dismissing.
const KIND_ICON: Record<WorldGoal["kind"], string> = { peak: "▲", depth: "▼", secret: "◆" };

const STAGGER = 900; // ms between toasts appearing
const LIFE = 5000; // ms each toast is on screen

export function ObjectiveToasts({
  goals,
  isMobile,
  compassReserve,
  onDone,
}: {
  goals: WorldGoal[];
  isMobile: boolean;
  compassReserve: number;
  onDone: () => void;
}) {
  const shown = goals.slice(0, 3);
  const total = STAGGER * (shown.length - 1) + LIFE + 400;

  useEffect(() => {
    const id = setTimeout(onDone, total);
    return () => clearTimeout(id);
  }, [onDone, total]);

  return (
    <div
      style={{
        position: "absolute",
        bottom: (isMobile ? 96 : 70) + compassReserve,
        left: 0,
        right: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        pointerEvents: "none",
        zIndex: 59,
        padding: isMobile ? "0 104px 0 16px" : "0 16px",
      }}
    >
      <style>{`
        @keyframes objToast {
          0% { opacity:0; transform: translateY(16px) scale(.96); }
          6% { opacity:1; transform: none; }
          80% { opacity:1; transform: none; }
          100% { opacity:0; transform: translateY(-8px) scale(.98); }
        }
        @keyframes objArrow { 0%,100% { transform: translateY(0); opacity:.5 } 50% { transform: translateY(4px); opacity:1 } }
        @media (prefers-reduced-motion: reduce){
          .obj-toast { animation: none !important; opacity: 1 !important; transform: none !important; }
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
            animation: `objToast ${LIFE}ms ease ${i * STAGGER}ms forwards`,
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
        className="obj-toast obj-arrow mono"
        style={{
          opacity: 0,
          animation: `objToast ${LIFE}ms ease ${shown.length * STAGGER}ms forwards`,
          fontSize: 10,
          letterSpacing: 1.2,
          color: "var(--muted)",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span className="obj-arrow" style={{ animation: "objArrow 1.1s ease-in-out infinite", color: "var(--gold)" }}>▾</span>
        TRACKED IN YOUR COMPASS
      </div>
    </div>
  );
}
