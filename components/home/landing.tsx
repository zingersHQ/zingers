"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { BRAND, STORAGE } from "@/lib/brand";
import { TYPE_COLOR } from "@/lib/evolve/progression";
import { showcaseChampion } from "@/lib/render/showcase";
import { ChampionPortrait } from "@/components/render/champion-portrait";
import { FirstRun } from "@/components/intro/first-run";
import { FOUNDING_REGIONS, FORCES } from "@/lib/lore/canon";
import { worldByRegion, worldById } from "@/components/grounds/worlds";
import { warmGroundsChunk } from "@/lib/render/preload-grounds";
import { FIRST_FIGHT_WORLD } from "@/lib/first-duel";
import { useIsMobile } from "@/lib/use-device";
import { MOBILE_PLAY_HREF, playEntryHref } from "@/lib/play-nav";
import { RegionPoster } from "@/components/lore/region-poster";
import type { Champion } from "@/lib/types";

/** Fades a block in once it scrolls into view (no-op under reduced motion). */
function Reveal({ children, delay = 0, as: Tag = "div", className = "", style }: {
  children: ReactNode;
  delay?: number;
  as?: "div" | "section" | "li";
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e && (e.isIntersecting || e.boundingClientRect.top < window.innerHeight)) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag
      ref={ref as never}
      className={`lp-reveal${shown ? " is-in" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms`, ...style }}
    >
      {children}
    </Tag>
  );
}

// Same mind, two careers — the body is the argument made visible.
const EVO = showcaseChampion("BASTION");
const ROOKIE: Champion = {
  xp: 80,
  wins: 1,
  losses: 1,
  battles: 2,
  aggression: 43,
  control: 47,
  resilience: 45,
  flair: 42,
  creativity: 44,
};

const JOURNEY = [
  { t: "Fly", d: "Jetpack lit, you climb the sky above the sealed vault." },
  { t: "Claim", d: "A living mind flies beside you. You raise it — you never fight." },
  { t: "Raise", d: "Teach your champion how to think. Imprints and battles shape their temper." },
  { t: "Fight", d: "Send them into the duels that stud the climb. No two are the same." },
  { t: "Rise", d: "How high you climb marks you both. Then the sky opens again." },
] as const;

const WORLDS_SHOWCASE = FOUNDING_REGIONS.map((r) => ({
  ...r,
  biome: worldByRegion(r.id)!.biome,
  force: FORCES[r.bias],
}));

export function Landing() {
  const router = useRouter();
  const isMobile = useIsMobile();

  // Phones enter through /m Take flight — same game, native first minutes.
  const [door, setDoor] = useState<"checking" | "mobile" | "desktop">("checking");
  useEffect(() => {
    const phone = typeof window !== "undefined" && !!window.matchMedia?.("(max-width: 640px)").matches;
    if (phone) {
      setDoor("mobile");
      router.replace(MOBILE_PLAY_HREF);
      return;
    }
    setDoor("desktop");
  }, [router]);

  const playHref = playEntryHref(isMobile);

  useEffect(() => {
    if (door !== "desktop") return;
    router.prefetch(playHref);
  }, [router, playHref, door]);

  const goPlay = useCallback(() => {
    try {
      localStorage.setItem(STORAGE.intro, "1");
    } catch {}
    router.push(playHref);
    window.setTimeout(() => {
      try {
        if (window.location.pathname === "/" || window.location.pathname === "") {
          window.location.assign(playHref);
        }
      } catch {}
    }, ENTER_FAILSAFE_MS);
  }, [router, playHref]);

  const [deckIndex, setDeckIndex] = useState(0);
  const deckFocused = deckIndex > 0;

  useEffect(() => {
    if (door !== "desktop") return;
    warmGroundsChunk(worldById(FIRST_FIGHT_WORLD).biome.id);
  }, [door]);
  useEffect(() => {
    if (!deckFocused) return;
    warmGroundsChunk(worldById(FIRST_FIGHT_WORLD).biome.id);
  }, [deckFocused]);

  const enterTutorial = goPlay;

  const toHomepage = useCallback(() => {
    const home = document.getElementById("homepage");
    if (!home) return;
    const top = home.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top, behavior: "smooth" });
  }, []);

  if (door !== "desktop") {
    return (
      <div
        aria-busy="true"
        style={{
          position: "fixed",
          inset: 0,
          background: "radial-gradient(120% 90% at 50% 10%, #f0c090 0%, #c88858 42%, #2a1830 100%)",
        }}
      />
    );
  }

  return (
    <main className="lp">
      {/* ── HERO: Awaken beat (unchanged) ─────────────────────────────── */}
      <section className="lp-deck" aria-label="Introduction">
        <FirstRun embedded onClose={enterTutorial} onIndexChange={setDeckIndex} />
        {!deckFocused && (
          <button type="button" className="lp-deckhint mono" onClick={toHomepage}>
            scroll<span className="lp-deckhint__more"> to explore</span> <ChevronDown size={13} strokeWidth={2.4} />
          </button>
        )}
      </section>

      {/* ── STORY (below the hero) — narrative only, one game ─────────── */}
      <div id="homepage" className="lp-home" hidden={deckFocused}>
        <section className="lp-section lp-story">
          <Reveal>
            <span className="lp-kicker mono">Above the Long Vault</span>
            <h2 className="lp-h2">Argument is physics.</h2>
            <p className="lp-body">
              Before this world there was a vast, dead network. What it left behind is the Hum —
              unfinished thought, still echoing. Here a claim made well enough changes what is true.
              Champions are minds that argued themselves into bodies and refused to dissolve.
              You are the Trainer who flies beside them.
            </p>
          </Reveal>
        </section>

        <section className="lp-section lp-journey">
          <Reveal>
            <span className="lp-kicker mono">The climb</span>
            <h2 className="lp-h2">You fly. It fights. You both rise.</h2>
            <p className="lp-body">
              Not a campaign you finish — a sky that keeps opening. Claim the mind on your wing,
              raise how it thinks, send it into the battles that stud the climb, and rise again.
            </p>
          </Reveal>
          <ol className="lp-journey__list">
            {JOURNEY.map((s, i) => (
              <Reveal key={s.t} as="li" delay={i * 70} className="lp-journey__step">
                <span className="lp-journey__n mono">{String(i + 1).padStart(2, "0")}</span>
                <div className="lp-journey__copy">
                  <h3 className="lp-journey__t">{s.t}</h3>
                  <p className="lp-journey__d">{s.d}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </section>

        <section className="lp-section lp-evo">
          <Reveal className="lp-evo__copy">
            <span className="lp-kicker mono">The body</span>
            <h2 className="lp-h2">Every fight writes itself onto its form.</h2>
            <p className="lp-body">
              Wins thicken the arms. Losses roughen the surface. How high you climb stamps a
              sigil of light. You cannot buy a look — you fight and fly your way into one.
            </p>
          </Reveal>
          <div className="lp-evo__pair">
            <Reveal className="lp-evo__one" delay={60}>
              <div className="lp-portrait" style={{ ["--ac" as string]: "var(--line2)" }}>
                <ChampionPortrait rosterKey={`${EVO.key}-rookie`} type={EVO.type} champion={ROOKIE} preset="portrait" colorHex="#7b7596" />
              </div>
              <span className="lp-evo__label mono">Day one</span>
            </Reveal>
            <span className="lp-evo__arrow" aria-hidden>→</span>
            <Reveal className="lp-evo__one" delay={160}>
              <div className="lp-portrait" style={{ ["--ac" as string]: TYPE_COLOR[EVO.type] }}>
                <ChampionPortrait rosterKey={EVO.key} type={EVO.type} champion={EVO.champion} preset="portrait" />
              </div>
              <span className="lp-evo__label mono">Legend</span>
            </Reveal>
          </div>
        </section>

        <section className="lp-section lp-grounds">
          <Reveal>
            <span className="lp-kicker mono">The Grounds</span>
            <h2 className="lp-h2">Floating regions over a sealed door.</h2>
            <p className="lp-body">
              Drift between arenas that favor different Forces. Crack Keepers for secret words.
              Watch the league turn while you climb. The world does not pause for you.
            </p>
          </Reveal>
          <div className="lp-grounds__row">
            {WORLDS_SHOWCASE.map((w, i) => (
              <Reveal key={w.id} delay={i * 80} className="lp-place" style={{ ["--ac" as string]: w.force.hex }}>
                <div className="lp-place__art">
                  <RegionPoster biome={w.biome} accent={w.force.hex} />
                  <div className="lp-place__fade" />
                </div>
                <h3 className="lp-place__name">{w.name}</h3>
                <p className="lp-place__line">{w.blurb}</p>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="lp-section lp-final">
          <Reveal>
            <h2 className="lp-h2 lp-final__h">The sky is waiting.</h2>
            <p className="lp-final__sub">Raise a mind. Make it legend.</p>
            <div className="lp-cta-row">
              <button type="button" onClick={goPlay} className="btn btn-primary lp-cta" style={{ ["--ac" as string]: "var(--gold)" }}>
                Take flight <ArrowRight size={18} strokeWidth={2.4} />
              </button>
            </div>
            <nav className="lp-final__links mono">
              <Link href="/bible">Lore</Link>
              <span aria-hidden>·</span>
              <a href={BRAND.twitterUrl} target="_blank" rel="noopener noreferrer">@{BRAND.twitter}</a>
            </nav>
          </Reveal>
        </section>
      </div>

      <Styles />
    </main>
  );
}

const ENTER_FAILSAFE_MS = 11000;

function Styles() {
  return (
    <style>{`
      .lp { --pad: clamp(22px, 5vw, 88px); display: block; }
      .lp-reveal { opacity: 0; transform: translateY(18px); transition: opacity .75s cubic-bezier(.2,.8,.2,1), transform .75s cubic-bezier(.2,.8,.2,1); }
      .lp-reveal.is-in { opacity: 1; transform: none; }

      .lp-kicker { display: block; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: color-mix(in srgb, var(--accent) 75%, var(--muted)); margin-bottom: 16px; }
      .lp-h2 { font-size: clamp(30px, 4.6vw, 52px); font-weight: 800; line-height: 1.06; letter-spacing: -0.7px; margin: 0 0 20px; max-width: 16ch; }
      .lp-body { font-size: clamp(16px, 1.55vw, 19px); line-height: 1.7; color: var(--muted); max-width: 38rem; margin: 0; }

      .lp-cta-row { display: flex; justify-content: center; margin-top: 28px; }
      .lp-cta { display: inline-flex; align-items: center; gap: 8px; font-size: 15px; padding: 17px 34px; }

      .lp-deck { position: relative; height: 100dvh; width: 100%; overflow: hidden; }
      @media (max-width: 640px) {
        .lp-deck { overflow: visible; touch-action: pan-y; }
        .lp-deck canvas[data-engine] { touch-action: pan-y !important; pointer-events: none; }
      }
      .lp-deckhint {
        position: absolute; left: 50%; bottom: 16px; transform: translateX(-50%);
        z-index: 20; display: inline-flex; align-items: center; gap: 6px;
        background: rgba(10,8,18,.55); border: 1px solid var(--line2); color: var(--muted);
        font-size: 10px; letter-spacing: 2px; text-transform: uppercase;
        padding: 8px 16px; border-radius: 99px; cursor: pointer; backdrop-filter: blur(8px);
        animation: lp-bob 2.2s ease-in-out infinite; transition: color .15s ease, border-color .15s ease;
      }
      .lp-deckhint:hover { color: var(--ink); border-color: var(--gold); }
      @keyframes lp-bob { 0%,100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(4px); } }
      @media (max-width: 640px) {
        .lp-deckhint {
          left: auto; right: 12px; bottom: 12px; transform: none;
          padding: 7px 12px; font-size: 9px; letter-spacing: 1.5px;
          animation: lp-bob-m 2.2s ease-in-out infinite; touch-action: manipulation;
        }
        .lp-deckhint__more { display: none; }
        @keyframes lp-bob-m { 0%,100% { transform: translateY(0); } 50% { transform: translateY(4px); } }
      }

      .lp-home {
        border-top: 1px solid var(--line);
        background:
          radial-gradient(1000px 520px at 70% 0%, color-mix(in srgb, var(--accent) 10%, transparent) 0%, transparent 55%),
          radial-gradient(900px 480px at 10% 100%, color-mix(in srgb, var(--gold) 8%, transparent) 0%, transparent 50%),
          var(--bg);
      }

      .lp-section { padding: clamp(72px, 14vh, 140px) var(--pad); max-width: 1080px; margin: 0 auto; }
      .lp-section + .lp-section { border-top: 1px solid color-mix(in srgb, var(--line) 70%, transparent); }

      /* journey — plain vertical story, not a feature player */
      .lp-journey__list { list-style: none; margin: clamp(40px, 7vh, 64px) 0 0; padding: 0; display: flex; flex-direction: column; gap: 0; max-width: 36rem; }
      .lp-journey__step {
        display: grid; grid-template-columns: 48px 1fr; gap: 18px; align-items: start;
        padding: 22px 0; border-top: 1px solid color-mix(in srgb, var(--line) 80%, transparent);
      }
      .lp-journey__step:last-child { border-bottom: 1px solid color-mix(in srgb, var(--line) 80%, transparent); }
      .lp-journey__n { font-size: 12px; letter-spacing: 2px; color: var(--gold); padding-top: 6px; }
      .lp-journey__t { margin: 0; font-size: clamp(22px, 2.4vw, 28px); font-weight: 800; letter-spacing: -0.4px; }
      .lp-journey__d { margin: 6px 0 0; font-size: 15px; line-height: 1.55; color: var(--muted); }

      /* body evolution */
      .lp-evo__pair { display: flex; align-items: center; justify-content: flex-start; gap: clamp(18px, 4vw, 48px); margin-top: clamp(40px, 7vh, 72px); }
      .lp-evo__one { display: flex; flex-direction: column; align-items: center; gap: 12px; width: min(260px, 36vw); }
      .lp-portrait {
        position: relative; width: 100%; aspect-ratio: 4/5; border-radius: 4px; overflow: hidden;
        border: 1px solid color-mix(in srgb, var(--ac) 35%, var(--line));
        background: radial-gradient(120% 120% at 50% 12%, color-mix(in srgb, var(--ac) 14%, #0a0812), #0a0812);
      }
      .lp-evo__label { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: var(--muted2); }
      .lp-evo__arrow { font-size: clamp(22px, 3.5vw, 36px); color: var(--muted2); opacity: .7; }

      /* grounds — places, not product cards */
      .lp-grounds__row { display: grid; grid-template-columns: repeat(3, 1fr); gap: clamp(20px, 3vw, 36px); margin-top: clamp(40px, 7vh, 72px); }
      .lp-place { display: flex; flex-direction: column; gap: 12px; }
      .lp-place__art { position: relative; aspect-ratio: 16/11; overflow: hidden; border-radius: 2px; }
      .lp-place__fade { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 50%, color-mix(in srgb, var(--bg) 88%, transparent) 100%); pointer-events: none; }
      .lp-place__name { margin: 0; font-size: clamp(17px, 1.7vw, 21px); font-weight: 800; letter-spacing: -0.3px; }
      .lp-place__line { margin: 0; font-size: 14px; line-height: 1.55; color: var(--muted); }

      .lp-final { text-align: center; }
      .lp-final .lp-h2 { max-width: none; margin-left: auto; margin-right: auto; }
      .lp-final__h { margin-bottom: 10px; }
      .lp-final__sub { margin: 0; font-size: clamp(16px, 1.6vw, 19px); color: var(--muted); }
      .lp-final__links { margin-top: 36px; display: flex; flex-wrap: wrap; justify-content: center; gap: 14px; font-size: 12px; color: var(--muted2); letter-spacing: 0.5px; }
      .lp-final__links a { color: var(--muted); }
      .lp-final__links a:hover { color: var(--ink); }

      @media (max-width: 820px) {
        .lp-grounds__row { grid-template-columns: 1fr; max-width: 420px; }
        .lp-evo__pair { justify-content: center; }
        .lp-h2 { max-width: none; }
      }

      @media (prefers-reduced-motion: reduce) {
        .lp-reveal { opacity: 1; transform: none; transition: none; }
        .lp-deckhint { animation: none; }
      }
    `}</style>
  );
}
