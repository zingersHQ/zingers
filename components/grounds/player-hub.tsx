"use client";
// ─────────────────────────────────────────────────────────────────────────────
// The Player Hub — top-right slide-over for Trainer identity + wallet, flight,
// your stuff, compact progress, season war, and settings. Learn/Build links sit
// under "More". Trigger shows level · crowns · wallet hint when unlinked.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  X, Crown, Gem, BookOpen, Target, Layers, Wallet,
  Settings as SettingsIcon, HelpCircle, Shield, ChevronRight, Rocket,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useChampions } from "@/store/champions";
import { trainerLevel, FORCES, forceMeta } from "@/lib/evolve/trainer";
import { TYPE_COLOR, EMBLEM } from "@/lib/evolve/progression";
import { readerSaga } from "@/lib/lore/saga";
import { HUB_NAV_GROUPS, playEntryHref } from "@/lib/play-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { AmbientToggle } from "@/components/grounds/ambience";
import { LocaleDropdown } from "@/components/locale-dropdown";
import { RobotMark } from "@/components/brand/robot-mark";
import { SolanaConnect } from "@/components/wallet/solana-connect";
import { STORAGE } from "@/lib/brand";
import type { WorldGoal } from "./goals";
import type { WarState } from "@/lib/types";

const KIND_ICON: Record<WorldGoal["kind"], string> = { peak: "▲", depth: "▼", secret: "◆" };

export function PlayerHub({
  isMobile,
  crowns,
  war,
  goals,
  goalsDone,
  fragments,
  nodesLeft,
  regionName,
  inRegion,
  hudDim,
  highlight,
  onHighlightOpen,
  onOpen,
  onTakeFlight,
  onOpenControls,
  onOpenSettings,
  onOpenClan,
}: {
  isMobile: boolean;
  crowns: number;
  war?: WarState | null;
  goals: WorldGoal[];
  goalsDone: string[];
  fragments: number;
  nodesLeft: number;
  regionName: string;
  inRegion: boolean;
  hudDim?: boolean;
  /** Pulse the hub trigger while the objectives coach flies into it. */
  highlight?: boolean;
  /** Fired when the trainer opens the hub during the objectives coach. */
  onHighlightOpen?: () => void;
  /** Any time the hub slide-over opens (dismiss orphan toasts above). */
  onOpen?: () => void;
  /** Jump straight into Flight for the current world (no mountain hunt). */
  onTakeFlight?: () => void;
  onOpenControls: () => void;
  onOpenSettings: () => void;
  onOpenClan: () => void;
}) {
  const t = useTranslations("nav");
  const trainerXp = useChampions((s) => s.trainerXp);
  const force = useChampions((s) => s.force);
  const [open, setOpen] = useState(false);
  const [walletLinked, setWalletLinked] = useState(false);

  const tl = trainerLevel(trainerXp);
  const saga = readerSaga(trainerXp);
  const fc = force ? TYPE_COLOR[force] : "#9a96b8";
  const fm = force ? forceMeta(force) : null;
  const rankFrac = Math.max(0.03, Math.min(1, tl.into / tl.span));

  useEffect(() => {
    const sync = () => {
      try {
        setWalletLinked(!!localStorage.getItem(STORAGE.solPubkey));
      } catch {
        setWalletLinked(false);
      }
    };
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [open]);

  const close = useCallback(() => setOpen(false), []);

  const openHub = useCallback(() => {
    setOpen(true);
    onOpen?.();
    if (highlight) onHighlightOpen?.();
  }, [highlight, onHighlightOpen, onOpen]);

  // M toggles the hub; Esc closes it (the grounds screen owns Esc→settings only
  // while the hub is shut).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.key) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) return;
      if (e.key === "Escape" && open) {
        e.stopPropagation();
        setOpen(false);
        return;
      }
      if (e.key.toLowerCase() === "m" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setOpen((v) => {
          const next = !v;
          if (next) {
            onOpen?.();
            if (highlight) onHighlightOpen?.();
          }
          return next;
        });
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, highlight, onHighlightOpen, onOpen]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const openThen = (fn: () => void) => () => { setOpen(false); fn(); };

  const warPts: Record<string, number> = {};
  for (const s of war?.standings ?? []) warPts[s.force] = s.points;
  const warMax = Math.max(1, ...Object.values(warPts));

  const goalsLeft = goals.filter((g) => !goalsDone.includes(g.id));
  const huntOpen = inRegion && (goalsLeft.length > 0 || nodesLeft > 0);

  return (
    <>
      <style>{`
        @keyframes hubCatch {
          0%, 100% { box-shadow: 0 0 0 0 transparent; }
          50% { box-shadow: 0 0 0 3px color-mix(in srgb, var(--gold) 45%, transparent), 0 0 22px -4px var(--gold); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hub-trigger.is-catch { animation: none !important; }
        }
      `}</style>
      {/* always-visible trigger: robot mark · level · crowns · wilds hunt badge */}
      <button
        type="button"
        onClick={openHub}
        className={`panel hub-trigger${hudDim ? " is-dim" : ""}${highlight ? " is-catch" : ""}`}
        aria-label={
          !walletLinked
            ? "Open your menu · connect wallet"
            : huntOpen
              ? `Open your menu · ${goalsLeft.length} goals · ${nodesLeft} caches`
              : "Open your menu"
        }
        aria-expanded={open}
        title={
          !walletLinked
            ? "Your menu · connect wallet"
            : huntOpen
              ? `Menu · ${goalsLeft.length}/${goals.length || 3} goals · ${nodesLeft} caches`
              : "Your menu"
        }
        style={{
          ["--ac" as string]: fc,
          display: "inline-flex",
          alignItems: "center",
          gap: isMobile ? 7 : 9,
          padding: isMobile ? "6px 10px 6px 8px" : "7px 12px 7px 9px",
          cursor: "pointer",
          pointerEvents: "auto",
          borderColor: open || highlight ? (highlight ? "var(--gold)" : fc) : "var(--line)",
          touchAction: "manipulation",
          animation: highlight ? "hubCatch 1.2s ease-in-out infinite" : undefined,
        }}
      >
        <span
          aria-hidden
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: isMobile ? 24 : 26,
            height: isMobile ? 24 : 26,
            borderRadius: 7,
            background: "rgba(255,255,255,.07)",
            color: "var(--ink)",
            flexShrink: 0,
          }}
        >
          <RobotMark size={isMobile ? 17 : 18} />
        </span>
        <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.05, minWidth: 0 }}>
          <span style={{ fontSize: isMobile ? 13 : 14, fontWeight: 800, color: fc }}>
            Level {tl.level}
          </span>
        </span>
        <span style={{ width: 1, height: 16, background: "var(--line2)" }} />
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Crown size={isMobile ? 13 : 15} color="var(--gold)" strokeWidth={2.2} />
          <span style={{ fontWeight: 800, fontSize: isMobile ? 13 : 15, color: "var(--gold)" }}>{crowns}</span>
        </span>
        {!walletLinked && (
          <span
            title="Connect wallet"
            aria-hidden
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginLeft: 2,
              width: 18,
              height: 18,
              borderRadius: 5,
              background: "color-mix(in srgb, #7c5cff 28%, transparent)",
              color: "#c4b5ff",
            }}
          >
            <Wallet size={11} strokeWidth={2.4} />
          </span>
        )}
        {(highlight || huntOpen) && (
          <span
            title="World objectives & caches"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              marginLeft: 2,
              padding: huntOpen && !highlight ? "2px 6px" : 0,
              width: highlight && !huntOpen ? 18 : undefined,
              height: highlight && !huntOpen ? 18 : undefined,
              justifyContent: "center",
              borderRadius: 5,
              background: "color-mix(in srgb, var(--gold) 22%, transparent)",
              color: "var(--gold)",
            }}
          >
            <Target size={11} strokeWidth={2.4} />
            {huntOpen && (
              <span className="mono" style={{ fontSize: isMobile ? 9 : 10, fontWeight: 800, letterSpacing: 0.3, lineHeight: 1 }}>
                {goals.length > 0 ? `${goals.length - goalsLeft.length}/${goals.length}` : "—"}
                {nodesLeft > 0 ? ` · ${nodesLeft}` : ""}
              </span>
            )}
          </span>
        )}
      </button>

      {open && (
        <div
          className="hub-scrim"
          role="dialog"
          aria-modal="true"
          aria-label="Your hub"
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 140,
            background: "rgba(5,3,9,.55)",
            backdropFilter: "blur(3px)",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <style>{`
            @keyframes hubIn { from { transform: translateX(24px); opacity: 0 } to { transform: none; opacity: 1 } }
            @media (prefers-reduced-motion: reduce){ .hub-panel { animation: none !important; } }
            .hub-navlink { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:9px 11px; border-radius:9px; border:1px solid var(--line); background:var(--hover); color:var(--ink); text-decoration:none; }
            .hub-navlink:hover { border-color: var(--line2); background: rgba(255,255,255,.05); }
          `}</style>
          <div
            className="hub-panel panel"
            style={{
              width: isMobile ? "100%" : "min(400px, 100%)",
              height: "100%",
              overflowY: "auto",
              borderRadius: isMobile ? 0 : "16px 0 0 16px",
              padding: "16px 16px 28px",
              animation: "hubIn .28s cubic-bezier(.2,.8,.2,1) both",
            }}
          >
            {/* header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 11, background: `${fc}22`, color: fc, fontSize: 20, fontWeight: 900 }}>
                  {force ? EMBLEM[force] : <Shield size={20} strokeWidth={2.2} />}
                </span>
                <div style={{ lineHeight: 1.15 }}>
                  <div style={{ fontSize: 17, fontWeight: 800 }}>Trainer · Level {tl.level}</div>
                  <div className="mono" style={{ fontSize: 10, letterSpacing: 0.5, color: "var(--muted)", marginTop: 2 }}>
                    {tl.title.toUpperCase()} · {fm ? fm.name.toUpperCase() : "NO CLAN YET"}
                  </div>
                </div>
              </div>
              <button onClick={close} aria-label="Close hub" className="panel" style={{ padding: 7, display: "grid", placeItems: "center", cursor: "pointer", color: "var(--muted)", lineHeight: 0 }}>
                <X size={16} strokeWidth={2.2} />
              </button>
            </div>

            {/* Account first — wallet was buried on Rank / Immortalize */}
            <SectionLabel>{t("account")}</SectionLabel>
            <div className="panel" style={{ padding: "12px 13px" }}>
              <SolanaConnect
                tone="hub"
                onIdentity={() => {
                  try {
                    setWalletLinked(!!localStorage.getItem(STORAGE.solPubkey));
                  } catch {
                    setWalletLinked(false);
                  }
                }}
              />
              <Link
                href="/standings"
                onClick={close}
                className="mono"
                style={{
                  display: "inline-block",
                  marginTop: 10,
                  fontSize: 10,
                  color: "var(--muted2)",
                  textDecoration: "underline",
                }}
              >
                {t("recoveryOnRank")}
              </Link>
            </div>

            {onTakeFlight && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  close();
                  onTakeFlight();
                }}
                style={{
                  ["--ac" as string]: "#39e0ff",
                  width: "100%",
                  marginTop: 14,
                  fontSize: 14,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Rocket size={16} strokeWidth={2.2} />
                Take flight{inRegion ? ` · ${regionName}` : ""}
              </button>
            )}

            {/* rank + crowns */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span className="mono" style={{ fontSize: 9, letterSpacing: 1.2, color: "var(--muted2)" }}>RANK PROGRESS</span>
                  <span className="mono" style={{ fontSize: 9, color: "var(--muted2)" }}>{tl.into}/{tl.span} xp</span>
                </div>
                <div style={{ height: 7, borderRadius: 4, background: "rgba(255,255,255,.08)", marginTop: 5, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.round(rankFrac * 100)}%`, background: fc, transition: "width .4s" }} />
                </div>
              </div>
              <div className="panel" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 10px" }}>
                <Crown size={14} color="var(--gold)" strokeWidth={2.2} />
                <span style={{ fontWeight: 800, color: "var(--gold)" }}>{crowns}</span>
              </div>
            </div>

            {/* You — your stuff */}
            <SectionLabel>{t("groups.you")}</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              <Link href="/collection" onClick={close} className="hub-navlink">
                <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <Layers size={15} color="var(--gold)" />
                  <span style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{t("items.collection.label")}</span>
                    <span style={{ fontSize: 10.5, color: "var(--muted2)" }}>{t("items.collection.blurb")}</span>
                  </span>
                </span>
                <ChevronRight size={15} color="var(--muted2)" />
              </Link>
              <Link href="/standings" onClick={close} className="hub-navlink">
                <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <Crown size={15} color="var(--gold)" />
                  <span style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{t("items.rank.label")}</span>
                    <span style={{ fontSize: 10.5, color: "var(--muted2)" }}>{t("items.rank.blurb")}</span>
                  </span>
                </span>
                <ChevronRight size={15} color="var(--muted2)" />
              </Link>
            </div>

            {/* Progress — one card, not three stacked systems */}
            <SectionLabel>{t("progress")}</SectionLabel>
            <div className="panel" style={{ padding: "12px 13px" }}>
              {inRegion && goals.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {goals.map((g) => {
                    const done = goalsDone.includes(g.id);
                    return (
                      <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 9, opacity: done ? 0.5 : 1 }}>
                        <span style={{ fontSize: 13, color: g.color, width: 16, textAlign: "center" }}>{KIND_ICON[g.kind]}</span>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, textDecoration: done ? "line-through" : "none" }}>
                          {g.label}
                        </span>
                        <span className="mono" style={{ fontSize: 10, color: done ? "#36d39a" : "var(--gold)", flexShrink: 0 }}>
                          {done ? "done" : `${g.reward.crowns}c`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ fontSize: 12, color: "var(--muted)", margin: 0, lineHeight: 1.4 }}>
                  {t("progressEmpty")}
                </p>
              )}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  marginTop: 12,
                  paddingTop: 10,
                  borderTop: "1px solid var(--line)",
                  alignItems: "center",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12 }}>
                  <BookOpen size={13} color="#cdb8ff" />
                  <span style={{ fontWeight: 700 }}>{saga.chapter.title}</span>
                  <span className="mono" style={{ fontSize: 9, color: "var(--muted2)" }}>
                    {saga.index + 1}/{saga.total}
                  </span>
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, marginLeft: "auto" }}>
                  <Gem size={13} color="#39e0ff" />
                  <span style={{ fontWeight: 700 }}>{fragments}</span>
                  <span className="mono" style={{ fontSize: 9, color: "var(--muted2)" }}>
                    {inRegion ? `· ${nodesLeft} caches` : ""}
                  </span>
                </span>
              </div>
            </div>

            {/* Season war — compact; clan CTA if needed */}
            {war && (
              <>
                <SectionLabel>{t("seasonWar")}</SectionLabel>
                <div className="panel" style={{ padding: "11px 12px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {FORCES.map((f) => {
                      const col = TYPE_COLOR[f.id];
                      const pts = warPts[f.id] ?? 0;
                      const lead = war.leader === f.id;
                      return (
                        <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <span style={{ color: col, fontSize: 11, fontWeight: 800, width: 13, textAlign: "center" }}>{EMBLEM[f.id]}</span>
                          <div style={{ flex: 1, height: 6, borderRadius: 4, background: "rgba(255,255,255,.07)", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${Math.round((pts / warMax) * 100)}%`, background: col, opacity: lead ? 1 : 0.55, transition: "width .4s" }} />
                          </div>
                          <span className="mono" style={{ fontSize: 9, color: lead ? col : "var(--muted2)", width: 22, textAlign: "right" }}>{pts}</span>
                        </div>
                      );
                    })}
                  </div>
                  {!fm && (
                    <button
                      onClick={openThen(onOpenClan)}
                      className="btn btn-primary"
                      style={{ ["--ac" as string]: fc, width: "100%", marginTop: 11, fontSize: 12.5 }}
                    >
                      {t("chooseClan")}
                    </button>
                  )}
                </div>
              </>
            )}

            {/* Settings */}
            <SectionLabel>{t("displaySettings")}</SectionLabel>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <LocaleDropdown variant="hub" />
              <ThemeToggle variant="compact" />
              <AmbientToggle compact={false} />
              <button onClick={openThen(onOpenControls)} className="panel" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 12px", cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>
                <HelpCircle size={15} /> {t("controls")}
              </button>
              <button onClick={openThen(onOpenSettings)} className="panel" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 12px", cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>
                <SettingsIcon size={15} /> {t("settings")}
              </button>
            </div>

            {/* Learn / Build tucked away — not the default wall of chrome */}
            <details style={{ marginTop: 18 }}>
              <summary
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: 1.2,
                  color: "var(--muted2)",
                  cursor: "pointer",
                  listStyle: "none",
                }}
              >
                {t("moreLinks")}
              </summary>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                {HUB_NAV_GROUPS.filter((g) => g.id !== "play" && g.id !== "you").flatMap((group) =>
                  group.items.map((item) => (
                    <Link
                      key={item.id}
                      href={item.id === "play" ? playEntryHref(isMobile) : item.href}
                      onClick={close}
                      className="panel"
                      style={{ padding: "6px 11px", fontSize: 12, fontWeight: 600, textDecoration: "none", color: "var(--ink)" }}
                    >
                      {t(`items.${item.id}.label`)}
                    </Link>
                  )),
                )}
              </div>
            </details>

            <p className="mono" style={{ fontSize: 9, color: "var(--muted2)", textAlign: "center", marginTop: 18, letterSpacing: 0.5 }}>
              {t("menuHint")}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mono" style={{ fontSize: 9.5, letterSpacing: 2, color: "var(--muted2)", margin: "20px 0 9px" }}>
      {children}
    </div>
  );
}

