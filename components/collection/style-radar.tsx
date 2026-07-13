"use client";
// A dependency-free SVG radar of the five style axes. Draws the champion's
// CURRENT build as a filled polygon over a faint "where it started" polygon from
// its earliest recorded snapshot — so a career of raising reads as a shape that
// grew and leaned. Pure + memoized; no animation (safe on mobile, no reflow).
import { memo } from "react";
import { AXES } from "@/lib/evolve/progression";
import type { Style } from "@/lib/types";

function points(values: number[], max: number, cx: number, cy: number, r: number): string {
  const n = values.length;
  return values
    .map((v, i) => {
      const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      const rad = (Math.max(0, Math.min(max, v)) / max) * r;
      return `${(cx + rad * Math.cos(ang)).toFixed(1)},${(cy + rad * Math.sin(ang)).toFixed(1)}`;
    })
    .join(" ");
}

function ringPoints(max: number, cx: number, cy: number, r: number, frac: number): string {
  return points(AXES.map(() => max * frac), max, cx, cy, r);
}

export const StyleRadar = memo(function StyleRadar({
  current,
  earliest,
  size = 224,
  accent = "var(--gold)",
}: {
  current: Style;
  earliest?: Style | null;
  size?: number;
  accent?: string;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 30;
  const curVals = AXES.map((a) => current[a.k] || 0);
  const earlyVals = earliest ? AXES.map((a) => earliest[a.k] || 0) : null;
  const peak = Math.max(12, ...curVals, ...(earlyVals || []));
  const max = Math.ceil(peak / 6) * 6; // clean grid ceiling

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Fighting-style radar">
      {/* grid rings */}
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} points={ringPoints(max, cx, cy, r, f)} fill="none" stroke="var(--line)" strokeWidth={1} opacity={f === 1 ? 0.9 : 0.4} />
      ))}
      {/* spokes + axis labels */}
      {AXES.map((a, i) => {
        const ang = -Math.PI / 2 + (i * 2 * Math.PI) / AXES.length;
        const ex = cx + r * Math.cos(ang);
        const ey = cy + r * Math.sin(ang);
        const lx = cx + (r + 16) * Math.cos(ang);
        const ly = cy + (r + 16) * Math.sin(ang);
        const anchor = Math.abs(Math.cos(ang)) < 0.3 ? "middle" : Math.cos(ang) > 0 ? "start" : "end";
        return (
          <g key={a.k}>
            <line x1={cx} y1={cy} x2={ex} y2={ey} stroke="var(--line)" strokeWidth={1} opacity={0.35} />
            <text x={lx} y={ly} fontSize={12} fill={a.color} textAnchor={anchor} dominantBaseline="middle" style={{ fontWeight: 700 }}>
              {a.glyph}
            </text>
          </g>
        );
      })}
      {/* earliest snapshot (faint underlay) */}
      {earlyVals && (
        <polygon points={points(earlyVals, max, cx, cy, r)} fill="var(--muted2)" fillOpacity={0.1} stroke="var(--muted2)" strokeWidth={1} strokeDasharray="3 3" opacity={0.7} />
      )}
      {/* current build */}
      <polygon points={points(curVals, max, cx, cy, r)} fill={accent} fillOpacity={0.16} stroke={accent} strokeWidth={2} />
      {AXES.map((a, i) => {
        const ang = -Math.PI / 2 + (i * 2 * Math.PI) / AXES.length;
        const rad = (Math.min(max, curVals[i]) / max) * r;
        return <circle key={a.k} cx={cx + rad * Math.cos(ang)} cy={cy + rad * Math.sin(ang)} r={2.5} fill={a.color} />;
      })}
    </svg>
  );
});
