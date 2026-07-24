// The Climb — 100 sectors, generated deterministically (docs/climb.md §2–3,
// docs/climb-feel.md §1).
//
// Feel-pass law: rings share ONE lateral plane (x = 0). Challenge is altitude
// timing + gap rhythm + hazards — never sideways rubber-banding. Layouts follow
// role archetypes so Arrival ≠ Gauntlet by shape.
//
// Hard law (2026-07): never a ring ladder. Enforce a minimum |ΔY| between
// consecutive gates and break near-collinear YZ runs so "five rings inline"
// cannot happen even when a role wants a staircase (staircases stay short).

import type { CircuitCheckpoint, CircuitTrackDef } from "../circuit";
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

/** Role → raw height delta before anti-ladder enforcement. */
function gateHeightDelta(role: Role, g: number, d: ReturnType<typeof sectorDifficulty>, rnd: () => number): number {
  const amp = Math.max(d.gateRadius * 1.45, d.vertStep * 1.7);
  switch (role) {
    case "arrival":
      // short rising staircase — 3 rings, clear steps (not a long ladder)
      return d.vertStep * (1.15 + rnd() * 0.3);
    case "teach":
      // mostly up, one early dip so flap timing lands before hazards
      return g === 1 ? -amp * 0.55 : d.vertStep * (1.1 + rnd() * 0.3);
    case "rhythm":
      return Math.sin((g + 1) * Math.PI) * amp * (0.95 + rnd() * 0.15);
    case "combine":
    case "twist":
      return (g % 2 === 0 ? 1 : -0.75) * amp * (0.8 + rnd() * 0.3);
    case "pressure":
    case "pressure2":
      return (g % 3 === 1 ? -1.15 : 1) * amp * (1.0 + rnd() * 0.3);
    case "vista":
      return (g % 2 === 0 ? 0.55 : -0.35) * d.vertStep * (0.9 + rnd() * 0.25);
    case "gauntlet":
      return Math.sin(g * 1.7 + 0.4) * amp * (1.15 + rnd() * 0.2);
    case "trial":
      return (g % 2 === 0 ? 1.0 : -0.85) * amp * (1.05 + rnd() * 0.2);
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

/**
 * Kill flat / same-direction ladders. Consecutive gates must swing by at least
 * `minSwing`; after two steps the same way, force a reverse so YZ never reads
 * as a straight diagonal of rings. Amplifying a small delta PRESERVES its sign
 * (don't turn a rising staircase into a bounce).
 */
function enforceSwing(
  raw: number,
  minSwing: number,
  sameDirStreak: number,
  lastSign: number,
  allowMono: boolean,
): { dy: number; sign: number; streak: number } {
  let dy = raw;
  let sign = dy === 0 ? lastSign || 1 : Math.sign(dy);

  if (Math.abs(dy) < minSwing) {
    if (dy !== 0) sign = Math.sign(dy);
    else if (allowMono && lastSign !== 0) sign = lastSign;
    else sign = lastSign <= 0 ? 1 : -1;
    dy = sign * minSwing;
  }

  if (!allowMono && sameDirStreak >= 2 && sign === lastSign) {
    sign = -sign;
    dy = sign * Math.max(minSwing, Math.abs(dy));
  }

  const streak = sign === lastSign ? sameDirStreak + 1 : 1;
  return { dy, sign, streak };
}

function buildClimbSector(i: number): CircuitTrackDef {
  const d = sectorDifficulty(i);
  const role = roleOf(i);
  const rnd = makeRng(i);
  const [gapMin, gapMax] = d.gapSec;
  // Arrival's 3-ring staircase may rise twice. Everything else reverses by the
  // third same-direction step so long diagonals can't form.
  const allowMono = role === "arrival";
  const minSwing = d.gateRadius * 1.2;

  const gatePos: { x: number; y: number; z: number }[] = [];

  let z = 0;
  let y = 2.8;
  const yFloor = 1.6;
  // Wide band so enforceSwing isn't crushed into a flat ceiling line.
  const yCeil = 2.8 + d.gates * Math.max(d.vertStep * 1.35, d.gateRadius * 1.5) + 8;

  let lastSign = 0;
  let sameDirStreak = 0;

  for (let g = 0; g < d.gates; g++) {
    const gap = gapFor(role, g, gapMin, gapMax, rnd, d.gates);
    z += d.speed * gap + (g === 0 ? 4 : 0);

    const raw = gateHeightDelta(role, g, d, rnd);
    const swung = enforceSwing(raw, minSwing, sameDirStreak, lastSign, allowMono);
    lastSign = swung.sign;
    sameDirStreak = swung.streak;
    y += swung.dy;
    y = Math.max(yFloor, Math.min(yCeil, y));

    // If clamp flattened us against a neighbor, nudge off the wall.
    if (gatePos.length > 0) {
      const prevY = gatePos[gatePos.length - 1]!.y;
      if (Math.abs(y - prevY) < minSwing * 0.85) {
        const nudge = (y >= prevY ? 1 : -1) * minSwing;
        y = Math.max(yFloor, Math.min(yCeil, prevY + nudge));
      }
    }

    gatePos.push({ x: 0, y, z });
  }

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
    platforms: [],
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
