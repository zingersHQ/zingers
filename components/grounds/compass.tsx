"use client";
import { useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import { Navigation, Gem, Check, ChevronUp, ChevronDown, Sparkles, Swords, Dumbbell, Crown, ChevronsUp, ChevronLeft, ChevronRight } from "lucide-react";
import type { Landmark, LandmarkKind } from "./landmarks";
import type { WorldGoal } from "./goals";

export interface Pose {
  x: number;
  z: number;
  heading: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// The Compass — a horizontal "heading tape" pill docked at the bottom of the
// screen (desktop: a centred 600px pill; mobile: full width with side margins).
// It reads like a real compass drum: targets sit on a curved 3D ribbon at their
// true bearing, sliding past a centre reticle as you turn. Objectives ride the
// ribbon as the primary markers; the fixed places (arena/train/keepers/tower)
// ride it too and fast-travel on tap once discovered. Cardinal ticks scroll
// behind everything so the whole thing orients like a dial.
//
// Pose is read from a ref on a light timer so the heavy 3D scene never re-renders.
// ─────────────────────────────────────────────────────────────────────────────
const DISCOVER_RADIUS = 11; // within this, a place is "discovered" (travel unlocks)
const HALF_FOV = Math.PI * 0.6; // ~108° to each side is on-tape before clamping to an edge

const PLACE_ICON: Record<LandmarkKind, ComponentType<{ size?: number; strokeWidth?: number }>> = {
  arena: Swords,
  train: Dumbbell,
  spire: Crown,
  tower: ChevronsUp,
};

const CARDINALS: { a: number; label: string }[] = [
  { a: 0, label: "N" },
  { a: Math.PI / 2, label: "E" },
  { a: Math.PI, label: "S" },
  { a: -Math.PI / 2, label: "W" },
];

// wrap an angle to [-π, π]
function norm(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

interface Marker {
  id: string;
  group: "goal" | "place";
  rel: number; // bearing relative to facing, [-π, π]
  dist: number;
  color: string;
  label: string;
  hint?: string;
  Icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  here: boolean;
  done?: boolean;
  featured?: boolean;
  travelable?: boolean;
  onPick?: () => void;
}

export function Compass({
  landmarks,
  goals = [],
  goalsDone = [],
  poseRef,
  onTravel,
  fragments,
  nodesLeft,
  isMobile,
}: {
  landmarks: Landmark[];
  goals?: WorldGoal[];
  goalsDone?: string[];
  poseRef: React.RefObject<Pose>;
  onTravel: (pos: [number, number, number]) => void;
  fragments: number;
  nodesLeft: number;
  isMobile: boolean;
}) {
  const [, tick] = useState(0);
  const discovered = useRef<Set<string>>(new Set());

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (t - last < 90) return; // ~11fps — smooth enough for a sliding tape
      last = t;
      const p = poseRef.current;
      if (p) {
        for (const l of landmarks) {
          const d = Math.hypot(l.pos[0] - p.x, l.pos[2] - p.z);
          if (d < DISCOVER_RADIUS) discovered.current.add(l.kind);
        }
      }
      tick((n) => (n + 1) % 1_000_000);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [landmarks, poseRef]);

  const p = poseRef.current ?? { x: 0, z: 0, heading: Math.PI };
  const hasGoals = goals.length > 0;
  const doneCount = goalsDone.filter((id) => goals.some((g) => g.id === id)).length;

  const markers: Marker[] = [];
  for (const g of goals) {
    const rel = norm(Math.atan2(g.pos[0] - p.x, g.pos[2] - p.z) - p.heading);
    markers.push({
      id: g.id,
      group: "goal",
      rel,
      dist: Math.hypot(g.pos[0] - p.x, g.pos[2] - p.z),
      color: g.color,
      label: g.label,
      hint: g.hint,
      Icon: g.kind === "peak" ? ChevronUp : g.kind === "depth" ? ChevronDown : Sparkles,
      here: false,
      done: goalsDone.includes(g.id),
      featured: g.featured,
    });
  }
  for (const l of landmarks) {
    const dist = Math.hypot(l.pos[0] - p.x, l.pos[2] - p.z);
    const rel = norm(Math.atan2(l.pos[0] - p.x, l.pos[2] - p.z) - p.heading);
    const here = dist < DISCOVER_RADIUS;
    const known = discovered.current.has(l.kind);
    markers.push({
      id: l.kind,
      group: "place",
      rel,
      dist,
      color: l.color,
      label: l.label,
      Icon: PLACE_ICON[l.kind] ?? Navigation,
      here,
      travelable: known && !here,
      onPick: known && !here ? () => onTravel(l.pos) : undefined,
    });
  }
  // draw far targets first so nearer ones layer on top at the centre
  markers.sort((a, b) => b.dist - a.dist);

  // facing cardinal, for the centre readout (north is arbitrary but consistent)
  const deg = ((p.heading * 180) / Math.PI + 360) % 360;
  const facing = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(deg / 45) % 8];

  const barH = isMobile ? 60 : 72;

  // map a relative bearing onto the tape: x-fraction, plus a curved-drum 3D tilt
  const place = (rel: number) => {
    const clamped = Math.max(-HALF_FOV, Math.min(HALF_FOV, rel));
    const offscreen = Math.abs(rel) > HALF_FOV;
    const o = clamped / HALF_FOV; // -1 .. 1
    const frac = 0.5 + o * 0.5; // 0 .. 1 across the ribbon
    return { frac, o, offscreen };
  };

  return (
    <div
      style={{
        width: isMobile ? "100%" : "min(600px, 100%)",
        height: barH,
        display: "flex",
        alignItems: "stretch",
        gap: 6,
        padding: "0 8px",
        background: "linear-gradient(180deg, rgba(24,21,38,.72), rgba(12,10,22,.78))",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: "1px solid var(--line2)",
        borderRadius: barH,
        boxShadow: "0 14px 50px -18px #000, inset 0 1px 0 rgba(255,255,255,.07)",
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {/* left cap — objective progress */}
      {hasGoals && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 6px", flexShrink: 0, minWidth: 40 }}>
          <Sparkles size={13} strokeWidth={2.2} color="var(--gold)" />
          <span className="mono" style={{ fontSize: 11, fontWeight: 800, color: "var(--gold)", letterSpacing: 0.5, lineHeight: 1.3 }}>
            {doneCount}/{goals.length}
          </span>
        </div>
      )}
      <div style={{ width: 1, alignSelf: "center", height: "62%", background: "var(--line2)", flexShrink: 0 }} />

      {/* the ribbon — a curved drum of bearing markers gliding past the reticle */}
      <div style={{ position: "relative", flex: 1, minWidth: 0, perspective: 720, perspectiveOrigin: "50% 60%" }}>
        {/* cardinal ticks scrolling behind the markers */}
        {CARDINALS.map((c) => {
          const rel = norm(c.a - p.heading);
          if (Math.abs(rel) > HALF_FOV) return null;
          const { frac, o } = place(rel);
          return (
            <span
              key={c.label}
              className="mono"
              style={{
                position: "absolute",
                left: `${frac * 100}%`,
                top: 5,
                transform: `translateX(-50%) rotateY(${o * -34}deg)`,
                fontSize: 8,
                letterSpacing: 1,
                fontWeight: 700,
                color: "var(--muted2)",
                opacity: 0.5 - Math.abs(o) * 0.28,
                pointerEvents: "none",
              }}
            >
              {c.label}
            </span>
          );
        })}

        {/* centre reticle — where you're pointed */}
        <div style={{ position: "absolute", left: "50%", top: 6, bottom: 6, width: 2, transform: "translateX(-1px)", background: "linear-gradient(180deg, rgba(245,208,32,.0), rgba(245,208,32,.55), rgba(245,208,32,.0))", pointerEvents: "none" }} />
        <div style={{ position: "absolute", left: "50%", top: 1, transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "6px solid var(--gold)", pointerEvents: "none" }} />
        <div className="mono" style={{ position: "absolute", left: "50%", bottom: 2, transform: "translateX(-50%)", fontSize: 7.5, letterSpacing: 1, color: "var(--gold)", fontWeight: 700, pointerEvents: "none", whiteSpace: "nowrap" }}>
          {facing} · {Math.round(deg)}°
        </div>

        {/* markers */}
        {markers.map((m) => {
          const { frac, o, offscreen } = place(m.rel);
          const scale = 1 - Math.abs(o) * 0.2;
          const opacity = m.done ? 0.45 : 1 - Math.abs(o) * 0.4 - (offscreen ? 0.12 : 0);
          const badge = m.group === "goal" ? (isMobile ? 22 : 24) : isMobile ? 18 : 20;
          const iconSize = m.group === "goal" ? 13 : 11;
          const ring = m.here || m.travelable ? m.color : `${m.color}77`;
          return (
            <div
              key={`${m.group}:${m.id}`}
              onClick={m.onPick}
              title={m.travelable ? `fast-travel to ${m.label}` : m.here ? `${m.label} — you're here` : `${m.label}${m.hint ? ` · ${m.hint}` : ""} · ${Math.round(m.dist)}m`}
              style={{
                position: "absolute",
                left: `${frac * 100}%`,
                top: "50%",
                transform: `translate(-50%, -50%) rotateY(${o * -34}deg) scale(${scale})`,
                transformOrigin: "center",
                transition: "left .12s linear, opacity .2s linear",
                opacity,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 1,
                pointerEvents: m.travelable ? "auto" : "none",
                cursor: m.travelable ? "pointer" : "default",
                zIndex: m.group === "goal" ? 3 : 2,
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: badge,
                  height: badge,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  color: m.done ? "var(--muted)" : m.color,
                  background: m.done ? "rgba(255,255,255,.06)" : `${m.color}24`,
                  border: `1.5px solid ${m.done ? "var(--line2)" : ring}`,
                  boxShadow: m.here || m.travelable ? `0 0 12px -3px ${m.color}` : "none",
                }}
              >
                {m.done ? <Check size={iconSize} strokeWidth={2.6} /> : <m.Icon size={iconSize} strokeWidth={2.4} />}
                {m.featured && !m.done && (
                  <span style={{ position: "absolute", top: -4, right: -4, fontSize: 9, color: "var(--gold)", lineHeight: 1 }}>★</span>
                )}
                {offscreen && !m.done && (
                  <span style={{ position: "absolute", top: "50%", [o < 0 ? "left" : "right"]: -9, transform: "translateY(-50%)", color: m.color, display: "inline-flex" }}>
                    {o < 0 ? <ChevronLeft size={11} strokeWidth={2.6} /> : <ChevronRight size={11} strokeWidth={2.6} />}
                  </span>
                )}
              </div>
              <span className="mono" style={{ fontSize: 7.5, letterSpacing: 0.3, color: m.here ? m.color : "var(--muted2)", fontWeight: 700, whiteSpace: "nowrap" }}>
                {m.here ? "HERE" : `${Math.round(m.dist)}m`}
              </span>
            </div>
          );
        })}
      </div>

      {/* right cap — fragment purse + caches left to find */}
      <div style={{ width: 1, alignSelf: "center", height: "62%", background: "var(--line2)", flexShrink: 0 }} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 6px", flexShrink: 0, minWidth: 40 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "#39e0ff", fontWeight: 800, fontSize: 12 }}>
          <Gem size={12} strokeWidth={2.2} /> {fragments}
        </span>
        {nodesLeft > 0 && (
          <span className="mono" style={{ fontSize: 7.5, color: "var(--muted2)", letterSpacing: 0.3, lineHeight: 1.3 }}>
            {nodesLeft} cache{nodesLeft === 1 ? "" : "s"}
          </span>
        )}
      </div>
    </div>
  );
}
