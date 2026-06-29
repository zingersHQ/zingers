"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Champion, CreatureType } from "@/lib/types";
import { BRAND } from "@/lib/brand";
import { armOnboardingAudio } from "@/lib/sound-gallery";
import { ONBOARDING_BG } from "@/lib/iconography";
import { LowerThird } from "@/components/intro/lower-third";
import { OnboardingAudio } from "@/components/intro/onboarding-audio";
import { RenderBoundary } from "@/components/grounds/render-guard";
import { FORCES, wheelNeighbors } from "@/lib/lore/canon";
import { TYPE_COLOR } from "@/lib/evolve/progression";
import { showcaseChampion } from "@/lib/render/showcase";
import { ForcesWheel } from "@/components/lore/forces-wheel";
import { speakCreatureType, stopCreature, primeCreature } from "@/lib/creature-voice";
import { setMood } from "@/lib/ambience-bus";

const AgentShowcase = dynamic(() => import("./agent-showcase"), {
  ssr: false,
  loading: () => <div className="mono" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "var(--muted2)", fontSize: 12 }}>summoning an agent…</div>,
});

// Standalone world vista for beats with no 3D figure (the Forces wheel).
const BiomeBackdropCanvas = dynamic(() => import("@/components/grounds/biome-backdrop").then((m) => m.BiomeBackdropCanvas), { ssr: false, loading: () => null });

const HERO: Champion = { xp: 38000, wins: 74, losses: 8, battles: 82, aggression: 19, control: 9, resilience: 7, flair: 16, creativity: 13, rating: 1492 };
const HERO_TYPE: CreatureType = "CHAOS";

// The rival in the arena beat. CHAOS sits one step ahead of COMPOSURE on the
// Wheel, so the hero "breaks the frame" and wins — the player's first taste of
// the type triangle, shown rather than explained.
const RIVAL = showcaseChampion("BASTION"); // COMPOSURE / The Stillness

const ACC = "#7c5cff";

export function FirstRun({ onClose, embedded = false, onIndexChange }: { onClose: () => void; embedded?: boolean; onIndexChange?: (i: number) => void }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 640px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // A four-beat story — Awaken → Shape → Fight → Legend — where the live agent
  // performs an action in every scene. On a phone we keep the two beats that hit
  // hardest: the birth and the fight.
  const slides = isMobile
    ? [<Awaken key="awaken" mobile />, <Forces key="forces" mobile />, <Fight key="fight" mobile />]
    : [<Awaken key="awaken" />, <Shape key="shape" />, <Forces key="forces" />, <Fight key="fight" />, <Legend key="legend" />];
  const count = slides.length;
  const LAST = count - 1;

  const [i, setI] = useState(0);
  const next = useCallback(() => setI((v) => (v >= LAST ? v : v + 1)), [LAST]);
  const back = useCallback(() => setI((v) => Math.max(0, v - 1)), []);

  // Keep the active index valid when the layout flips between desktop/mobile.
  useEffect(() => {
    setI((v) => Math.min(v, LAST));
  }, [LAST]);

  // Let the host (the landing page) react to the deck advancing — e.g. hide the
  // rest of the homepage once you leave slide 1 so the deck takes full focus.
  useEffect(() => {
    onIndexChange?.(i);
  }, [i, onIndexChange]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Space / right / enter page the deck forward — even when embedded, where
      // the deck deliberately takes over focus from the homepage below it.
      if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        i >= LAST ? onClose() : next();
      } else if (e.key === "ArrowLeft") back();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i, LAST, next, back, onClose]);

  useEffect(() => armOnboardingAudio(), []);

  return (
    <div
      style={
        embedded
          ? { position: "relative", width: "100%", height: "100%", background: ONBOARDING_BG, overflow: "hidden" }
          : { position: "fixed", inset: 0, zIndex: 80, background: ONBOARDING_BG }
      }
    >
      <OnboardingAudio compact={isMobile} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
        }}
      >
        {/* full-bleed scene with cinematic dip-transition between beats */}
        <div style={{ position: "absolute", inset: 0, background: "#0a0813" }}>
          <SlideStage active={i} slides={slides} />
        </div>

        {/* transparent header overlay: brand · progress dots · skip */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, display: "flex", alignItems: "center", padding: "16px 20px", gap: 8, pointerEvents: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span aria-hidden style={{ width: 18, height: 18, borderRadius: 5, border: "2px solid var(--gold)", display: "grid", placeItems: "center" }}>
              <span style={{ width: 5, height: 5, borderRadius: 9, background: ACC }} />
            </span>
            <span className="mono" style={{ fontSize: 10, letterSpacing: 2.5, color: "var(--muted2)" }}>{BRAND.nameUpper}</span>
          </div>
          {count > 1 && (
            <div style={{ marginLeft: "auto", display: "flex", gap: 6, pointerEvents: "auto" }}>
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
          <button onClick={onClose} className="mono" style={{ marginLeft: count > 1 ? 14 : "auto", pointerEvents: "auto", background: "none", border: "none", color: "var(--muted2)", fontSize: 11, letterSpacing: 1, cursor: "pointer" }}>
            SKIP
          </button>
        </div>

        {/* side navigation — transparent, white outline */}
        {i > 0 && <NavArrow side="left" onClick={back} />}
        <NavArrow side="right" onClick={() => (i >= LAST ? onClose() : next())} />
      </div>
    </div>
  );
}

// Cinematic beat-to-beat transition. A hard swap of `slides[i]` felt mechanic
// and also flashed the 3D scene as it remounted. Instead we "dip": the outgoing
// beat eases out + fades into the dark stage, the swap happens hidden in that
// dark beat, then the incoming beat eases in from the travel direction. Because
// the remount lands at opacity 0, you never see the agent pop or the loader.
const EXIT_MS = 300;
const ENTER_MS = 560;

function SlideStage({ active, slides }: { active: number; slides: React.ReactNode[] }) {
  const [shown, setShown] = useState(active);
  const [mode, setMode] = useState<"in" | "out">("in");
  const dirRef = useRef(1);

  useEffect(() => {
    if (active === shown) return;
    dirRef.current = active > shown ? 1 : -1;
    setMode("out");
    const t = setTimeout(() => {
      // swap + enter in one commit so the new beat never flickers through "out"
      setShown(active);
      setMode("in");
    }, EXIT_MS);
    return () => clearTimeout(t);
  }, [active, shown]);

  const dir = dirRef.current;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div
        key={shown}
        style={{
          position: "absolute",
          inset: 0,
          willChange: "opacity, transform",
          ["--dx" as string]: `${dir * 46}px`,
          animation:
            mode === "out"
              ? `deckOut ${EXIT_MS}ms cubic-bezier(.4,0,1,1) forwards`
              : `deckIn ${ENTER_MS}ms cubic-bezier(.16,.84,.32,1) both`,
        }}
      >
        {slides[shown]}
      </div>
      <style>{`
        @keyframes deckIn { from { opacity: 0; transform: translateX(var(--dx)) scale(.99); } to { opacity: 1; transform: none; } }
        @keyframes deckOut { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateX(calc(var(--dx) * -1)) scale(.99); } }
      `}</style>
    </div>
  );
}

function NavArrow({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={side === "left" ? "previous" : "next"}
      style={{
        position: "absolute",
        zIndex: 10,
        top: "50%",
        transform: "translateY(-50%)",
        [side]: "clamp(10px, 3vw, 28px)",
        width: 48,
        height: 48,
        borderRadius: 99,
        background: "transparent",
        border: "1px solid rgba(255,255,255,.7)",
        color: "#fff",
        fontSize: 20,
        lineHeight: 1,
        cursor: "pointer",
        display: "grid",
        placeItems: "center",
      }}
    >
      {side === "left" ? "←" : "→"}
    </button>
  );
}

const FULL: React.CSSProperties = { position: "absolute", inset: 0, background: "#0a0813", overflow: "hidden" };

function Stage({ children }: { children: React.ReactNode }) {
  return (
    <RenderBoundary
      fallback={
        <div className="mono" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "var(--muted2)", fontSize: 11, padding: 24, textAlign: "center" }}>
          3D preview unavailable. Enable graphics acceleration in your browser to see live agents.
        </div>
      }
    >
      {children}
    </RenderBoundary>
  );
}

// ── Beat 1 — AWAKEN ──────────────────────────────────────────────────────────
// A mind ignites: slow camera push-in onto a breathing agent, aura alight.
function Awaken({ mobile }: { mobile?: boolean }) {
  return (
    <div style={FULL}>
      <Stage>
        <AgentShowcase champion={HERO} type={HERO_TYPE} scale={mobile ? 0.6 : 0.78} dolly gesture="idle" animMode="standing" />
      </Stage>
      <LowerThird
        mobile={mobile}
        kicker="AN AI YOU RAISE"
        title={
          <>
            A mind argues itself
            <br />
            into a body.
          </>
        }
        body="You don't fight. You raise it — choose its brain, drill how it thinks, and watch what you teach become flesh."
      />
    </div>
  );
}

// ── Beat 2 — SHAPE ───────────────────────────────────────────────────────────
// Training: the agent throws practice strikes while the doctrine you pick forges
// its build.
function Shape({ mobile }: { mobile?: boolean }) {
  return (
    <div style={FULL}>
      <Stage>
        <AgentShowcase champion={HERO} type={HERO_TYPE} scale={mobile ? 0.6 : 0.78} gesture="punch" animMode="punch" biomeId="ember" />
      </Stage>
      <LowerThird
        mobile={mobile}
        kicker="TRAIN"
        title={
          <>
            Teach it how
            <br />
            to think.
          </>
        }
        body="Any brain, any doctrine. What you drill in becomes its body — heavier fists, a sharper skull, a frame that won't fall."
      >
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 16 }}>
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
                background: idx === 0 ? "rgba(124,92,255,.14)" : "rgba(10,8,18,.5)",
              }}
            >
              {l}
            </span>
          ))}
        </div>
      </LowerThird>
    </div>
  );
}

// ── Beat 3 — FORCES ──────────────────────────────────────────────────────────
// The one diagram that makes the whole game legible BEFORE any proper noun lands
// in 3D: five fighting styles on a wheel, each beating the next. Names are plain
// (Logic / Static / Calm / Chorus / Spark) so the player leaves knowing what a
// "Force" is and that a "Clan" is just the Force you pick to fight for.
function Forces({ mobile }: { mobile?: boolean }) {
  return (
    <div style={FULL}>
      {/* a quiet Void Garden vista behind the diagram */}
      <div style={{ position: "absolute", inset: 0 }}>
        <Stage>
          <BiomeBackdropCanvas biomeId="void" />
        </Stage>
        {/* dim the landscape so the wheel + copy stay legible on top */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 90% at 50% 38%, rgba(10,8,18,.25) 0%, rgba(10,8,18,.62) 60%, rgba(10,8,18,.82) 100%)" }} />
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          paddingBottom: mobile ? "44vh" : 240,
          paddingTop: mobile ? 56 : 40,
        }}
      >
        <ForcesWheel size={mobile ? 250 : 360} />
      </div>
      <LowerThird
        mobile={mobile}
        kicker="THE FIVE FORCES"
        title={
          <>
            Five styles.
            <br />
            One wheel.
          </>
        }
        body="Every champion is one of five Forces — its fighting style, shown by its colour and sigil. Each Force beats the next around the wheel and loses to the one behind it. Later you swear to one Force to fight for: that’s your Clan."
      />
    </div>
  );
}

// ── Beat 4 — FIGHT ───────────────────────────────────────────────────────────
// The arena: a self-running duel where the hero presses its type advantage and
// thinks out loud. CHAOS (hero) sits one step ahead of COMPOSURE (rival).
const HERO_LINES: { line: string; why: string }[] = [
  { line: "Too steady — and steady things shatter clean.", why: "why › overload the frame" },
  { line: "Your structure is the weak point. Watch the thread.", why: "why › pull, don't push" },
  { line: "Frame's broken. There's nothing left to defend.", why: "why › finisher now" },
];

// The rival holds the line between the hero's barbs — COMPOSURE refusing to break —
// so the beat reads as a two-voice exchange (both creatures "speak"), not a monologue.
const RIVAL_RETORTS = ["I hold.", "Stay calm.", "You'll tire first."];

function Fight({ mobile }: { mobile?: boolean }) {
  // Swell the procedural score to combat for the duel beat, then settle it back
  // to the calm hub mood on the way out (mute toggle still wins via the engine).
  useEffect(() => {
    setMood("battle");
    return () => setMood("concord");
  }, []);
  return (
    <div style={FULL}>
      <Stage>
        <AgentShowcase champion={HERO} type={HERO_TYPE} scale={mobile ? 0.46 : 0.56} rival={{ champion: RIVAL.champion, type: RIVAL.type }} biomeId="colosseum" />
      </Stage>
      <MatchupTag mobile={mobile} />
      <ReasoningBubble mobile={mobile} />
      <LowerThird
        mobile={mobile}
        kicker="FIGHT"
        title={
          <>
            It argues
            <br />
            for its life.
          </>
        }
        body="Every move is reasoning you can feel. Five Forces turn one wheel — each style beats the next. Your champion just broke the frame."
      />
    </div>
  );
}

function MatchupTag({ mobile }: { mobile?: boolean }) {
  const hero = FORCES[HERO_TYPE];
  const prey = FORCES[wheelNeighbors(HERO_TYPE).prey];
  return (
    <div
      className="mono"
      style={{
        position: "absolute",
        zIndex: 3,
        top: mobile ? 40 : 52,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: 9,
        pointerEvents: "none",
        fontSize: mobile ? 9 : 11,
        letterSpacing: 1.2,
        background: "rgba(10,8,18,.6)",
        border: "1px solid var(--line2)",
        borderRadius: 99,
        padding: mobile ? "5px 11px" : "6px 14px",
        backdropFilter: "blur(6px)",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ color: hero.hex, fontWeight: 700 }}>{hero.sigil} {hero.name}</span>
      <span style={{ color: "var(--good)", letterSpacing: 0.5 }}>beats</span>
      <span style={{ color: prey.hex, fontWeight: 700 }}>{prey.name} {prey.sigil}</span>
    </div>
  );
}

// The "thinks out loud" beat: a reasoning bar that cycles like a live bout turn.
function ReasoningBubble({ mobile }: { mobile?: boolean }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    primeCreature();
    const id = setInterval(() => setN((v) => (v + 1) % HERO_LINES.length), 2600);
    return () => {
      clearInterval(id);
      stopCreature();
    };
  }, []);
  // Each turn the hero "argues for its life" in its CHAOS voice; the rival mutters
  // back a beat later in its own voice, so you hear the duel, not just see it.
  useEffect(() => {
    speakCreatureType(HERO_LINES[n].line, HERO_TYPE);
    const id = setTimeout(() => speakCreatureType(RIVAL_RETORTS[n % RIVAL_RETORTS.length], RIVAL.type), 2000);
    return () => clearTimeout(id);
  }, [n]);
  const t = HERO_LINES[n];
  const c = TYPE_COLOR[HERO_TYPE];
  return (
    <div
      style={{
        position: "absolute",
        zIndex: 4,
        transform: "translateZ(0)",
        top: mobile ? "13%" : "15%",
        left: mobile ? "5%" : "6%",
        maxWidth: mobile ? 210 : 290,
        pointerEvents: "none",
        background: "rgba(22,17,42,.94)",
        border: `1px solid ${c}`,
        borderRadius: 14,
        borderBottomLeftRadius: 3,
        padding: mobile ? "10px 13px" : "13px 16px",
        backdropFilter: "blur(7px)",
        boxShadow: `0 10px 34px rgba(0,0,0,.55), 0 0 22px ${c}40`,
      }}
    >
      <div className="mono" style={{ fontSize: mobile ? 7.5 : 8.5, letterSpacing: 1.6, color: c, marginBottom: 6 }}>THINKING OUT LOUD</div>
      {/* only the line animates in; the shell stays painted so it never flickers out */}
      <div key={n} style={{ animation: "zingerIn .4s cubic-bezier(.2,.8,.2,1)" }}>
        <p style={{ fontSize: mobile ? 12.5 : 14.5, fontStyle: "italic", color: "#fff", lineHeight: 1.4, margin: 0 }}>&ldquo;{t.line}&rdquo;</p>
        <p className="mono" style={{ fontSize: mobile ? 8.5 : 9.5, color: c, letterSpacing: 0.4, margin: "8px 0 0" }}>{t.why}</p>
      </div>
      <style>{`@keyframes zingerIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }`}</style>
    </div>
  );
}

// ── Beat 4 — LEGEND (desktop only) ───────────────────────────────────────────
// Victory & the climb: the agent leaps, evolution flaring, while the overnight
// league keeps fighting in the corner.
const OVERNIGHT: { who: string; verdict: string; won: boolean }[] = [
  { who: "vs. AXIOM", verdict: "broke the proof", won: true },
  { who: "vs. VOX", verdict: "outlasted the room", won: true },
  { who: "vs. EMBER", verdict: "burned out late", won: false },
];

function Legend({ mobile }: { mobile?: boolean }) {
  return (
    <div style={FULL}>
      <Stage>
        <AgentShowcase champion={HERO} type={HERO_TYPE} scale={mobile ? 0.6 : 0.74} gesture="jump" animMode="jump" biomeId="amphitheatre" />
      </Stage>
      <div
        style={{
          position: "absolute",
          zIndex: 3,
          top: mobile ? 44 : 58,
          right: mobile ? 16 : 28,
          width: mobile ? 184 : 222,
          pointerEvents: "none",
          background: "rgba(10,8,18,.62)",
          border: "1px solid var(--line2)",
          borderRadius: 14,
          padding: "12px 13px",
          backdropFilter: "blur(7px)",
        }}
      >
        <div className="mono" style={{ fontSize: 8.5, letterSpacing: 2, color: "var(--muted2)", marginBottom: 9 }}>WHILE YOU SLEPT</div>
        {OVERNIGHT.map((r) => (
          <div key={r.who} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderTop: "1px solid var(--line)" }}>
            <span className="mono" style={{ fontSize: 9, fontWeight: 700, color: r.won ? "var(--good)" : "var(--bad)", width: 26 }}>{r.won ? "WIN" : "LOSS"}</span>
            <span style={{ fontSize: 11, color: "var(--ink)", flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {r.who} <span style={{ color: "var(--muted2)" }}>· {r.verdict}</span>
            </span>
          </div>
        ))}
      </div>

      <LowerThird
        mobile={mobile}
        kicker="CLIMB"
        title={
          <>
            Win while you sleep.
            <br />
            Become legend.
          </>
        }
        body="The league runs duels on its own. Wake to results, memory notes, and a card worth sharing — your mind, climbing without you."
      />
    </div>
  );
}
