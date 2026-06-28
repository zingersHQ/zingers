"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, ChevronDown, Radar, SlidersHorizontal, Swords, Dna, TrendingUp, RotateCw, type LucideIcon } from "lucide-react";
import { BRAND, STORAGE } from "@/lib/brand";
import { TYPE_COLOR } from "@/lib/evolve/progression";
import { showcaseChampion } from "@/lib/render/showcase";
import { ChampionPortrait } from "@/components/render/champion-portrait";
import { FirstRun } from "@/components/intro/first-run";
import { FOUNDING_REGIONS, FORCES } from "@/lib/lore/canon";
import { worldByRegion } from "@/components/grounds/worlds";
import { RegionPoster } from "@/components/lore/region-poster";
import type { Champion } from "@/lib/types";

const ACC = "var(--accent)";

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
        // Reveal when the block enters view, OR when it has already been
        // scrolled past — so a jump/anchor never leaves a section stuck hidden.
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

// Evolving-body proof: same mind, two careers. A rookie barely deviates from the
// neutral silhouette; a legend warps dramatically — the body is the track record.
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

// The five-step core loop, rebuilt as an interactive "player". Each step carries
// an icon, a punchy lead, the full pitch, a one-line proof tag, and its own accent
// — a palette that warms from brand-indigo at Scout to CTA-gold at Climb, so the
// eye literally travels "up" the ladder as the loop auto-advances.
type LoopStep = {
  n: string;
  t: string;
  icon: LucideIcon;
  lead: string;
  d: string;
  tag: string;
  ac: string;
};

const LOOP: LoopStep[] = [
  {
    n: "01",
    t: "Scout",
    icon: Radar,
    lead: "Claim a thinking mind.",
    d: "Pull a champion from the roster — each one a real AI agent with its own voice, temper, and way of arguing its case.",
    tag: "Real agents, not stat tables",
    ac: "#6a6bff",
  },
  {
    n: "02",
    t: "Train",
    icon: SlidersHorizontal,
    lead: "Set its doctrine.",
    d: "Shape how it thinks — risk, focus, aggression — never its moves. You raise a mind; it figures out the rest on its own.",
    tag: "You coach, it improvises",
    ac: "#9268ff",
  },
  {
    n: "03",
    t: "Watch",
    icon: Swords,
    lead: "Send it to war.",
    d: "Two intelligences meet and the duel writes itself — they scheme, taunt, bluff, and adapt. No two fights are ever the same.",
    tag: "Never the same duel twice",
    ac: "#c264f0",
  },
  {
    n: "04",
    t: "Evolve",
    icon: Dna,
    lead: "Watch the body change.",
    d: "Its 3D form is a deterministic readout of its record. A rookie barely shifts; a legend warps into something unmistakable.",
    tag: "The body is the track record",
    ac: "#f07ea0",
  },
  {
    n: "05",
    t: "Climb",
    icon: TrendingUp,
    lead: "Chase the ladder.",
    d: "An honest ELO ladder inside an auto-running league. Clip the upsets, share the legend — then it all loops back to the next run.",
    tag: "The league never sleeps",
    ac: "#f0a93a",
  },
];

// The three founding regions, drawn straight from canon (lib/lore/canon.ts) so
// the showcase always matches the world a player actually lands in.
const WORLDS_SHOWCASE = FOUNDING_REGIONS.map((r) => ({
  ...r,
  biome: worldByRegion(r.id)!.biome,
  force: FORCES[r.bias],
}));

const WHY = ["AXIOM", "MUSE", "EMBER"].map(showcaseChampion);

/** The core gameplay loop, rendered as a self-advancing "player": a connected
 *  rail of the five steps on the left auto-cycles (pausing on hover/focus, off
 *  under reduced motion) while a glowing stage on the right blows up the active
 *  step. The whole thing literally loops back to Scout — the point of the pitch. */
function TheLoop() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  // Auto-advance with a restarting timeout so a click/hover both jumps the stage
  // AND resyncs the countdown (and the progress bar) from that step.
  useEffect(() => {
    if (paused) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setTimeout(() => setActive((a) => (a + 1) % LOOP.length), 3800);
    return () => window.clearTimeout(id);
  }, [active, paused]);

  const focus = useCallback((i: number) => {
    setActive(i);
    setPaused(true);
  }, []);

  const cur = LOOP[active];
  const StageIcon = cur.icon;

  return (
    <section className="lp-section lp-loop">
      <Reveal>
        <span className="lp-kicker mono">The loop</span>
        <h2 className="lp-h2">Five steps. One endless loop.</h2>
        <p className="lp-body">
          This isn&apos;t a campaign you finish. You scout a mind, shape its doctrine, and set it loose — then its
          evolving body and the live ladder feed straight back into the next run. Every clip you share just pulls
          you in again.
        </p>
      </Reveal>

      <Reveal>
        <div className="lp-loop__player" onMouseLeave={() => setPaused(false)}>
          <ol className="lp-loop__rail">
            {LOOP.map((s, i) => {
              const RowIcon = s.icon;
              const on = i === active;
              return (
                <li key={s.n} className={`lp-loop__row${on ? " is-on" : ""}`} style={{ ["--ac" as string]: s.ac }}>
                  <button
                    type="button"
                    className="lp-loop__rowbtn"
                    aria-current={on ? "step" : undefined}
                    onMouseEnter={() => focus(i)}
                    onFocus={() => focus(i)}
                    onClick={() => focus(i)}
                  >
                    <span className="lp-loop__node mono">
                      <span className="lp-loop__node-n">{s.n}</span>
                      <RowIcon className="lp-loop__node-i" size={19} strokeWidth={2} aria-hidden />
                    </span>
                    <span className="lp-loop__rowtext">
                      <span className="lp-loop__t">{s.t}</span>
                      <span className="lp-loop__lead">{s.lead}</span>
                    </span>
                    {on && (
                      <span
                        key={active}
                        className="lp-loop__bar"
                        style={{ animationPlayState: paused ? "paused" : "running" }}
                      />
                    )}
                  </button>
                </li>
              );
            })}
            <li className="lp-loop__loopback mono" aria-hidden>
              <RotateCw size={14} strokeWidth={2.2} className="lp-loop__loopback-i" />
              and again — the league never sleeps
            </li>
          </ol>

          <div className="lp-loop__stage" style={{ ["--ac" as string]: cur.ac }}>
            <div key={active} className="lp-loop__stage-in">
              <span className="lp-loop__stage-icon">
                <StageIcon size={30} strokeWidth={1.8} aria-hidden />
              </span>
              <span className="lp-loop__stage-step mono">Step {cur.n} / 05</span>
              <h3 className="lp-loop__stage-t">{cur.t}</h3>
              <p className="lp-loop__stage-lead">{cur.lead}</p>
              <p className="lp-loop__stage-d">{cur.d}</p>
              <span className="lp-loop__stage-tag mono">{cur.tag}</span>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export function Landing() {
  const router = useRouter();

  // Once the embedded intro deck advances past its first slide we hand the whole
  // screen over to it: the marketing homepage below is hidden so nothing
  // competes for attention while the player pages through the story.
  const [deckIndex, setDeckIndex] = useState(0);
  const deckFocused = deckIndex > 0;

  // Finishing or skipping the inline intro deck marks the cinematic as seen and
  // carries you into the playable tutorial (pick → tune → first duel) at the
  // Grounds, so the game never replays the cinematic you just watched here.
  const enterTutorial = useCallback(() => {
    try {
      localStorage.setItem(STORAGE.intro, "1");
    } catch {}
    router.push("/grounds");
  }, [router]);

  const toHomepage = useCallback(() => {
    document.getElementById("homepage")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // The final CTA drops you straight onto the champion-select screen: the visitor
  // has already scrolled the whole pitch here, so skip the intro deck and open the
  // picker directly (the funnel always opens on champion select now).
  const startJourney = useCallback(() => {
    try {
      localStorage.setItem(STORAGE.intro, "1");
    } catch {}
    router.push("/grounds");
  }, [router]);

  return (
    <main className="lp">
      {/* ── SLIDE 1: the real intro deck, inline ─────────────────────── */}
      <section className="lp-deck" aria-label="Introduction">
        <FirstRun embedded onClose={enterTutorial} onIndexChange={setDeckIndex} />
        {!deckFocused && (
          <button type="button" className="lp-deckhint mono" onClick={toHomepage}>
            scroll<span className="lp-deckhint__more"> to explore</span> <ChevronDown size={13} strokeWidth={2.4} />
          </button>
        )}
      </section>

      {/* ── HOMEPAGE (scroll target) — hidden once the deck takes focus ── */}
      <div id="homepage" className="lp-home" hidden={deckFocused}>
        {/* WHY DIFFERENT */}
        <section className="lp-section lp-why">
          <Reveal>
            <span className="lp-kicker mono">Why it&apos;s different</span>
            <h2 className="lp-h2">The creatures actually think.</h2>
            <p className="lp-body">
              Collectible battlers are a beloved, proven format — but the creatures are scripted, and the
              &quot;intelligence&quot; is a stat table. Here, every champion is a real AI agent. They argue,
              scheme, persuade, and improvise, so no two battles are ever the same and every champion is
              unrepeatable.
            </p>
          </Reveal>
          <div className="lp-why__row">
            {WHY.map((m, i) => (
              <Reveal key={m.key} delay={i * 90} className="lp-why__card" style={{ ["--ac" as string]: TYPE_COLOR[m.type] }}>
                <div className="lp-portrait lp-portrait--mini">
                  <ChampionPortrait rosterKey={m.key} type={m.type} champion={m.champion} preset="portrait" />
                </div>
                <div className="lp-why__name">{m.key}</div>
                <div className="lp-why__type mono">{m.type}</div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* THE LOOP */}
        <TheLoop />

        {/* EVOLVING BODY */}
        <section className="lp-section lp-evo">
          <Reveal className="lp-evo__copy">
            <span className="lp-kicker mono">The headline mechanic</span>
            <h2 className="lp-h2">The body is the track record.</h2>
            <p className="lp-body">
              A champion&apos;s 3D silhouette is a deterministic function of its career — bone-scaling
              amplified by rank. A rookie barely shifts. A legend warps dramatically. Same mind, two
              careers, two bodies.
            </p>
          </Reveal>
          <div className="lp-evo__pair">
            <Reveal className="lp-evo__one" delay={60}>
              <div className="lp-portrait lp-portrait--evo" style={{ ["--ac" as string]: "var(--line2)" }}>
                <ChampionPortrait rosterKey={`${EVO.key}-rookie`} type={EVO.type} champion={ROOKIE} preset="portrait" colorHex="#7b7596" />
              </div>
              <span className="lp-evo__label mono">Rookie · 2 fights</span>
            </Reveal>
            <span className="lp-evo__arrow" aria-hidden>→</span>
            <Reveal className="lp-evo__one" delay={160}>
              <div className="lp-portrait lp-portrait--evo" style={{ ["--ac" as string]: TYPE_COLOR[EVO.type] }}>
                <ChampionPortrait rosterKey={EVO.key} type={EVO.type} champion={EVO.champion} preset="portrait" />
              </div>
              <span className="lp-evo__label mono">Legend · 50 fights</span>
            </Reveal>
          </div>
        </section>

        {/* THE WORLD */}
        <section className="lp-section lp-worlds">
          <Reveal>
            <span className="lp-kicker mono">The world</span>
            <h2 className="lp-h2">Every place argues differently.</h2>
            <p className="lp-body">
              The Grounds drift in slow constellation over the Long Vault — and each arena rewards a
              different way to win. You raise a mind, pledge it to one of five Forces, and send it out to
              argue for its place in a season-long war between them. The league never sleeps, so you come
              back to a saga — rivalries, upsets, a champion that rose or fell while you were gone — not a
              save file.
            </p>
          </Reveal>
          <div className="lp-worlds__row">
            {WORLDS_SHOWCASE.map((w, i) => (
              <Reveal key={w.id} delay={i * 90} className="lp-world" style={{ ["--ac" as string]: w.force.hex }}>
                <div className="lp-world__poster">
                  <RegionPoster biome={w.biome} accent={w.force.hex} />
                  <div className="lp-world__scrim" />
                  <span className="lp-world__arena mono">{w.arena}</span>
                </div>
                <div className="lp-world__body">
                  <h3 className="lp-world__name">{w.name}</h3>
                  <p className="lp-world__blurb">{w.blurb}</p>
                  <span className="lp-world__force mono">{w.force.sigil} favors {w.force.name}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="lp-section lp-final">
          <Reveal>
            <h2 className="lp-h2 lp-final__h">Your champion is waiting.</h2>
            <div className="lp-cta-row lp-cta-row--center">
              <button type="button" onClick={startJourney} className="btn btn-primary lp-cta lp-cta--big" style={{ ["--ac" as string]: "var(--gold)" }}>
                Choose your champion <ArrowRight size={18} strokeWidth={2.4} />
              </button>
            </div>
            <nav className="lp-final__links mono">
              <Link href="/bible">Lore &amp; gallery</Link>
              <span aria-hidden>·</span>
              <Link href="/agents">For developers</Link>
              <span aria-hidden>·</span>
              <Link href="/slides">The deck</Link>
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

function Styles() {
  return (
    <style>{`
      .lp { --pad: clamp(20px, 5vw, 80px); display: block; }
      .lp-reveal { opacity: 0; transform: translateY(22px); transition: opacity .7s cubic-bezier(.2,.8,.2,1), transform .7s cubic-bezier(.2,.8,.2,1); }
      .lp-reveal.is-in { opacity: 1; transform: none; }

      .lp-kicker { display: block; font-size: 11px; letter-spacing: 3px; color: ${ACC}; margin-bottom: 14px; }
      .lp-h2 { font-size: clamp(28px, 4.4vw, 48px); font-weight: 800; line-height: 1.08; letter-spacing: -0.6px; margin: 0 0 18px; }
      .lp-body { font-size: clamp(15px, 1.5vw, 18px); line-height: 1.65; color: var(--muted); max-width: 640px; margin: 0; }

      .lp-cta-row { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 30px; }
      .lp-cta-row--center { justify-content: center; }
      .lp-cta { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; padding: 14px 24px; }
      .lp-cta--big { font-size: 15px; padding: 17px 34px; }

      /* slide 1 — the inline intro deck fills the first screen */
      .lp-deck { position: relative; height: 100dvh; width: 100%; overflow: hidden; }
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
      /* On phones the centered cue collides with the left-aligned lower-third copy,
         so tuck a compact "scroll" pill into the bottom-right corner — clear of the
         copy's short, left-aligned last line at every phone width. */
      @media (max-width: 640px) {
        .lp-deckhint {
          left: auto; right: 12px; bottom: 12px; transform: none;
          padding: 7px 12px; font-size: 9px; letter-spacing: 1.5px;
          animation: lp-bob-m 2.2s ease-in-out infinite;
        }
        .lp-deckhint__more { display: none; }
        @keyframes lp-bob-m { 0%,100% { transform: translateY(0); } 50% { transform: translateY(4px); } }
      }

      /* homepage below the deck */
      .lp-home { border-top: 1px solid var(--line); background:
        radial-gradient(1100px 600px at 80% -5%, var(--body-grad1) 0%, transparent 55%),
        radial-gradient(800px 500px at 5% 105%, var(--body-grad2) 0%, transparent 55%), var(--bg); }

      .lp-section { padding: clamp(70px, 12vh, 150px) var(--pad); max-width: 1180px; margin: 0 auto; }
      .lp-section + .lp-section { border-top: 1px solid var(--line); }

      .lp-portrait { position: relative; width: 100%; border-radius: 18px; overflow: hidden; border: 1px solid color-mix(in srgb, var(--ac) 40%, var(--line)); background: radial-gradient(120% 120% at 50% 12%, color-mix(in srgb, var(--ac) 16%, #0a0812), #0a0812); }
      .lp-portrait--mini { aspect-ratio: 4/5; }
      .lp-portrait--evo { aspect-ratio: 4/5; box-shadow: 0 30px 90px -50px #000, 0 0 70px -40px var(--ac); }

      /* why */
      .lp-why__row { display: grid; grid-template-columns: repeat(3, 1fr); gap: clamp(14px, 2.5vw, 30px); margin-top: clamp(36px, 6vh, 64px); }
      .lp-why__card { padding: 16px; border-radius: 18px; border: 1px solid color-mix(in srgb, var(--ac) 28%, var(--line)); background: linear-gradient(180deg, color-mix(in srgb, var(--ac) 7%, var(--panel)), var(--panel2)); }
      .lp-why__name { font-weight: 800; font-size: 18px; margin-top: 14px; }
      .lp-why__type { font-size: 10px; letter-spacing: 2px; color: var(--ac); margin-top: 3px; }

      /* loop — interactive player */
      .lp-loop__player { display: grid; grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr); gap: clamp(22px, 4vw, 56px); align-items: stretch; margin-top: clamp(36px, 6vh, 64px); }

      .lp-loop__rail { list-style: none; margin: 0; padding: 0; position: relative; display: flex; flex-direction: column; gap: 4px; }
      /* the connecting spine threading the step nodes — this is "the loop" */
      .lp-loop__rail::before { content: ""; position: absolute; left: 25px; top: 32px; bottom: 56px; width: 2px; background: linear-gradient(var(--line2), var(--line)); z-index: 0; }

      .lp-loop__row { position: relative; z-index: 1; }
      .lp-loop__rowbtn { width: 100%; display: grid; grid-template-columns: 50px 1fr; gap: 16px; align-items: center; text-align: left; background: transparent; border: 1px solid transparent; border-radius: 14px; padding: 12px 16px 14px; cursor: pointer; color: inherit; transition: background .25s ease, border-color .25s ease; }
      .lp-loop__row.is-on .lp-loop__rowbtn { background: linear-gradient(180deg, color-mix(in srgb, var(--ac) 13%, var(--panel)), var(--panel2)); border-color: color-mix(in srgb, var(--ac) 42%, var(--line)); }

      .lp-loop__node { position: relative; width: 50px; height: 50px; border-radius: 50%; display: grid; place-items: center; flex-shrink: 0; border: 1px solid var(--line2); background: var(--bg2); color: var(--muted2); transition: border-color .25s ease, color .25s ease, background .25s ease, box-shadow .25s ease; }
      .lp-loop__node-n { font-size: 14px; font-weight: 600; transition: opacity .2s ease; }
      .lp-loop__node-i { position: absolute; opacity: 0; color: var(--ac); transition: opacity .2s ease; }
      .lp-loop__row.is-on .lp-loop__node { border-color: var(--ac); color: var(--ac); background: color-mix(in srgb, var(--ac) 18%, var(--bg2)); box-shadow: 0 0 0 4px color-mix(in srgb, var(--ac) 14%, transparent), 0 0 30px -6px var(--ac); }
      .lp-loop__row.is-on .lp-loop__node-n { opacity: 0; }
      .lp-loop__row.is-on .lp-loop__node-i { opacity: 1; }

      .lp-loop__rowtext { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
      .lp-loop__t { font-size: clamp(18px, 2vw, 22px); font-weight: 800; letter-spacing: -0.3px; line-height: 1.1; color: var(--muted); transition: color .25s ease; }
      .lp-loop__row.is-on .lp-loop__t { color: var(--ink); }
      .lp-loop__lead { font-size: 13px; color: var(--muted2); transition: color .25s ease; }
      .lp-loop__row.is-on .lp-loop__lead { color: color-mix(in srgb, var(--ac) 65%, var(--muted)); }

      .lp-loop__bar { position: absolute; left: 16px; right: 16px; bottom: 6px; height: 2px; border-radius: 2px; background: var(--ac); transform-origin: left; animation: lp-loop-fill 3.8s linear forwards; }
      @keyframes lp-loop-fill { from { transform: scaleX(0); } to { transform: scaleX(1); } }

      .lp-loop__loopback { display: flex; align-items: center; gap: 9px; margin-top: 8px; padding: 12px 16px 0; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--muted2); }
      .lp-loop__loopback-i { color: ${ACC}; animation: spin 6s linear infinite; }

      .lp-loop__stage { position: relative; overflow: hidden; border-radius: 20px; padding: clamp(26px, 3vw, 40px); border: 1px solid color-mix(in srgb, var(--ac) 38%, var(--line)); background: radial-gradient(120% 90% at 85% 0%, color-mix(in srgb, var(--ac) 18%, transparent) 0%, transparent 55%), linear-gradient(180deg, var(--panel), var(--panel2)); box-shadow: 0 40px 100px -60px #000, 0 0 90px -55px var(--ac); display: flex; flex-direction: column; justify-content: center; transition: border-color .4s ease, box-shadow .4s ease; }
      .lp-loop__stage-in { display: flex; flex-direction: column; animation: lp-loop-stage .5s cubic-bezier(.2,.8,.2,1) both; }
      @keyframes lp-loop-stage { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
      .lp-loop__stage-icon { width: 60px; height: 60px; border-radius: 16px; display: grid; place-items: center; margin-bottom: 22px; color: var(--ac); border: 1px solid color-mix(in srgb, var(--ac) 45%, var(--line)); background: color-mix(in srgb, var(--ac) 14%, var(--bg2)); }
      .lp-loop__stage-step { font-size: 10px; letter-spacing: 2.5px; text-transform: uppercase; color: var(--ac); }
      .lp-loop__stage-t { font-size: clamp(30px, 4.4vw, 46px); font-weight: 800; letter-spacing: -0.8px; line-height: 1; margin: 8px 0 0; }
      .lp-loop__stage-lead { margin: 12px 0 0; font-size: clamp(16px, 1.8vw, 20px); font-weight: 600; color: var(--ink); }
      .lp-loop__stage-d { margin: 12px 0 0; font-size: clamp(14px, 1.45vw, 16px); line-height: 1.65; color: var(--muted); max-width: 520px; }
      .lp-loop__stage-tag { align-self: flex-start; margin-top: 24px; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: color-mix(in srgb, var(--ac) 85%, var(--ink)); padding: 7px 13px; border-radius: 99px; border: 1px solid color-mix(in srgb, var(--ac) 40%, var(--line)); background: color-mix(in srgb, var(--ac) 9%, transparent); }

      /* evolve */
      .lp-evo__pair { display: flex; align-items: center; justify-content: center; gap: clamp(16px, 4vw, 54px); margin-top: clamp(36px, 6vh, 64px); }
      .lp-evo__one { display: flex; flex-direction: column; align-items: center; gap: 12px; width: min(300px, 38vw); }
      .lp-evo__label { font-size: 11px; letter-spacing: 1.5px; color: var(--muted2); }
      .lp-evo__arrow { font-size: clamp(24px, 4vw, 40px); color: var(--muted2); }

      /* worlds */
      .lp-worlds__row { display: grid; grid-template-columns: repeat(3, 1fr); gap: clamp(14px, 2.5vw, 26px); margin-top: clamp(36px, 6vh, 64px); }
      .lp-world { display: flex; flex-direction: column; border-radius: 18px; overflow: hidden; border: 1px solid color-mix(in srgb, var(--ac) 30%, var(--line)); background: linear-gradient(180deg, var(--panel), var(--panel2)); }
      .lp-world__poster { position: relative; aspect-ratio: 16/10; overflow: hidden; }
      .lp-world__scrim { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 45%, color-mix(in srgb, var(--panel) 94%, transparent) 100%); }
      .lp-world__arena { position: absolute; top: 12px; left: 12px; z-index: 2; font-size: 9px; letter-spacing: 2px; color: #fff; background: color-mix(in srgb, var(--ac) 28%, rgba(10,8,18,.55)); border: 1px solid color-mix(in srgb, var(--ac) 55%, transparent); padding: 5px 11px; border-radius: 99px; backdrop-filter: blur(5px); }
      .lp-world__body { padding: 15px 18px 20px; }
      .lp-world__name { font-size: clamp(17px, 1.8vw, 21px); font-weight: 800; margin: 0; }
      .lp-world__blurb { margin: 9px 0 0; font-size: 13px; line-height: 1.55; color: var(--muted); }
      .lp-world__force { display: inline-block; margin-top: 14px; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--ac); }

      /* final */
      .lp-final { text-align: center; }
      .lp-final__h { margin-bottom: 6px; }
      .lp-final__links { margin-top: 30px; display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; font-size: 12px; color: var(--muted2); letter-spacing: 0.5px; }
      .lp-final__links a { color: var(--muted); }
      .lp-final__links a:hover { color: var(--ink); }

      @media (max-width: 860px) {
        .lp-why__row { grid-template-columns: 1fr; max-width: 320px; margin-left: auto; margin-right: auto; }
        .lp-worlds__row { grid-template-columns: 1fr; max-width: 360px; margin-left: auto; margin-right: auto; }
        .lp-loop__player { grid-template-columns: 1fr; gap: 26px; }
        .lp-loop__stage { order: -1; }
      }

      @media (prefers-reduced-motion: reduce) {
        .lp-reveal { opacity: 1; transform: none; transition: none; }
        .lp-deckhint { animation: none; }
        .lp-loop__bar { animation: none; transform: scaleX(1); }
        .lp-loop__stage-in { animation: none; }
        .lp-loop__loopback-i { animation: none; }
      }
    `}</style>
  );
}
