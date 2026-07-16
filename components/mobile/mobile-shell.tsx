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
import { useCallback, useEffect, useMemo, useState } from "react";
import { Home, Eye, Shield, Rocket, Trophy, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import CircuitLite from "@/components/grounds/circuit-lite";
import MobileToday from "@/components/mobile/mobile-today";
import MobileWatch from "@/components/mobile/mobile-watch";
import MobileChampion from "@/components/mobile/mobile-champion";
import MobileRank from "@/components/mobile/mobile-rank";
import MobileSplash from "@/components/mobile/mobile-splash";
import { useChampions } from "@/store/champions";
import { ROSTER } from "@/lib/engine/roster";
import { firstDuelStarterKeys } from "@/lib/first-duel";
import { getOwnerToken } from "@/lib/owner";
import { track as pingEvent } from "@/lib/track";
import { STORAGE } from "@/lib/brand";

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

  // Climb is the bus-time door (docs/two-doors.md §3): playable immediately, even
  // with no champion — a loaner "wild mind" flies with you (guest Climb), and the
  // fall card offers to claim it. `unowned` still routes the Champion tab to adopt.
  const owned = useChampions((s) => s.owned);
  const unowned = !owned || !ROSTER[owned];

  // the loaner wild mind: a deterministic weekly starter, seeded off the device
  // token so a returning guest keeps meeting the same mind (attachment before adoption).
  const loanerKey = useMemo(() => {
    const keys = firstDuelStarterKeys().filter((k) => ROSTER[k]);
    if (!keys.length) return "AXIOM";
    const tok = getOwnerToken() || "guest";
    let h = 2166136261;
    for (let i = 0; i < tok.length; i++) {
      h ^= tok.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return keys[(h >>> 0) % keys.length]!;
  }, []);

  const selectTab = useCallback(
    (id: TabId) => {
      setPrevTab(tab);
      setTab(id);
    },
    [tab],
  );

  const activeTab: TabId = tab;

  // Immersive contexts drop the bottom tab bar for a clean, focused surface and
  // carry their own back/close affordance instead (docs/mobile.md homogenisation):
  //   • Climb — the one-thumb flight game wants an unobstructed canvas.
  //   • Champion selection — a fresh trainer commits here; picking is the exit.
  // Everything else (Today · Watch · Champion profile · Rank) keeps the tab bar
  // as the single, consistent primary navigation. No burger anywhere.
  const adopting = activeTab === "champion" && unowned;
  const immersive = activeTab === "climb" || adopting;

  // Leave an immersive context back to the last browse tab (never back into
  // another immersive one).
  const exitImmersive = useCallback(() => {
    const safe = prevTab !== activeTab && prevTab !== "climb" && !(prevTab === "champion" && unowned) ? prevTab : "today";
    setTab(safe);
  }, [prevTab, activeTab, unowned]);

  // guest Climb → claim: jump to the Champion tab (which shows adopt when unowned)
  const claimFromClimb = useCallback(() => {
    pingEvent("m_claim_from_climb");
    setPrevTab(tab);
    setTab("champion");
  }, [tab]);

  // splash door — the epic first screen, shown once per browser. Read the latch
  // in an effect (never during render) so SSR/first paint match, then reveal it.
  const [showSplash, setShowSplash] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE.mSplash)) setShowSplash(true);
    } catch {
      // no storage — skip the splash rather than gate the whole app on it
    }
  }, []);
  const dismissSplash = useCallback(() => {
    try {
      localStorage.setItem(STORAGE.mSplash, String(Date.now()));
    } catch {
      // best-effort latch
    }
    setShowSplash(false);
  }, []);
  const splashFly = useCallback(() => {
    dismissSplash();
    setPrevTab("today");
    setTab("climb");
  }, [dismissSplash]);
  const splashEnter = useCallback(() => {
    dismissSplash();
    setTab("today");
  }, [dismissSplash]);

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
      {showSplash && <MobileSplash onFly={splashFly} onEnter={splashEnter} />}
      {/* content area — positioned so the full-bleed Climb canvas can fill it */}
      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        {activeTab === "climb" ? (
          <CircuitLite
            embedded
            onExit={exitImmersive}
            guestKey={unowned ? loanerKey : undefined}
            onClaim={unowned ? claimFromClimb : undefined}
          />
        ) : activeTab === "today" ? (
          <MobileToday onNavigate={(t) => selectTab(t as TabId)} />
        ) : activeTab === "watch" ? (
          <MobileWatch />
        ) : activeTab === "champion" ? (
          <MobileChampion onNavigate={(t) => selectTab(t as TabId)} initialPick={loanerKey} />
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
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTab(t.id)}
              aria-current={active ? "page" : undefined}
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
                color: active ? ACCENT : "var(--muted2, #6b6785)",
                opacity: 1,
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
