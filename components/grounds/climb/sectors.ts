// The Climb — 100 sectors, generated deterministically (docs/climb.md §2–3,
// docs/climb-feel.md §1).
//
// Feel-pass law: rings share ONE lateral plane (x = 0). Challenge is altitude
// timing + gap rhythm + hazards — never sideways rubber-banding. Layouts follow
// role archetypes (staircase / sine rhythm / pressure bite / vista glide) so
// Arrival ≠ Gauntlet by shape, not only sky tint.

import type { CircuitCheckpoint, CircuitPlatform, CircuitTrackDef } from "../circuit";
import { hash01 } from "../landmarks";
import { CLIMB_SECTOR_COUNT, roleIndex, roleOf, sectorDifficulty, type Role } from "./difficulty";
import { reachTheme } from "./reaches";

const SIGNATURE_NAMES: Record<number, string> = {
  9: "First Gate Trial",
  24: "The Silver Span",
  49: "The Open Roof",
  74: "Zenith Crossing",
  89: "The Corona Gauntlet",
  99: "The Hum",
};

const ROLE_WORD: Record<number, string> = {
  1: "Arrival",
  2: "Approach",
  3: "Weave",
  4: "Rhythm",
  5: "Pressure",
  6: "Vista",
  7: "Twist",
  8: "Surge",
  9: "Gauntlet",
  10: "Gate Trial",
};

function sectorName(i: number): string {
  if (SIGNATURE_NAMES[i]) return SIGNATURE_NAMES[i]!;
  const theme = reachTheme(i);
  return `${theme.name} · ${ROLE_WORD[roleIndex(i)] ?? "Climb"}`;
}

function makeRng(i: number): () => number {
  let s = Math.floor(hash01(`climb:sector:${i}`) * 2147483646) + 1;
  return () => ((s = (s * 16807) % 2147483647), s / 2147483647);
}

/** Role → how consecutive gate heights relate (docs/climb-feel.md §1b). */
function gateHeightDelta(role: Role, g: number, d: ReturnType<typeof sectorDifficulty>, rnd: () => number): number {
  const amp = Math.max(d.gateRadius * 1.35, d.vertStep * 1.6); // real flap room
  switch (role) {
    case "arrival":
    case "teach":
      return d.vertStep * (1.05 + rnd() * 0.25);
    case "rhythm":
      return Math.sin(g * Math.PI) * amp * (0.85 + rnd() * 0.2);
    case "combine":
    case "twist":
      return (g % 2 === 0 ? 1 : -0.55) * amp * (0.7 + rnd() * 0.35);
    case "pressure":
    case "pressure2":
      return (g % 3 === 1 ? -1 : 1) * amp * (0.95 + rnd() * 0.35);
    case "vista":
      return d.vertStep * (0.45 + rnd() * 0.25);
    case "gauntlet":
      return Math.sin(g * 1.7 + 0.4) * amp * (1.05 + rnd() * 0.25);
    case "trial":
      return (g % 2 === 0 ? 0.9 : -0.7) * amp * (1.0 + rnd() * 0.2);
  }
}

function gapFor(role: Role, g: number, gapMin: number, gapMax: number, rnd: () => number, gates: number): number {
  if (role === "rhythm") return (gapMin + gapMax) * 0.5;
  if (role === "vista") {
    const mid = Math.floor(gates / 2);
    if (g === mid) return gapMax;
    return gapMin + (gapMax - gapMin) * 0.25 * rnd();
  }
  if (role === "pressure" || role === "pressure2" || role === "gauntlet") {
    return g % 3 === 2 ? gapMax * 0.85 : gapMin + (gapMax - gapMin) * 0.2 * rnd();
  }
  return gapMin + (gapMax - gapMin) * rnd();
}

function buildClimbSector(i: number): CircuitTrackDef {
  const d = sectorDifficulty(i);
  const role = roleOf(i);
  const rnd = makeRng(i);
  const [gapMin, gapMax] = d.gapSec;

  const platforms: CircuitPlatform[] = [
    { pos: [0, -0.25, 0], size: [Math.max(9, 12 - d.reach * 0.22), 0.5, 10], accent: "top" },
  ];
  const gatePos: { x: number; y: number; z: number }[] = [];

  let z = 0;
  let y = 2.8;
  const platW = Math.max(2.4, 3.6 - d.reach * 0.11);
  const yFloor = 1.6;
  const yCeil = 2.8 + d.gates * Math.max(d.vertStep, d.gateRadius * 0.9) + 4;

  for (let g = 0; g < d.gates; g++) {
    const gap = gapFor(role, g, gapMin, gapMax, rnd, d.gates);
    z += d.speed * gap + (g === 0 ? 4 : 0);
    y += gateHeightDelta(role, g, d, rnd);
    y = Math.max(yFloor, Math.min(yCeil, y));

    // coplanar corridor — x always 0 (climb-feel §1c)
    platforms.push({ pos: [0, y - 1.9, z], size: [platW, 0.5, platW], accent: g % 2 ? "a" : "b" });
    gatePos.push({ x: 0, y, z });
  }

  const last = gatePos[gatePos.length - 1]!;
  platforms.push({ pos: [0, last.y - 1.4, last.z + 5], size: [platW + 2, 0.6, platW + 2], accent: "top" });

  const checkpoints: CircuitCheckpoint[] = [
    { index: 0, label: "Start", pos: [0, 2, 6], radius: 3.5 },
    ...gatePos.map((g, idx) => {
      const isFinish = idx === gatePos.length - 1;
      return {
        index: idx + 1,
        label: isFinish ? "Finish" : `Gate ${idx + 1}`,
        pos: [g.x, g.y, g.z] as [number, number, number],
        radius: isFinish ? d.gateRadius + 0.5 : d.gateRadius,
        ...(isFinish ? { finish: true } : {}),
      };
    }),
  ];

  return {
    id: `climb:s${i + 1}`,
    name: sectorName(i),
    spawn: [0, 1.1, -2.5],
    platforms,
    checkpoints,
  };
}

export const CLIMB_SECTORS: CircuitTrackDef[] = Array.from({ length: CLIMB_SECTOR_COUNT }, (_, i) =>
  buildClimbSector(i),
);

export function climbSector(index: number): CircuitTrackDef {
  return CLIMB_SECTORS[Math.max(0, Math.min(CLIMB_SECTOR_COUNT - 1, index))]!;
}

export { CLIMB_SECTOR_COUNT } from "./difficulty";
