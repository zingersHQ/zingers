"use client";
// Short in-world ceremony after you swear to a Clan: letterboxed world shot of
// the Trainer beside the rising flag (others lowering), with a skip affordance.
// Presentation only — the pledge is already committed before this mounts.
import { useEffect, useRef } from "react";
import { EMBLEM } from "@/lib/evolve/progression";
import type { CreatureType } from "@/lib/types";
import { pledgeSfx } from "@/lib/sfx";

export const CLAN_CEREMONY_MS = 8000;

export type ClanCeremony = {
  type: CreatureType;
  name: string;
  motto: string;
  color: string;
};

export function ClanCinematic({
  ceremony,
  onDone,
}: {
  ceremony: ClanCeremony;
  onDone: () => void;
}) {
  const done = useRef(false);
  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDone();
  };

  useEffect(() => {
    pledgeSfx();
    const t = setTimeout(finish, CLAN_CEREMONY_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " " || e.code === "Space") {
        e.preventDefault();
        finish();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { type, name, motto, color } = ceremony;

  return (
    <div
      style={{ position: "absolute", inset: 0, zIndex: 72, pointerEvents: "none" }}
      aria-live="polite"
      aria-label={`${name} clan joined`}
    >
      <style>{CEREMONY_CSS}</style>
      <div className="clan-cin-bar clan-cin-bar--top" aria-hidden />
      <div className="clan-cin-bar clan-cin-bar--bottom" aria-hidden />

      <button
        type="button"
        onClick={finish}
        className="mono"
        style={{
          position: "absolute",
          top: "calc(5.5vh + 10px)",
          right: 18,
          zIndex: 5,
          pointerEvents: "auto",
          background: "rgba(5,4,10,.45)",
          border: "1px solid rgba(255,255,255,.14)",
          borderRadius: 8,
          color: "rgba(255,255,255,.72)",
          fontSize: 11,
          letterSpacing: 1.4,
          cursor: "pointer",
          padding: "6px 12px",
        }}
      >
        SKIP
      </button>

      <div
        className="clan-cin-caption"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: "7.5vh",
          zIndex: 5,
          display: "flex",
          justifyContent: "center",
          padding: "0 20px",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            maxWidth: 520,
            padding: "12px 16px",
            borderRadius: 14,
            background: "rgba(5,4,10,.55)",
            border: `1px solid ${color}66`,
            boxShadow: `0 0 48px -20px ${color}`,
            backdropFilter: "blur(6px)",
          }}
        >
          <span
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              display: "grid",
              placeItems: "center",
              background: `${color}22`,
              color,
              fontSize: 24,
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            {EMBLEM[type]}
          </span>
          <div style={{ minWidth: 0 }}>
            <div className="mono" style={{ fontSize: 9.5, letterSpacing: 2.2, color, fontWeight: 700 }}>
              CLAN JOINED
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.3, lineHeight: 1.15, marginTop: 2 }}>
              {name}
            </div>
            <div className="mono" style={{ fontSize: 11, color: "rgba(255,255,255,.62)", fontStyle: "italic", marginTop: 3 }}>
              {motto}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const CEREMONY_CSS = `
.clan-cin-bar{position:absolute;left:0;right:0;height:0;background:#020106;z-index:4;pointer-events:none;animation:clanCinBar .55s cubic-bezier(.2,.8,.2,1) forwards}
.clan-cin-bar--top{top:0}
.clan-cin-bar--bottom{bottom:0}
@keyframes clanCinBar{to{height:5.5vh}}
.clan-cin-caption{animation:clanCinFade .7s ease-out .15s both}
@keyframes clanCinFade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion: reduce){
  .clan-cin-bar{animation:none;height:5.5vh}
  .clan-cin-caption{animation:none}
}
`;
