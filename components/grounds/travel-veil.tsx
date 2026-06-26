"use client";
// Scene-change transition for moving between places — gate travel between
// regions, and stepping into / out of a venue. Without this the world simply
// cut-swaps (you teleport). Here a short force-tinted veil wipes shut, the
// destination quietly mounts behind it, then it lifts onto the new place with a
// name card — so travel reads as a directed scene change, not a jump cut.
import { useEffect, useState } from "react";
import { travelWhoosh } from "@/lib/sfx";

export interface TravelCard {
  kicker: string; // e.g. TRAVELING / ENTERING / RETURNING
  title: string; // destination name
  sub?: string; // tagline / blurb
  color: string; // destination accent
  sigil?: string; // optional force/venue glyph
}

type Phase = "cover" | "reveal";

const COVER_MS = 380; // veil fades to opaque
const HOLD_MS = 200; // beat at full cover while the new place mounts
const REVEAL_MS = 560; // veil lifts onto the destination

export function TravelVeil({
  card,
  onCovered,
  onDone,
}: {
  card: TravelCard;
  onCovered: () => void; // swap the world/venue while hidden
  onDone: () => void; // tear down
}) {
  const [phase, setPhase] = useState<Phase>("cover");

  useEffect(() => {
    travelWhoosh();
  }, []);

  useEffect(() => {
    if (phase === "cover") {
      let lift: ReturnType<typeof setTimeout>;
      const shut = setTimeout(() => {
        onCovered();
        lift = setTimeout(() => setPhase("reveal"), HOLD_MS);
      }, COVER_MS);
      return () => {
        clearTimeout(shut);
        clearTimeout(lift);
      };
    }
    const done = setTimeout(onDone, REVEAL_MS);
    return () => clearTimeout(done);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const shut = phase === "cover";

  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, zIndex: 78, pointerEvents: "none" }}>
      <style>{TRAVEL_KEYFRAMES}</style>
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: shut ? 1 : 0,
          transition: `opacity ${shut ? COVER_MS : REVEAL_MS}ms cubic-bezier(.4,0,.2,1)`,
          background: `radial-gradient(120% 120% at 50% 45%, ${card.color}40 0%, #05040a 56%, #030208 100%)`,
          display: "grid",
          placeItems: "center",
        }}
      >
        {shut && (
          <div className="travel-card" style={{ textAlign: "center", color: "#fff", maxWidth: "82vw" }}>
            {card.sigil && (
              <div style={{ fontSize: 40, color: card.color, marginBottom: 10, textShadow: `0 0 30px ${card.color}` }}>{card.sigil}</div>
            )}
            <div className="mono" style={{ fontSize: 10, letterSpacing: 4, color: "rgba(255,255,255,.6)", marginBottom: 10 }}>
              {card.kicker}
            </div>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.4, lineHeight: 1.05, textShadow: `0 0 28px ${card.color}66` }}>
              {card.title}
            </div>
            {card.sub && (
              <div className="mono" style={{ fontSize: 11, letterSpacing: 1, color: "rgba(255,255,255,.55)", marginTop: 12 }}>
                {card.sub}
              </div>
            )}
            <div style={{ display: "flex", gap: 7, justifyContent: "center", marginTop: 18 }}>
              {[0, 1, 2].map((i) => (
                <span key={i} className="travel-pip" style={{ width: 6, height: 6, borderRadius: "50%", background: card.color, animationDelay: `${i * 0.16}s` }} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const TRAVEL_KEYFRAMES = `
@keyframes travelCardIn { from { opacity:0; transform:translateY(10px) scale(.98);} to { opacity:1; transform:none;} }
@keyframes travelPip { 0%,100% { opacity:.25; transform:scale(.7);} 50% { opacity:1; transform:scale(1);} }
.travel-card { animation: travelCardIn .4s cubic-bezier(.2,.8,.2,1) both .06s; }
.travel-pip { animation: travelPip 1s ease-in-out infinite; }
`;
