"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Champion, CreatureType } from "@/lib/types";
import { BRAND } from "@/lib/brand";
import { armOnboardingAudio } from "@/lib/sound-gallery";
import { trackOnce } from "@/lib/track";
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

const InfiniteFlightHero = dynamic(() => import("@/components/home/infinite-flight-hero"), {
  ssr: false,
  loading: () => <div className="mono" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "var(--muted2)", fontSize: 12 }}>summoning the sky…</div>,
});

// Standalone world vista for beats with no 3D figure (the Forces wheel).
const BiomeBackdropCanvas = dynamic(() => import("@/components/grounds/biome-backdrop").then((m) => m.BiomeBackdropCanvas), { ssr: false, loading: () => null });

/** Richer meadow + scatter on intro backdrops; foreground ring keeps the close camera framed in vegetation. */
const INTRO_BACKDROP = { richness: 1.38, framing: true } as const;

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

  // Flight-first story — World → Companion → Forces → Arenas → Fly.
  // TEMP (2026-07): later beats are parked. Slide 1 (Awaken) stays as the
  // desktop homepage hero; Next / → / Enter / Space / SKIP close the deck
  // straight into "Summoning minds for you to raise…" → champion select.
  // Phone homepage is /m Take flight (Trainer+champion), not this deck —
  // Landing redirects phones there. Uncomment the full assignment to restore.
  const slides: React.ReactNode[] = [
    <Awaken key="awaken" mobile={isMobile} embedded={embedded} />,
    // <Shape key="shape" mobile={isMobile} embedded={embedded} />,
    // <Forces key="forces" mobile={isMobile} embedded={embedded} />,
    // <Fight key="fight" mobile={isMobile} embedded={embedded} />,
    // <Legend key="legend" mobile={isMobile} embedded={embedded} />,
  ];
  /*
  const slides = isMobile
    ? [<Awaken key="awaken" mobile embedded={embedded} />, <Shape key="shape" mobile embedded={embedded} />, <Legend key="legend" mobile embedded={embedded} />]
    : [<Awaken key="awaken" embedded={embedded} />, <Shape key="shape" embedded={embedded} />, <Forces key="forces" embedded={embedded} />, <Fight key="fight" embedded={embedded} />, <Legend key="legend" embedded={embedded} />];
  */
  const count = slides.length;
  const LAST = count - 1;
  // Hero-only deck: the right control is Start → summoning (not "next slide").
  const heroOnly = count <= 1;

  const [i, setI] = useState(0);
  const next = useCallback(() => setI((v) => (v >= LAST ? v : v + 1)), [LAST]);
  const back = useCallback(() => setI((v) => Math.max(0, v - 1)), []);
  const startOrAdvance = useCallback(() => {
    if (heroOnly || i >= LAST) onClose();
    else next();
  }, [heroOnly, i, LAST, onClose, next]);

  // Keep the active index valid when the layout flips between desktop/mobile.
  useEffect(() => {
    setI((v) => Math.min(v, LAST));
  }, [LAST]);

  // first-journey funnel (docs/two-doors.md §5): reaching the last beat means the
  // visitor watched the cinematic through rather than skipping. Once per browser.
  // Hero-only (parked later slides) is not a watched cinematic — don't count it.
  useEffect(() => {
    if (heroOnly) return;
    if (i >= LAST) trackOnce("fj_cinematic", "zingers_fj_cinematic_v1");
  }, [i, LAST, heroOnly]);

  // Let the host (the landing page) react to the deck advancing — e.g. hide the
  // rest of the homepage once you leave slide 1 so the deck takes full focus.
  useEffect(() => {
    onIndexChange?.(i);
  }, [i, onIndexChange]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Space / right / enter page the deck forward — even when embedded, where
      // the deck deliberately takes over focus from the homepage below it.
      // Hero-only: those keys are Start → summoning.
      if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        startOrAdvance();
      } else if (e.key === "ArrowLeft" && !heroOnly) back();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [startOrAdvance, back, onClose, heroOnly]);

  useEffect(() => armOnboardingAudio(), []);

  // Horizontal swipe between beats on touch devices; vertical drags fall through to
  // page scroll (see touch-action: pan-y on the embedded overlay + scrollThrough canvas).
  const swipeRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    swipeRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  }, []);
  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const start = swipeRef.current;
      const t = e.changedTouches[0];
      swipeRef.current = null;
      if (!start || !t) return;
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      if (Date.now() - start.t > 700) return;
      if (Math.abs(dx) < 48) return;
      if (Math.abs(dy) > Math.abs(dx) * 0.75) return;
      if (dx < 0) startOrAdvance();
      else if (!heroOnly) back();
    },
    [startOrAdvance, back, heroOnly],
  );

  const touchScroll = embedded && isMobile;

  return (
    <div
      style={
        embedded
          ? {
              position: "relative",
              width: "100%",
              height: "100%",
              background: ONBOARDING_BG,
              overflow: touchScroll ? "visible" : "hidden",
              touchAction: touchScroll ? "pan-y" : undefined,
            }
          : { position: "fixed", inset: 0, zIndex: 80, background: ONBOARDING_BG }
      }
    >
      <OnboardingAudio compact={isMobile} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow: touchScroll ? "visible" : "hidden",
          touchAction: touchScroll ? "pan-y" : undefined,
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
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

        {/* side navigation — transparent, white outline.
            Hero-only: the right control is Start → summoning (no left pager). */}
        {!heroOnly && i > 0 && <NavArrow side="left" onClick={back} />}
        <NavArrow side="right" onClick={startOrAdvance} label={heroOnly || i >= LAST ? "start" : "next"} />
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

function NavArrow({ side, onClick, label }: { side: "left" | "right"; onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label ?? (side === "left" ? "previous" : "next")}
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
        touchAction: "manipulation",
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
// Infinite flight: Trainer + champion over a looping belt of real Grounds
// islands (Void Garden daylight + nature kit). Same hero as the mobile door.
function Awaken({ mobile, embedded }: { mobile?: boolean; embedded?: boolean }) {
  return (
    <div style={{ ...FULL, background: "radial-gradient(120% 90% at 50% 10%, #f0c090 0%, #c88858 42%, #2a1830 100%)" }}>
      <Stage>
        <div style={{ position: "absolute", inset: 0, pointerEvents: embedded ? "none" : undefined }}>
          <InfiniteFlightHero variant={mobile ? "mobile" : "desktop"} />
        </div>
      </Stage>
      <LowerThird
        mobile={mobile}
        kicker="WELCOME"
        title={
          <>
            You fly.
            <br />
            It fights.
          </>
        }
        body="You're the Trainer: jetpack lit, a thinking champion flying at your side. Raise it, tune it, and send it into the battles you climb over — you both rise."
      />
    </div>
  );
}

// ── Beat 2 — SHAPE ───────────────────────────────────────────────────────────
// Training: the agent throws practice strikes while the strategy you pick forges
// its build.
function Shape({ mobile, embedded }: { mobile?: boolean; embedded?: boolean }) {
  return (
    <div style={FULL}>
      <Stage>
        <AgentShowcase
          champion={HERO}
          type={HERO_TYPE}
          scale={mobile ? 0.6 : 0.78}
          animMode="train"
          biomeId="ember"
          backdropRichness={INTRO_BACKDROP.richness}
          backdropFraming={INTRO_BACKDROP.framing}
          scrollThrough={embedded}
        />
      </Stage>
      <LowerThird
        mobile={mobile}
        kicker="YOUR CHAMPION"
        title={
          <>
            Claim a mind.
            <br />
            It flies with you.
          </>
        }
        body="You adopt a raw mind and it rises to your side. Shape how it grows and its body becomes the visible story of everything you gave it, yours and unlike anyone else's."
      />
    </div>
  );
}

// ── Beat 3 — FORCES ──────────────────────────────────────────────────────────
// The one diagram that makes the whole game legible BEFORE any proper noun lands
// in 3D: five fighting styles on a wheel, each beating the next. Names are plain
// (Logic / Static / Calm / Chorus / Spark) so the player leaves knowing what a
// "Force" is and that a "Clan" is just the Force you pick to fight for.
function Forces({ mobile, embedded }: { mobile?: boolean; embedded?: boolean }) {
  return (
    <div style={FULL}>
      {/* a quiet Void Garden vista behind the diagram */}
      <div style={{ position: "absolute", inset: 0 }}>
        <Stage>
          <BiomeBackdropCanvas biomeId="void" richness={INTRO_BACKDROP.richness} framing={INTRO_BACKDROP.framing} />
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
        body="Every champion is one of five Forces, its fighting style, shown by its colour and its sigil (its Force badge). Each Force beats the next around the wheel and loses to the one behind it. Later you swear to one Force to fight for: that’s your Clan."
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

function Fight({ mobile, embedded }: { mobile?: boolean; embedded?: boolean }) {
  // Swell the procedural score to combat for the duel beat, then settle it back
  // to the calm hub mood on the way out (mute toggle still wins via the engine).
  useEffect(() => {
    setMood("battle");
    return () => setMood("concord");
  }, []);
  return (
    <div style={FULL}>
      <Stage>
        <AgentShowcase
          champion={HERO}
          type={HERO_TYPE}
          scale={mobile ? 0.46 : 0.56}
          rival={{ champion: RIVAL.champion, type: RIVAL.type }}
          biomeId="colosseum"
          backdropRichness={INTRO_BACKDROP.richness}
          backdropFraming={INTRO_BACKDROP.framing}
          scrollThrough={embedded}
        />
      </Stage>
      <MatchupTag mobile={mobile} />
      <ReasoningBubble mobile={mobile} />
      <LowerThird
        mobile={mobile}
        kicker="THE ARENAS"
        title={
          <>
            And when you want it,
            <br />
            the fireworks.
          </>
        }
        body="Fly your champion to an arena and it fights on its own, thinking, adapting, arguing for its life. A spectacular payoff you choose, never the reason you're here."
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

// ── Finale — FLY ─────────────────────────────────────────────────────────────
// The agent leaps (reads as lift-off), evolution flaring — the deck ends on the
// joy of flight, with the living world (the async league) turning in the corner.
const OVERNIGHT: { who: string; verdict: string; won: boolean }[] = [
  { who: "vs. AXIOM", verdict: "broke the proof", won: true },
  { who: "vs. VOX", verdict: "outlasted the room", won: true },
  { who: "vs. EMBER", verdict: "burned out late", won: false },
];

function Legend({ mobile, embedded }: { mobile?: boolean; embedded?: boolean }) {
  return (
    <div style={FULL}>
      <Stage>
        <AgentShowcase
          champion={HERO}
          type={HERO_TYPE}
          scale={mobile ? 0.6 : 0.74}
          gesture="jump"
          animMode="jump"
          biomeId="amphitheatre"
          backdropRichness={INTRO_BACKDROP.richness}
          backdropFraming={INTRO_BACKDROP.framing}
          scrollThrough={embedded}
        />
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
        <div className="mono" style={{ fontSize: 8.5, letterSpacing: 2, color: "var(--muted2)", marginBottom: 9 }}>THE WORLD, WHILE YOU'RE AWAY</div>
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
        kicker="FLY"
        title={
          <>
            Then you fly.
            <br />
            Soar the deep.
          </>
        }
        body="Chase towers, run the circuit, glide the drifting regions with your champion at your wing. The Grounds run on without you, and stretch far past the Concord, the neutral hub at their center."
      />
    </div>
  );
}

// Parked later beats — kept reachable while only Awaken is in the deck so
// restore (uncomment Shape/Forces/Fight/Legend above) stays type-checked.
const _PARKED_FIRST_RUN_BEATS = { Shape, Forces, Fight, Legend };
void _PARKED_FIRST_RUN_BEATS;
