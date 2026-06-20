// A flat, deterministic "postcard" of a region — drawn straight from its biome
// config (sky, nebula, terrain shape + palette, crystals). No WebGL: it renders
// the same on server and client, stays cheap in a gallery, and actually reads as
// the PLACE a season belongs to instead of a lone champion in an empty frame.
import type { BiomeConfig } from "@/components/grounds/biomes";

const W = 320;
const H = 180;

// mulberry32 — same seeded RNG the rest of the world uses, so a region's
// skyline is stable forever for a given biome seed.
function rngFrom(seed: number) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex([r, g, b]: [number, number, number]): string {
  const c = (x: number) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}
function mix(a: string, b: string, t: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

// A silhouette ridge across the full width, closed down to the bottom edge.
// `ridged` → jagged volcanic spires; otherwise neighbours are averaged into
// soft rolling hills.
function ridge(seed: number, baseY: number, amp: number, steps: number, ridged: boolean) {
  const r = rngFrom(seed);
  const ys: number[] = [];
  for (let i = 0; i <= steps; i++) {
    let v = r();
    if (ridged) v = Math.pow(v, 0.55); // bias toward taller, sharper peaks
    ys.push(v);
  }
  if (!ridged) {
    for (let pass = 0; pass < 2; pass++) {
      const prev = [...ys];
      for (let i = 1; i < ys.length - 1; i++) ys[i] = (prev[i - 1] + prev[i] + prev[i + 1]) / 3;
    }
  }
  const pt = (i: number) => {
    const x = (i / steps) * W;
    const y = baseY - ys[i] * amp;
    return [x, y] as const;
  };
  const [x0, y0] = pt(0);
  let top = `M ${x0.toFixed(1)} ${y0.toFixed(1)}`;
  for (let i = 1; i <= steps; i++) {
    const [x, y] = pt(i);
    top += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  const fill = `${top} L ${W} ${H} L 0 ${H} Z`;
  return { fill, top };
}

function diamond(cx: number, cy: number, rx: number, ry: number) {
  return `${cx},${(cy - ry).toFixed(1)} ${(cx + rx).toFixed(1)},${cy} ${cx},${(cy + ry).toFixed(1)} ${(cx - rx).toFixed(1)},${cy}`;
}

export function RegionPoster({ biome, accent, className }: { biome: BiomeConfig; accent?: string; className?: string }) {
  const seed = biome.terrain.seed + 1;
  const ridged = biome.terrain.ridged;
  const crest = biome.terrain.high;
  const glow = accent ?? biome.floatCrystal.emissive;

  const uid = `rp-${biome.id}`;
  const far = ridge(seed * 7 + 11, H * 0.6, ridged ? 34 : 26, ridged ? 18 : 14, ridged);
  const mid = ridge(seed * 13 + 29, H * 0.72, ridged ? 42 : 34, ridged ? 20 : 13, ridged);
  const near = ridge(seed * 17 + 53, H * 0.86, ridged ? 30 : 26, ridged ? 16 : 11, ridged);

  const farFill = mix(biome.terrain.mid, biome.sky.bottom, 0.5);
  const midFill = biome.terrain.mid;
  const nearFill = mix(biome.terrain.low, "#000000", 0.15);

  // a handful of floating crystals, deterministically scattered in the sky band
  const cr = rngFrom(seed * 31 + 7);
  const crystals = Array.from({ length: 5 }, () => ({
    x: 24 + cr() * (W - 48),
    y: 22 + cr() * (H * 0.42),
    s: 2.6 + cr() * 3.4,
  }));

  return (
    <svg
      className={className}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
      aria-hidden
    >
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={biome.sky.top} />
          <stop offset="100%" stopColor={biome.sky.bottom} />
        </linearGradient>
        <radialGradient id={`${uid}-sun`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={mix(glow, "#ffffff", 0.55)} stopOpacity={0.95} />
          <stop offset="45%" stopColor={glow} stopOpacity={0.6} />
          <stop offset="100%" stopColor={glow} stopOpacity={0} />
        </radialGradient>
        <filter id={`${uid}-blur`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <filter id={`${uid}-soft`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
      </defs>

      <rect x="0" y="0" width={W} height={H} fill={`url(#${uid}-sky)`} />

      {/* nebula — soft drifting colour the biome already defines for its sky */}
      <g filter={`url(#${uid}-blur)`} opacity={biome.nebula.opacity}>
        {biome.nebula.colors.slice(0, 4).map((c, i) => (
          <circle key={i} cx={40 + i * 80} cy={28 + (i % 2) * 26} r={34 + (i % 3) * 12} fill={c} opacity={0.55} />
        ))}
      </g>

      {/* the season's "sun" — the featured force, hanging over its region */}
      <circle cx={W * 0.76} cy={H * 0.28} r={42} fill={`url(#${uid}-sun)`} />
      <circle cx={W * 0.76} cy={H * 0.28} r={9} fill={mix(glow, "#ffffff", 0.4)} opacity={0.85} />

      {/* terrain — three silhouettes, dark in front, hazed at the back */}
      <path d={far.fill} fill={farFill} opacity={0.9} />
      <path d={mid.fill} fill={midFill} />
      <path d={mid.top} fill="none" stroke={crest} strokeWidth={1.4} strokeLinejoin="round" opacity={0.85} filter={`url(#${uid}-soft)`} />
      <path d={near.fill} fill={nearFill} />

      {/* bioluminescent crystals floating over the land */}
      <g filter={`url(#${uid}-soft)`}>
        {crystals.map((c, i) => (
          <polygon key={i} points={diamond(c.x, c.y, c.s * 0.62, c.s)} fill={biome.floatCrystal.color} opacity={0.9} />
        ))}
      </g>
    </svg>
  );
}
