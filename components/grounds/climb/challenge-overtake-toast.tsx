"use client";
// Brief congrats when you clear the sector a challenge ghost failed on.
import { useEffect } from "react";

export function ChallengeOvertakeToast({
  name,
  accent,
  onDone,
}: {
  name?: string | null;
  accent: string;
  onDone: () => void;
}) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 2800);
    return () => window.clearTimeout(t);
  }, [onDone]);

  const who = (name || "them").trim() || "them";

  return (
    <div
      aria-live="polite"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: "18%",
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 140,
        padding: "0 16px",
      }}
    >
      <style>{`
        @keyframes climbOvertakeIn {
          0% { opacity: 0; transform: translateY(12px) scale(.96); }
          12% { opacity: 1; transform: none; }
          78% { opacity: 1; transform: none; }
          100% { opacity: 0; transform: translateY(-8px) scale(.98); }
        }
        @media (prefers-reduced-motion: reduce) {
          .climb-overtake-toast {
            animation: none !important;
            opacity: 1 !important;
          }
        }
      `}</style>
      <div
        className="climb-overtake-toast mono"
        style={{
          maxWidth: 340,
          width: "100%",
          textAlign: "center",
          padding: "12px 16px",
          borderRadius: 14,
          border: `1px solid ${accent}`,
          background: "rgba(12,11,18,.92)",
          boxShadow: `0 12px 36px -16px ${accent}`,
          animation: "climbOvertakeIn 2.7s cubic-bezier(.2,.7,.2,1) both",
        }}
      >
        <div style={{ fontSize: 10, letterSpacing: 2, fontWeight: 800, color: accent }}>
          PAST THEIR MARK
        </div>
        <div style={{ marginTop: 6, fontSize: 13, fontWeight: 700, color: "#fff", letterSpacing: 0.2 }}>
          We cleared the sector {who} fell on.
        </div>
        <div style={{ marginTop: 4, fontSize: 11, color: "var(--muted, #9a96b8)", letterSpacing: 0.3 }}>
          Stay with me. Keep climbing.
        </div>
      </div>
    </div>
  );
}
