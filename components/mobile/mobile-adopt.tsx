"use client";
// ─────────────────────────────────────────────────────────────────────────────
// Mobile champion adoption (docs/mobile.md: the raise lane must be reachable on a
// phone). Desktop adopts through the 3D first-duel funnel (pick → train → fight);
// phones have no 3D onboarding, so a fresh mobile user could reach the Champion
// tab with no way to actually GET a champion. This is that missing door: the same
// weekly starters (one per Force) the desktop pick uses, adopted as a true rookie
// via adoptStarterRookie — so the origin arc (rookie → legend) is identical, and
// the first-duel gate is marked complete so desktop doesn't re-onboard them.
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo, useState } from "react";
import { Sparkles, Check, ChevronRight } from "lucide-react";
import { TYPE_COLOR } from "@/lib/evolve/progression";
import { forceName } from "@/lib/lore/canon";
import { ROSTER } from "@/lib/engine/roster";
import { useChampions } from "@/store/champions";
import { ChampionAvatar } from "@/components/champion-avatar";
import {
  firstDuelStarterKeys,
  previewRookieChampion,
  FIRST_DUEL_HOOKS,
  markFirstDuelComplete,
} from "@/lib/first-duel";

export function MobileAdopt() {
  const adoptStarterRookie = useChampions((s) => s.adoptStarterRookie);
  const [picked, setPicked] = useState<string | null>(null);

  // one champion per Force for the current week — the same pool desktop offers
  const starters = useMemo(
    () => firstDuelStarterKeys().filter((k) => ROSTER[k]),
    [],
  );

  const confirm = () => {
    if (!picked) return;
    adoptStarterRookie(picked);
    markFirstDuelComplete();
  };

  return (
    <div style={{ height: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "20px 14px 24px" }}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <Sparkles size={26} strokeWidth={2} style={{ color: "var(--accent)" }} />
          <div style={{ fontSize: 22, fontWeight: 800, margin: "8px 0 4px" }}>Choose your champion</div>
          <p style={{ fontSize: 13, lineHeight: 1.55, color: "var(--muted, #9a96b8)", margin: "0 auto", maxWidth: 320 }}>
            You raise the mind that fights. Pick one to begin — it starts green and
            evolves as you train it and call fights.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {starters.map((key) => {
            const type = ROSTER[key].type;
            const col = TYPE_COLOR[type];
            const on = picked === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setPicked(key)}
                className="panel"
                style={{
                  ["--ac" as string]: col,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 13px",
                  textAlign: "left",
                  cursor: "pointer",
                  border: on ? `1.5px solid ${col}` : "1px solid var(--line, rgba(255,255,255,.1))",
                  background: on ? "var(--panel2, #15131f)" : "transparent",
                  boxShadow: on ? `0 0 40px -20px ${col}` : "none",
                }}
              >
                <ChampionAvatar ckey={key} type={type} champion={previewRookieChampion(key)} size={52} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{ROSTER[key].name}</div>
                  <div className="mono" style={{ fontSize: 10, color: col, margin: "1px 0 3px" }}>{forceName(type)}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted, #9a96b8)", lineHeight: 1.35 }}>
                    {FIRST_DUEL_HOOKS[key] ?? "A mind worth raising."}
                  </div>
                </div>
                <span
                  aria-hidden
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 999,
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                    border: on ? "none" : "1.5px solid var(--line2, rgba(255,255,255,.2))",
                    background: on ? col : "transparent",
                    color: "#0a0a12",
                  }}
                >
                  {on && <Check size={15} strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={confirm}
          disabled={!picked}
          style={{
            width: "100%",
            marginTop: 18,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "15px 16px",
            borderRadius: 13,
            border: "none",
            background: picked ? "var(--accent, #7cf6c8)" : "var(--panel2, #1a1826)",
            color: picked ? "#0a0a12" : "var(--muted2, #6b6785)",
            fontSize: 15,
            fontWeight: 800,
            cursor: picked ? "pointer" : "not-allowed",
          }}
        >
          {picked ? <>Raise {ROSTER[picked].name} <ChevronRight size={17} strokeWidth={2.6} /></> : "Pick a champion above"}
        </button>

        <p className="mono" style={{ fontSize: 9.5, color: "var(--muted2, #6b6785)", textAlign: "center", lineHeight: 1.5, margin: "12px 0 0" }}>
          One champion to start · a new pool of starters rotates weekly
        </p>
      </div>
    </div>
  );
}

export default MobileAdopt;
