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
import { guestLoanerKey } from "@/lib/first-duel";
import { getOwnerToken } from "@/lib/owner";
import { track as pingEvent } from "@/lib/track";
import { STORAGE } from "@/lib/brand";
import { readClimbChallengeFromSearch, type ClimbChallenge } from "@/lib/climb-challenge";
import { formatCircuitMs } from "@/components/grounds/circuit";

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
  { id: "climb", label: "Ascent", icon: Rocket },
  { id: "rank", label: "Rank", icon: Trophy },
];

const ACCENT = "var(--accent, #7cf6c8)";

export function MobileShell() {
  const [tab, setTab] = useState<TabId>("today");
  // where a "back/close" from an immersive context returns to (the last browse tab)
  const [prevTab, setPrevTab] = useState<TabId>("today");
  /** Incoming async Climb challenge from ?climb= (ghost race ships later). */
  const [challenge, setChallenge] = useState<ClimbChallenge | null>(null);
  const [challengeDismissed, setChallengeDismissed] = useState(false);

  // Climb is the bus-time door (docs/two-doors.md §3): playable immediately, even
  // with no champion — a loaner "wild mind" flies with you (guest Climb), and the
  // fall card offers to claim it. `unowned` still routes the Champion tab to adopt.
  const owned = useChampions((s) => s.owned);
  const unowned = !owned || !ROSTER[owned];

  // Same loaner helper as desktop guest Ascent — weekly starter, device-stable.
  const loanerKey = useMemo(() => guestLoanerKey(getOwnerToken() || "guest"), []);

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

  // splash door — shown once per browser. Latch is read in an effect (never
  // during render) so SSR/first paint match. Until that resolves we hold an
  // opaque sky gate so the Today homepage never flashes under the Take flight
  // poster for a frame.
  const [splashGate, setSplashGate] = useState<"checking" | "splash" | "shell">("checking");
  useEffect(() => {
    // Challenge deep-links skip the splash and open Climb immediately.
    if (typeof window !== "undefined") {
      const c = readClimbChallengeFromSearch(window.location.search);
      if (c) {
        setChallenge(c);
        pingEvent("climb_challenge_open");
        setTab("climb");
        setSplashGate("shell");
        try {
          localStorage.setItem(STORAGE.mSplash, String(Date.now()));
        } catch {
          /* best-effort */
        }
        return;
      }
    }
    try {
      setSplashGate(localStorage.getItem(STORAGE.mSplash) ? "shell" : "splash");
    } catch {
      // no storage — skip the splash rather than gate the whole app on it
      setSplashGate("shell");
    }
  }, []);
  const dismissSplash = useCallback(() => {
    try {
      localStorage.setItem(STORAGE.mSplash, String(Date.now()));
    } catch {
      // best-effort latch
    }
    setSplashGate("shell");
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

  const showSplash = splashGate === "splash";
  // Same sky as MobileSplash — covers the shell while we decide, and sits under
  // the splash itself so nothing from Today peeks through on first paint.
  const splashSky =
    "radial-gradient(120% 90% at 50% 8%, #1a2b4d 0%, #12112a 46%, #08070f 100%)";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        background: splashGate === "shell" ? "var(--bg, #07060d)" : splashSky,
        color: "#fff",
        overflow: "hidden",
        overscrollBehavior: "none",
      }}
    >
      {splashGate === "checking" && (
        <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 1200, background: splashSky }} />
      )}
      {showSplash && <MobileSplash onFly={splashFly} onEnter={splashEnter} />}
      {/* content area — positioned so the full-bleed Climb canvas can fill it.
          Held back until the splash latch resolves so Today never paints under
          the Take flight door. */}
      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        {/* Defer mounting the Today/home shell until the splash latch is known and
            dismissed — otherwise the homepage paints for a frame under Take flight. */}
        {splashGate === "shell" && (
          <>
            {activeTab === "climb" ? (
              <>
                {challenge && !challengeDismissed && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(10px + env(safe-area-inset-top, 0px))",
                      left: 12,
                      right: 12,
                      zIndex: 35,
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: `1px solid ${ACCENT}`,
                      background: "rgba(8,7,14,.88)",
                      backdropFilter: "blur(8px)",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="mono" style={{ fontSize: 9, letterSpacing: 1.4, color: ACCENT }}>
                        CHALLENGE
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginTop: 2 }}>
                        Beat {challenge.name || "a Trainer"} · {challenge.sectors}/100
                        {challenge.totalMs > 0 ? ` · ${formatCircuitMs(challenge.totalMs)}` : ""}
                      </div>
                      <div className="mono" style={{ fontSize: 10, color: "var(--muted, #9a96b8)", marginTop: 2 }}>
                        {challenge.path?.length
                          ? "Ghost flies beside you — clear deeper or faster to win"
                          : "Clear deeper (or same depth, faster) to claim the win"}
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label="Dismiss challenge"
                      onClick={() => setChallengeDismissed(true)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        border: "1px solid rgba(255,255,255,.14)",
                        background: "transparent",
                        color: "#e6e2f5",
                        cursor: "pointer",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      <X size={14} strokeWidth={2.4} />
                    </button>
                  </div>
                )}
                <CircuitLite
                  embedded
                  onExit={exitImmersive}
                  guestKey={unowned ? loanerKey : undefined}
                  onClaim={unowned ? claimFromClimb : undefined}
                  challenge={challenge}
                />
              </>
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
          </>
        )}
      </div>

      {/* bottom tab bar — thumb-reachable, with iOS safe-area padding. Hidden in
          immersive contexts (Climb, champion selection), which carry their own
          back/close instead — one consistent nav model, no burger. Also held
          back while the Take flight splash gate is up. */}
      {splashGate === "shell" && !immersive && (
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
