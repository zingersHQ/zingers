"use client";
import { useEffect } from "react";
import { Flag, RotateCcw, Skull, Timer, Trophy, ChevronRight } from "lucide-react";
import { formatCircuitMs } from "./circuit";
import type { CircuitPersonalBest } from "./circuit-tracks";

export type CircuitPhase = "ready" | "running" | "sector" | "done" | "failed";
export type CircuitFailReason = "fall" | "gates";

export interface CircuitBoardEntry {
  handle: string;
  sectors: number;
  totalMs: number;
  clearedAll: boolean;
  /** owner token — used for a short display id when no handle is set */
  token?: string;
}

function rankLabel(e: CircuitBoardEntry): string | null {
  const h = e.handle?.trim();
  if (h) return h;
  const t = e.token?.trim();
  if (t && t.length >= 4) return `T-${t.slice(0, 4)}`;
  return null;
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
  sectorTotal = 100,
  reachName,
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
  sectorTotal?: number;
  /** short Reach name only — no roman/tagline essay */
  reachName?: string;
}) {
  const running = phase === "running";
  const sectorN = sectorIndex + 1;

  useEffect(() => {
    if (phase !== "sector" && phase !== "failed" && phase !== "done") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== "Enter") return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) return;
      e.preventDefault();
      if (phase === "sector") onContinue();
      else onRestart();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, onContinue, onRestart]);

  const title =
    phase === "failed"
      ? "RUN OVER"
      : phase === "done"
        ? "CLEAR"
        : reachName
          ? reachName
          : `Sector ${sectorN}`;

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
          <Timer size={14} color={accent} strokeWidth={2.2} />
          <span
            style={{
              fontSize: 20,
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
              color: running || phase === "done" || phase === "failed" ? accent : "var(--muted)",
              lineHeight: 1,
            }}
          >
            {phase === "ready" && !runMs ? "—" : formatCircuitMs(runMs || sectorMs)}
          </span>
        </div>
        {(running || phase === "ready") && (
          <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 7 }}>
            {Array.from({ length: cpTotal }, (_, i) => {
              const hit = i < cpNext;
              const next = i === cpNext && running;
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

      {!compact && (
        <CircuitBoardPanel board={board} loading={boardLoading} accent={accent} personalBest={personalBest} sectorTotal={sectorTotal} />
      )}

      {phase === "sector" && (
        <CircuitModal accent={accent} icon={<ChevronRight size={28} color={accent} />} kicker={`SECTOR ${sectorN}`} title="SECTOR CLEARED" sub={`${sectorTotal - sectorN} to go · ${formatCircuitMs(runMs)}s elapsed`}>
          <button type="button" className="btn btn-primary" style={{ ["--ac" as string]: accent, width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={onContinue}>
            Sector {sectorN + 1} <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        </CircuitModal>
      )}

      {phase === "done" && (
        <CircuitModal accent={accent} icon={<Flag size={28} color={accent} />} kicker="FULL CLEAR" title={`All ${sectorTotal} sectors`} sub={`${formatCircuitMs(runMs)}s total`}>
          <button type="button" className="btn btn-primary" style={{ ["--ac" as string]: accent, width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={onRestart}>
            <RotateCcw size={16} strokeWidth={2.2} /> run again
          </button>
        </CircuitModal>
      )}

      {phase === "failed" && (
        <CircuitModal accent="#ff5a5a" icon={<Skull size={28} color="#ff5a5a" />} kicker="RUN OVER" title={`${sectorIndex} sector${sectorIndex === 1 ? "" : "s"} cleared`} sub={failReason === "gates" ? "Missed a gate. Back to sector 1." : "One fall ends the run."}>
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
          set a handle in Standings to appear here
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {named.map(({ e, label }, i) => (
            <div key={`${label}-${i}`} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
              <span className="mono" style={{ width: 14, color: "var(--muted2)", fontSize: 10 }}>{i + 1}</span>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}>
                {label}
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
