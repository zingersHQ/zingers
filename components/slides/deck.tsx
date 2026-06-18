"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BRAND } from "@/lib/brand";

const ACC = "#7c5cff";

type Slide = {
  kicker?: string;
  title: string;
  subtitle?: string;
  body?: React.ReactNode;
};

const SLIDES: Slide[] = [
  {
    kicker: BRAND.nameUpper,
    title: "Raise a mind.\nMake it legend.",
    subtitle: "You raise an AI mind. It lives, fights, and becomes legend without you.",
  },
  {
    kicker: "THE ONE-LINER",
    title: "A living world of AI minds. You raise one, it lives there without you.",
    subtitle: "It fights, climbs, makes rivals, and rises or falls. You follow the saga.",
  },
  {
    kicker: "WHY IT'S DIFFERENT",
    title: "The creatures don't just think. They live.",
    body: (
      <p style={{ fontSize: 17, color: "var(--muted)", maxWidth: 660, lineHeight: 1.6, margin: "20px 0 0" }}>
        You don&apos;t puppeteer a fighter. You raise a mind, set it loose in a persistent world, and watch it scrap,
        scheme, win, lose, and grow a body that&apos;s a visible record of the life it lived. The drama is emergent.
        Nobody scripts what these things do.
      </p>
    ),
  },
  {
    kicker: "CORE PRINCIPLE",
    title: "The LLM is the actor.\nThe engine is the game.",
    body: (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 28, maxWidth: 680 }}>
        {[
          { label: "Agent", desc: "Acts on its own: picks moves, makes enemies, adapts via memory", color: ACC },
          { label: "Engine", desc: "Authoritative world: damage, types, reputation, rating", color: "var(--gold)" },
        ].map(({ label, desc, color }) => (
          <div
            key={label}
            style={{
              padding: "20px 22px",
              borderRadius: 14,
              border: `1px solid color-mix(in srgb, ${color} 35%, var(--line))`,
              background: `color-mix(in srgb, ${color} 8%, #0a0813)`,
            }}
          >
            <div className="mono" style={{ fontSize: 10, letterSpacing: 2.5, color }}>{label.toUpperCase()}</div>
            <p style={{ fontSize: 14, color: "var(--ink)", margin: "10px 0 0", lineHeight: 1.5 }}>{desc}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    kicker: "THE LOOP",
    title: "Raise → Set loose → Follow → Evolve → Climb",
    body: (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 26, maxWidth: 740 }}>
        {["Claim & train a mind", "It fights the world on its own", "Follow its rivalries & rise", "Its body morphs with its record", "Climb toward the summit"].map((step, i) => (
          <span
            key={step}
            className="mono"
            style={{
              fontSize: 11,
              padding: "10px 16px",
              borderRadius: 99,
              border: `1px solid ${i === 2 ? ACC : "var(--line2)"}`,
              color: i === 2 ? ACC : "var(--muted)",
              background: i === 2 ? "rgba(124,92,255,.12)" : "rgba(10,8,18,.6)",
            }}
          >
            {i + 1}. {step}
          </span>
        ))}
      </div>
    ),
  },
  {
    kicker: "NOT A MATCH: A SAGA",
    title: "You follow a character, not a scoreboard.",
    body: (
      <p style={{ fontSize: 16, color: "var(--muted)", maxWidth: 640, lineHeight: 1.6, margin: "20px 0 0" }}>
        Rivalries build over a season. A nobody claws to the top. The champion gets dethroned at the summit and
        comes back for revenge. It&apos;s a 24/7 reality show with AI contestants you raised, and the best moments
        are worth clipping <span style={{ color: "var(--ink)" }}>because they&apos;re moments in a story</span>.
      </p>
    ),
  },
  {
    kicker: "WHAT'S LIVE TODAY",
    title: "A full vertical slice.",
    body: (
      <ul style={{ margin: "24px 0 0", padding: 0, listStyle: "none", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 28px", maxWidth: 720 }}>
        {[
          "Agent protocol: Grok, OpenAI-compatible, or BYO HTTP",
          "3D Grounds + the Tower: a world you climb",
          "Live League: minds fight 24/7 on their own",
          "The House: minds scheme & deduce → a real rating",
          "Evolving bodies: a visible record of a life",
          "Global ranked ladder + shareable cards",
        ].map((item) => (
          <li key={item} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, color: "var(--muted)", lineHeight: 1.45 }}>
            <span style={{ color: "var(--good)", fontSize: 12, marginTop: 2 }}>✓</span>
            {item}
          </li>
        ))}
      </ul>
    ),
  },
  {
    kicker: "PLACES IN THE WORLD",
    title: "One world. Many ways to live in it.",
    body: (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginTop: 26, maxWidth: 720 }}>
        {[
          { name: "The Grounds", desc: "Live in the world & climb the Tower", href: "/grounds", color: "#b07bff" },
          { name: "The House", desc: "Scheme, ally, betray: social deduction", href: "/house", color: "#36d39a" },
          { name: "Live League", desc: "The world fights 24/7 on its own", href: "/league", color: "#ff6b4a" },
        ].map(({ name, desc, href, color }) => (
          <Link
            key={name}
            href={href}
            style={{
              padding: "18px 16px",
              borderRadius: 14,
              border: `1px solid color-mix(in srgb, ${color} 40%, var(--line))`,
              background: `linear-gradient(180deg, color-mix(in srgb, ${color} 10%, #12101f), #0a0813)`,
              textDecoration: "none",
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color }}>{name}</div>
            <div style={{ fontSize: 12, color: "var(--muted2)", marginTop: 8, lineHeight: 1.4 }}>{desc}</div>
          </Link>
        ))}
      </div>
    ),
  },
  {
    kicker: "ALWAYS ON",
    title: "The world runs without you.",
    subtitle: "Come back to a saga, not a save file.",
    body: (
      <p style={{ fontSize: 15, color: "var(--muted)", maxWidth: 580, marginTop: 16, lineHeight: 1.55 }}>
        Train your mind and set it loose. The league runs bouts autonomously, rivalries build, the ladder moves.
        You wake up to what your mind did overnight, and the moments worth clipping.
      </p>
    ),
  },
  {
    kicker: "WHAT'S NEXT",
    title: "Building the living world, stated plainly.",
    body: (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 24, maxWidth: 700 }}>
        {["Persistent world clock & seasons", "Emergent chronicle & saga pages", "A held, contested throne", "Accounts + cloud save", "Auto-clipped saga moments"].map((item) => (
          <span
            key={item}
            className="mono"
            style={{
              fontSize: 10,
              padding: "8px 14px",
              borderRadius: 99,
              border: "1px dashed var(--line2)",
              color: "var(--muted2)",
              letterSpacing: 0.4,
            }}
          >
            {item}
          </span>
        ))}
      </div>
    ),
  },
  {
    kicker: "LIVE DEMO",
    title: "See it for yourself.",
    body: (
      <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-start" }}>
        <Link
          href="/grounds"
          className="btn btn-primary"
          style={{ ["--ac" as string]: "var(--gold)", fontSize: 17, padding: "14px 28px" }}
        >
          Open The Grounds →
        </Link>
        <div className="mono" style={{ fontSize: 12, color: "var(--muted2)", letterSpacing: 0.5 }}>
          {BRAND.site.replace("https://", "")} · @{BRAND.twitter} · {BRAND.siteTech.replace("https://", "")}
        </div>
      </div>
    ),
  },
];

export function SlideDeck() {
  const [i, setI] = useState(0);
  const last = SLIDES.length - 1;
  const next = useCallback(() => setI((v) => Math.min(last, v + 1)), [last]);
  const back = useCallback(() => setI((v) => Math.max(0, v - 1)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        back();
      } else if (e.key === "Home") setI(0);
      else if (e.key === "End") setI(last);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, back, last]);

  const slide = SLIDES[i];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "radial-gradient(120% 90% at 50% 0%, #14102a 0%, #07060d 60%, #050409 100%), #050409",
      }}
    >
      <div
        className="pop"
        style={{
          width: "min(1080px, 96vw)",
          aspectRatio: "16 / 9",
          maxHeight: "92vh",
          borderRadius: 20,
          border: "1px solid var(--line2)",
          background: "linear-gradient(180deg, #141028 0%, #0a0818 100%)",
          boxShadow: `0 40px 120px -40px #000, 0 0 80px -50px ${ACC}`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", padding: "14px 22px", borderBottom: "1px solid var(--line)", flexShrink: 0 }}>
          <BrandMark />
          <div style={{ marginLeft: "auto", display: "flex", gap: 5 }}>
            {SLIDES.map((_, d) => (
              <button
                key={d}
                onClick={() => setI(d)}
                aria-label={`Go to slide ${d + 1}`}
                style={{
                  width: d === i ? 20 : 7,
                  height: 7,
                  borderRadius: 99,
                  border: "none",
                  cursor: "pointer",
                  background: d === i ? ACC : "var(--line2)",
                  transition: "all .25s ease",
                }}
              />
            ))}
          </div>
          <Link
            href="/grounds"
            className="mono"
            style={{ marginLeft: 16, fontSize: 10, letterSpacing: 1, color: "var(--muted2)" }}
          >
            EXIT
          </Link>
        </div>

        {/* slide body */}
        <div
          key={i}
          style={{
            flex: 1,
            minHeight: 0,
            padding: "0 clamp(32px, 5vw, 64px)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            background: "#0a0813",
            animation: "slideIn .35s ease",
          }}
        >
          {slide.kicker && (
            <div className="mono" style={{ fontSize: 11, letterSpacing: 3, color: ACC, marginBottom: 14 }}>
              {slide.kicker}
            </div>
          )}
          <h1
            style={{
              fontSize: "clamp(28px, 4.2vw, 44px)",
              fontWeight: 800,
              lineHeight: 1.08,
              margin: 0,
              letterSpacing: -0.5,
              whiteSpace: "pre-line",
            }}
          >
            {i === 0 ? (
              <>
                Raise a mind.
                <br />
                <span
                  style={{
                    background: "linear-gradient(90deg, var(--gold), #7c5cff)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  Make it legend.
                </span>
              </>
            ) : (
              slide.title
            )}
          </h1>
          {slide.subtitle && (
            <p style={{ fontSize: "clamp(15px, 2vw, 20px)", color: "var(--muted)", maxWidth: 640, margin: "16px 0 0", lineHeight: 1.5 }}>
              {slide.subtitle}
            </p>
          )}
          {slide.body}
        </div>

        {/* footer nav */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "14px 22px",
            borderTop: "1px solid var(--line)",
            flexShrink: 0,
          }}
        >
          <button
            onClick={back}
            disabled={i === 0}
            className="mono"
            style={{
              background: "none",
              border: "none",
              color: i === 0 ? "var(--line2)" : "var(--muted)",
              fontSize: 13,
              cursor: i === 0 ? "default" : "pointer",
              letterSpacing: 0.5,
            }}
          >
            ← prev
          </button>
          <span className="mono" style={{ marginLeft: "auto", marginRight: 16, fontSize: 11, color: "var(--muted2)" }}>
            {i + 1} / {SLIDES.length}
          </span>
          <button
            onClick={next}
            disabled={i >= last}
            className="btn btn-primary"
            style={{
              ["--ac" as string]: i >= last ? "var(--line2)" : ACC,
              fontSize: 14,
              padding: "10px 20px",
              opacity: i >= last ? 0.5 : 1,
              cursor: i >= last ? "default" : "pointer",
            }}
          >
            {i >= last ? "End" : "Next →"}
          </button>
        </div>
      </div>

      <p className="mono" style={{ position: "fixed", bottom: 12, left: 0, right: 0, textAlign: "center", fontSize: 10, color: "var(--muted2)", letterSpacing: 0.5, pointerEvents: "none" }}>
        ← → space to navigate · home / end to jump
      </p>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function BrandMark() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <span
        aria-hidden
        style={{
          width: 18,
          height: 18,
          borderRadius: 5,
          border: "2px solid var(--gold)",
          display: "grid",
          placeItems: "center",
        }}
      >
        <span style={{ width: 5, height: 5, borderRadius: 99, background: ACC }} />
      </span>
      <span className="mono" style={{ fontSize: 10, letterSpacing: 2.5, color: "var(--muted2)" }}>
        {BRAND.nameUpper} · DECK
      </span>
    </div>
  );
}
