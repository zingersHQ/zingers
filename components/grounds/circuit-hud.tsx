"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Flag, Rocket, RotateCcw, Share2, Skull, Sparkles, Swords, Timer, Trophy } from "lucide-react";
import { CIRCUIT_LIVES, CIRCUIT_SECTOR_INTRO, formatCircuitMs } from "./circuit";
import type { CircuitPersonalBest } from "./circuit-tracks";
import { reachThemeByIndex } from "./climb/reaches";
import { FlightTeachToast } from "./climb/flight-teach-toast";
import { flightMasteryLine, hundredClearDetail } from "./climb/flight-mastery";
import { rewardSfx } from "@/lib/sfx";
import { NextLine } from "@/components/director/next-card";
import { traitLabel, type WingTraitId } from "@/lib/wing-traits";

export type CircuitPhase = "ready" | "running" | "sector" | "done" | "failed" | "continue" | "ceiling" | "ranklock" | "prove";
export type CircuitFailReason = "fall" | "gates";

export interface CircuitBoardEntry {
  /** Server-resolved: claimed name → short wallet → short token */
  handle: string;
  sectors: number;
  totalMs: number;
  clearedAll: boolean;
  you?: boolean;
}

function rankLabel(e: CircuitBoardEntry): string | null {
  const h = e.handle?.trim();
  return h || null;
}

/** Corner share control — icon alone was unread; toast lives in the modal. */
function ShareChallengeBtn({
  onClick,
  label,
}: {
  onClick: () => void;
  label?: string;
}) {
  const tip = label || "Share challenge";
  return (
    <button
      type="button"
      onClick={onClick}
      title={tip}
      aria-label={tip}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 34,
        padding: "0 10px",
        borderRadius: 10,
        border: "1px solid var(--line2)",
        background: "transparent",
        color: "var(--muted)",
        cursor: "pointer",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.4,
      }}
    >
      <Share2 size={14} strokeWidth={2.2} />
      Share
    </button>
  );
}

function LifePips({ lives, maxLives = CIRCUIT_LIVES, accent }: { lives: number; maxLives?: number; accent: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }} aria-label={`${lives} ${lives === 1 ? "life" : "lives"} left`}>
      {Array.from({ length: maxLives }, (_, i) => {
        const on = i < lives;
        return (
          <span
            key={i}
            style={{
              width: 7,
              height: 7,
              borderRadius: 7,
              background: on ? accent : "transparent",
              border: `1.5px solid ${on ? accent : "var(--line)"}`,
              opacity: on ? 0.95 : 0.45,
              boxShadow: on ? `0 0 8px ${accent}66` : "none",
            }}
          />
        );
      })}
    </div>
  );
}

/**
 * Sector-open title card — pairs with the arrive camera hold/sweep.
 * Bold Reach + sector, then after it leaves: "Jump to start" alone.
 * Jump/Space during the card starts the sector and fades this off immediately
 * (parity with mobile Climb's first-press dismiss).
 */
function SectorIntro({
  phase,
  sectorN,
  sectorTotal,
  accent,
  reachName,
  lives,
  maxLives = CIRCUIT_LIVES,
  modifierLabel = null,
}: {
  phase: CircuitPhase;
  sectorN: number;
  sectorTotal: number;
  accent: string;
  reachName?: string;
  lives: number;
  maxLives?: number;
  modifierLabel?: string | null;
}) {
  const [showCard, setShowCard] = useState(true);
  const [cardOut, setCardOut] = useState(false);
  const hideT = useRef<number | null>(null);

  const dismissCard = useCallback((fade: boolean) => {
    if (hideT.current != null) {
      window.clearTimeout(hideT.current);
      hideT.current = null;
    }
    if (!fade) {
      setShowCard(false);
      setCardOut(false);
      return;
    }
    setCardOut(true);
    hideT.current = window.setTimeout(() => {
      setShowCard(false);
      setCardOut(false);
      hideT.current = null;
    }, 320);
  }, []);

  useEffect(() => {
    setShowCard(true);
    setCardOut(false);
    rewardSfx("small");
    const doneT = window.setTimeout(() => dismissCard(true), CIRCUIT_SECTOR_INTRO.cardMs);
    return () => {
      window.clearTimeout(doneT);
      if (hideT.current != null) window.clearTimeout(hideT.current);
    };
  }, [sectorN, dismissCard]);

  // Early Jump-to-start — fade the card as soon as the sector goes live.
  useEffect(() => {
    if (phase !== "running") return;
    dismissCard(true);
  }, [phase, dismissCard]);

  if (!showCard && phase !== "ready") return null;

  return (
    <>
      {showCard && (
        <div
          className={`circuit-sector-intro${cardOut ? " circuit-sector-intro--out" : ""}`}
          aria-live="polite"
        >
          <div className="circuit-sector-intro__wash" style={{ ["--ac" as string]: accent }} />
          <div className="circuit-sector-intro__card">
            <div className="circuit-sector-intro__kicker mono" style={{ color: accent }}>
              {reachName ? reachName.toUpperCase() : "FLIGHT"}
            </div>
            <div className="circuit-sector-intro__rule" style={{ background: accent }} />
            <div className="circuit-sector-intro__num">
              {sectorN}
              <span className="circuit-sector-intro__of"> / {sectorTotal}</span>
            </div>
            <div className="circuit-sector-intro__lives mono" style={{ color: accent }}>
              {Array.from({ length: maxLives }, (_, i) => (
                <span
                  key={i}
                  className="circuit-sector-intro__pip"
                  style={{
                    background: i < lives ? accent : "transparent",
                    borderColor: accent,
                    opacity: i < lives ? 1 : 0.35,
                  }}
                />
              ))}
              <span style={{ marginLeft: 8, letterSpacing: 1.6 }}>
                {lives} {lives === 1 ? "LIFE" : "LIVES"}
              </span>
            </div>
            {modifierLabel && (
              <div
                className="mono"
                style={{
                  display: "inline-block",
                  marginTop: 10,
                  padding: "3px 10px",
                  borderRadius: 999,
                  border: `1px solid ${accent}`,
                  color: accent,
                  fontSize: 9.5,
                  letterSpacing: 1.5,
                }}
              >
                {modifierLabel}
              </div>
            )}
          </div>
        </div>
      )}
      {!showCard && phase === "ready" && (
        <div className="circuit-sector-intro__hint mono" style={{ color: accent }}>
          Jump to start
        </div>
      )}
    </>
  );
}

export function CircuitHud({
  phase,
  sectorIndex,
  runMs,
  sectorMs,
  cpNext,
  cpTotal,
  personalBest,
  board,
  boardLoading,
  onContinue,
  onRestart,
  onExit,
  onShareChallenge,
  shareChallengeLabel,
  shareMsg = null,
  teachMsg = null,
  clearSnap = null,
  sectorModifierLabel = null,
  expeditionOpen = false,
  onProve,
  onClaim,
  claimName,
  onToHub,
  hubLabel,
  challengeResult,
  challengeLabel,
  accent,
  compact,
  failReason,
  sectorTotal = 100,
  reachName,
  lives = CIRCUIT_LIVES,
  runMode = "ranked",
  campsLit = 0,
  scoutCamp = 1,
  onPickRanked,
  onPickScout,
  onPickExpedition,
  expeditionLabel,
  expeditionDetail,
  showModePicker = false,
  ascentReaches = 0,
  climbHundred = false,
  scoutUnlocked = false,
  rankLockKicker,
  rankLockTitle,
  rankLockDetail,
  maxLives = CIRCUIT_LIVES,
  conditionLine,
  conditionDetail,
  wingLine,
  formLine,
  formDetail,
  earnedWingOptions,
  earnedWingPick,
  onPickEarnedWing,
}: {
  phase: CircuitPhase;
  sectorIndex: number;
  runMs: number;
  sectorMs: number;
  cpNext: number;
  cpTotal: number;
  personalBest: CircuitPersonalBest | null;
  board: CircuitBoardEntry[];
  boardLoading: boolean;
  onContinue: () => void;
  onRestart: () => void;
  /** Leave the Circuit venue — jump on the pad starts the run, so walking out is awkward. */
  onExit?: () => void;
  /** Share this run as an async Climb challenge (same levels as mobile). */
  onShareChallenge?: () => void;
  /** Tooltip / aria — e.g. "Copy challenge link" on desktop. */
  shareChallengeLabel?: string;
  /** Clipboard / share feedback shown inside the outcome modal. */
  shareMsg?: string | null;
  /** One-shot Flight teach / gold payout toast. */
  teachMsg?: string | null;
  /** FULL CLEAR mastery snapshot (stumbles / gold / lives). */
  clearSnap?: {
    mastery: { stumbles: number; goldRings: number; livesLeft: number; maxLives: number };
    firstHundred: boolean;
  } | null;
  /** Sector modifier banner (Swift / Duskfall / …). */
  sectorModifierLabel?: string | null;
  /** Weekly expedition unlocked — show post-Hundred CTA. */
  expeditionOpen?: boolean;
  /** Open in-place altitude Prove (Reach II gate). */
  onProve?: () => void;
  /** Guest Ascent: open champion selection to claim (not auto-claim the loaner). */
  onClaim?: () => void;
  claimName?: string | null;
  /** Claimed Trainer: leave the Ascent (usually back to the Concord). */
  onToHub?: () => void;
  hubLabel?: string;
  challengeResult?: "beat" | "surpassed" | "miss" | null;
  challengeLabel?: string | null;
  accent: string;
  compact?: boolean;
  failReason?: CircuitFailReason;
  sectorTotal?: number;
  /** short Reach name only — no roman/tagline essay */
  reachName?: string;
  /** Remaining lives in the current run (3 → continues → 0 run over). */
  lives?: number;
  /** Cap from wing traits (Second Wind → 3). */
  maxLives?: number;
  /** Today's ranked Condition, e.g. "TODAY · FOG BANK". */
  conditionLine?: string;
  conditionDetail?: string;
  /** Ready-strip wing loadout line, e.g. "Second Wind · Gold Eye". */
  wingLine?: string;
  /** Career form/fatigue/scar line when it matters (Stage 4). */
  formLine?: string;
  formDetail?: string;
  earnedWingOptions?: string[];
  earnedWingPick?: string | null;
  onPickEarnedWing?: (id: string) => void;
  /** Ranked campaign vs unranked scout vs weekly expedition. */
  runMode?: "ranked" | "scout" | "expedition";
  campsLit?: number;
  scoutCamp?: number;
  onPickRanked?: () => void;
  onPickScout?: (camp: number) => void;
  onPickExpedition?: () => void;
  expeditionLabel?: string;
  expeditionDetail?: string;
  /** Ready at run start with full lives — show ranked/scout picker. */
  showModePicker?: boolean;
  /** Flight sigil depth from campsLit (0..10). */
  ascentReaches?: number;
  climbHundred?: boolean;
  /** Unlock Ladder — Scout opens at Trainer rank + a lit camp. */
  scoutUnlocked?: boolean;
  /** Trainer-rank ceiling copy when phase === "ranklock". */
  rankLockKicker?: string;
  rankLockTitle?: string;
  rankLockDetail?: string;
}) {
  const running = phase === "running";
  const sectorN = sectorIndex + 1;
  const introActive = phase === "ready";
  const guestClaim = !!onClaim && !!claimName;
  /** End cards own the claim CTA — hide corner chrome so it doesn't stack. */
  const hideCornerChrome = phase === "failed" || phase === "done" || phase === "ceiling" || phase === "ranklock";

  useEffect(() => {
    // Sector clear: Enter/Space continues. RUN OVER / CLEAR: never Space — Space is
    // jump in Circuit and was instantly restarting runs (felt like no game over).
    if (phase !== "sector" && phase !== "failed" && phase !== "done") return;
    const onKey = (e: KeyboardEvent) => {
      if (phase === "sector") {
        if (e.code !== "Space" && e.key !== "Enter") return;
      } else if (e.key !== "Enter") {
        return;
      }
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) return;
      e.preventDefault();
      if (phase === "sector") onContinue();
      else if (!guestClaim) onRestart();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, onContinue, onRestart, guestClaim]);

  const title =
    phase === "failed"
      ? "RUN OVER"
      : phase === "continue"
        ? "LIFE LOST"
        : phase === "done"
          ? "CLEAR"
          : reachName
            ? reachName
            : `Sector ${sectorN}`;

  return (
    <>
      <FlightTeachToast message={teachMsg} accent={accent} />
      {/* Guests: continue into the game (claim) — not an exit. Owned: leave chrome. */}
      {guestClaim && onClaim && (
        <button
          type="button"
          onClick={onClaim}
          aria-label="Claim a champion"
          className="panel"
          style={{
            position: "absolute",
            top: 14,
            right: 16,
            zIndex: hideCornerChrome ? 50 : 120,
            pointerEvents: hideCornerChrome ? "none" : "auto",
            opacity: hideCornerChrome ? 0 : 1,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 12px",
            cursor: "pointer",
            fontSize: 12.5,
            fontWeight: 600,
            touchAction: "manipulation",
            ["--ac" as string]: accent,
            borderColor: accent,
            color: accent,
          }}
        >
          Claim a champion <ChevronRight size={15} strokeWidth={2.4} />
        </button>
      )}
      {onExit && !guestClaim && (
        <button
          type="button"
          onClick={onExit}
          aria-label="Exit Flight"
          className="panel"
          style={{
            position: "absolute",
            top: 14,
            left: 16,
            zIndex: hideCornerChrome ? 50 : 120,
            pointerEvents: hideCornerChrome ? "none" : "auto",
            opacity: hideCornerChrome ? 0 : 1,
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "7px 12px 7px 9px",
            cursor: "pointer",
            fontSize: 12.5,
            fontWeight: 600,
            touchAction: "manipulation",
          }}
        >
          <ChevronLeft size={15} strokeWidth={2.4} /> Exit Flight
        </button>
      )}
      {/* SectorIntro owns the ready open (big 1/100) — keep this strip off so it
          doesn't stack with Preparing / TAKE FLIGHT / the title card. */}
      {!introActive && (
        <div
          className="panel"
          style={{
            position: "absolute",
            top: 56,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 100,
            pointerEvents: "none",
            padding: "8px 14px",
            ["--ac" as string]: accent,
            borderColor: running ? accent : "var(--line)",
            textAlign: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <span className="mono" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: accent }}>
              {title}
            </span>
            <span className="mono" style={{ fontSize: 10, color: "var(--muted2)" }}>
              {sectorN}/{sectorTotal}
            </span>
            {(running || phase === "continue") && (
              <LifePips lives={lives} maxLives={maxLives} accent={phase === "continue" ? "#ff5a5a" : accent} />
            )}
            <Timer size={14} color={accent} strokeWidth={2.2} />
            <span
              style={{
                fontSize: 20,
                fontWeight: 700,
                fontVariantNumeric: "tabular-nums",
                color: running || phase === "done" || phase === "failed" || phase === "continue" ? accent : "var(--muted)",
                lineHeight: 1,
              }}
            >
              {formatCircuitMs(runMs || sectorMs)}
            </span>
          </div>
          {running && (
            <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 7 }}>
              {Array.from({ length: cpTotal }, (_, i) => {
                const hit = i < cpNext;
                const next = i === cpNext;
                return (
                  <span
                    key={i}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 6,
                      background: hit ? accent : next ? "transparent" : "var(--line2)",
                      border: `1.5px solid ${hit || next ? accent : "var(--line)"}`,
                      opacity: 0.9,
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {!compact && !introActive && (
        <CircuitBoardPanel board={board} loading={boardLoading} accent={accent} personalBest={personalBest} sectorTotal={sectorTotal} />
      )}

      {phase === "ready" && showModePicker && onPickRanked && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: compact ? 88 : 72,
            zIndex: 56,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            pointerEvents: "none",
            padding: "0 16px",
          }}
        >
          {conditionLine && (
            <div className="mono" style={{ fontSize: 9, letterSpacing: 1.2, color: "var(--gold)", fontWeight: 800, textAlign: "center", pointerEvents: "none" }} title={conditionDetail}>
              {conditionLine}
            </div>
          )}
          {wingLine && (
            <div className="mono" style={{ fontSize: 9, letterSpacing: 1.2, color: accent, fontWeight: 800, textAlign: "center", pointerEvents: "none" }}>
              WINGS · {wingLine}
            </div>
          )}
          {formLine && (
            <div className="mono" style={{ fontSize: 9, letterSpacing: 1.2, color: "rgba(242,238,251,.72)", fontWeight: 800, textAlign: "center", pointerEvents: "none" }} title={formDetail}>
              {formLine}
            </div>
          )}
          {earnedWingOptions && earnedWingOptions.length > 1 && onPickEarnedWing && (
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 5, pointerEvents: "auto" }}>
              {earnedWingOptions.map((id) => {
                const on = earnedWingPick === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onPickEarnedWing(id)}
                    className="mono"
                    style={{
                      padding: "4px 9px",
                      borderRadius: 999,
                      border: `1px solid ${on ? accent : "rgba(255,255,255,.16)"}`,
                      background: on ? `${accent}28` : "rgba(10,10,18,.45)",
                      color: on ? accent : "rgba(242,238,251,.7)",
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: 0.5,
                      cursor: "pointer",
                    }}
                  >
                    {traitLabel(id as WingTraitId)}
                  </button>
                );
              })}
            </div>
          )}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 6,
              maxWidth: 440,
              pointerEvents: "auto",
            }}
          >
            <button
              type="button"
              onClick={onPickRanked}
              className="mono"
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: `1.5px solid ${runMode === "ranked" ? accent : "rgba(255,255,255,.18)"}`,
                background: runMode === "ranked" ? `${accent}33` : "rgba(10,10,18,.55)",
                color: runMode === "ranked" ? accent : "rgba(242,238,251,.75)",
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: 0.8,
                cursor: "pointer",
              }}
            >
              RANKED · SECTOR 1
            </button>
            {onPickExpedition && expeditionLabel && (
              <button
                type="button"
                onClick={onPickExpedition}
                className="mono"
                title={expeditionDetail}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: `1.5px solid ${runMode === "expedition" ? "var(--gold)" : "rgba(255,255,255,.18)"}`,
                  background: runMode === "expedition" ? "rgba(245,208,32,.22)" : "rgba(10,10,18,.55)",
                  color: runMode === "expedition" ? "var(--gold)" : "rgba(242,238,251,.75)",
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: 0.8,
                  cursor: "pointer",
                }}
              >
                WEEK · {expeditionLabel.toUpperCase()}
              </button>
            )}
            {scoutUnlocked &&
              onPickScout &&
              Array.from({ length: campsLit }, (_, i) => {
                const camp = i + 1;
                const on = runMode === "scout" && scoutCamp === camp;
                const theme = reachThemeByIndex(camp - 1);
                return (
                  <button
                    key={camp}
                    type="button"
                    onClick={() => onPickScout(camp)}
                    className="mono"
                    title={`Scout from Camp ${theme.roman} · ${theme.name} (unranked)`}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      border: `1.5px solid ${on ? theme.accent : "rgba(255,255,255,.18)"}`,
                      background: on ? `${theme.accent}33` : "rgba(10,10,18,.55)",
                      color: on ? theme.accent : "rgba(242,238,251,.75)",
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: 0.6,
                      cursor: "pointer",
                    }}
                  >
                    SCOUT · CAMP {theme.roman}
                  </button>
                );
              })}
          </div>
          {runMode === "scout" && (
            <div className="mono" style={{ fontSize: 9, letterSpacing: 1, color: "rgba(242,238,251,.55)", textAlign: "center" }}>
              PRACTICE · no board · half XP · quarter Crowns
              {climbHundred ? " · ★ Hundred" : ""}
            </div>
          )}
          {runMode === "expedition" && (
            <div className="mono" style={{ fontSize: 9, letterSpacing: 1, color: "rgba(242,238,251,.55)", textAlign: "center" }}>
              EXPEDITION · weekly board · no camps · {sectorTotal} sectors
            </div>
          )}
        </div>
      )}

      {(phase === "ready" || phase === "running") && (
        <SectorIntro
          key={sectorIndex}
          phase={phase}
          sectorN={sectorN}
          sectorTotal={sectorTotal}
          accent={accent}
          reachName={reachName}
          lives={lives}
          maxLives={maxLives}
          modifierLabel={sectorModifierLabel}
        />
      )}

      {phase === "continue" && (
        <div
          aria-live="assertive"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 115,
            pointerEvents: "none",
            display: "grid",
            placeItems: "center",
            background: "radial-gradient(ellipse at center, rgba(40,8,12,.42) 0%, rgba(6,5,11,.55) 70%)",
            animation: "fadein 0.25s ease both",
          }}
        >
          <div style={{ textAlign: "center", paddingBottom: "8vh" }}>
            <div
              className="mono"
              style={{
                fontSize: 12,
                letterSpacing: 2.6,
                fontWeight: 800,
                color: "#ff5a5a",
                textShadow: "0 0 28px rgba(255,90,90,.55)",
                marginBottom: 10,
              }}
            >
              LIFE LOST
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "#f5f2e8",
                textShadow: "0 4px 24px rgba(0,0,0,.5)",
                marginBottom: 8,
              }}
            >
              {failReason === "gates" ? "Missed a gate" : "You fell"}
            </div>
            <div className="mono" style={{ fontSize: 13, letterSpacing: 1.6, color: "#ffb4b4", fontWeight: 800 }}>
              LAST LIFE · same sector. Not game over yet
            </div>
          </div>
        </div>
      )}

      {phase === "sector" && (
        <div
          aria-live="polite"
          className="mono"
          style={{
            position: "absolute",
            left: "50%",
            top: "38%",
            transform: "translate(-50%, -50%)",
            zIndex: 55,
            pointerEvents: "none",
            textAlign: "center",
            color: accent,
            fontWeight: 800,
            letterSpacing: 2,
            fontSize: 13,
            textShadow: "0 2px 18px rgba(0,0,0,.65)",
          }}
        >
          SECTOR {sectorN} CLEAR
          <div style={{ marginTop: 6, fontSize: 11, letterSpacing: 1.2, color: "rgba(255,255,255,.7)", fontWeight: 600 }}>
            {sectorTotal - sectorN} to go
          </div>
        </div>
      )}

      {phase === "done" && (
        <CircuitModal
          accent={accent}
          icon={<Flag size={28} color={accent} />}
          kicker={clearSnap?.firstHundred ? "THE HUNDRED" : "FULL CLEAR"}
          title={`All ${sectorTotal} sectors`}
          sub={hundredClearDetail(!!clearSnap?.firstHundred)}
          headerAction={
            onShareChallenge ? (
              <ShareChallengeBtn onClick={onShareChallenge} label={shareChallengeLabel} />
            ) : undefined
          }
        >
          {clearSnap && (
            <div className="mono" style={{ fontSize: 12, letterSpacing: 0.6, fontWeight: 700, color: accent, marginBottom: 12 }}>
              {flightMasteryLine(clearSnap.mastery)}
            </div>
          )}
          {shareMsg && (
            <div className="mono pop" style={{ fontSize: 11, letterSpacing: 1, fontWeight: 700, color: accent, marginBottom: 12 }}>
              {shareMsg}
            </div>
          )}
          {challengeResult && challengeLabel && (
            <div
              className="mono"
              style={{
                fontSize: 11,
                letterSpacing: 1,
                fontWeight: 800,
                color: challengeResult === "miss" ? "#ff8a8a" : accent,
                marginBottom: 12,
              }}
            >
              {challengeResult === "beat"
                ? `YOU BEAT ${challengeLabel}`
                : challengeResult === "surpassed"
                  ? `PAST THEIR MARK · further than ${challengeLabel}`
                  : `${challengeLabel} HOLD`}
            </div>
          )}
          {ascentReaches > 0 && (
            <div className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 12, fontSize: 10, letterSpacing: 1.5, color: accent }}>
              <Sparkles size={12} strokeWidth={2.2} />
              FLIGHT SIGIL · {ascentReaches} REACH{ascentReaches === 1 ? "" : "ES"}
            </div>
          )}
          {!guestClaim && <NextLine accent={accent} />}
          {guestClaim && onClaim && (
            <button type="button" className="btn btn-primary" style={{ ["--ac" as string]: accent, width: "100%", marginBottom: 8, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={onClaim}>
              <Sparkles size={15} strokeWidth={2.2} /> Claim a champion
            </button>
          )}
          {!guestClaim && onShareChallenge && (
            <button
              type="button"
              className="btn"
              style={{ ["--ac" as string]: accent, width: "100%", marginBottom: 8, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, borderColor: accent, color: accent }}
              onClick={onShareChallenge}
            >
              <Share2 size={15} strokeWidth={2.2} /> Challenge a friend
            </button>
          )}
          {!guestClaim && expeditionOpen && onPickExpedition && (
            <button
              type="button"
              className="btn"
              style={{ ["--ac" as string]: "var(--line2)", width: "100%", marginBottom: 8, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              onClick={onPickExpedition}
            >
              <Sparkles size={15} strokeWidth={2.2} /> This week&apos;s sky
            </button>
          )}
          <button type="button" className="btn btn-primary" style={{ ["--ac" as string]: accent, width: "100%", marginBottom: 8, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={onRestart}>
            <Rocket size={16} strokeWidth={2.2} /> Fly cleaner
          </button>
          {!guestClaim && onToHub && (
            <button type="button" className="btn" style={{ ["--ac" as string]: "var(--line2)", width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={onToHub}>
              {hubLabel || "To the Hub"}
            </button>
          )}
          <div className="mono" style={{ fontSize: 9, letterSpacing: 1, color: "var(--muted2)", marginTop: 4, textAlign: "center" }}>
            CRAFT BOARD · soft trust
          </div>
        </CircuitModal>
      )}

      {phase === "failed" && (
        <CircuitModal
          accent="#ff5a5a"
          icon={<Skull size={28} color="#ff5a5a" />}
          kicker="RUN OVER"
          title={`${sectorIndex} sector${sectorIndex === 1 ? "" : "s"} cleared`}
          sub={
            guestClaim
              ? "Out of lives. Claim a champion, or try again as a guest."
              : failReason === "gates"
                ? "Out of lives. Missed a gate. Try again, or head back to the Hub."
                : "Out of lives. Try again, or head back to the Hub."
          }
          headerAction={
            onShareChallenge ? (
              <ShareChallengeBtn onClick={onShareChallenge} label={shareChallengeLabel} />
            ) : undefined
          }
        >
          {shareMsg && (
            <div className="mono pop" style={{ fontSize: 11, letterSpacing: 1, fontWeight: 700, color: accent, marginBottom: 12 }}>
              {shareMsg}
            </div>
          )}
          {challengeResult && challengeLabel && (
            <div
              className="mono"
              style={{
                fontSize: 11,
                letterSpacing: 1,
                fontWeight: 800,
                color: challengeResult === "miss" ? "#ff8a8a" : accent,
                marginBottom: 12,
              }}
            >
              {challengeResult === "beat"
                ? `YOU BEAT ${challengeLabel}`
                : challengeResult === "surpassed"
                  ? `PAST THEIR MARK · further than ${challengeLabel}`
                  : `${challengeLabel} HOLD`}
            </div>
          )}
          {ascentReaches > 0 && (
            <div className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 12, fontSize: 10, letterSpacing: 1.5, color: "var(--muted, #9a96b8)" }}>
              <Sparkles size={12} strokeWidth={2.2} style={{ color: accent }} />
              FLIGHT SIGIL · {ascentReaches} REACH{ascentReaches === 1 ? "" : "ES"}
            </div>
          )}
          {!guestClaim && <NextLine accent={accent} />}
          {guestClaim && onClaim && (
            <>
              <div className="mono" style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.45, marginBottom: 12 }}>
                {claimName
                  ? `${claimName} flew with you. Claim it, or pick another champion.`
                  : "Claim a champion to keep this run. XP, Crowns, and the board."}
              </div>
              <button type="button" className="btn btn-primary" style={{ ["--ac" as string]: accent, width: "100%", marginBottom: 8, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={onClaim}>
                <Sparkles size={15} strokeWidth={2.2} /> Claim a champion
              </button>
            </>
          )}
          <button
            type="button"
            className="btn btn-primary"
            style={{ ["--ac" as string]: guestClaim ? accent : "#ff5a5a", width: "100%", marginBottom: 8, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            onClick={onRestart}
          >
            <Rocket size={16} strokeWidth={2.2} /> Try again
          </button>
          {!guestClaim && onToHub && (
            <button type="button" className="btn" style={{ ["--ac" as string]: "var(--line2)", width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={onToHub}>
              {hubLabel || "To the Hub"}
            </button>
          )}
        </CircuitModal>
      )}

      {phase === "ceiling" && (
        <CircuitModal
          accent={accent}
          icon={<Sparkles size={28} color={accent} />}
          kicker="ALTITUDE GATE"
          title={guestClaim ? "Claim a champion to prove" : "Prove your champion for the higher sky"}
          sub={
            guestClaim
              ? "The higher sky needs a claimed champion. Keep this wild mind, then prove."
              : "A short fight opens the next stretch of sky."
          }
        >
          {guestClaim && onClaim && (
            <button type="button" className="btn btn-primary" style={{ ["--ac" as string]: accent, width: "100%", marginBottom: 8, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={onClaim}>
              <Sparkles size={15} strokeWidth={2.2} /> Claim a champion
            </button>
          )}
          {!guestClaim && onProve && (
            <button type="button" className="btn btn-primary" style={{ ["--ac" as string]: accent, width: "100%", marginBottom: 8, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={onProve}>
              <Swords size={15} strokeWidth={2.2} /> Prove now
            </button>
          )}
          <button type="button" className="btn" style={{ ["--ac" as string]: "var(--line2)", width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={onRestart}>
            <RotateCcw size={15} strokeWidth={2.2} /> First flight again
          </button>
        </CircuitModal>
      )}

      {phase === "ranklock" && (
        <CircuitModal
          accent={accent}
          icon={<Sparkles size={28} color={accent} />}
          kicker={rankLockKicker ?? "RANK GATE"}
          title={rankLockTitle ?? "Higher sky needs a higher rank"}
          sub={rankLockDetail ?? "Keep flying, fighting, and teaching to climb Trainer rank."}
        >
          <button type="button" className="btn btn-primary" style={{ ["--ac" as string]: accent, width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={onRestart}>
            <RotateCcw size={15} strokeWidth={2.2} /> Fly the open sky again
          </button>
        </CircuitModal>
      )}
    </>
  );
}

function CircuitModal({
  accent,
  icon,
  kicker,
  title,
  sub,
  headerAction,
  children,
}: {
  accent: string;
  icon?: React.ReactNode;
  kicker: string;
  title: string;
  sub: string;
  /** Corner control (e.g. share) — not a peer of the main exit actions. */
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "var(--overlay)", backdropFilter: "blur(6px)", zIndex: 160, padding: 16, pointerEvents: "auto" }}>
      <div className="panel pop" style={{ ["--ac" as string]: accent, padding: 24, width: "min(400px, 92vw)", textAlign: "center", borderColor: accent, pointerEvents: "auto", position: "relative" }}>
        {headerAction && (
          <div style={{ position: "absolute", top: 12, right: 12 }}>{headerAction}</div>
        )}
        {icon && <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>{icon}</div>}
        <div className="mono" style={{ fontSize: 10, letterSpacing: 2, color: accent }}>{kicker}</div>
        <div style={{ fontSize: 28, fontWeight: 700, margin: "8px 0 4px" }}>{title}</div>
        <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginBottom: 16, lineHeight: 1.45 }}>{sub}</div>
        {children}
      </div>
    </div>
  );
}

function CircuitBoardPanel({
  board,
  loading,
  accent,
  personalBest,
  sectorTotal = 100,
}: {
  board: CircuitBoardEntry[];
  loading: boolean;
  accent: string;
  personalBest: CircuitPersonalBest | null;
  sectorTotal?: number;
}) {
  const named = board
    .map((e) => ({ e, label: rankLabel(e) }))
    .filter((row): row is { e: CircuitBoardEntry; label: string } => !!row.label)
    .slice(0, 8);

  return (
    <div
      className="panel"
      style={{
        position: "absolute",
        top: 56,
        right: 16,
        zIndex: 99,
        width: "min(200px, 40vw)",
        padding: "8px 10px",
        ["--ac" as string]: accent,
        pointerEvents: "none",
      }}
    >
      <div className="mono" style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--muted2)", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
        <Trophy size={11} strokeWidth={2} color={accent} /> BOARD
      </div>
      {loading ? (
        <div className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>…</div>
      ) : named.length === 0 ? (
        <div className="mono" style={{ fontSize: 10, color: "var(--muted)", lineHeight: 1.4 }}>
          no runs yet. Join the standings board to place
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {named.map(({ e, label }, i) => (
            <div key={`${label}-${i}`} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
              <span className="mono" style={{ width: 14, color: "var(--muted2)", fontSize: 10 }}>{i + 1}</span>
              <span
                style={{
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontWeight: e.you ? 800 : 600,
                  color: e.you ? accent : undefined,
                }}
              >
                {label}{e.you ? " · you" : ""}
              </span>
              <span className="mono" style={{ color: accent, fontWeight: 700, fontSize: 10 }}>
                {e.sectors}/{sectorTotal}
              </span>
            </div>
          ))}
        </div>
      )}
      {personalBest && (
        <div className="mono" style={{ fontSize: 9, color: "var(--muted2)", marginTop: 6, borderTop: "1px solid var(--line)", paddingTop: 5 }}>
          you · {personalBest.sectors}/{sectorTotal} · {formatCircuitMs(personalBest.totalMs)}s
        </div>
      )}
    </div>
  );
}
