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
import { useState } from "react";
import { Home, Eye, Shield, Rocket, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import CircuitLite from "@/components/grounds/circuit-lite";
import MobileToday from "@/components/mobile/mobile-today";
import MobileWatch from "@/components/mobile/mobile-watch";
import MobileChampion from "@/components/mobile/mobile-champion";
import MobileRank from "@/components/mobile/mobile-rank";

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
  const [tab, setTab] = useState<TabId>("climb");

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
        {tab === "climb" ? (
          <CircuitLite embedded />
        ) : tab === "today" ? (
          <MobileToday onNavigate={(t) => setTab(t as TabId)} />
        ) : tab === "watch" ? (
          <MobileWatch />
        ) : tab === "champion" ? (
          <MobileChampion onNavigate={(t) => setTab(t as TabId)} />
        ) : (
          <MobileRank />
        )}
      </div>

      {/* bottom tab bar — thumb-reachable, with iOS safe-area padding */}
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
          const active = t.id === tab;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
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
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
                transition: "color .12s",
              }}
            >
              <Icon size={21} strokeWidth={active ? 2.6 : 2} />
              <span className="mono" style={{ fontSize: 9.5, letterSpacing: 0.8, fontWeight: active ? 800 : 500 }}>{t.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default MobileShell;
