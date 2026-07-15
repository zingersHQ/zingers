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
import { ChampionPortraitScene } from "@/components/render/champion-portrait-scene";
import { CharacterBeat } from "@/components/grounds/character-beat";
import { firstFlightScript } from "@/lib/lore/character-beats";
import {
  firstDuelStarterKeys,
  previewRookieChampion,
  FIRST_DUEL_HOOKS,
  markFirstDuelComplete,
} from "@/lib/first-duel";

export function MobileAdopt() {
  const adoptStarterRookie = useChampions((s) => s.adoptStarterRookie);
  const [picked, setPicked] = useState<string | null>(null);
  // key currently playing its "first flight" vignette (before ownership commits)
  const [flying, setFlying] = useState<string | null>(null);

  // one champion per Force for the current week — the same pool desktop offers
  const starters = useMemo(
    () => firstDuelStarterKeys().filter((k) => ROSTER[k]),
    [],
  );

  const confirm = () => {
    if (!picked) return;
    setFlying(picked); // play the vignette first; adoption commits when it ends
  };

  const commit = () => {
    if (flying) {
      adoptStarterRookie(flying);
      markFirstDuelComplete();
    }
  };

  if (flying) {
    const type = ROSTER[flying].type;
    return (
      <CharacterBeat
        script={firstFlightScript(flying)}
        accent={TYPE_COLOR[type]}
        voice="champion"
        championType={type}
        portrait={{ key: flying, type, champion: previewRookieChampion(flying), name: ROSTER[flying].name }}
        onComplete={commit}
        layout="stage"
        sound
      />
    );
  }

  // Borderless renders sized by how many there are: 1 → full width, 2 → half,
  // 3 → third; 4 wraps to a 2-grid, 5+ to a 3-grid. The champion is the hero of
  // this screen, so it shows the full body (no avatar chrome), as big as fits.
  const cols = starters.length <= 3 ? starters.length : starters.length === 4 ? 2 : 3;
  const pickedHook = picked ? (FIRST_DUEL_HOOKS[picked] ?? "A mind worth raising.") : null;

  return (
    <div style={{ height: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "calc(18px + env(safe-area-inset-top, 0px)) 14px calc(20px + env(safe-area-inset-bottom, 0px))" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <Sparkles size={24} strokeWidth={2} style={{ color: "var(--accent)" }} />
          <div style={{ fontSize: 21, fontWeight: 800, margin: "6px 0 4px" }}>Choose your champion</div>
          <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--muted, #9a96b8)", margin: "0 auto", maxWidth: 320 }}>
            You raise the mind that fights. Pick one to begin — it starts green and
            evolves as you train it and call fights.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10 }}>
          {starters.map((key) => {
            const type = ROSTER[key].type;
            const col = TYPE_COLOR[type];
            const on = picked === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setPicked(key)}
                aria-pressed={on}
                style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 0,
                  padding: 0,
                  textAlign: "center",
                  cursor: "pointer",
                  borderRadius: 16,
                  overflow: "hidden",
                  border: on ? `1.5px solid ${col}` : "1px solid var(--line, rgba(255,255,255,.09))",
                  background: on ? "var(--panel2, #15131f)" : "rgba(255,255,255,.02)",
                  boxShadow: on ? `0 0 44px -18px ${col}` : "none",
                  transition: "border-color .14s, box-shadow .14s, background .14s",
                }}
              >
                {/* borderless full-body render — fills the cell, sized by count */}
                <div style={{ width: "100%", aspectRatio: "1 / 1", position: "relative" }}>
                  <ChampionPortraitScene
                    type={type}
                    champion={previewRookieChampion(key)}
                    identityKey={key}
                    preset="portrait"
                    animMode="standing"
                    scale={1.05}
                  />
                  {on && (
                    <span
                      aria-hidden
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        width: 24,
                        height: 24,
                        borderRadius: 999,
                        display: "grid",
                        placeItems: "center",
                        background: col,
                        color: "#0a0a12",
                        boxShadow: "0 2px 10px rgba(0,0,0,.4)",
                      }}
                    >
                      <Check size={15} strokeWidth={3} />
                    </span>
                  )}
                </div>
                <div style={{ padding: "8px 8px 11px", width: "100%" }}>
                  <div style={{ fontSize: cols >= 3 ? 13 : 16, fontWeight: 800, lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ROSTER[key].name}</div>
                  <div className="mono" style={{ fontSize: 9.5, color: col, marginTop: 2, letterSpacing: 0.4 }}>{forceName(type)}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* the picked mind's hook — one supporting line, replaces the per-card copy */}
        <p style={{ minHeight: 34, fontSize: 12.5, lineHeight: 1.4, color: picked ? "var(--ink, #e6e2f5)" : "var(--muted2, #6b6785)", textAlign: "center", margin: "12px auto 0", maxWidth: 340 }}>
          {pickedHook ?? "Tap a champion to meet it."}
        </p>

        <button
          type="button"
          onClick={confirm}
          disabled={!picked}
          style={{
            width: "100%",
            marginTop: 10,
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
