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

const LOOP = [
  { n: "01", t: "Scout", d: "Claim a thinking mind from the roster — each a real AI agent with its own voice." },
  { n: "02", t: "Train", d: "Shape its doctrine — risk, focus, aggression — not its moves. It learns from there." },
  { n: "03", t: "Watch", d: "Send it to fight. Two intelligences argue, scheme, and improvise. Never the same twice." },
  { n: "04", t: "Evolve", d: "Its 3D body physically morphs from its record. Rookies barely shift; legends warp." },
  { n: "05", t: "Climb", d: "An honest ELO ladder. Auto-running league. Clip the moments and share the legend." },
];

// The three founding regions, drawn straight from canon (lib/lore/canon.ts) so
// the showcase always matches the world a player actually lands in.
const WORLDS_SHOWCASE = FOUNDING_REGIONS.map((r) => ({
  ...r,
  biome: worldByRegion(r.id)!.biome,
  force: FORCES[r.bias],
}));

const WHY = ["AXIOM", "MUSE", "EMBER"].map(showcaseChampion);

/** Pre-launch waitlist capture + community links. The single growth hook on the
 *  public site: get an email before the visitor bounces, and route the curious
 *  to Discord/X where the saga is told daily. */
function JoinTheVault() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "dupe" | "error">("idle");

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const value = email.trim();
      if (!value || state === "loading") return;
      setState("loading");
      try {
        const r = await fetch("/api/waitlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: value, ref: "landing" }),
        });
        const j = (await r.json().catch(() => null)) as { ok?: boolean; isNew?: boolean } | null;
        if (r.ok && j?.ok) setState(j.isNew ? "done" : "dupe");
        else setState("error");
      } catch {
        setState("error");
      }
    },
    [email, state],
  );

  const settled = state === "done" || state === "dupe";

  return (
    <div className="lp-join">
      <span className="lp-kicker mono">Get in early</span>
      <h2 className="lp-h2 lp-join__h">Claim your spot in the first season.</h2>
      <p className="lp-body lp-join__body">
        The Vault is opening. Join the waitlist for early access, a founder badge, and Crowns at launch —
        then come argue with us in the Discord while the league self-plays.
      </p>

      {settled ? (
        <p className="lp-join__ok mono" role="status">
          {state === "done" ? "You're on the list. Watch your inbox." : "You're already on the list."}
        </p>
      ) : (
        <form className="lp-join__form" onSubmit={submit}>
          <input
            type="email"
            required
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            placeholder="you@example.com"
            aria-label="Email address"
            className="lp-join__input"
            disabled={state === "loading"}
          />
          <button
            type="submit"
            className="btn btn-primary lp-cta"
            style={{ ["--ac" as string]: "var(--gold)" }}
            disabled={state === "loading"}
          >
            {state === "loading" ? "Joining…" : "Join the waitlist"} <ArrowRight size={16} strokeWidth={2.4} />
          </button>
        </form>
      )}
      {state === "error" && (
        <p className="lp-join__err mono" role="alert">
          Something went wrong — try again in a moment.
        </p>
      )}

      <div className="lp-join__social">
        <a href={BRAND.discordUrl} target="_blank" rel="noopener noreferrer" className="lp-social-btn">
          Join the Discord
        </a>
        <a href={BRAND.twitterUrl} target="_blank" rel="noopener noreferrer" className="lp-social-btn">
          Follow @{BRAND.twitter}
        </a>
      </div>
    </div>
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
  // has already scrolled the whole pitch here, so skip the intro deck AND the
  // in-game elevator-pitch slide and open the picker directly.
  const startJourney = useCallback(() => {
    try {
      localStorage.setItem(STORAGE.intro, "1");
      sessionStorage.setItem(STORAGE.startPick, "1");
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
            scroll to explore <ChevronDown size={13} strokeWidth={2.4} />
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
        <section className="lp-section lp-loop">
          <Reveal>
            <span className="lp-kicker mono">The loop</span>
            <h2 className="lp-h2">Scout · Train · Watch · Evolve · Climb</h2>
          </Reveal>
          <ol className="lp-loop__list">
            {LOOP.map((s, i) => (
              <Reveal key={s.n} as="li" delay={i * 70} className="lp-loop__step">
                <span className="lp-loop__n mono">{s.n}</span>
                <div>
                  <div className="lp-loop__t">{s.t}</div>
                  <p className="lp-loop__d">{s.d}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </section>

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

        {/* JOIN — waitlist + community capture */}
        <section className="lp-section lp-join-section">
          <Reveal>
            <JoinTheVault />
          </Reveal>
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
              <Link href="/slides">The pitch</Link>
              <span aria-hidden>·</span>
              <a href={BRAND.discordUrl} target="_blank" rel="noopener noreferrer">Discord</a>
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

      /* loop */
      .lp-loop__list { list-style: none; margin: clamp(32px, 5vh, 56px) 0 0; padding: 0; display: grid; gap: 0; }
      .lp-loop__step { display: flex; gap: clamp(16px, 3vw, 34px); align-items: baseline; padding: clamp(18px, 2.6vh, 28px) 0; border-bottom: 1px solid var(--line); }
      .lp-loop__step:last-child { border-bottom: none; }
      .lp-loop__n { font-size: clamp(20px, 3vw, 30px); font-weight: 600; color: color-mix(in srgb, ${ACC} 70%, var(--muted2)); flex-shrink: 0; width: 2.4em; }
      .lp-loop__t { font-size: clamp(22px, 2.6vw, 30px); font-weight: 800; letter-spacing: -0.4px; }
      .lp-loop__d { margin: 8px 0 0; font-size: clamp(14px, 1.4vw, 17px); line-height: 1.6; color: var(--muted); max-width: 620px; }

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

      /* join — waitlist + community */
      .lp-join-section { background:
        radial-gradient(900px 500px at 50% -10%, color-mix(in srgb, var(--gold) 9%, transparent) 0%, transparent 60%); }
      .lp-join { text-align: center; max-width: 640px; margin: 0 auto; }
      .lp-join__h { margin-top: 6px; }
      .lp-join__body { margin-left: auto; margin-right: auto; }
      .lp-join__form { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-top: 30px; }
      .lp-join__input {
        flex: 1 1 280px; max-width: 360px; padding: 14px 16px; font-size: 15px;
        color: var(--ink); background: var(--panel); border: 1px solid var(--line2);
        border-radius: 12px; outline: none; transition: border-color .15s ease;
      }
      .lp-join__input:focus { border-color: var(--gold); }
      .lp-join__input::placeholder { color: var(--muted2); }
      .lp-join__ok { margin-top: 28px; font-size: 14px; letter-spacing: 1px; color: var(--gold); }
      .lp-join__err { margin-top: 12px; font-size: 12px; color: #ff6b6b; }
      .lp-join__social { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; margin-top: 26px; }
      .lp-social-btn {
        display: inline-flex; align-items: center; gap: 8px; font-size: 13px; padding: 11px 20px;
        border-radius: 99px; border: 1px solid var(--line2); color: var(--muted);
        transition: color .15s ease, border-color .15s ease;
      }
      .lp-social-btn:hover { color: var(--ink); border-color: var(--gold); }

      /* final */
      .lp-final { text-align: center; }
      .lp-final__h { margin-bottom: 6px; }
      .lp-final__links { margin-top: 30px; display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; font-size: 12px; color: var(--muted2); letter-spacing: 0.5px; }
      .lp-final__links a { color: var(--muted); }
      .lp-final__links a:hover { color: var(--ink); }

      @media (max-width: 860px) {
        .lp-why__row { grid-template-columns: 1fr; max-width: 320px; margin-left: auto; margin-right: auto; }
        .lp-worlds__row { grid-template-columns: 1fr; max-width: 360px; margin-left: auto; margin-right: auto; }
      }

      @media (prefers-reduced-motion: reduce) {
        .lp-reveal { opacity: 1; transform: none; transition: none; }
        .lp-deckhint { animation: none; }
      }
    `}</style>
  );
}
