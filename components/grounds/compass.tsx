"use client";
import { useEffect, useRef, useState } from "react";
import { Navigation, MapPin, Gem } from "lucide-react";
import type { Landmark } from "./landmarks";

export interface Pose {
  x: number;
  z: number;
  heading: number;
}

// A district compass + fast-travel panel. Reads the live player pose from a ref
// (so it never forces the heavy 3D scene to re-render) and refreshes itself on a
// light timer. Each district shows a heading arrow + distance; once you've been
// near it, a tap fast-travels you there.
const DISCOVER_RADIUS = 11; // within this, a district counts as "discovered"

export function Compass({
  landmarks,
  poseRef,
  onTravel,
  fragments,
  nodesLeft,
  isMobile,
}: {
  landmarks: Landmark[];
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
      if (t - last < 140) return; // ~7fps is plenty for a compass
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

  return (
    <div className="panel" style={{ padding: isMobile ? "8px 9px" : "10px 12px", width: isMobile ? 150 : 184, pointerEvents: "auto" }}>
      <div className="mono" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9, letterSpacing: 1.5, color: "var(--muted2)", marginBottom: 8 }}>
        <Navigation size={12} strokeWidth={2} />
        DISTRICTS
        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 3, color: "#39e0ff" }}>
          <Gem size={11} strokeWidth={2} /> {fragments}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {landmarks.map((l) => {
          const dx = l.pos[0] - p.x;
          const dz = l.pos[2] - p.z;
          const dist = Math.hypot(dx, dz);
          const bearing = Math.atan2(dx, dz); // world convention: atan2(x, z)
          const rel = bearing - p.heading;
          const here = dist < DISCOVER_RADIUS;
          const known = discovered.current.has(l.kind);
          return (
            <button
              key={l.kind}
              onClick={() => known && !here && onTravel(l.pos)}
              disabled={!known || here}
              title={known ? (here ? "you're here" : `fast-travel to ${l.label}`) : "discover this district first"}
              className="panel"
              style={{
                ["--ac" as string]: l.color,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "5px 8px",
                cursor: known && !here ? "pointer" : "default",
                borderColor: here ? l.color : "var(--line)",
                opacity: known ? 1 : 0.5,
                textAlign: "left",
              }}
            >
              <span
                style={{
                  color: l.color,
                  display: "inline-flex",
                  transform: `rotate(${rel}rad)`,
                  transition: "transform .14s linear",
                  flexShrink: 0,
                }}
              >
                {here ? <MapPin size={13} strokeWidth={2.4} /> : <Navigation size={13} strokeWidth={2.4} style={{ transform: "rotate(-45deg)" }} />}
              </span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: "block", fontSize: 11, fontWeight: 700, color: known ? "#fff" : "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.label}</span>
                <span className="mono" style={{ fontSize: 8, color: "var(--muted2)", letterSpacing: 0.5 }}>{here ? "ARRIVED" : `${Math.round(dist)}m${known ? " · travel" : ""}`}</span>
              </span>
            </button>
          );
        })}
      </div>
      {nodesLeft > 0 && (
        <div className="mono" style={{ fontSize: 8, color: "var(--muted2)", letterSpacing: 0.5, marginTop: 7, textAlign: "center" }}>
          {nodesLeft} cache{nodesLeft === 1 ? "" : "s"} hidden in the wilds
        </div>
      )}
    </div>
  );
}
