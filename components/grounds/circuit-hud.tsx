"use client";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Flag, RotateCcw, Share2, Skull, Sparkles, Swords, Timer, Trophy } from "lucide-react";
import { CIRCUIT_LIVES, CIRCUIT_SECTOR_INTRO, formatCircuitMs } from "./circuit";
import type { CircuitPersonalBest } from "./circuit-tracks";
import { rewardSfx } from "@/lib/sfx";

export type CircuitPhase = "ready" | "running" | "sector" | "done" | "failed" | "continue" | "ceiling" | "prove";
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

function LifePips({ lives, accent }: { lives: number; accent: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }} aria-label={`${lives} ${lives === 1 ? "life" : "lives"} left`}>
      {Array.from({ length: CIRCUIT_LIVES }, (_, i) => {
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
 */
function SectorIntro({
  sectorN,
  sectorTotal,
  accent,
  reachName,
  lives,
}: {
  sectorN: number;
  sectorTotal: number;
  accent: string;
  reachName?: string;
  lives: number;
}) {
  const [showCard, setShowCard] = useState(true);

  useEffect(() => {
    setShowCard(true);
    rewardSfx("small");
    const doneT = window.setTimeout(() => setShowCard(false), CIRCUIT_SECTOR_INTRO.cardMs);
    return () => window.clearTimeout(doneT);
  }, [sectorN]);

  return (
    <>
      {showCard && (
        <div className="circuit-sector-intro" aria-live="polite">
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
              {Array.from({ length: CIRCUIT_LIVES }, (_, i) => (
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
          </div>
        </div>
      )}
      {!showCard && (
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
  /** Desktop: "Copy challenge link"; mobile: native share wording. */
  shareChallengeLabel?: string;
  /** Open in-place altitude Prove (Reach II gate). */
  onProve?: () => void;
  /** Guest Ascent: open champion selection to claim (not auto-claim the loaner). */
  onClaim?: () => void;
  claimName?: string | null;
  /** Claimed Trainer: leave the Ascent (usually back to the Concord). */
  onToHub?: () => void;
  hubLabel?: string;
  challengeResult?: "beat" | "miss" | null;
  challengeLabel?: string | null;
  accent: string;
  compact?: boolean;
  failReason?: CircuitFailReason;
  sectorTotal?: number;
  /** short Reach name only — no roman/tagline essay */
  reachName?: string;
  /** Remaining lives in the current run (2 → 1 continue → 0 run over). */
  lives?: number;
}) {
  const running = phase === "running";
  const sectorN = sectorIndex + 1;
  const introActive = phase === "ready";
  const guestClaim = !!onClaim && !!claimName;
  /** End cards own the claim CTA — hide corner chrome so it doesn't stack. */
  const hideCornerChrome = phase === "failed" || phase === "done" || phase === "ceiling";

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
          <ChevronLeft size={15} strokeWidth={2.4} /> Exit Ascent
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
              <LifePips lives={lives} accent={phase === "continue" ? "#ff5a5a" : accent} />
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

      {phase === "ready" && (
        <SectorIntro
          key={sectorIndex}
          sectorN={sectorN}
          sectorTotal={sectorTotal}
          accent={accent}
          reachName={reachName}
          lives={lives}
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
              LAST LIFE · same sector — not game over yet
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
        <CircuitModal accent={accent} icon={<Flag size={28} color={accent} />} kicker="FULL CLEAR" title={`All ${sectorTotal} sectors`} sub={`${formatCircuitMs(runMs)}s total`}>
          {challengeResult && challengeLabel && (
            <div className="mono" style={{ fontSize: 11, letterSpacing: 1, fontWeight: 800, color: challengeResult === "beat" ? accent : "#ff8a8a", marginBottom: 12 }}>
              {challengeResult === "beat" ? `YOU BEAT ${challengeLabel}` : `${challengeLabel} HOLD`}
            </div>
          )}
          {guestClaim && onClaim && (
            <button type="button" className="btn btn-primary" style={{ ["--ac" as string]: accent, width: "100%", marginBottom: 8, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={onClaim}>
              <Sparkles size={15} strokeWidth={2.2} /> Claim a champion
            </button>
          )}
          {onShareChallenge && (
            <button type="button" className="btn" style={{ ["--ac" as string]: accent, width: "100%", marginBottom: 8, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={onShareChallenge}>
              <Share2 size={15} strokeWidth={2.2} /> {shareChallengeLabel || "Challenge a friend"}
            </button>
          )}
          {!guestClaim && onToHub && (
            <button type="button" className="btn" style={{ ["--ac" as string]: "var(--line2)", width: "100%", marginBottom: 8, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={onToHub}>
              <ChevronLeft size={16} strokeWidth={2.2} /> {hubLabel || "To the Hub"}
            </button>
          )}
          <button type="button" className={guestClaim ? "btn" : "btn btn-primary"} style={{ ["--ac" as string]: guestClaim ? "var(--line2)" : accent, width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={onRestart}>
            <RotateCcw size={16} strokeWidth={2.2} /> Run again
          </button>
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
              ? "Out of lives. Claim a champion — or try again as a guest."
              : failReason === "gates"
                ? "Out of lives — missed a gate. Try again, share the run, or head back."
                : "Out of lives. Try again, share the run, or head back."
          }
        >
          {challengeResult && challengeLabel && (
            <div className="mono" style={{ fontSize: 11, letterSpacing: 1, fontWeight: 800, color: challengeResult === "beat" ? accent : "#ff8a8a", marginBottom: 12 }}>
              {challengeResult === "beat" ? `YOU BEAT ${challengeLabel}` : `${challengeLabel} HOLD`}
            </div>
          )}
          {guestClaim && onClaim && (
            <>
              <div className="mono" style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.45, marginBottom: 12 }}>
                {claimName
                  ? `${claimName} flew with you — claim it, or pick another champion.`
                  : "Claim a champion to keep this run — XP, Crowns, and the board."}
              </div>
              <button type="button" className="btn btn-primary" style={{ ["--ac" as string]: accent, width: "100%", marginBottom: 8, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={onClaim}>
                <Sparkles size={15} strokeWidth={2.2} /> Claim a champion
              </button>
            </>
          )}
          {onShareChallenge && (
            <button type="button" className="btn" style={{ ["--ac" as string]: accent, width: "100%", marginBottom: 8, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={onShareChallenge}>
              <Share2 size={15} strokeWidth={2.2} /> {shareChallengeLabel || "Challenge a friend"}
            </button>
          )}
          {!guestClaim && onToHub && (
            <button type="button" className="btn" style={{ ["--ac" as string]: "var(--line2)", width: "100%", marginBottom: 8, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={onToHub}>
              <ChevronLeft size={16} strokeWidth={2.2} /> {hubLabel || "To the Hub"}
            </button>
          )}
          <button
            type="button"
            className={guestClaim || onToHub ? "btn" : "btn btn-primary"}
            style={{ ["--ac" as string]: guestClaim || onToHub ? "var(--line2)" : "#ff5a5a", width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            onClick={onRestart}
          >
            <RotateCcw size={16} strokeWidth={2.2} /> Try again
          </button>
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
            <RotateCcw size={15} strokeWidth={2.2} /> Practice the first sky again
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
  children,
}: {
  accent: string;
  icon?: React.ReactNode;
  kicker: string;
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "var(--overlay)", backdropFilter: "blur(6px)", zIndex: 160, padding: 16, pointerEvents: "auto" }}>
      <div className="panel pop" style={{ ["--ac" as string]: accent, padding: 24, width: "min(400px, 92vw)", textAlign: "center", borderColor: accent, pointerEvents: "auto" }}>
        {icon && <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>{icon}</div>}
        <div className="mono" style={{ fontSize: 10, letterSpacing: 2, color: accent }}>{kicker}</div>
        <div style={{ fontSize: 28, fontWeight: 700, margin: "8px 0 4px" }}>{title}</div>
        <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginBottom: 16 }}>{sub}</div>
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
          no runs yet — claim a name in Standings
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
