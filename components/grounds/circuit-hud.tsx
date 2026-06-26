"use client";
import { Flag, RotateCcw, Skull, Timer, Trophy, ChevronRight } from "lucide-react";
import { formatCircuitMs } from "./circuit";
import type { CircuitPersonalBest } from "./circuit-tracks";
import { CIRCUIT_SECTOR_COUNT } from "./circuit-tracks";

export type CircuitPhase = "ready" | "running" | "sector" | "done" | "failed";
export type CircuitFailReason = "fall" | "gates";

export interface CircuitBoardEntry {
  handle: string;
  sectors: number;
  totalMs: number;
  clearedAll: boolean;
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
  accent,
  compact,
  failReason,
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
  accent: string;
  compact?: boolean;
  failReason?: CircuitFailReason;
}) {
  const running = phase === "running";
  const sectorN = sectorIndex + 1;

  return (
    <>
      <div
        className="panel"
        style={{
          position: "absolute",
          top: 56,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 100,
          pointerEvents: "none",
          padding: "10px 16px",
          ["--ac" as string]: accent,
          borderColor: running ? accent : "var(--line)",
          minWidth: 240,
          textAlign: "center",
        }}
      >
        <div className="mono" style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--muted2)", marginBottom: 4 }}>
          {phase === "failed"
            ? "RUN OVER"
            : phase === "done"
              ? "FULL CLEAR"
              : running || phase === "sector"
                ? `SECTOR ${sectorN} / ${CIRCUIT_SECTOR_COUNT}`
                : "THE CIRCUIT"}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Timer size={18} color={accent} strokeWidth={2.2} />
          <span
            style={{
              fontSize: 28,
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
              color: running || phase === "done" || phase === "failed" ? accent : "var(--muted)",
            }}
          >
            {phase === "ready" && !runMs ? "—" : formatCircuitMs(runMs || sectorMs)}
          </span>
          <span className="mono" style={{ fontSize: 10, color: "var(--muted2)" }}>s</span>
        </div>
        {personalBest && phase !== "done" && phase !== "failed" && (
          <div
            className="mono"
            style={{
              fontSize: 9,
              color: "var(--muted2)",
              marginTop: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            <Trophy size={11} strokeWidth={2} /> best {personalBest.sectors}/{CIRCUIT_SECTOR_COUNT} · {formatCircuitMs(personalBest.totalMs)}s
          </div>
        )}
        {/* sector progress strip */}
        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 8 }}>
          {Array.from({ length: CIRCUIT_SECTOR_COUNT }, (_, i) => {
            const cleared = i < sectorIndex || (phase === "sector" && i === sectorIndex) || phase === "done";
            const current = i === sectorIndex && (running || phase === "ready" || phase === "sector");
            return (
              <span
                key={i}
                style={{
                  width: i === sectorIndex ? 14 : 6,
                  height: 6,
                  borderRadius: 6,
                  background: cleared ? accent : current ? "transparent" : "var(--line2)",
                  border: `1.5px solid ${cleared || current ? accent : "var(--line)"}`,
                  boxShadow: current ? `0 0 8px ${accent}` : undefined,
                  transition: "width 0.2s",
                }}
              />
            );
          })}
        </div>
        {/* gate dots for current sector */}
        {(running || phase === "ready") && (
          <div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 8 }}>
            {Array.from({ length: cpTotal }, (_, i) => {
              const hit = i < cpNext;
              const next = i === cpNext && running;
              return (
                <span
                  key={i}
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 7,
                    background: hit ? accent : next ? "transparent" : "var(--line2)",
                    border: `1.5px solid ${hit || next ? accent : "var(--line)"}`,
                    opacity: 0.85,
                  }}
                />
              );
            })}
          </div>
        )}
        {phase === "ready" && (
          <div className="mono" style={{ fontSize: 9, color: "var(--muted)", marginTop: 8, letterSpacing: 0.5 }}>
            clear all {CIRCUIT_SECTOR_COUNT} sectors · pass every gate · fall or skip = restart
          </div>
        )}
      </div>

      {/* Leaderboard — compact, always visible on desktop */}
      {!compact && (
        <CircuitBoardPanel board={board} loading={boardLoading} accent={accent} personalBest={personalBest} />
      )}

      {phase === "sector" && (
        <CircuitModal accent={accent} icon={<ChevronRight size={28} color={accent} />} kicker={`SECTOR ${sectorN}`} title="SECTOR CLEARED" sub={`${CIRCUIT_SECTOR_COUNT - sectorN} to go · ${formatCircuitMs(runMs)}s elapsed`}>
          <button type="button" className="btn btn-primary" style={{ ["--ac" as string]: accent, width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={onContinue}>
            Sector {sectorN + 1} <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        </CircuitModal>
      )}

      {phase === "done" && (
        <CircuitModal accent={accent} icon={<Flag size={28} color={accent} />} kicker="FULL CLEAR" title="All 10 sectors" sub={`${formatCircuitMs(runMs)}s total`}>
          <button type="button" className="btn btn-primary" style={{ ["--ac" as string]: accent, width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={onRestart}>
            <RotateCcw size={16} strokeWidth={2.2} /> run again
          </button>
        </CircuitModal>
      )}

      {phase === "failed" && (
        <CircuitModal accent="#ff5a5a" icon={<Skull size={28} color="#ff5a5a" />} kicker="RUN OVER" title={`${sectorIndex} sector${sectorIndex === 1 ? "" : "s"} cleared`} sub={failReason === "gates" ? "Missed a gate — every ring must be crossed. Back to sector 1." : "Back to sector 1. One fall ends the run."}>
          <button type="button" className="btn btn-primary" style={{ ["--ac" as string]: "#ff5a5a", width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={onRestart}>
            <RotateCcw size={16} strokeWidth={2.2} /> try again
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
  icon: React.ReactNode;
  kicker: string;
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "var(--overlay)", backdropFilter: "blur(6px)", zIndex: 55, padding: 16 }}>
      <div className="panel pop" style={{ ["--ac" as string]: accent, padding: 24, width: "min(400px, 92vw)", textAlign: "center", borderColor: accent }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>{icon}</div>
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
}: {
  board: CircuitBoardEntry[];
  loading: boolean;
  accent: string;
  personalBest: CircuitPersonalBest | null;
}) {
  return (
    <div
      className="panel"
      style={{
        position: "absolute",
        top: 56,
        right: 16,
        zIndex: 99,
        width: "min(220px, 42vw)",
        padding: "10px 12px",
        ["--ac" as string]: accent,
        pointerEvents: "none",
      }}
    >
      <div className="mono" style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--muted2)", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
        <Trophy size={11} strokeWidth={2} color={accent} /> RANKINGS
      </div>
      {loading ? (
        <div className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>loading…</div>
      ) : board.length === 0 ? (
        <div className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>no runs yet — be first</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {board.slice(0, 8).map((e, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
              <span className="mono" style={{ width: 16, color: "var(--muted2)", fontSize: 10 }}>{i + 1}</span>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}>
                {e.handle || "anonymous"}
              </span>
              <span className="mono" style={{ color: accent, fontWeight: 700, fontSize: 10 }}>
                {e.sectors}/{CIRCUIT_SECTOR_COUNT}
              </span>
            </div>
          ))}
        </div>
      )}
      {personalBest && (
        <div className="mono" style={{ fontSize: 9, color: "var(--muted2)", marginTop: 8, borderTop: "1px solid var(--line)", paddingTop: 6 }}>
          you · {personalBest.sectors}/{CIRCUIT_SECTOR_COUNT} · {formatCircuitMs(personalBest.totalMs)}s
        </div>
      )}
    </div>
  );
}
