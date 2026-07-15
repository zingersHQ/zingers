// The Climb — 100 sectors, generated deterministically (docs/climb.md §2–3).
//
// Each sector = (reach recipe × role template × per-sector seed) → a concrete
// track the existing CircuitScene/Flyer can render, with NO stored level data.
// Gate spacing is authored in seconds-of-flight and converted to world-Z here
// (dz = speed × gap) so the 5-second scenic cap stays honest at any speed.

import type { CircuitCheckpoint, CircuitPlatform, CircuitTrackDef } from "../circuit";
import { hash01 } from "../landmarks";
import { CLIMB_SECTOR_COUNT, roleIndex, sectorDifficulty } from "./difficulty";
import { reachTheme } from "./reaches";

// Landmark sectors get a hand-named identity worth talking about (§2). Indices
// are 0-based (s10 → 9, s25 → 24, s50 → 49, s75 → 74, s90 → 89, s100 → 99).
const SIGNATURE_NAMES: Record<number, string> = {
  9: "First Gate Trial",
  24: "The Silver Span",
  49: "The Open Roof", // s50 — crosses the Amphitheatre's roof over a live crowd
  74: "Zenith Crossing",
  89: "The Corona Gauntlet",
  99: "The Hum", // s100 — the final ring into silence and starlight
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

// a small seeded LCG per sector so gaps/weave vary within a sector but stay
// identical for every player and every run
function makeRng(i: number): () => number {
  let s = Math.floor(hash01(`climb:sector:${i}`) * 2147483646) + 1;
  return () => ((s = (s * 16807) % 2147483647), s / 2147483647);
}

function buildClimbSector(i: number): CircuitTrackDef {
  const d = sectorDifficulty(i);
  const rnd = makeRng(i);
  const [gapMin, gapMax] = d.gapSec;

  const platforms: CircuitPlatform[] = [
    { pos: [0, -0.25, 0], size: [Math.max(9, 12 - d.reach * 0.22), 0.5, 10], accent: "top" },
  ];
  const gatePos: { x: number; y: number; z: number }[] = [];

  let z = 0;
  let y = 2.2; // first ring height above the launch pad
  const platW = Math.max(2.4, 3.6 - d.reach * 0.11);

  for (let g = 0; g < d.gates; g++) {
    const gap = gapMin + (gapMax - gapMin) * rnd();
    z += d.speed * gap + (g === 0 ? 3 : 0); // launch offset on the first ring
    // ascending climb with gentle per-gate variation (altitude IS the score)
    const rise = d.vertStep * (0.7 + rnd() * 0.6);
    y += rise;
    const side = g % 2 === 0 ? 1 : -1;
    const x = side * d.latAmp * (0.55 + Math.sin(g * 1.1 + i * 0.37) * 0.35 + rnd() * 0.1);

    // a stepping-stone platform below each ring (decorative depth cue)
    platforms.push({ pos: [x * 0.7, y - 1.9, z], size: [platW, 0.5, platW], accent: g % 2 ? "a" : "b" });
    gatePos.push({ x: x * 0.3, y, z });
  }

  const last = gatePos[gatePos.length - 1]!;
  // summit pad just past the finish ring
  platforms.push({ pos: [last.x * 0.5, last.y - 1.4, last.z + 5], size: [platW + 2, 0.6, platW + 2], accent: "top" });

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
