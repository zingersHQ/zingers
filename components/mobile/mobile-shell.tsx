"use client";
// ─────────────────────────────────────────────────────────────────────────────
// M0 — the native mobile shell (docs/mobile.md §3).
//
// Replaces "the only door is the 3D world" with a phone-native bottom-tab shell.
// The phone is the spectate/predict/share lane (growth-strategy.md §3.4.2); the
// desktop keeps the immersive Grounds. Tabs map to the soul verbs (essence.md):
//
//   Today · Watch · Champion · Climb · Rank
//
// Every tab is now a real native body — no "open X" bridges:
//   Today (daily call) · Watch (predict a bout) · Champion (raise your mind) ·
//   Climb (one-thumb Circuit) · Rank (ladder + live feed).
// All reuse the existing engine/store/APIs; none reuse the desktop page layouts.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useState } from "react";
import { Home, Eye, Shield, Rocket, Trophy, Lock, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import CircuitLite from "@/components/grounds/circuit-lite";
import MobileToday from "@/components/mobile/mobile-today";
import MobileWatch from "@/components/mobile/mobile-watch";
import MobileChampion from "@/components/mobile/mobile-champion";
import MobileRank from "@/components/mobile/mobile-rank";
import { useChampions } from "@/store/champions";
import { ROSTER } from "@/lib/engine/roster";

type TabId = "today" | "watch" | "champion" | "climb" | "rank";

interface TabDef {
  id: TabId;
  label: string;
  icon: LucideIcon;
}

const TABS: TabDef[] = [
  { id: "today", label: "Today", icon: Home },
  { id: "watch", label: "Watch", icon: Eye },
  { id: "champion", label: "Champion", icon: Shield },
  { id: "climb", label: "Climb", icon: Rocket },
  { id: "rank", label: "Rank", icon: Trophy },
];

const ACCENT = "var(--accent, #7cf6c8)";

export function MobileShell() {
  const [tab, setTab] = useState<TabId>("today");
  // where a "back/close" from an immersive context returns to (the last browse tab)
  const [prevTab, setPrevTab] = useState<TabId>("today");
  const [lockHint, setLockHint] = useState(false);

  // Climb is a flight game — it needs a champion to fly. Keep it locked until one
  // is claimed. `climbLocked` also guards the content so a champion lost while the
  // Climb tab is open falls back to Today instead of mounting a pilot-less canvas.
  const owned = useChampions((s) => s.owned);
  const climbLocked = !owned || !ROSTER[owned];

  const selectTab = useCallback(
    (id: TabId) => {
      if (id === "climb" && climbLocked) {
        // Don't enter Climb without a champion — steer them to claim one first.
        setPrevTab(tab);
        setTab("champion");
        setLockHint(true);
        window.setTimeout(() => setLockHint(false), 2800);
        return;
      }
      setPrevTab(tab);
      setTab(id);
    },
    [climbLocked, tab],
  );

  const activeTab: TabId = tab === "climb" && climbLocked ? "today" : tab;

  // Immersive contexts drop the bottom tab bar for a clean, focused surface and
  // carry their own back/close affordance instead (docs/mobile.md homogenisation):
  //   • Climb — the one-thumb flight game wants an unobstructed canvas.
  //   • Champion selection — a fresh trainer commits here; picking is the exit.
  // Everything else (Today · Watch · Champion profile · Rank) keeps the tab bar
  // as the single, consistent primary navigation. No burger anywhere.
  const adopting = activeTab === "champion" && climbLocked;
  const immersive = activeTab === "climb" || adopting;

  // Leave an immersive context back to the last browse tab (never back into
  // another immersive one, and never a locked Climb).
  const exitImmersive = useCallback(() => {
    const safe = prevTab !== activeTab && prevTab !== "climb" && !(prevTab === "champion" && climbLocked) ? prevTab : "today";
    setTab(safe);
  }, [prevTab, activeTab, climbLocked]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        background: "var(--bg, #07060d)",
        color: "#fff",
        overflow: "hidden",
        overscrollBehavior: "none",
      }}
    >
      {/* content area — positioned so the full-bleed Climb canvas can fill it */}
      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        {activeTab === "climb" ? (
          <CircuitLite embedded onExit={exitImmersive} />
        ) : activeTab === "today" ? (
          <MobileToday onNavigate={(t) => selectTab(t as TabId)} />
        ) : activeTab === "watch" ? (
          <MobileWatch />
        ) : activeTab === "champion" ? (
          <MobileChampion onNavigate={(t) => selectTab(t as TabId)} />
        ) : (
          <MobileRank />
        )}

        {/* selection close — champion pick is chromeless; a top-right X returns to
            the last browse tab so a trainer is never trapped without a bottom bar */}
        {adopting && (
          <button
            type="button"
            onClick={exitImmersive}
            aria-label="Close champion selection"
            style={{
              position: "absolute",
              top: "calc(12px + env(safe-area-inset-top, 0px))",
              right: 12,
              zIndex: 30,
              width: 38,
              height: 38,
              display: "grid",
              placeItems: "center",
              borderRadius: 999,
              background: "rgba(8,7,14,.55)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,.12)",
              color: "#e6e2f5",
              cursor: "pointer",
              boxShadow: "0 4px 16px -6px rgba(0,0,0,.5)",
            }}
          >
            <X size={18} strokeWidth={2.4} />
          </button>
        )}
      </div>

      {/* transient nudge when a locked tab is tapped */}
      {lockHint && (
        <div
          role="status"
          style={{
            position: "absolute",
            left: "50%",
            bottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
            transform: "translateX(-50%)",
            zIndex: 1001,
            display: "flex",
            alignItems: "center",
            gap: 8,
            maxWidth: "88vw",
            padding: "9px 14px",
            borderRadius: 99,
            background: "rgba(8,7,14,.95)",
            border: "1px solid var(--line2, rgba(255,255,255,.14))",
            boxShadow: "0 12px 34px -18px #000",
            animation: "mshLockHint .3s ease both",
          }}
        >
          <Lock size={13} strokeWidth={2.4} color={ACCENT} />
          <span style={{ fontSize: 12.5, lineHeight: 1.3 }}>Claim a champion first — then Climb unlocks.</span>
        </div>
      )}
      <style>{`@keyframes mshLockHint { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }`}</style>

      {/* bottom tab bar — thumb-reachable, with iOS safe-area padding. Hidden in
          immersive contexts (Climb, champion selection), which carry their own
          back/close instead — one consistent nav model, no burger. */}
      {!immersive && (
      <nav
        style={{
          display: "flex",
          borderTop: "1px solid var(--line, rgba(255,255,255,.08))",
          background: "rgba(8,7,14,.92)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
        aria-label="Primary"
      >
        {TABS.map((t) => {
          const active = t.id === activeTab;
          const locked = t.id === "climb" && climbLocked;
          const Icon = locked ? Lock : t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTab(t.id)}
              aria-current={active ? "page" : undefined}
              aria-disabled={locked || undefined}
              title={locked ? "Claim a champion to unlock Climb" : undefined}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                padding: "9px 0 8px",
                border: "none",
                background: "transparent",
                color: locked ? "var(--muted2, #6b6785)" : active ? ACCENT : "var(--muted2, #6b6785)",
                opacity: locked ? 0.45 : 1,
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
                transition: "color .12s, opacity .12s",
              }}
            >
              <Icon size={21} strokeWidth={active ? 2.6 : 2} />
              <span className="mono" style={{ fontSize: 9.5, letterSpacing: 0.8, fontWeight: active ? 800 : 500 }}>{t.label}</span>
            </button>
          );
        })}
      </nav>
      )}
    </div>
  );
}

export default MobileShell;
