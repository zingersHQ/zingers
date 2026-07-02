"use client";
import { useEffect, useState, type RefObject } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Battle juice — presentation-only helpers for the live arena. Screen shake,
// the round-start VS card and the KO freeze-beat. Everything layers transforms
// and opacity on top of the existing SSE events (keyframes live in
// globals.css, all guarded by prefers-reduced-motion there too).
// ─────────────────────────────────────────────────────────────────────────────

/** Live prefers-reduced-motion flag (CSS guards the keyframes; this guards JS timing/imperative bits). */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

const SHAKE_CLASSES = ["arena-shake-sm", "arena-shake-md", "arena-shake-lg"] as const;

/**
 * Shake the stage when a new turn lands, scaled to its damage. Applied
 * imperatively (remove → reflow → re-add) so back-to-back hits of the same
 * size still restart the animation without remounting the fighter panels —
 * a remount would snap the HP tween.
 */
export function useScreenShake(ref: RefObject<HTMLDivElement | null>, round: number | undefined, dmg: number | undefined, disabled: boolean) {
  useEffect(() => {
    if (disabled || !round || !dmg || dmg <= 0) return;
    const el = ref.current;
    if (!el) return;
    el.classList.remove(...SHAKE_CLASSES);
    void el.offsetWidth; // flush so the same class re-triggers its animation
    el.classList.add(dmg >= 25 ? "arena-shake-lg" : dmg >= 12 ? "arena-shake-md" : "arena-shake-sm");
  }, [ref, round, dmg, disabled]);
}

/** Round-start "VS" card — overlays the fighter panels, then fades itself out. */
export function VsIntro(props: { aName: string; bName: string; acol: string; bcol: string }) {
  const { aName, bName, acol, bcol } = props;
  return (
    <div className="vs-wrap" style={{ position: "absolute", inset: 0, zIndex: 5, display: "grid", placeItems: "center", pointerEvents: "none" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: "14px 26px",
          borderRadius: 16,
          background: "var(--overlay)",
          border: "1px solid var(--line2)",
          backdropFilter: "blur(6px)",
        }}
      >
        <span className="vs-side-l glow" style={{ ["--ac" as string]: acol, fontSize: 26, fontWeight: 700, color: acol, whiteSpace: "nowrap" }}>
          {aName}
        </span>
        <span className="vs-mark mono glow" style={{ ["--ac" as string]: "var(--gold)", fontSize: 34, fontWeight: 700, color: "var(--gold)" }}>
          VS
        </span>
        <span className="vs-side-r glow" style={{ ["--ac" as string]: bcol, fontSize: 26, fontWeight: 700, color: bcol, whiteSpace: "nowrap" }}>
          {bName}
        </span>
      </div>
    </div>
  );
}

/** The KO freeze-beat: shockwave rings + a slammed-in "K.O." held before the verdict card. */
export function KoOverlay({ col }: { col: string }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "grid", placeItems: "center", pointerEvents: "none" }}>
      <div className="cel-shock" style={{ position: "absolute", width: 180, height: 180, borderRadius: "50%", border: `3px solid ${col}` }} />
      <div className="cel-shock" style={{ position: "absolute", width: 180, height: 180, borderRadius: "50%", border: "2px solid var(--gold)", animationDelay: "0.12s" }} />
      <div className="ko-word glow" style={{ ["--ac" as string]: col, fontSize: "clamp(64px, 14vw, 110px)", fontWeight: 700, color: col, letterSpacing: "0.06em" }}>
        K.O.
      </div>
    </div>
  );
}
