"use client";
// The hand-off the game was missing: claiming a champion used to flip you into
// the world with no beat in between — pick an agent, BOOM, you're just standing
// there. This sequences that moment like a classic game scene change:
//   1. CARD    — a "champion claimed" pledge card pops in with confetti.
//   2. COVER   — a force-tinted veil wipes the screen shut (and behind it the
//                world quietly mounts your figure, so the pop-in is hidden).
//   3. REVEAL  — the veil lifts to show you standing in the Concord.
//   4. WELCOME — a short orientation toast tells you what to do next.
import { useEffect, useState } from "react";
import type { Champion, CreatureType } from "@/lib/types";
import { TYPE_COLOR } from "@/lib/evolve/progression";
import { FORCES, FORCE_MOTTO } from "@/lib/lore/canon";
import { ChampionAvatar } from "@/components/champion-avatar";
import { Confetti } from "@/components/grounds/celebration";
import { pledgeSfx, rewardSfx } from "@/lib/sfx";

type Phase = "card" | "cover" | "reveal" | "welcome";

// timings (ms): cover wipes shut, world mounts under it, then the veil lifts
const COVER_MS = 620; // veil fades fully opaque
const HOLD_MS = 260; // beat at black so the figure pop-in stays hidden
const REVEAL_MS = 820; // veil lifts to show the world
const WELCOME_MS = 6000; // orientation toast lingers

export function ArrivalSequence({
  ckey,
  type,
  name,
  champion,
  onEnter,
  onDone,
}: {
  ckey: string;
  type: CreatureType;
  name: string;
  champion: Champion;
  onEnter: () => void; // mount the world / take ownership (called while the veil hides it)
  onDone: () => void; // tear the sequence down
}) {
  const [phase, setPhase] = useState<Phase>("card");
  const accent = TYPE_COLOR[type];
  const force = FORCES[type];
  const motto = FORCE_MOTTO[type];

  useEffect(() => {
    rewardSfx("epic");
  }, []);

  // choreography clock — each phase schedules the next
  useEffect(() => {
    if (phase === "cover") {
      pledgeSfx();
      let lift: ReturnType<typeof setTimeout>;
      // once the veil is fully shut, claim the champion (world mounts unseen),
      // hold a beat, then lift.
      const shut = setTimeout(() => {
        onEnter();
        lift = setTimeout(() => setPhase("reveal"), HOLD_MS);
      }, COVER_MS);
      return () => {
        clearTimeout(shut);
        clearTimeout(lift);
      };
    }
    if (phase === "reveal") {
      const t = setTimeout(() => setPhase("welcome"), REVEAL_MS);
      return () => clearTimeout(t);
    }
    if (phase === "welcome") {
      const t = setTimeout(onDone, WELCOME_MS);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const veilShut = phase === "cover";

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 70, pointerEvents: phase === "card" ? "auto" : "none" }}>
      <style>{ARRIVAL_KEYFRAMES}</style>

      {/* ───────── the claim card ───────── */}
      {phase === "card" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            background: "rgba(5,4,10,.82)",
            backdropFilter: "blur(7px)",
            padding: 20,
          }}
        >
          <Confetti accent={accent} count={64} originTop="38%" />
          <div
            className="panel cel-reveal"
            style={{
              ["--ac" as string]: accent,
              position: "relative",
              width: "min(420px, 94vw)",
              padding: "26px 26px 22px",
              textAlign: "center",
              borderColor: accent,
              boxShadow: `0 0 90px -18px ${accent}, 0 30px 70px -34px #000`,
              background: `radial-gradient(130% 130% at 50% 0%, ${accent}26 0%, var(--panel) 62%)`,
            }}
          >
            <div className="mono" style={{ fontSize: 10, letterSpacing: 2.6, color: accent, fontWeight: 700, textShadow: `0 0 18px ${accent}99` }}>
              CHAMPION CLAIMED
            </div>

            <div style={{ position: "relative", display: "grid", placeItems: "center", margin: "14px 0 4px" }}>
              <span aria-hidden className="arrival-halo" style={{ position: "absolute", width: 132, height: 132, borderRadius: "50%", border: `2px solid ${accent}`, opacity: 0.6 }} />
              <ChampionAvatar ckey={ckey} type={type} champion={champion} size={104} />
            </div>

            <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: -0.3, marginTop: 6 }}>{name}</div>
            <div className="mono" style={{ fontSize: 11, color: accent, marginTop: 3 }}>
              {force.sigil} {force.name} · {motto}
            </div>

            <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--muted)", margin: "12px 2px 16px" }}>
              This mind is yours now. Step into the Concord — <strong style={{ color: "var(--fg)" }}>train</strong> it to grow sharper, or walk to a <strong style={{ color: "var(--fg)" }}>gate</strong> and put it in a fight.
            </p>

            <button
              className="btn btn-primary"
              onClick={() => setPhase("cover")}
              style={{ ["--ac" as string]: accent, fontSize: 14, padding: "10px 20px", width: "100%" }}
            >
              Enter the Grounds →
            </button>
          </div>
        </div>
      )}

      {/* ───────── the wipe veil ───────── */}
      {phase !== "card" && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            opacity: veilShut ? 1 : 0,
            transition: `opacity ${veilShut ? COVER_MS : REVEAL_MS}ms cubic-bezier(.4,0,.2,1)`,
            background: `radial-gradient(120% 120% at 50% 45%, ${accent}3a 0%, #05040a 58%, #030208 100%)`,
            display: "grid",
            placeItems: "center",
          }}
        >
          {phase === "cover" && (
            <div className="mono arrival-enter" style={{ textAlign: "center", color: "#fff" }}>
              <div style={{ display: "flex", gap: 7, justifyContent: "center", marginBottom: 12 }}>
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="arrival-pip"
                    style={{ width: 7, height: 7, borderRadius: "50%", background: accent, animationDelay: `${i * 0.16}s` }}
                  />
                ))}
              </div>
              <div style={{ fontSize: 11, letterSpacing: 3, color: "rgba(255,255,255,.7)" }}>ENTERING THE GROUNDS</div>
            </div>
          )}
        </div>
      )}

      {/* ───────── the welcome toast ───────── */}
      {phase === "welcome" && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: "11%", display: "flex", justifyContent: "center", padding: "0 16px", pointerEvents: "auto" }}>
          <div
            className="panel arrival-rise"
            style={{
              ["--ac" as string]: accent,
              display: "flex",
              alignItems: "center",
              gap: 13,
              padding: "11px 15px",
              maxWidth: 470,
              borderColor: accent,
              boxShadow: `0 0 40px -16px ${accent}, 0 20px 50px -30px #000`,
            }}
          >
            <span style={{ fontSize: 20, color: accent, flexShrink: 0 }}>{force.sigil}</span>
            <span style={{ fontSize: 12.5, lineHeight: 1.4 }}>
              <strong>Welcome to the Concord, {name}.</strong> Move with{" "}
              <span className="mono" style={{ color: "var(--fg)" }}>WASD</span> or drag. Walk to a glowing gate to fight, or open the menu to train.
            </span>
            <button onClick={onDone} className="btn" style={{ ["--ac" as string]: accent, fontSize: 11, padding: "4px 10px", flexShrink: 0 }}>
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const ARRIVAL_KEYFRAMES = `
@keyframes arrivalPip { 0%,100% { opacity:.25; transform:scale(.7);} 50% { opacity:1; transform:scale(1);} }
@keyframes arrivalHalo { 0% { transform:scale(.8); opacity:.6;} 70% { opacity:0;} 100% { transform:scale(1.9); opacity:0;} }
@keyframes arrivalEnter { from { opacity:0;} to { opacity:1;} }
@keyframes arrivalRise { from { opacity:0; transform:translateY(14px);} to { opacity:1; transform:translateY(0);} }
.arrival-pip { animation: arrivalPip 1s ease-in-out infinite; }
.arrival-halo { animation: arrivalHalo 1.8s ease-out infinite; }
.arrival-enter { animation: arrivalEnter .5s ease both .15s; }
.arrival-rise { animation: arrivalRise .5s cubic-bezier(.2,.8,.2,1) both; }
`;
