"use client";
import { FORCES, WHEEL, wheelNeighbors } from "@/lib/lore/canon";
import type { CreatureType } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// The Wheel — the one diagram that teaches the whole combat system without a
// word of cosmology: five argument styles arranged in a pentagon, each with an
// arrow into the next, because each Force beats the next and loses to the one
// behind it (canon WHEEL + wheelNeighbors). Used in the first-run deck and the
// champion-claim screen so a new Reader learns "what beats what" by sight.
// ─────────────────────────────────────────────────────────────────────────────
const DEG = Math.PI / 180;

// node k sits on a circle, starting at the top (-90°) and stepping clockwise.
const nodeAngle = (k: number) => (-90 + 72 * k) * DEG;

export function ForcesWheel({ size = 320, highlight }: { size?: number; highlight?: CreatureType }) {
  const cx = size / 2;
  const cy = size / 2;
  const rNode = size * 0.36; // where the force badges sit
  const rArc = size * 0.235; // where the "beats" arrows ride (inside the badges)
  const gap = 22 * DEG; // pull each arrow off its end nodes so it reads cleanly

  const nodes = WHEEL.map((id, k) => {
    const a = nodeAngle(k);
    return { id, x: cx + rNode * Math.cos(a), y: cy + rNode * Math.sin(a) };
  });

  const arcs = WHEEL.map((id, k) => {
    const a0 = nodeAngle(k) + gap;
    const a1 = nodeAngle(k + 1) - gap;
    const x0 = cx + rArc * Math.cos(a0);
    const y0 = cy + rArc * Math.sin(a0);
    const x1 = cx + rArc * Math.cos(a1);
    const y1 = cy + rArc * Math.sin(a1);
    return { id, d: `M ${x0} ${y0} A ${rArc} ${rArc} 0 0 1 ${x1} ${y1}`, color: FORCES[id].hex };
  });

  const badge = Math.max(34, size * 0.15);

  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto", maxWidth: "100%" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: "absolute", inset: 0, overflow: "visible" }} aria-hidden>
        <defs>
          {WHEEL.map((id) => (
            <marker key={id} id={`fw-ah-${id}`} markerWidth="8" markerHeight="8" refX="5.5" refY="3" orient="auto" markerUnits="userSpaceOnUse">
              <path d="M0,0 L6,3 L0,6 Z" fill={FORCES[id].hex} />
            </marker>
          ))}
        </defs>
        {arcs.map((a) => {
          const dim = highlight ? (highlight === a.id || wheelNeighbors(highlight).predator === a.id ? 1 : 0.22) : 0.85;
          return <path key={a.id} d={a.d} fill="none" stroke={a.color} strokeWidth={2.25} strokeLinecap="round" markerEnd={`url(#fw-ah-${a.id})`} opacity={dim} />;
        })}
      </svg>

      {nodes.map(({ id, x, y }) => {
        const f = FORCES[id];
        const on = !highlight || highlight === id;
        return (
          <div
            key={id}
            style={{
              position: "absolute",
              left: x,
              top: y,
              transform: `translate(-50%, -50%) scale(${highlight === id ? 1.08 : 1})`,
              width: size * 0.3,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              textAlign: "center",
              opacity: on ? 1 : 0.4,
              transition: "opacity .25s, transform .25s",
              pointerEvents: "none",
            }}
          >
            <span
              style={{
                display: "grid",
                placeItems: "center",
                width: badge,
                height: badge,
                borderRadius: "50%",
                fontSize: badge * 0.46,
                color: f.hex,
                background: `${f.hex}1f`,
                border: `2px solid ${f.hex}`,
                boxShadow: highlight === id ? `0 0 18px -2px ${f.hex}` : `0 0 12px -6px ${f.hex}`,
              }}
            >
              {f.sigil}
            </span>
            <span style={{ fontSize: Math.max(10, size * 0.036), fontWeight: 700, color: "#fff", lineHeight: 1.1, letterSpacing: -0.2 }}>{f.inWorld}</span>
            <span className="mono" style={{ fontSize: Math.max(8, size * 0.028), color: "var(--muted2)", lineHeight: 1.2, fontStyle: "italic" }}>{f.argues}</span>
          </div>
        );
      })}

      <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", textAlign: "center", pointerEvents: "none" }}>
        <div className="mono" style={{ fontSize: Math.max(7, size * 0.026), letterSpacing: 2, color: "var(--muted2)" }}>EACH BEATS</div>
        <div className="mono" style={{ fontSize: Math.max(7, size * 0.026), letterSpacing: 2, color: "var(--muted2)" }}>THE NEXT ↻</div>
      </div>
    </div>
  );
}

// A one-line legend for tight spots (the claim screen header): the five sigils
// chained by "beats" arrows, looping back to the start.
export function ForcesChain() {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
      {WHEEL.map((id, k) => {
        const f = FORCES[id];
        return (
          <span key={id} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span title={`${f.inWorld} — ${f.argues}`} style={{ display: "grid", placeItems: "center", width: 24, height: 24, borderRadius: "50%", fontSize: 12, color: f.hex, background: `${f.hex}1f`, border: `1.5px solid ${f.hex}` }}>
              {f.sigil}
            </span>
            <span style={{ color: "var(--muted2)", fontSize: 12 }}>{k < WHEEL.length - 1 ? "›" : "↻"}</span>
          </span>
        );
      })}
    </div>
  );
}
