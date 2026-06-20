"use client";
// Loud, gamified reveals for outcome moments — claiming a cache, clearing a
// standing objective (peak / depth / secret), swearing allegiance, and winning
// or losing a duel / gauntlet. Replaces the old flat little toasts with a card
// that pops in with overshoot, an expanding shockwave ring, a confetti burst,
// and a matching sound. A "bad" tone swaps confetti for a shake + unlucky sting.
//
// The keyframes live in globals.css (.cel-* classes) so the duel / gauntlet
// result cards can reuse the confetti + shake without re-declaring them.
import { useEffect, useMemo } from "react";
import { rewardSfx, pledgeSfx, badLuckSfx } from "@/lib/sfx";

export type CelebrationTone = "good" | "epic" | "pledge" | "bad";

const PALETTE = ["#ffd23f", "#7c5cff", "#39e0ff", "#ff6b4a", "#36d39a", "#c77dff", "#ffffff"];

type Piece = {
  left: number; // start x offset from origin, px
  tx: number; // travel x, px
  ty: number; // travel y, px (positive = down)
  spin: number; // deg
  delay: number; // s
  dur: number; // s
  size: number; // px
  color: string;
  round: boolean;
};

function makePieces(n: number, accent: string): Piece[] {
  const pal = [accent, ...PALETTE];
  const out: Piece[] = [];
  for (let i = 0; i < n; i++) {
    const ang = (Math.PI * (i / n)) * 2 + Math.random() * 0.5; // spread around the circle
    const power = 120 + Math.random() * 240;
    out.push({
      left: (Math.random() - 0.5) * 40,
      tx: Math.cos(ang) * power,
      ty: Math.sin(ang) * power * 0.7 + 120 + Math.random() * 160, // gravity bias downward
      spin: (Math.random() - 0.5) * 900,
      delay: Math.random() * 0.12,
      dur: 1.1 + Math.random() * 0.9,
      size: 6 + Math.random() * 7,
      color: pal[Math.floor(Math.random() * pal.length)],
      round: Math.random() < 0.3,
    });
  }
  return out;
}

// Fire the right sting for a win / loss outcome. `epic` reserves the longer
// fanfare for marquee wins (duels, cleared gauntlets).
export function outcomeSfx(won: boolean, epic = true) {
  if (won) rewardSfx(epic ? "epic" : "big");
  else badLuckSfx();
}

// A standalone confetti burst that fills its positioned parent and rains from
// `originTop`. Drop it behind any result/reward card. Renders nothing when count
// is 0 (e.g. a loss).
export function Confetti({ accent, count = 48, originTop = "31%" }: { accent: string; count?: number; originTop?: string }) {
  const pieces = useMemo(() => makePieces(count, accent), [count, accent]);
  if (count <= 0) return null;
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 1 }}>
      <div style={{ position: "absolute", top: originTop, left: "50%", width: 0, height: 0 }}>
        {pieces.map((p, idx) => (
          <span
            key={idx}
            className="cel-confetti"
            style={{
              position: "absolute",
              left: p.left,
              top: 0,
              width: p.size,
              height: p.round ? p.size : p.size * 0.5,
              background: p.color,
              borderRadius: p.round ? "50%" : 1,
              ["--tx" as string]: `${p.tx}px`,
              ["--ty" as string]: `${p.ty}px`,
              ["--spin" as string]: `${p.spin}deg`,
              ["--cel-dur" as string]: `${p.dur}s`,
              ["--cel-delay" as string]: `${p.delay}s`,
              boxShadow: `0 0 6px ${p.color}66`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function Celebration({
  tone = "good",
  accent,
  kicker,
  title,
  subtitle,
  children,
}: {
  tone?: CelebrationTone;
  accent: string;
  kicker: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  const count = tone === "bad" ? 0 : tone === "epic" ? 80 : 48;

  useEffect(() => {
    if (tone === "bad") badLuckSfx();
    else if (tone === "pledge") pledgeSfx();
    else rewardSfx(tone === "epic" ? "epic" : "big");
  }, [tone]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "26%",
        pointerEvents: "none",
        zIndex: 62,
        overflow: "hidden",
      }}
    >
      <Confetti accent={accent} count={count} originTop="31%" />

      <div style={{ position: "relative", display: "grid", placeItems: "center" }}>
        {/* expanding shockwave ring */}
        {tone !== "bad" && (
          <span
            aria-hidden
            className="cel-shock"
            style={{ position: "absolute", width: 120, height: 120, borderRadius: "50%", border: `2px solid ${accent}` }}
          />
        )}

        {/* the card */}
        <div
          className={`panel ${tone === "bad" ? "cel-shake" : "cel-reveal"}`}
          style={{
            ["--ac" as string]: accent,
            position: "relative",
            padding: "16px 26px",
            textAlign: "center",
            minWidth: 220,
            borderColor: accent,
            boxShadow: `0 0 90px -20px ${accent}, 0 24px 60px -30px #000`,
            background: `radial-gradient(120% 140% at 50% 0%, ${accent}1f 0%, var(--panel) 60%)`,
          }}
        >
          <div
            className="mono"
            style={{ fontSize: 9.5, letterSpacing: 2.4, color: accent, fontWeight: 700, textShadow: `0 0 18px ${accent}99` }}
          >
            {kicker}
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, margin: subtitle ? "3px 0 2px" : children ? "3px 0 8px" : "3px 0 0", letterSpacing: -0.3 }}>
            {title}
          </div>
          {subtitle && <div style={{ fontSize: 12, fontStyle: "italic", color: "var(--muted)", marginBottom: children ? 8 : 0 }}>{subtitle}</div>}
          {children && (
            <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", fontSize: 13, fontWeight: 700 }}>
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
