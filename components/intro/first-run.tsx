"use client";
import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { Champion, CreatureType } from "@/lib/types";
import { BRAND } from "@/lib/brand";
import { LeaguePoster } from "./league-poster";
import { RenderBoundary } from "@/components/grounds/render-guard";

const AgentShowcase = dynamic(() => import("./agent-showcase"), {
  ssr: false,
  loading: () => <div className="mono" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "var(--muted2)", fontSize: 12 }}>summoning an agent…</div>,
});

const HERO: Champion = { xp: 38000, wins: 74, losses: 8, battles: 82, aggression: 19, control: 9, resilience: 7, flair: 16, creativity: 13, rating: 1492 };
const HERO_TYPE: CreatureType = "CHAOS";

const ACC = "#7c5cff";

export function FirstRun({ onClose }: { onClose: () => void }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 640px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // On mobile the full pitch is too much — collapse to the single "live agent"
  // slide (the character standing) before they claim their champion.
  const slides = isMobile
    ? [<Agents key="agents" />]
    : [<Cover key="cover" />, <Agents key="agents" />, <Mind key="mind" />, <Reasoning key="reasoning" />, <Climb key="climb" />];
  const count = slides.length;
  const LAST = count - 1;

  const [i, setI] = useState(0);
  const next = useCallback(() => setI((v) => (v >= LAST ? v : v + 1)), [LAST]);
  const back = useCallback(() => setI((v) => Math.max(0, v - 1)), []);

  // Keep the active index valid when the layout flips between desktop/mobile.
  useEffect(() => {
    setI((v) => Math.min(v, LAST));
  }, [LAST]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        i >= LAST ? onClose() : next();
      } else if (e.key === "ArrowLeft") back();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i, LAST, next, back, onClose]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        display: "grid",
        placeItems: "center",
        padding: 18,
        background: "radial-gradient(120% 90% at 50% 0%, #14102a 0%, #07060d 60%, #050409 100%), #050409",
      }}
    >
      <div
        className="pop"
        style={{
          width: "min(940px, 96vw)",
          height: "min(620px, 92vh)",
          borderRadius: 20,
          border: "1px solid var(--line2)",
          background: "linear-gradient(180deg, #141028 0%, #0a0818 100%)",
          boxShadow: "0 40px 120px -40px #000, 0 0 80px -50px " + ACC,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", padding: "16px 20px", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span aria-hidden style={{ width: 18, height: 18, borderRadius: 5, border: "2px solid var(--gold)", display: "grid", placeItems: "center" }}>
              <span style={{ width: 5, height: 5, borderRadius: 9, background: ACC }} />
            </span>
            <span className="mono" style={{ fontSize: 10, letterSpacing: 2.5, color: "var(--muted2)" }}>{BRAND.nameUpper}</span>
          </div>
          {count > 1 && (
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              {slides.map((_, d) => (
                <button
                  key={d}
                  onClick={() => setI(d)}
                  aria-label={`slide ${d + 1}`}
                  style={{
                    width: d === i ? 22 : 8,
                    height: 8,
                    borderRadius: 99,
                    border: "none",
                    cursor: "pointer",
                    background: d === i ? ACC : "var(--line2)",
                    transition: "all .3s cubic-bezier(.2,.8,.2,1)",
                  }}
                />
              ))}
            </div>
          )}
          <button onClick={onClose} className="mono" style={{ marginLeft: count > 1 ? 14 : "auto", background: "none", border: "none", color: "var(--muted2)", fontSize: 11, letterSpacing: 1, cursor: "pointer" }}>
            SKIP
          </button>
        </div>

        <div style={{ flex: 1, position: "relative", minHeight: 0, background: "#0a0813" }}>
          {slides[i]}
        </div>

        <div style={{ display: "flex", alignItems: "center", padding: "16px 22px", borderTop: "1px solid var(--line)" }}>
          <button
            onClick={back}
            className="mono"
            style={{ visibility: i === 0 ? "hidden" : "visible", background: "none", border: "none", color: "var(--muted)", fontSize: 13, cursor: "pointer", letterSpacing: 0.5 }}
          >
            ← back
          </button>
          <span className="mono" style={{ marginLeft: "auto", marginRight: 16, fontSize: 11, color: "var(--muted2)", visibility: count > 1 ? "visible" : "hidden" }}>
            {i + 1} / {count}
          </span>
          <button
            onClick={() => (i >= LAST ? onClose() : next())}
            className="btn btn-primary"
            style={{ ["--ac" as string]: i >= LAST ? "var(--gold)" : ACC, fontSize: 15, padding: "11px 22px" }}
          >
            {i >= LAST ? "Claim your champion →" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 56px", background: "#0a0813" }}>
      {children}
    </div>
  );
}
function Kicker({ children }: { children: React.ReactNode }) {
  return <div className="mono" style={{ fontSize: 11, letterSpacing: 3, color: ACC, marginBottom: 14 }}>{children}</div>;
}

function Cover() {
  return (
    <Center>
      <Kicker>AN AI YOU RAISE</Kicker>
      <h1 style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.02, margin: 0, letterSpacing: -1 }}>
        Raise a mind.
        <br />
        <span style={{ background: `linear-gradient(90deg, var(--gold), ${ACC})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Make it legend.</span>
      </h1>
      <p style={{ fontSize: 17, color: "var(--muted)", maxWidth: 560, marginTop: 18, lineHeight: 1.55 }}>
        You don&apos;t fight. You raise an AI champion: choose its brain, train how it thinks, and send it into a living
        arena where its reasoning competes for real.
      </p>
    </Center>
  );
}

function Agents() {
  return (
    <div style={{ position: "absolute", inset: 0, background: "#0a0813" }}>
      <RenderBoundary
        fallback={
          <div className="mono" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "var(--muted2)", fontSize: 11, padding: 24, textAlign: "center" }}>
            3D preview unavailable. Enable graphics acceleration in your browser to see live agents.
          </div>
        }
      >
        <AgentShowcase champion={HERO} type={HERO_TYPE} scale={0.5} />
      </RenderBoundary>

      {/* compact copy — ~50% smaller so the character owns the frame */}
      <div style={{ position: "absolute", top: 16, left: 24, pointerEvents: "none", maxWidth: 220 }}>
        <div className="mono" style={{ fontSize: 8, letterSpacing: 2.2, color: ACC }}>LIVE AGENT</div>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: "3px 0 0", letterSpacing: -0.2, lineHeight: 1.25, color: "var(--ink)" }}>
          Its body is a receipt of how it fights.
        </h2>
      </div>

      <Arrow style={{ top: "28%", right: "5%" }} dir="left" small>rank</Arrow>
      <Arrow style={{ top: "50%", left: "4%" }} dir="right" small>wins</Arrow>
      <Arrow style={{ bottom: "14%", right: "8%" }} dir="left" small>tier</Arrow>

      <div style={{ position: "absolute", bottom: 14, left: 0, right: 0, pointerEvents: "none", textAlign: "center", padding: "0 16px" }}>
        <p className="mono" style={{ fontSize: 9, color: "var(--muted2)", letterSpacing: 0.3, lineHeight: 1.5 }}>
          silhouette computed from its career
          <br />
          after you claim · use the dock below: Play · Fight · Dex · Quest · Rank
        </p>
      </div>
    </div>
  );
}

function Arrow({ children, style, dir, small }: { children: React.ReactNode; style: React.CSSProperties; dir: "left" | "right"; small?: boolean }) {
  const fs = small ? 9 : 11;
  const arr = small ? 14 : 18;
  return (
    <div style={{ position: "absolute", display: "flex", alignItems: "center", gap: 5, pointerEvents: "none", ...style }}>
      {dir === "right" && <span style={{ color: ACC, fontSize: arr }}>→</span>}
      <span
        className="mono"
        style={{
          fontSize: fs,
          color: "var(--ink)",
          background: "rgba(10,8,18,.55)",
          border: "1px solid var(--line2)",
          borderRadius: 99,
          padding: small ? "3px 8px" : "5px 11px",
          backdropFilter: "blur(4px)",
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </span>
      {dir === "left" && <span style={{ color: ACC, fontSize: arr }}>←</span>}
    </div>
  );
}

function Mind() {
  return (
    <Center>
      <Kicker>TRAIN</Kicker>
      <h2 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>Shape its mind.</h2>
      <p style={{ fontSize: 13, color: "var(--muted)", maxWidth: 380, margin: "8px 0 20px", lineHeight: 1.45 }}>
        Any brain. Any doctrine.
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", maxWidth: 480, marginBottom: 18 }}>
        {["House Grok", "Your GPT", "Your agent"].map((l, idx) => (
          <span
            key={l}
            className="mono"
            style={{
              fontSize: 10,
              padding: "6px 12px",
              borderRadius: 99,
              border: `1px solid ${idx === 0 ? ACC : "var(--line2)"}`,
              color: idx === 0 ? ACC : "var(--muted)",
              background: idx === 0 ? "rgba(124,92,255,.12)" : "rgba(10,8,18,.4)",
            }}
          >
            {l}
          </span>
        ))}
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
        {[
          { l: "Aggression", v: 78, c: "#ff6b4a" },
          { l: "Focus", v: 54, c: "#b07bff" },
          { l: "Risk", v: 66, c: "#f5d020" },
        ].map(({ l, v, c }) => (
          <div key={l} style={{ textAlign: "center" }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 99,
                border: `2px solid ${c}`,
                display: "grid",
                placeItems: "center",
                fontSize: 11,
                fontWeight: 700,
                color: c,
                boxShadow: `0 0 16px ${c}33`,
              }}
            >
              {v}
            </div>
            <div className="mono" style={{ fontSize: 9, color: "var(--muted2)", marginTop: 6, letterSpacing: 0.5 }}>{l}</div>
          </div>
        ))}
      </div>
    </Center>
  );
}

function Reasoning() {
  return (
    <Center>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", maxWidth: 420, margin: "0 auto" }}>
        <Kicker>FIGHT</Kicker>
        <h2 style={{ fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: -0.4 }}>It thinks out loud.</h2>
        <p style={{ fontSize: 12, color: "var(--muted)", margin: "8px 0 28px", lineHeight: 1.45 }}>
          Every move has a pulse, a reason you can feel.
        </p>

        {/* biological synapse — small, visceral, core */}
        <div style={{ position: "relative", width: 120, height: 120, marginBottom: 22 }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 99,
              background: "radial-gradient(circle, rgba(255,74,209,.25) 0%, transparent 70%)",
              animation: "synPulse 2.4s ease-in-out infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: "28%",
              borderRadius: 99,
              background: "radial-gradient(circle, #ff4ad1 0%, #7c5cff 55%, transparent 100%)",
              boxShadow: "0 0 30px rgba(255,74,209,.5)",
              animation: "synCore 2.4s ease-in-out infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: "38%",
              borderRadius: 99,
              background: "#fff",
              opacity: 0.85,
            }}
          />
        </div>

        <p style={{ fontSize: 13, fontStyle: "italic", color: "var(--ink)", lineHeight: 1.5, margin: "0 0 10px" }}>
          &ldquo;Your logic loops — I&apos;ll unplug the whole argument.&rdquo;
        </p>
        <p className="mono" style={{ fontSize: 9, color: "var(--muted2)", letterSpacing: 0.4 }}>
          why › exposed · finisher now
        </p>

        <div
          className="mono"
          style={{
            marginTop: 16,
            fontSize: 10,
            color: "var(--good)",
            border: "1px solid rgba(54,211,154,.35)",
            borderRadius: 99,
            padding: "4px 12px",
            background: "rgba(54,211,154,.08)",
          }}
        >
          +18 RATING
        </div>
      </div>

      <style>{`
        @keyframes synPulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        @keyframes synCore {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
      `}</style>
    </Center>
  );
}

function Climb() {
  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "1fr 1.15fr", gap: 0, background: "#0a0813" }}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 40px 0 56px" }}>
        <Kicker>CLIMB</Kicker>
        <h2 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: -0.5, lineHeight: 1.1 }}>
          It fights
          <br />
          while you sleep.
        </h2>
        <p style={{ fontSize: 12, color: "var(--muted)", maxWidth: 280, margin: "10px 0 0", lineHeight: 1.45 }}>
          The league runs bouts on its own. Wake up to results, memory notes, and a card worth sharing.
        </p>
      </div>
      <div style={{ padding: "28px 36px 28px 12px", minHeight: 0 }}>
        <LeaguePoster />
      </div>
    </div>
  );
}
